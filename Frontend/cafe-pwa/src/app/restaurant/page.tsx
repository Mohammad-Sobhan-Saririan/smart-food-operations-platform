"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, ArrowLeft, ArrowRight, Plus, Minus, User, Lock, RefreshCw, UserCheck, ChevronDown, Users, Building2 } from "lucide-react";
import jalaali from "jalaali-js";
import { motion, AnimatePresence } from "framer-motion";
import { getPersianWeekOfMonth } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { useRouter, usePathname } from "next/navigation";
import LoadingScreen from "@/components/LoadingScreen";

// ---------- Helpers (دقیقاً کدهای خودتان) ----------
const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

interface Company { id: number; name: string; }
interface AvailableAccount { id: string; name: string; isMe: boolean; }
interface ApiMenuOption { dayOfWeek: number; isActive: boolean; mealTypeId: number; mealTypeName: string; dishId: number; dishName: string; }
interface ApiEntitlement { dayOfWeek: number; mealTypeId: number; dishCount: number; }

const getWeekStartDate = (date: Date): Date => {
    const d = new Date(date.setHours(0, 0, 0, 0));
    const day = d.getDay();
    const diff = day === 6 ? 0 : day + 1;
    d.setDate(d.getDate() - diff);
    return d;
};
const getDateForDay = (weekStart: Date, dayIndex: number): Date => {
    const date = new Date(weekStart);
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + dayIndex);
    return date;
};
const daysOfWeek = [{ index: 0, name: "شنبه" }, { index: 1, name: "یکشنبه" }, { index: 2, name: "دوشنبه" }, { index: 3, name: "سه‌شنبه" }, { index: 4, name: "چهارشنبه" }, { index: 5, name: "پنج‌شنبه" }, { index: 6, name: "جمعه" }];
const buildKey = (dateISO: string, mealTypeId: number, dishId: number) => `${dateISO}|${mealTypeId}|${dishId}`;
const parseKey = (key: string) => {
    const [dateISO, mealTypeIdStr, dishIdStr] = key.split("|");
    return { dateISO, mealTypeId: Number(mealTypeIdStr), dishId: Number(dishIdStr) };
};
const toJalaliStr = (gDateISO: string) => {
    const [gy, gm, gd] = gDateISO.split("-").map(Number);
    const j = jalaali.toJalaali(gy, gm, gd);
    return `${j.jy}-${String(j.jm).padStart(2, "0")}-${String(j.jd).padStart(2, "0")}`;
};
const isEqualRecord = (a: Record<string, number>, b: Record<string, number>) => {
    const aKeys = Object.keys(a); const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    for (const k of aKeys) if (a[k] !== b[k]) return false;
    return true;
};
function getPersianMonthName(month: number): string {
    const months = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
    return months[month - 1] || "";
}

// ---------- Component ----------
export default function FoodReservationPage() {
    const [currentWeek, setCurrentWeek] = useState(getWeekStartDate(new Date()));
    const [menu, setMenu] = useState<ApiMenuOption[]>([]);
    const [entitlements, setEntitlements] = useState<ApiEntitlement[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // --- States for Dropdowns ---
    const [companies, setCompanies] = useState<Company[]>([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
    const [selectedCompanyName, setSelectedCompanyName] = useState<string>(""); // برای نمایش در صورت نیاز
    const [availableAccounts, setAvailableAccounts] = useState<AvailableAccount[]>([]);
    const [targetUserId, setTargetUserId] = useState<string | null>(null);

    // --- Logic States ---
    const [currentPriority, setCurrentPriority] = useState<number>(0);
    const [proxyInfos, setProxyInfos] = useState<Record<string, { name: string, priority: number }>>({});
    const [lockedMeals, setLockedMeals] = useState<Record<string, string>>({});
    const [initialDishQuantities, setInitialDishQuantities] = useState<Record<string, number>>({});
    const [dishQuantities, setDishQuantities] = useState<Record<string, number>>({});

    // --- Auth & Loader ---
    const { user, authChecked } = useAuthStore();
    const [showLoader, setShowLoader] = useState(true);
    const [done, setDone] = useState(false);
    const [message, setMessage] = useState("در حال بررسی ورود...");
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => { if (authChecked) setDone(true); }, [authChecked]);
    useEffect(() => {
        if (!authChecked) setMessage("در حال بررسی ورود...");
        else if (!user) setMessage("در حال هدایت...");
        else setMessage("در حال بارگذاری...");
    }, [authChecked, user]);

    // 1. Load Initial Lists (Companies & Accounts)
    useEffect(() => {
        if (!authChecked || !user) return;
        const init = async () => {
            try {
                const [compRes, bossRes] = await Promise.all([
                    fetch(`${API_URL}/api/restaurant/rst_companies`, { credentials: "include" }),
                    fetch(`${API_URL}/api/restaurant/my-bosses`, { credentials: "include" })
                ]);
                const compData = await compRes.json();
                const bossData = await bossRes.json();

                setCompanies(compData || []);
                setAvailableAccounts([
                    { id: user.id, name: `خودم (${user.name})`, isMe: true },
                    ...bossData.map((b: any) => ({ id: b.id, name: b.name, isMe: false }))
                ]);

                const storedComp = sessionStorage.getItem('rst_selectedCompanyId');
                const storedCompName = sessionStorage.getItem('rst_selectedCompanyName');
                const storedTarget = sessionStorage.getItem('rst_targetUserId');

                if (storedComp) setSelectedCompanyId(Number(storedComp));
                else if (compData.length > 0) setSelectedCompanyId(compData[0].id);

                if (storedCompName) setSelectedCompanyName(storedCompName);

                setTargetUserId(storedTarget || user.id);
            } catch (e) { console.error(e); }
        };
        init();
    }, [authChecked, user]);

    // 2. Fetch Logic (Updated with targetUserId)
    const fetchEverything = useCallback(async () => {
        if (!selectedCompanyId || !targetUserId) return;
        setLoading(true);
        try {
            const weekStart = getWeekStartDate(currentWeek);
            const { jy, jm, jd } = jalaali.toJalaali(weekStart);
            const weekStartJalali = `${jy}-${String(jm).padStart(2, "0")}-${String(jd).padStart(2, "0")}`;

            const [menuRes, resRes] = await Promise.all([
                fetch(`${API_URL}/api/restaurant/menu?date=${weekStartJalali}&companyId=${selectedCompanyId}&targetUserId=${targetUserId}`, { credentials: "include" }),
                fetch(`${API_URL}/api/restaurant/reservations?weekStartDate=${weekStartJalali}&targetUserId=${targetUserId}`, { credentials: "include" })
            ]);

            const menuData = await menuRes.json();
            const resData = await resRes.json();

            setMenu(menuData.menu || []);
            setEntitlements(menuData.entitlements || []);
            setCurrentPriority(menuData.currentPriority || 0);

            const restored: Record<string, number> = {};
            const locked: Record<string, string> = {};
            const proxies: Record<string, { name: string, priority: number }> = {};

            resData.forEach((r: any) => {
                const proxyKey = `${r.date}|${r.mealTypeId}`;
                proxies[proxyKey] = {
                    name: r.proxyUserName || "خودِ کاربر",
                    priority: r.savedWithPriority ?? 0
                };

                if (r.companyId && r.companyId !== selectedCompanyId) {
                    locked[proxyKey] = companies.find(c => c.id === r.companyId)?.name || `شرکت ${r.companyId}`;
                    return;
                }
                JSON.parse(r.chosenDishIds || "[]").forEach((d: any) => {
                    restored[buildKey(r.date, r.mealTypeId, d.id)] = d.quantity;
                });
            });

            setInitialDishQuantities(restored);
            setDishQuantities(restored);
            setLockedMeals(locked);
            setProxyInfos(proxies);
        } catch (e) { toast.error("خطا در دریافت اطلاعات"); }
        finally { setLoading(false); }
    }, [currentWeek, selectedCompanyId, targetUserId, companies]);

    useEffect(() => { fetchEverything(); }, [fetchEverything]);

    // Handlers
    const handleAccountSwitch = (newUserId: string) => {
        setTargetUserId(newUserId);
        sessionStorage.setItem('rst_targetUserId', newUserId);
    };
    const handleCompanyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = Number(e.target.value);
        setSelectedCompanyId(id);
        sessionStorage.setItem('rst_selectedCompanyId', id.toString());
        // آپدیت نام شرکت برای نمایش (اختیاری)
        const name = companies.find(c => c.id === id)?.name || "";
        setSelectedCompanyName(name);
        sessionStorage.setItem('rst_selectedCompanyName', name);
    };

    const handleQuantityChange = (date: Date, mealTypeId: number, dishId: number, newQty: number, limit: number) => {
        const j = jalaali.toJalaali(date);
        const jStr = `${j.jy}-${String(j.jm).padStart(2, "0")}-${String(j.jd).padStart(2, "0")}`;
        const key = buildKey(jStr, mealTypeId, dishId);

        // Priority Check Logic
        const pInfo = proxyInfos[`${jStr}|${mealTypeId}`];
        if (pInfo && pInfo.priority < currentPriority) {
            toast.error("توسط مقام بالاتر قفل شده است");
            return;
        }

        const total = Object.entries(dishQuantities).reduce((sum, [k, c]) => {
            const [d, m] = k.split("|");
            return (d === jStr && Number(m) === mealTypeId) ? sum + c : sum;
        }, 0);
        const current = dishQuantities[key] || 0;
        if (newQty > limit - (total - current)) {
            toast.warning(`حداکثر ${limit} عدد مجاز است`);
            return;
        }

        const upd = { ...dishQuantities };
        if (newQty <= 0) delete upd[key]; else upd[key] = newQty;
        setDishQuantities(upd);
    };

    const handleSave = async () => {
        if (isEqualRecord(dishQuantities, initialDishQuantities)) return toast.info("تغییری داده نشده");
        setIsSaving(true);
        try {
            const selected = Object.entries(dishQuantities).map(([k, v]) => {
                const { dateISO, mealTypeId, dishId } = parseKey(k);
                return { date: dateISO, mealTypeId, dishId, quantity: v };
            });
            const ws = getWeekStartDate(currentWeek);
            const { jy, jm, jd } = jalaali.toJalaali(ws);
            const wsJ = `${jy}-${String(jm).padStart(2, "0")}-${String(jd).padStart(2, "0")}`;
            const res = await fetch(`${API_URL}/api/restaurant/reserve`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    weekStartDate: wsJ, reservations: selected,
                    userRSTCompany: selectedCompanyId, targetUserId
                }),
            });
            if (!res.ok) {
                const err = await res.json();
                if (res.status === 403 && err.type === "cutoff_exceeded") throw new Error(`${err.message}: ${err.date}`);
                throw new Error(err.message || "خطا در ذخیره");
            }
            toast.success("ثبت شد ✅");
            fetchEverything();
        } catch (e: any) { toast.error(e.message); }
        finally { setIsSaving(false); }
    };

    const changeWeek = (dir: "next" | "prev") => {
        setCurrentWeek((prev) => {
            const newDate = new Date(prev);
            newDate.setDate(newDate.getDate() + (dir === "next" ? 7 : -7));
            return newDate;
        });
    };

    if (showLoader) return <LoadingScreen minDuration={1000} done={done} message={message} onFinish={() => !user ? router.replace(`/login?redirect=${pathname}`) : setShowLoader(false)} />;

    const mealTypes = Array.from(new Set(menu.map(m => m.mealTypeId))).map(id => ({ id, name: menu.find(m => m.mealTypeId === id)?.mealTypeName }));
    const hasAnyFood = menu.length > 0;

    return (
        <div style={{ direction: "rtl" }} className="px-4 sm:px-8 py-8 min-h-screen bg-gradient-to-br from-[#04245f] via-[#4338ca] to-[#04245f] text-white">

            {/* 🟢 HEADER WITH DUAL DROPDOWNS (New Part) */}
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center mb-6 gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-md shadow-lg">

                {/* 1. Account Dropdown */}
                <div className="flex items-center gap-3 w-full md:w-auto bg-black/20 p-2 pr-3 pl-2 rounded-xl border border-white/5">
                    <div className="p-2 bg-indigo-500/20 rounded-lg hidden sm:block"><Users className="w-5 h-5 text-indigo-300" /></div>
                    <div className="flex-1 md:w-64 relative">
                        <p className="text-[10px] text-white/40 mb-1 px-1">رزرو غذا برای:</p>
                        <div className="relative">
                            <select
                                value={targetUserId || ""}
                                onChange={(e) => handleAccountSwitch(e.target.value)}
                                className="w-full bg-transparent border-none text-white font-bold text-sm focus:ring-0 cursor-pointer appearance-none pl-2 py-1"
                            >
                                {availableAccounts.map(acc => (
                                    <option key={acc.id} value={acc.id} className="bg-[#0b1220] text-white py-2">{acc.name}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* 2. Company Dropdown */}
                <div className="flex items-center gap-3 w-full md:w-auto bg-black/20 p-2 pr-3 pl-2 rounded-xl border border-white/5">
                    <div className="p-2 bg-emerald-500/20 rounded-lg hidden sm:block"><Building2 className="w-5 h-5 text-emerald-300" /></div>
                    <div className="flex-1 md:w-64 relative">
                        <p className="text-[10px] text-white/40 mb-1 px-1">شرکت / ساختمان:</p>
                        <div className="relative">
                            <select
                                value={selectedCompanyId || ""}
                                onChange={handleCompanyChange}
                                className="w-full bg-transparent border-none text-white font-bold text-sm focus:ring-0 cursor-pointer appearance-none pl-2 py-1"
                            >
                                {companies.map(comp => (
                                    <option key={comp.id} value={comp.id} className="bg-[#0b1220] text-white py-2">{comp.name}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                        </div>
                    </div>
                </div>
            </div>

            <h1 className="text-3xl font-bold my-6 text-center text-white drop-shadow-lg">رزرو غذای هفتگی</h1>

            {/* 🟢 ORIGINAL CARD UI (Restored) */}
            <Card className="bg-white/10 backdrop-blur-lg border border-white/20 text-white rounded-3xl shadow-2xl pt-0">
                <CardHeader style={{
                    backgroundColor: "#ff2b2bff",
                    borderTopLeftRadius: "1.5rem",
                    borderTopRightRadius: "1.5rem",
                    paddingTop: "0.8rem",
                    paddingBottom: "0.4rem",
                    borderBottom: "4px solid #570404ff",
                }}>
                    <div className="flex justify-between items-center gap-2" >
                        <Button variant="ghost" onClick={() => changeWeek("prev")} className="hover:bg-white/10 text-white">
                            <ArrowRight className="ml-2" /> هفته قبل
                        </Button>
                        <CardTitle className="text-xl sm:text-2xl text-center">
                            {getPersianWeekOfMonth(currentWeek)}
                        </CardTitle>
                        <Button variant="ghost" onClick={() => changeWeek("next")} className="hover:bg-white/10 text-white">
                            هفته بعد <ArrowLeft className="mr-2" />
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="p-6 space-y-12">
                    {loading ? (
                        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-white" /></div>
                    ) : !hasAnyFood ? (
                        <div className="text-center py-16 text-white/70 text-lg font-medium">برای این هفته هیچ غذایی تعریف نشده است 🍽️</div>
                    ) : (
                        mealTypes.map((meal) => (
                            <section key={meal.id}>
                                <h2 className="text-2xl font-bold mb-6 border-r-4 border-[#D63A4F] pr-4">{meal.name}</h2>
                                <motion.div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                                    {daysOfWeek.map((day) => {
                                        const dishes = menu.filter((m) => m.dayOfWeek === day.index && m.mealTypeId === meal.id);
                                        const date = getDateForDay(currentWeek, day.index);
                                        const jDate = jalaali.toJalaali(date);
                                        const jalaliDate = `${jDate.jd} ${getPersianMonthName(jDate.jm)} ${jDate.jy}`;
                                        const jalaliDateStr = `${jDate.jy}-${String(jDate.jm).padStart(2, "0")}-${String(jDate.jd).padStart(2, "0")}`;
                                        const entitlement = entitlements.find((e) => e.dayOfWeek === day.index && e.mealTypeId === meal.id);
                                        const lockKey = `${jalaliDateStr}|${meal.id}`;
                                        const lockedCompanyName = lockedMeals[lockKey];

                                        // 🟢 Logic Injection: Priority Check
                                        const proxyInfo = proxyInfos[lockKey];
                                        const isLockedByPriority = proxyInfo && proxyInfo.priority < currentPriority;

                                        return (
                                            <motion.div key={`${meal.id}-${day.index}`} className={`rounded-3xl p-4 border transition-all ${lockedCompanyName ? "bg-gray-700/40 border-gray-500/40 opacity-70 cursor-not-allowed" : "bg-white/5 border-white/10 hover:bg-white/10"}`} whileHover={{ scale: 1.02 }}>

                                                <div className="flex flex-col gap-2 mb-3 text-center items-center justify-center">
                                                    <h3 className="font-bold text-lg">{day.name}</h3>
                                                    {lockedCompanyName ? (
                                                        <div className="flex flex-col items-center justify-center text-center py-8 px-3 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-sm">
                                                            <div className="flex items-center gap-2 mb-1 text-white/70"><span className="text-sm text-white/80">این وعده غذایی در </span></div>
                                                            <p className="text-base font-semibold text-white py-2">{lockedCompanyName}</p>
                                                            <div className="flex items-center gap-2 mb-2 text-white/70"><span className="text-sm text-white/80">رزرو شده است.</span></div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col gap-1 mb-1"><p className="text-xs text-white/70">{jalaliDate}</p></div>
                                                    )}
                                                </div>

                                                {!lockedCompanyName && (
                                                    <>
                                                        <div className="flex flex-col gap-1 mb-3">
                                                            {entitlement && dishes.length > 0 && <p className="text-xs text-white/50">حداکثر {entitlement.dishCount} سفارش</p>}
                                                        </div>

                                                        {dishes.length === 0 && <div className="flex flex-col items-center justify-center py-6 text-white/70 text-sm font-medium rounded-lg">غذایی برای این وعده تعریف نشده است</div>}

                                                        {dishes.map((dish) => {
                                                            const key = buildKey(jalaliDateStr, meal.id, dish.dishId);
                                                            const currentQty = dishQuantities[key] || 0;
                                                            const initialQty = initialDishQuantities[key] || 0;
                                                            const isActive = currentQty > 0;
                                                            const wasInDB = initialDishQuantities.hasOwnProperty(key);
                                                            const isChanged = currentQty !== initialQty;

                                                            let bgClass = "bg-white/5 border-white/10 hover:bg-white/15";
                                                            if (wasInDB && !isChanged && isActive) bgClass = "bg-emerald-500/20 border-emerald-400/50";
                                                            else if (isChanged && isActive) bgClass = "bg-[#D63A4F]/25 border-[#D63A4F]/50 ring-2 ring-red-400/60";
                                                            else if (wasInDB && !isActive && initialQty > 0) bgClass = "bg-[#D63A4F]/20 border-[#D63A4F]/40 opacity-60 ring-1 ring-red-300/40";

                                                            return (
                                                                <motion.div key={dish.dishId} className={`group p-4 rounded-xl border relative cursor-pointer transition-all mt-2 ${bgClass}`} whileTap={{ scale: 0.97 }}
                                                                    onClick={() => { if (currentQty === 0 && !isLockedByPriority) handleQuantityChange(date, meal.id, dish.dishId, 1, entitlement?.dishCount || 1); }}>
                                                                    <div className="flex flex-row md:flex-col md:items-start justify-between md:justify-start gap-2 md:gap-3">
                                                                        <span className="text-sm font-medium leading-snug line-clamp-2">{dish.dishName}</span>
                                                                        <div className="flex items-center gap-0 md:w-full transition-all md:justify-center">
                                                                            <AnimatePresence>
                                                                                {isActive && (
                                                                                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.2 }} className="flex items-center gap-0 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1 transition-all md:opacity-0 md:translate-y-2 md:group-hover:opacity-100 md:group-hover:translate-y-0" onClick={(e) => e.stopPropagation()}>
                                                                                        <Button size="icon" variant="ghost" className="h-6 w-6 sm:h-7 sm:w-7 md:h-6 md:w-6 text-white/80 hover:text-white" disabled={isLockedByPriority} onClick={() => handleQuantityChange(date, meal.id, dish.dishId, currentQty - 1, entitlement?.dishCount || 1)}><Minus size={14} /></Button>
                                                                                        <motion.span key={currentQty} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-6 text-center font-semibold text-base select-none">{currentQty}</motion.span>
                                                                                        <Button size="icon" variant="ghost" className="h-6 w-6 sm:h-7 sm:w-7 md:h-6 md:w-6 text-white/80 hover:text-white" disabled={isLockedByPriority} onClick={() => handleQuantityChange(date, meal.id, dish.dishId, currentQty + 1, entitlement?.dishCount || 1)}><Plus size={14} /></Button>
                                                                                    </motion.div>
                                                                                )}
                                                                            </AnimatePresence>
                                                                        </div>
                                                                    </div>
                                                                </motion.div>
                                                            );
                                                        })}

                                                        {/* 🟢 Logic Injection: Registered By */}
                                                        {proxyInfo && (
                                                            <div className="mt-3 pt-2 border-t border-white/10 flex flex-col gap-1">
                                                                <div className="flex items-center gap-2 text-[10px] text-white/50">
                                                                    <UserCheck className="w-3 h-3 text-emerald-400" />
                                                                    <span>ثبت شده توسط: </span>
                                                                    <span className="text-emerald-300 font-medium">{proxyInfo.name}</span>
                                                                </div>
                                                                {isLockedByPriority && <div className="flex items-center gap-1 text-[9px] text-red-400 mt-1"><Lock className="w-3 h-3" /><span>قفل شده (اولویت بالاتر)</span></div>}
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </motion.div>
                                        );
                                    })}
                                </motion.div>
                            </section>
                        ))
                    )}
                    {hasAnyFood && (
                        <div className="flex justify-end pt-8">
                            <Button onClick={handleSave} disabled={isSaving} className="bg-gradient-to-r from-[#D63A4F] to-red-600 hover:opacity-90 text-lg px-8 py-5 rounded-xl shadow-lg transition-all disabled:opacity-50">
                                {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />در حال ذخیره رزرو...</> : "ذخیره رزروها"}
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}