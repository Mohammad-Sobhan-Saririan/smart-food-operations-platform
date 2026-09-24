"use client";
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useCartStore, type CartItem as CartItemType } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { CartItem } from '@/components/CartItem';
import { EmptyCart } from '@/components/EmptyCart';
import { toast } from 'sonner';
import { getDistanceInMeters } from '@/lib/location';
import { Loader2, ShoppingCart } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Floor } from '@/types';
import { glassInputStyle } from '@/components/admin/UserFormDialog';

// coords & policy
const ORGANIZATION_LAT = 32.33898854094914;
const ORGANIZATION_LON = 51.50619575284041;
const ALLOWED_RADIUS_METERS = 500;
const EXPIRATION_MINUTES = 10;

// pending + overlay UX tuning
const PENDING_ORDER_KEY = 'pending_order_v2';
const MIN_OVERLAY_MS = 800;         // حداقل زمان نمایش overlay برای جلوگیری از پرش
const SUCCESS_HOLD_MS = 350;        // مکث کوتاه بعد از موفقیت برای حس انتقال
const SUBMIT_TIMEOUT_MS = 12000;    // تایم‌اوت درخواست ثبت سفارش

// --- Helpers ----------------------------------------------------
const wait = (ms: number) => new Promise(res => setTimeout(res, ms));

async function ensureMinDuration(startedAt: number, minMs: number) {
    const elapsed = Date.now() - startedAt;
    if (elapsed < minMs) await wait(minMs - elapsed);
}

function makeClientRequestId() {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return (crypto as any).randomUUID();
    }
    return 'cr-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
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
    const p = { clientRequestId, payload, createdAt: Date.now() };
    try { sessionStorage.setItem(PENDING_ORDER_KEY, JSON.stringify(p)); } catch { }
}
function clearPendingOrder() { try { sessionStorage.removeItem(PENDING_ORDER_KEY); } catch { } }
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
                // server error — still retry
            }
        } catch {
            // network error — still retry
        }
        const waitMs = Math.min(1000 * Math.pow(2, attempt), 30000);
        await wait(waitMs);
    }
    return { found: false as const };
}

// ---------------------------------------------------------------

type PlacingStage = 'idle' | 'submitting' | 'verifying' | 'done' | 'error';

export default function CartPage() {
    const { user } = useAuthStore();
    const router = useRouter();

    const [floors, setFloors] = useState<Floor[]>([]);
    const [description, setDescription] = useState('');
    const FLOOR_ID_KEY = 'qr_scanned_floor_id';
    const FLOOR_TIMESTAMP_KEY = 'qr_scanned_floor_timestamp';
    const [selectedFloorId, setSelectedFloorId] = useState('');
    const [isHydrated, setIsHydrated] = useState(false);

    const [placingStage, setPlacingStage] = useState<PlacingStage>('idle');
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);

    // safe cart subscription
    const useSafeCart = () => {
        const [cart, setCart] = useState<CartItemType[]>([]);
        const { clearCart } = useCartStore();
        useEffect(() => {
            const unsubscribe = useCartStore.subscribe(state => setCart(state.cart));
            setCart(useCartStore.getState().cart);
            return () => unsubscribe();
        }, []);
        return { cart, clearCart };
    };
    const { cart, clearCart } = useSafeCart();
    const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

    // fetch floors + handle scanned floor
    useEffect(() => {
        const fetchFloors = async () => {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/floors`);
                const data = await res.json();
                setFloors(data || []);
            } catch (e) {
                console.warn('floors fetch failed', e);
                toast.error('دریافت لیست طبقات موفق نبود. لطفا صفحه را رفرش کنید.');
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

    // If user returns and pending order exists, show hint (non-blocking)
    useEffect(() => {
        const pending = getPendingOrder();
        if (pending?.clientRequestId) {
            toast.info('یک سفارش قبلاً ارسال شده و وضعیتش نامشخص است. می‌توانید وضعیت را بررسی کنید.');
        }
    }, []);

    // Prevent "EmptyCart flash" while overlay is visible
    if (!isHydrated) {
        return <div className="flex justify-center items-center h-[80vh]"><Loader2 className="h-8 w-8 animate-spin text-white" /></div>;
    }
    if (cart.length === 0 && !isPlacingOrder) return <EmptyCart />;

    // --- Submit logic (final) ------------------------------------
    const finalizeSuccess = async (orderId: string, newCreditBalance?: number | null) => {
        // show "done" state a bit (smoothness)
        setPlacingStage('done');
        await wait(SUCCESS_HOLD_MS);

        // navigate first for smooth transition
        router.push(`/order-success/${orderId}`);

        // cleanup behind the scenes (overlay is still showing so no visual jump)
        clearPendingOrder();
        clearCart();

        if (typeof newCreditBalance === 'number' && user) {
            useAuthStore.setState({ user: { ...user, creditBalance: newCreditBalance } });
        }

        // optional: toast here (or move it to invoice page)
        toast.success(`سفارش #${orderId} ثبت شد.`);
        // keep overlay until route changes (no need to set false immediately)
        setIsPlacingOrder(false);
        setPlacingStage('idle');
    };

    const handleCreateOrder = async () => {
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
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload)
            }, SUBMIT_TIMEOUT_MS);

            // ensure min overlay time (prevents "flash")
            await ensureMinDuration(startedAt, MIN_OVERLAY_MS);

            if (res.ok) {
                const data = await res.json();
                await finalizeSuccess(data.order.id, data.newCreditBalance ?? null);
                return;
            } else {
                let errMsg = 'خطایی در ثبت سفارش رخ داد.';
                let errorId: string | undefined;
                try {
                    const errJson = await res.json();
                    errMsg = errJson.message || errMsg;
                    errorId = errJson.errorId;
                } catch { }
                clearPendingOrder();
                setPlacingStage('error');
                setIsPlacingOrder(false);

                toast.error(errorId ? `${errMsg} (کد: ${errorId})` : errMsg);
                return;
            }

        } catch (err) {
            // network/timeout -> verifying
            await ensureMinDuration(startedAt, MIN_OVERLAY_MS);
            setPlacingStage('verifying');

            toast.info('ارتباط با سرور ضعیف است — در حال بررسی وضعیت سفارش...');

            const result = await verifyOrderStatus(clientRequestId, 6);
            if (result.found) {
                await finalizeSuccess(result.order.id, null);
                return;
            }

            // still not found -> user actions
            setPlacingStage('error');
            setIsPlacingOrder(false);
            toast.error('ثبت سفارش نامشخص است. لطفاً تلاش مجدد کنید یا وضعیت را بررسی کنید.');
            // keep pending so user can retry/verify
            return;
        }
    };

    const retryPendingOrder = async () => {
        const pending = getPendingOrder();
        if (!pending?.payload) {
            toast.error('سفارشی برای تلاش مجدد پیدا نشد.');
            return;
        }

        const startedAt = Date.now();
        setIsPlacingOrder(true);
        setPlacingStage('submitting');

        try {
            const res = await fetchWithTimeout(`${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(pending.payload)
            }, SUBMIT_TIMEOUT_MS);

            await ensureMinDuration(startedAt, MIN_OVERLAY_MS);

            if (res.ok) {
                const data = await res.json();
                await finalizeSuccess(data.order.id, data.newCreditBalance ?? null);
            } else {
                let errMsg = 'خطا در ثبت سفارش';
                let errorId: string | undefined;
                try { const errJson = await res.json(); errMsg = errJson.message || errMsg; errorId = errJson.errorId; } catch { }
                setPlacingStage('error');
                setIsPlacingOrder(false);
                toast.error(errorId ? `${errMsg} (کد: ${errorId})` : errMsg);
            }
        } catch {
            await ensureMinDuration(startedAt, MIN_OVERLAY_MS);
            setPlacingStage('error');
            setIsPlacingOrder(false);
            toast.error('ارتباط برقرار نشد. دوباره تلاش کنید.');
        }
    };

    const manualVerify = async () => {
        const pending = getPendingOrder();
        if (!pending?.clientRequestId) {
            toast.error('سفارشی برای بررسی وجود ندارد.');
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
            toast.error('هنوز سفارشی پیدا نشد. می‌توانید دوباره تلاش کنید.');
        }
    };

    // --- Overlay UI ----------------------------------------------
    const renderOverlay = () => {
        if (!isPlacingOrder) return null;

        let title = '';
        let sub = '';
        if (placingStage === 'submitting') {
            title = 'در حال ثبت سفارش...';
            sub = 'لطفاً چند لحظه صبر کنید.';
        } else if (placingStage === 'verifying') {
            title = 'در حال بررسی وضعیت سفارش...';
            sub = 'ارتباط ضعیف است؛ داریم وضعیت را از سرور بررسی می‌کنیم.';
        } else if (placingStage === 'done') {
            title = 'سفارش ثبت شد ✅';
            sub = 'در حال انتقال به صفحه فاکتور...';
        } else if (placingStage === 'error') {
            title = 'مشکل در ثبت سفارش';
            sub = 'می‌توانید تلاش مجدد کنید یا وضعیت سفارش را بررسی کنید.';
        }

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                <div className="w-full max-w-md bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6 text-white text-center">
                    <div className="flex items-center justify-center mb-4">
                        {(placingStage === 'submitting' || placingStage === 'verifying') && (
                            <Loader2 className="h-8 w-8 animate-spin" />
                        )}
                    </div>

                    <h3 className="text-lg font-semibold mb-2">{title}</h3>
                    <p className="text-sm text-white/70 mb-4">{sub}</p>

                    {placingStage === 'error' && (
                        <div className="flex gap-2 justify-center flex-wrap">
                            <Button onClick={retryPendingOrder} className="bg-[#D63A4F]">تلاش مجدد</Button>
                            <Button variant="outline" onClick={manualVerify}>بررسی وضعیت</Button>
                            <Button variant="ghost" onClick={() => { setIsPlacingOrder(false); setPlacingStage('idle'); }}>
                                بستن
                            </Button>
                        </div>
                    )}

                    {(placingStage === 'submitting') && (
                        <p className="text-xs text-white/60">
                            اگر این مرحله طولانی شد، ممکن است اینترنت شما ضعیف باشد.
                        </p>
                    )}
                </div>
            </div>
        );
    };

    // --- Checkout (guest vs logged in) ----------------------------
    const handleCheckout = async () => {
        // اگر کاربر در حال سفارش است، دوباره شروع نکن
        if (isPlacingOrder) return;

        // logged in users — proceed directly
        if (user) {
            await handleCreateOrder();
            return;
        }

        // guest — check location
        setIsPlacingOrder(true);
        setPlacingStage('submitting');

        if (!navigator.geolocation) {
            toast.error("مرورگر شما از موقعیت‌یابی پشتیبانی نمی‌کند. لطفا وارد شوید.");
            setIsPlacingOrder(false);
            setPlacingStage('idle');
            return;
        }

        toast.info("برای ثبت سفارش مهمان، موقعیت مکانی شما بررسی می‌شود...");
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const distance = getDistanceInMeters(
                    position.coords.latitude, position.coords.longitude,
                    ORGANIZATION_LAT, ORGANIZATION_LON
                );

                if (distance <= ALLOWED_RADIUS_METERS) {
                    await handleCreateOrder();
                } else {
                    toast.error("شما خارج از محدوده سازمان هستید. برای ثبت سفارش لطفا وارد حساب کاربری خود شوید.");
                    setTimeout(() => router.push('/login'), 1000);
                    setIsPlacingOrder(false);
                    setPlacingStage('idle');
                }
            },
            () => {
                toast.error("دسترسی به موقعیت مکانی رد شد. شما به صفحه ورود منتقل می‌شوید.");
                setTimeout(() => router.push('/login'), 2000);
                setIsPlacingOrder(false);
                setPlacingStage('idle');
            }
        );
    };

    // --- Render ---------------------------------------------------
    return (
        <>
            {renderOverlay()}

            <div className="container mx-auto p-4 sm:p-6">
                <h1 className="text-2xl font-bold text-white my-4">سبد خرید شما</h1>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    <div className="lg:col-span-2 space-y-3">
                        {cart.map((item) => (
                            <CartItem key={item.id} item={item} />
                        ))}
                    </div>

                    <div className="lg:col-span-1 bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-3 sm:p-4 sticky top-20 text-white text-sm">
                        <h2 className="text-base font-semibold mb-3">خلاصه سفارش</h2>

                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-white/70">جمع کل</span>
                                <span className="font-bold">{total.toLocaleString()} لبخند</span>
                            </div>

                            {user && (
                                <div className="flex justify-between text-white/70">
                                    <span>اعتبار شما</span>
                                    <span className="font-medium">{user.creditBalance.toLocaleString()} لبخند</span>
                                </div>
                            )}
                        </div>

                        <Separator className="my-2 bg-white/20" />

                        <div className="space-y-2 mb-2">
                            <Label htmlFor="floor" className="text-white/80">طبقه تحویل</Label>
                            <Select value={selectedFloorId.toString()} onValueChange={setSelectedFloorId} dir="rtl">
                                <SelectTrigger className={glassInputStyle}>
                                    <SelectValue placeholder="یک طبقه را انتخاب کنید..." />
                                </SelectTrigger>
                                <SelectContent className='bg-white/5 backdrop-blur-lg border border-white/20 text-white'>
                                    {floors.map(floor => (
                                        <SelectItem key={floor.id} value={floor.id.toString()}>{floor.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2 mt-4">
                            <Label htmlFor="orderDescription" className="text-white/80">
                                توضیحات اضافی سفارش <span className="text-white/50 text-xs">(اختیاری)</span>
                            </Label>
                            <textarea
                                id="orderDescription"
                                placeholder="مثال: بدون شکر، شات اضافی، روی شیر بادام، خیلی داغ باشه..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={4}
                                className="w-full rounded-lg bg-white/10 border border-white/20 px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/50 resize-none text-sm"
                                maxLength={300}
                            />
                            <p className="text-xs text-white/50 text-right">{description.length}/300</p>
                        </div>

                        <Button
                            onClick={handleCheckout}
                            disabled={isPlacingOrder || !selectedFloorId}
                            size="sm"
                            className="w-full mt-6 bg-[#D63A4F] text-white hover:bg-red-700 disabled:opacity-50"
                        >
                            {isPlacingOrder ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    در حال پردازش...
                                </>
                            ) : (
                                'تایید و ثبت نهایی سفارش'
                            )}
                        </Button>

                        <Button
                            variant="outline"
                            className="w-full mt-2 text-white border-white/20 hover:bg-white/10 flex items-center justify-center gap-2"
                            onClick={() => router.push('/')}
                        >
                            <ShoppingCart className="h-4 w-4" />
                            ادامه خرید
                        </Button>

                        {getPendingOrder() && !isPlacingOrder && (
                            <div className="mt-3 text-xs text-white/70">
                                <p>یک سفارش قبلاً ارسال شده و وضعیتش نامشخص است.</p>
                                <div className="flex gap-2 mt-2">
                                    <Button size="sm" onClick={manualVerify}>بررسی وضعیت</Button>
                                    <Button size="sm" variant="outline" onClick={retryPendingOrder}>تلاش مجدد</Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
