"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CartItem } from "@/components/CartItem";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Floor } from "@/types";
import { Label } from "./ui/label";
import { Input } from "./ui/input";

const glassInputStyle = "bg-white/10 border-white/20 text-white placeholder:text-white/40 text-sm";

const ORGANIZATION_LAT = 32.33898854094914;
const ORGANIZATION_LON = 51.50619575284041;
const ALLOWED_RADIUS_METERS = 500;
const EXPIRATION_MINUTES = 10;

// UX & networking tuning (match CartPage)
const PENDING_ORDER_KEY = "pending_order_v2";
const MIN_OVERLAY_MS = 800;
const SUCCESS_HOLD_MS = 350;
const SUBMIT_TIMEOUT_MS = 12000;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function ensureMinDuration(startedAt: number, minMs: number) {
    const elapsed = Date.now() - startedAt;
    if (elapsed < minMs) await wait(minMs - elapsed);
}
function makeClientRequestId() {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return (crypto as any).randomUUID();
    }
    return "cr-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}
async function fetchWithTimeout(url: string, opts: RequestInit = {}, timeoutMs = 10000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, { ...opts, signal: controller.signal });
        clearTimeout(id);
        return res;
    } catch (err) {
        clearTimeout(id);
        throw err;
    }
}
function savePendingOrder(clientRequestId: string, payload: any) {
    try {
        sessionStorage.setItem(PENDING_ORDER_KEY, JSON.stringify({ clientRequestId, payload, createdAt: Date.now() }));
    } catch { }
}
function clearPendingOrder() {
    try { sessionStorage.removeItem(PENDING_ORDER_KEY); } catch { }
}
function getPendingOrder() {
    try {
        const s = sessionStorage.getItem(PENDING_ORDER_KEY);
        return s ? JSON.parse(s) : null;
    } catch { return null; }
}

// verify with exponential backoff
async function verifyOrderStatus(clientRequestId: string, maxAttempts = 6) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/orders/by-client-request/${encodeURIComponent(clientRequestId)}`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                return { found: true, order: data.order };
            } else if (res.status === 404) {
                // not found yet
            } else {
                // server error - still retry a few times
            }
        } catch {
            // network error - continue retrying
        }
        const waitMs = Math.min(1000 * Math.pow(2, attempt), 30000);
        await wait(waitMs);
    }
    return { found: false as const };
}

export const CartSidebar = () => {
    const { user } = useAuthStore();
    const { cart, clearCart } = useCartStore();
    const router = useRouter();

    const [description, setDescription] = useState("");
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);
    const [floors, setFloors] = useState<Floor[]>([]);
    const [selectedFloorId, setSelectedFloorId] = useState("");
    const [isHydrated, setIsHydrated] = useState(false);
    const [placingStage, setPlacingStage] = useState<'idle' | 'submitting' | 'verifying' | 'done' | 'error'>('idle');

    const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const FLOOR_ID_KEY = "qr_scanned_floor_id";
    const FLOOR_TIMESTAMP_KEY = "qr_scanned_floor_timestamp";

    useEffect(() => {
        const fetchFloors = async () => {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/floors`);
                const data = await res.json();
                setFloors(data || []);
            } catch (e) {
                console.warn("floors fetch failed", e);
            }

            const scannedFloorId = sessionStorage.getItem(FLOOR_ID_KEY);
            const timestampStr = sessionStorage.getItem(FLOOR_TIMESTAMP_KEY);
            if (scannedFloorId && timestampStr) {
                const timeElapsedMs = Date.now() - parseInt(timestampStr, 10);
                const timeElapsedMinutes = timeElapsedMs / 60000;
                if (timeElapsedMinutes < EXPIRATION_MINUTES) {
                    setSelectedFloorId(scannedFloorId);
                    return;
                } else {
                    sessionStorage.removeItem(FLOOR_ID_KEY);
                    sessionStorage.removeItem(FLOOR_TIMESTAMP_KEY);
                }
            }
            if (user?.defaultFloorId) setSelectedFloorId(user.defaultFloorId.toString());
        };
        fetchFloors();
    }, [user]);

    useEffect(() => setIsHydrated(true), []);

    // distance util (kept local)
    const getDistanceInMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371e3;
        const φ1 = (lat1 * Math.PI) / 180;
        const φ2 = (lat2 * Math.PI) / 180;
        const Δφ = ((lat2 - lat1) * Math.PI) / 180;
        const Δλ = ((lon2 - lon1) * Math.PI) / 180;
        const a =
            Math.sin(Δφ / 2) ** 2 +
            Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    // finalize flow (smooth transition, then cleanup)
    const finalizeSuccess = async (orderId: string, newCreditBalance?: number | null) => {
        setPlacingStage('done');
        await wait(SUCCESS_HOLD_MS);
        // navigate first for smooth UX
        router.push(`/order-success/${orderId}`);
        // cleanup after navigation (overlay hides with route change)
        clearPendingOrder();
        clearCart();
        if (typeof newCreditBalance === 'number' && user) {
            useAuthStore.setState({ user: { ...user, creditBalance: newCreditBalance } });
        }
        // optional: toast (or show toast in invoice page)
        toast.success(`سفارش #${orderId} ثبت شد.`);
        setIsPlacingOrder(false);
        setPlacingStage('idle');
    };

    // main create order (idempotent & verify on network failure)
    const handleCreateOrder = async () => {
        if (cart.length === 0) {
            toast.error("سبد خرید خالی است.");
            return;
        }
        const startedAt = Date.now();
        setIsPlacingOrder(true);
        setPlacingStage('submitting');

        const clientRequestId = makeClientRequestId();
        const payload = {
            items: cart,
            deliveryFloorId: selectedFloorId,
            description,
            clientRequestId
        };

        savePendingOrder(clientRequestId, payload);

        try {
            const res = await fetchWithTimeout(`${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/orders`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(payload),
            }, SUBMIT_TIMEOUT_MS);

            await ensureMinDuration(startedAt, MIN_OVERLAY_MS);

            if (res.ok) {
                const data = await res.json();
                await finalizeSuccess(data.order.id, data.newCreditBalance ?? null);
                return;
            } else {
                let errMsg = "مشکلی در ثبت سفارش رخ داد.";
                let errorId: string | undefined;
                try { const errJson = await res.json(); errMsg = errJson.message || errMsg; errorId = errJson.errorId; } catch { }
                clearPendingOrder();
                setPlacingStage('error');
                setIsPlacingOrder(false);
                toast.error(errorId ? `${errMsg} (کد: ${errorId})` : errMsg);
                return;
            }
        } catch (err) {
            // network / timeout -> verify flow
            await ensureMinDuration(startedAt, MIN_OVERLAY_MS);
            setPlacingStage('verifying');
            toast.info("ارتباط با سرور ضعیف است — در حال بررسی وضعیت سفارش...");

            const result = await verifyOrderStatus(clientRequestId, 6);
            if (result.found) {
                await finalizeSuccess(result.order.id, null);
                return;
            }

            setPlacingStage('error');
            setIsPlacingOrder(false);
            toast.error("ثبت سفارش نامشخص است. می‌توانید تلاش مجدد کنید.");
            return;
        }
    };

    // retry pending
    const retryPendingOrder = async () => {
        const pending = getPendingOrder();
        if (!pending?.payload) {
            toast.error("سفارشی برای تلاش مجدد موجود نیست.");
            return;
        }
        const startedAt = Date.now();
        setIsPlacingOrder(true);
        setPlacingStage('submitting');

        try {
            const res = await fetchWithTimeout(`${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/orders`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(pending.payload),
            }, SUBMIT_TIMEOUT_MS);

            await ensureMinDuration(startedAt, MIN_OVERLAY_MS);

            if (res.ok) {
                const data = await res.json();
                await finalizeSuccess(data.order.id, data.newCreditBalance ?? null);
            } else {
                let errMsg = "خطا در ثبت سفارش";
                let errorId: string | undefined;
                try { const e = await res.json(); errMsg = e.message || errMsg; errorId = e.errorId; } catch { }
                setPlacingStage('error');
                setIsPlacingOrder(false);
                toast.error(errorId ? `${errMsg} (کد: ${errorId})` : errMsg);
            }
        } catch {
            await ensureMinDuration(startedAt, MIN_OVERLAY_MS);
            setPlacingStage('error');
            setIsPlacingOrder(false);
            toast.error("ارتباط برقرار نشد. دوباره تلاش کنید.");
        }
    };

    // manual verify for pending
    const manualVerify = async () => {
        const pending = getPendingOrder();
        if (!pending?.clientRequestId) {
            toast.error("سفارشی برای بررسی موجود نیست.");
            return;
        }
        setIsPlacingOrder(true);
        setPlacingStage('verifying');
        const result = await verifyOrderStatus(pending.clientRequestId, 6);
        if (result.found) {
            await finalizeSuccess(result.order.id, null);
        } else {
            setPlacingStage('error');
            setIsPlacingOrder(false);
            toast.error("هنوز سفارشی پیدا نشد. می‌توانید تلاش مجدد کنید.");
        }
    };

    // checkout: guest vs logged in
    const handleCheckout = async () => {
        if (isPlacingOrder) return;

        if (user) {
            await handleCreateOrder();
            return;
        }

        if (!navigator.geolocation) {
            toast.error("مرورگر شما از موقعیت‌یابی پشتیبانی نمی‌کند. لطفا وارد شوید.");
            return;
        }

        setIsPlacingOrder(true);
        setPlacingStage('submitting');
        toast.info("در حال بررسی موقعیت مکانی شما...");
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const distance = getDistanceInMeters(pos.coords.latitude, pos.coords.longitude, ORGANIZATION_LAT, ORGANIZATION_LON);
                if (distance <= ALLOWED_RADIUS_METERS) {
                    await handleCreateOrder();
                } else {
                    toast.error("خارج از محدوده سازمان هستید. لطفاً وارد شوید.");
                    router.push("/login");
                    setIsPlacingOrder(false);
                    setPlacingStage('idle');
                }
            },
            () => {
                toast.error("دسترسی به موقعیت رد شد. به صفحه ورود منتقل می‌شوید.");
                router.push("/login");
                setIsPlacingOrder(false);
                setPlacingStage('idle');
            }
        );
    };

    const sidebarVariants = {
        hidden: { x: "-100%", opacity: 0.5 },
        visible: { x: 0, opacity: 1 },
    };

    if (!isHydrated) {
        return (
            <div className="flex justify-center items-center h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
        );
    }

    return (
        <AnimatePresence>
            {cart.length > 0 && (
                <motion.aside
                    variants={sidebarVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    transition={{ type: "spring", stiffness: 400, damping: 40 }}
                    className="hidden fixed bg-white/10 backdrop-blur-xl left-0 h-[calc(100%-5.5rem)] w-full max-w-sm 
                     backdrop-blur-2xl border border-white/10 z-40 lg:flex flex-col overflow-hidden m-2 rounded-2xl shadow-lg text-sm"
                    style={{ direction: "rtl" }}
                >
                    {/* Overlay for submitting / verifying */}
                    {isPlacingOrder && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
                            <div className="text-white text-center">
                                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3" />
                                <div className="text-sm">
                                    {placingStage === 'submitting' && "در حال ثبت سفارش..."}
                                    {placingStage === 'verifying' && "در حال بررسی وضعیت سفارش..."}
                                    {placingStage === 'error' && "خطا در ثبت سفارش"}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="p-4 flex justify-between items-center flex-shrink-0">
                        <h2 className="text-xl font-bold text-white">سبد خرید شما</h2>
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#D63A4F] text-xs font-bold">
                            {cart.reduce((acc, item) => acc + item.quantity, 0)}
                        </span>
                    </div>

                    <div className="flex-grow p-4 space-y-3 overflow-auto">
                        {cart.map((item) => (
                            <CartItem key={item.id} item={item} />
                        ))}
                    </div>

                    <div className="p-4 mt-auto flex-shrink-0 text-white">
                        <div className="space-y-4">
                            <div className="flex justify-between text-sm text-white/80">
                                <span>مبلغ کل:</span>
                                <span className="font-bold">{total.toLocaleString()} لبخند</span>
                            </div>

                            {user && (
                                <div className="flex justify-between text-xs text-white/70">
                                    <span>اعتبار شما:</span>
                                    <span>{user.creditBalance.toLocaleString()} لبخند</span>
                                </div>
                            )}

                            <Separator className="my-2 bg-white/20" />

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="floor" className="text-white/80 text-xs">طبقه تحویل</Label>
                                    <Select value={selectedFloorId.toString()} onValueChange={setSelectedFloorId} dir="rtl">
                                        <SelectTrigger className="bg-white/10 border-white/20 text-white placeholder:text-white/40 text-xs h-9">
                                            <SelectValue placeholder="انتخاب طبقه..." />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white/5 backdrop-blur-lg border border-white/20 text-white text-xs">
                                            {floors.map((floor) => <SelectItem key={floor.id} value={floor.id.toString()}>{floor.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>


                            </div>

                            <div className="space-y-2 mt-4">
                                <Label htmlFor="orderDescription" className="text-white/80 text-xs">توضیحات اضافی سفارش <span className="text-white/50">(اختیاری)</span></Label>
                                <textarea id="orderDescription" placeholder="مثال: بدون شکر، شات اضافی..." value={description} onChange={(e) => setDescription(e.target.value)} rows={4} maxLength={300} className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2.5 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/40 resize-none text-sm leading-relaxed" />
                                <div className="flex justify-end"><span className="text-xs text-white/50">{description.length}/300</span></div>
                            </div>

                            <div className="mt-3 mb-3 space-y-2 ">
                                <Button onClick={handleCheckout} disabled={isPlacingOrder || !selectedFloorId} size="sm" className="w-full text-sm bg-[#D63A4F] hover:bg-red-700 disabled:opacity-50">
                                    {isPlacingOrder ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />در حال ثبت سفارش...</>) : "ثبت نهایی سفارش"}
                                </Button>

                                <Button variant="outline" className="w-full bg-transparent hover:bg-white/10 text-sm py-2 border-white/20" asChild>
                                    <a href="/cart">مشاهده سبد خرید کامل <ArrowLeft className="mr-2 h-4 w-4" /></a>
                                </Button>
                            </div>

                            {/* pending quick actions */}
                            {getPendingOrder() && !isPlacingOrder && (
                                <div className="mt-2 text-xs text-white/70">
                                    <p>سفارش قبلی در وضعیت نامشخص است.</p>
                                    <div className="flex gap-2 mt-2">
                                        <Button size="sm" onClick={manualVerify}>بررسی وضعیت</Button>
                                        <Button size="sm" variant="outline" onClick={retryPendingOrder}>تلاش مجدد</Button>
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                </motion.aside>
            )}
        </AnimatePresence>
    );
};
