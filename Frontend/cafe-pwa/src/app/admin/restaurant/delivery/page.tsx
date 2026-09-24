"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import jalaali from "jalaali-js";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Loader2,
    ChevronRight,
    ChevronLeft,
    Search,
    CheckCircle2,
    XCircle,
    RotateCcw,
    UtensilsCrossed,
    Lock,
} from "lucide-react";
import {
    Select,
    SelectTrigger,
    SelectContent,
    SelectValue,
    SelectItem,
} from "@/components/ui/select";
import { toast } from "sonner"; // ـــ فقط برای موفقیت؛ برای خطا استفاده نمی‌کنیم.

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
const HOME_ROUTE = "/";

const STATUS = {
    RESERVED: 1,
    CONFIRMED: 2,
    CANCELED: 3,
    NO_SHOW: 4,
    DELIVERED: 5,
} as const;

type ReservationRow = {
    id: number;
    date: string; // YYYY-MM-DD (Jalali)
    mealTypeId: number;
    mealType: string;
    statusId: number;
    status: string;
    companyId: number;
    company: string;
    userName: string;
    chosenDishes: { id: number; name: string; imageUrl: string; quantity: number }[];
};

type MetaData = {
    mealTypes: { id: number; DisplayName: string }[];
    statuses: { id: number; nameFA: string }[];
    companies: { id: number; name: string }[];
};

const DAYS = [
    { idx: 0, name: "شنبه" },
    { idx: 1, name: "یکشنبه" },
    { idx: 2, name: "دوشنبه" },
    { idx: 3, name: "سه‌شنبه" },
    { idx: 4, name: "چهارشنبه" },
    { idx: 5, name: "پنج‌شنبه" },
    { idx: 6, name: "جمعه" },
];

// ----- Jalali helpers -----
function jalaliAddDays(jDateStr: string, days: number) {
    const [jy, jm, jd] = jDateStr.split("-").map(Number);
    const g = jalaali.toGregorian(jy, jm, jd);
    const date = new Date(Date.UTC(g.gy, g.gm - 1, g.gd));
    date.setUTCDate(date.getUTCDate() + days);
    const j = jalaali.toJalaali(
        date.getUTCFullYear(),
        date.getUTCMonth() + 1,
        date.getUTCDate()
    );
    return `${j.jy}-${String(j.jm).padStart(2, "0")}-${String(j.jd).padStart(2, "0")}`;
}

function getCurrentWeekStartJalali() {
    const now = new Date();
    const day = now.getDay();
    const diff = day === 6 ? 0 : day + 1;
    const start = new Date(now);
    start.setHours(12, 0, 0, 0);
    start.setDate(start.getDate() - diff);
    const j = jalaali.toJalaali(start);
    return `${j.jy}-${String(j.jm).padStart(2, "0")}-${String(j.jd).padStart(2, "0")}`;
}

export default function DeliveryPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // هفته و روز
    const [weekStart, setWeekStart] = useState<string>(getCurrentWeekStartJalali());
    const [activeDay, setActiveDay] = useState<number>(0);

    // فیلترها
    const [search, setSearch] = useState("");
    const [companyId, setCompanyId] = useState<string>("all");
    const [statusId, setStatusId] = useState<string>("all");
    const [mealTypeId, setMealTypeId] = useState<string>("all");

    // دیتا
    const [weekRows, setWeekRows] = useState<ReservationRow[]>([]);
    const [meta, setMeta] = useState<MetaData | null>(null);
    const [loading, setLoading] = useState(false);

    // حالت قفل
    const [locked, setLocked] = useState(false);

    // کنترل نمایش/عدم نمایش کل صفحه
    const [initialLoading, setInitialLoading] = useState(true);
    const [fatal, setFatal] = useState(false);

    // جلوگیری از setState بعد از unmount
    const mountedRef = useRef(true);
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    // set current day (شنبه=0)
    useEffect(() => {
        const now = new Date();
        const day = now.getDay();
        const diff = day === 6 ? 0 : day + 1;
        setActiveDay(diff);
    }, []);

    // خواندن querystring برای قفل و مقداردهی اولیه فیلترها
    useEffect(() => {
        const lockParam = searchParams.get("lock");
        const dayParam = searchParams.get("day");
        const cParam = searchParams.get("companyId");
        const sParam = searchParams.get("statusId");
        const mParam = searchParams.get("mealTypeId");
        const weekParam = searchParams.get("weekStart");

        if (weekParam) setWeekStart(weekParam);
        if (dayParam && !Number.isNaN(Number(dayParam))) {
            const d = Number(dayParam);
            if (d >= 0 && d <= 6) setActiveDay(d);
        }
        if (cParam) setCompanyId(cParam);
        if (sParam) setStatusId(sParam);
        if (mParam) setMealTypeId(mParam);

        setLocked(lockParam === "1" || lockParam === "true");
    }, [searchParams]);

    // در صورت fatal، فوراً به خانه برو
    useEffect(() => {
        if (fatal) {
            router.replace(HOME_ROUTE);
        }
    }, [fatal, router]);

    // متادیتا
    const fetchMeta = useCallback(async () => {
        const ac = new AbortController();
        try {
            const lockCode = searchParams.get("lockCode") || "";
            const res = await fetch(
                `${API_URL}/api/admin/restaurant/meta${lockCode ? `?lockCode=${lockCode}` : ""}`,
                { credentials: "include", signal: ac.signal }
            );
            if (!res.ok) throw new Error("meta failed");
            const data = (await res.json()) as MetaData & {
                lock?: { enabled?: boolean; filters?: any };
            };

            // اعتبارسنجی ساختار
            if (
                !data ||
                !Array.isArray(data.mealTypes) ||
                !Array.isArray(data.statuses) ||
                !Array.isArray(data.companies)
            ) {
                throw new Error("invalid meta");
            }

            if (!mountedRef.current) return;
            setMeta(data);

            // اگر بک‌اند lock داده بود، قفل و فیلترها را ست کن
            if (data.lock?.enabled && data.lock.filters) {
                const f = data.lock.filters;
                setLocked(true);
                if (f.weekStart) setWeekStart(f.weekStart);
                if (typeof f.day === "number") setActiveDay(f.day);
                if (f.companyId != null) setCompanyId(String(f.companyId));
                if (f.statusId != null) setStatusId(String(f.statusId));
                if (f.mealTypeId != null) setMealTypeId(String(f.mealTypeId));
            }
        } catch {
            if (!mountedRef.current) return;
            // هیچ toast خطایی نمایش نده؛ فقط ری‌دایرکت
            setFatal(true);
        }
        return () => ac.abort();
    }, [searchParams]);

    // دریافت کل هفته
    const fetchWeekList = useCallback(async () => {
        const ac = new AbortController();
        if (!mountedRef.current) return;
        setLoading(true);
        try {
            const lockCode = searchParams.get("lockCode") || "";
            const params = new URLSearchParams();

            if (lockCode) {
                params.set("lockCode", lockCode);
            } else {
                params.set("weekStartJalali", weekStart);
                if (companyId !== "all") params.set("companyId", companyId);
                if (statusId !== "all") params.set("statusId", statusId);
                if (mealTypeId !== "all") params.set("mealTypeId", mealTypeId);
            }

            const res = await fetch(
                `${API_URL}/api/admin/restaurant/reservations?${params.toString()}`,
                { credentials: "include", signal: ac.signal }
            );
            if (!res.ok) throw new Error("fetch failed");

            const data = await res.json();

            if (data?.lock && data.lock.verified === false) {
                throw new Error("invalid lockCode");
            }
            const allRows: ReservationRow[] = data?.data || [];
            if (!Array.isArray(allRows)) {
                throw new Error("invalid data");
            }

            if (!mountedRef.current) return;
            setWeekRows(allRows);

            // اگر پاسخ شامل lock معتبر بود، فیلترها را از آن ست کن (اختیاری)
            if (data.lock?.verified && data.lock.filters) {
                const f = data.lock.filters;
                setLocked(true);
                if (f.weekStart) setWeekStart(f.weekStart);
                if (typeof f.day === "number") setActiveDay(f.day);
                if (f.companyId != null) setCompanyId(String(f.companyId));
                if (f.statusId != null) setStatusId(String(f.statusId));
                if (f.mealTypeId != null) setMealTypeId(String(f.mealTypeId));
            }
        } catch {
            if (!mountedRef.current) return;
            setFatal(true);
        } finally {
            if (!mountedRef.current) return;
            setLoading(false);
            setInitialLoading(false);
        }
        return () => ac.abort();
    }, [weekStart, companyId, statusId, mealTypeId, searchParams]);

    // بارگیری اولیه
    useEffect(() => {
        (async () => {
            await fetchMeta();
            if (mountedRef.current) await fetchWeekList();
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchMeta, fetchWeekList]);

    // تاریخ فعال
    const activeDate = useMemo(
        () => jalaliAddDays(weekStart, activeDay),
        [weekStart, activeDay]
    );

    // فیلتر سطح-هفته (برای شمارنده‌ها و لیست روز)
    const weekFiltered = useMemo(() => {
        return weekRows.filter((r) => {
            if (companyId !== "all" && String(r.companyId) !== companyId) return false;
            if (statusId !== "all" && String(r.statusId) !== statusId) return false;
            if (mealTypeId !== "all" && String(r.mealTypeId) !== mealTypeId) return false;
            return true;
        });
    }, [weekRows, companyId, statusId, mealTypeId]);

    // شمارنده‌ی تحویل‌نشده برای هر روز
    const pendingCountByDay = useMemo(() => {
        const map = new Map<number, number>();
        for (let i = 0; i < 7; i++) {
            const date = jalaliAddDays(weekStart, i);
            const count = weekFiltered.filter(
                (r) =>
                    r.date === date &&
                    !(r.statusId === STATUS.DELIVERED || r.statusId === STATUS.NO_SHOW)
            ).length;
            map.set(i, count);
        }
        return map;
    }, [weekFiltered, weekStart]);

    // شمارنده‌های دراپ‌داون‌ها برای روز فعال
    const countsForCompaniesOnActiveDay = useMemo(() => {
        const map = new Map<number, number>();
        const base = weekRows.filter((r) => {
            if (r.date !== activeDate) return false;
            if (statusId !== "all" && String(r.statusId) !== statusId) return false;
            if (mealTypeId !== "all" && String(r.mealTypeId) !== mealTypeId) return false;
            return true;
        });
        base.forEach((r) => map.set(r.companyId, (map.get(r.companyId) || 0) + 1));
        return map;
    }, [weekRows, activeDate, statusId, mealTypeId]);

    const countsForStatusesOnActiveDay = useMemo(() => {
        const map = new Map<number, number>();
        const base = weekRows.filter((r) => {
            if (r.date !== activeDate) return false;
            if (companyId !== "all" && String(r.companyId) !== companyId) return false;
            if (mealTypeId !== "all" && String(r.mealTypeId) !== mealTypeId) return false;
            return true;
        });
        base.forEach((r) => map.set(r.statusId, (map.get(r.statusId) || 0) + 1));
        return map;
    }, [weekRows, activeDate, companyId, mealTypeId]);

    const countsForMealTypesOnActiveDay = useMemo(() => {
        const map = new Map<number, number>();
        const base = weekRows.filter((r) => {
            if (r.date !== activeDate) return false;
            if (companyId !== "all" && String(r.companyId) !== companyId) return false;
            if (statusId !== "all" && String(r.statusId) !== statusId) return false;
            return true;
        });
        base.forEach((r) => map.set(r.mealTypeId, (map.get(r.mealTypeId) || 0) + 1));
        return map;
    }, [weekRows, activeDate, companyId, statusId]);

    // فیلتر نهایی روز فعال + سرچ + مرتب‌سازی
    const filteredRows = useMemo(() => {
        let list = weekFiltered.filter((r) => r.date === activeDate);
        if (search.trim()) list = list.filter((r) => r.userName.includes(search.trim()));
        return list.sort((a, b) => {
            const aDelivered = a.statusId === STATUS.DELIVERED || a.statusId === STATUS.NO_SHOW;
            const bDelivered = b.statusId === STATUS.DELIVERED || b.statusId === STATUS.NO_SHOW;
            return aDelivered === bDelivered ? a.userName.localeCompare(b.userName, "fa") : aDelivered ? 1 : -1;
        });
    }, [weekFiltered, activeDate, search]);

    // ناوبری هفته (در حالت قفل غیرفعال)
    const goPrevWeek = () => {
        if (locked) return;
        setWeekStart((w) => jalaliAddDays(w, -7));
    };
    const goNextWeek = () => {
        if (locked) return;
        setWeekStart((w) => jalaliAddDays(w, +7));
    };

    // تغییر وضعیت
    const mapStatusName = (id: number) =>
        id === 5
            ? "تحویل شد"
            : id === 4
                ? "عدم حضور"
                : id === 1
                    ? "رزرو شده"
                    : id === 2
                        ? "تایید شده"
                        : id === 3
                            ? "لغو شده"
                            : "نامشخص";

    const updateStatus = async (id: number, statusId: number) => {
        try {
            // خوش‌گمانانه
            setWeekRows((prev) =>
                prev.map((r) => (r.id === id ? { ...r, statusId, status: mapStatusName(statusId) } : r))
            );
            const res = await fetch(`${API_URL}/api/admin/restaurant/reservations/${id}/status`, {
                method: "PUT",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ statusId }),
            });
            if (!res.ok) throw new Error();
            // موفقیت → مجازه toast داشته باشیم
            toast.success("وضعیت با موفقیت به‌روزرسانی شد");
        } catch {
            // هر خطای معتبر/دسترسی → کاربر صفحه را نبیند
            setFatal(true);
        }
    };

    const btn = {
        deliver: "bg-emerald-600 hover:bg-emerald-700 text-white",
        noShow: "bg-red-600 hover:bg-red-700 text-white",
        revert: "bg-slate-700 hover:bg-slate-800 text-white",
        soft: "bg-white/10 hover:bg-white/20 text-white",
        muted: "bg-white/5 text-white/60",
    };

    // --- هیچ وقت صفحه را در حالت خطا/ریدایرکت نمایش نده
    if (fatal) return null;

    // --- نمایش لودینگ اولیه (تا وقتی وضعیت مشخص شود)
    if (initialLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-[80vh] text-white/70" dir="rtl">
                <Loader2 className="h-8 w-8 animate-spin mb-2" />
                در حال بارگذاری اطلاعات...
            </div>
        );
    }

    // اگر متادیتا نداریم (مثلاً ریدایرکت در راه است) چیزی نشان نده
    if (!meta) return null;

    return (
        <Card className="bg-white/10 border border-white/20 text-white" dir="rtl">
            <CardHeader className="space-y-4">
                <div className="flex flex-col gap-3">
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
                        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                            <UtensilsCrossed className="h-5 w-5" />
                            ثبت تحویل غذا
                            {locked && (
                                <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-white/10 border border-white/20">
                                    <Lock className="h-3.5 w-3.5" />
                                    فیلترها قفل هستند
                                </span>
                            )}
                        </CardTitle>

                        <div className="flex items-center gap-1">
                            <Button
                                onClick={goPrevWeek}
                                className={`${btn.soft} px-2`}
                                title="هفته قبل"
                                disabled={locked}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                            <div className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-left">
                                شروع هفته: <span className="font-semibold">{weekStart}</span>
                            </div>
                            <Button
                                onClick={goNextWeek}
                                className={`${btn.soft} px-2`}
                                title="هفته بعد"
                                disabled={locked}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* فیلترها */}
                    <div className="flex flex-col lg:flex-row gap-3">
                        {/* شرکت */}
                        <Select
                            value={companyId}
                            onValueChange={(v) => setCompanyId(v)}
                            disabled={locked}
                        >
                            <SelectTrigger className="bg-white/5 border-white/20 text-white w-full lg:w-56">
                                <SelectValue placeholder="شرکت" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#001c4d] text-white border-white/20">
                                <SelectItem value="all">
                                    <div className="flex items-center justify-between w-full">
                                        <span>همه شرکت‌ها</span>
                                        <span className="text-xs opacity-70">
                                            {weekRows.filter((r) => r.date === activeDate).length}
                                        </span>
                                    </div>
                                </SelectItem>
                                {meta?.companies.map((c) => (
                                    <SelectItem key={c.id} value={String(c.id)}>
                                        <div className="flex items-center justify-between w-full">
                                            <span>{c.name}</span>
                                            <span className="text-xs opacity-70">
                                                {countsForCompaniesOnActiveDay.get(c.id) || 0}
                                            </span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* وعده */}
                        <Select
                            value={mealTypeId}
                            onValueChange={(v) => setMealTypeId(v)}
                            disabled={locked}
                        >
                            <SelectTrigger className="bg-white/5 border-white/20 text-white w-full lg:w-40">
                                <SelectValue placeholder="وعده" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#001c4d] text-white border-white/20">
                                <SelectItem value="all">
                                    <div className="flex items-center justify-between w-full">
                                        <span>همه وعده‌ها</span>
                                        <span className="text-xs opacity-70">
                                            {weekRows.filter((r) => r.date === activeDate).length}
                                        </span>
                                    </div>
                                </SelectItem>
                                {meta?.mealTypes.map((m) => (
                                    <SelectItem key={m.id} value={String(m.id)}>
                                        <div className="flex items-center justify-between w-full">
                                            <span>{m.DisplayName}</span>
                                            <span className="text-xs opacity-70">
                                                {countsForMealTypesOnActiveDay.get(m.id) || 0}
                                            </span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* وضعیت */}
                        <Select
                            value={statusId}
                            onValueChange={(v) => setStatusId(v)}
                            disabled={locked}
                        >
                            <SelectTrigger className="bg-white/5 border-white/20 text-white w-full lg:w-56">
                                <SelectValue placeholder="وضعیت" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#001c4d] text-white border-white/20">
                                <SelectItem value="all">
                                    <div className="flex items-center justify-between w-full">
                                        <span>همه وضعیت‌ها</span>
                                        <span className="text-xs opacity-70">
                                            {weekRows.filter((r) => r.date === activeDate).length}
                                        </span>
                                    </div>
                                </SelectItem>
                                {meta?.statuses.map((s) => (
                                    <SelectItem key={s.id} value={String(s.id)}>
                                        <div className="flex items-center justify-between w-full">
                                            <span>{s.nameFA}</span>
                                            <span className="text-xs opacity-70">
                                                {countsForStatusesOnActiveDay.get(s.id) || 0}
                                            </span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* روزهای هفته (دسکتاپ) */}
                    <div className="hidden lg:grid grid-cols-7 gap-2 text-sm">
                        {DAYS.map((d) => {
                            const active = activeDay === d.idx;
                            const count = pendingCountByDay.get(d.idx) || 0;
                            return (
                                <Button
                                    key={d.idx}
                                    onClick={() => !locked && setActiveDay(d.idx)}
                                    variant="ghost"
                                    className={`rounded-lg w-full text-sm py-2 ${active
                                            ? "bg-[#D63A4F] text-white"
                                            : "bg-white/5 hover:bg-white/15 text-white/80"
                                        } ${locked ? "cursor-not-allowed opacity-70" : ""}`}
                                >
                                    {d.name}
                                    {count > 0 && (
                                        <span className="text-xs bg-black/30 rounded-full px-2 py-0.5 mr-1">
                                            {count}
                                        </span>
                                    )}
                                </Button>
                            );
                        })}
                    </div>

                    {/* نسخه موبایل: Dropdown روزها */}
                    <div className="lg:hidden w-full">
                        <Select
                            value={String(activeDay)}
                            onValueChange={(v) => setActiveDay(Number(v))}
                            disabled={locked}
                        >
                            <SelectTrigger className="w-full bg-white/5 border-white/20 text-white">
                                <SelectValue placeholder="انتخاب روز هفته" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#001c4d] text-white border-white/20">
                                {DAYS.map((d) => {
                                    const count = pendingCountByDay.get(d.idx) || 0;
                                    const date = jalaliAddDays(weekStart, d.idx);
                                    return (
                                        <SelectItem key={d.idx} value={String(d.idx)}>
                                            <div className="flex items-center justify-between w-full">
                                                <span>
                                                    {d.name} <span className="opacity-60 text-xs">({date})</span>
                                                </span>
                                                {count > 0 && (
                                                    <span className="text-xs opacity-70">تحویل‌نشده: {count}</span>
                                                )}
                                            </div>
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* سرچ */}
                    <div className="relative">
                        <Search className="absolute right-3 top-2.5 h-4 w-4 text-white/50" />
                        <Input
                            placeholder="جستجوی نام کاربر..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="bg-white/5 border-white/20 text-white placeholder:text-white/50 pr-8"
                        />
                    </div>
                </div>
            </CardHeader>

            <CardContent className="pb-6">
                {loading ? (
                    <div className="flex justify-center py-10">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : filteredRows.length === 0 ? (
                    <div className="text-center text-white/70 py-10">
                        رزروی برای این روز یافت نشد.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredRows.map((r) => {
                            const delivered = r.statusId === STATUS.DELIVERED;
                            const noShow = r.statusId === STATUS.NO_SHOW;
                            const reserved = r.statusId === STATUS.RESERVED;
                            return (
                                <div
                                    key={r.id}
                                    className={`rounded-2xl bg-white/5 border border-white/10 p-4 flex flex-col gap-3 ${delivered || noShow ? "opacity-80" : ""
                                        }`}
                                >
                                    <div className="flex justify-between items-start gap-2">
                                        <div>
                                            <h3 className="font-semibold text-base">{r.userName}</h3>
                                            <p className="text-xs text-white/60">
                                                {r.company} • {r.mealType}
                                            </p>
                                            <p className="text-xs text-white/40">تاریخ: {r.date}</p>
                                        </div>
                                        <span
                                            className={`px-2 py-1 rounded-md text-xs font-medium ${delivered
                                                    ? "bg-emerald-600/20 text-emerald-200 border border-emerald-400/30"
                                                    : noShow
                                                        ? "bg-red-600/20 text-red-200 border border-red-400/30"
                                                        : reserved
                                                            ? "bg-white/10 text-white border border-white/20"
                                                            : "bg-slate-700/30 text-white/60"
                                                }`}
                                        >
                                            {r.status}
                                        </span>
                                    </div>

                                    {r.chosenDishes?.length > 0 && (
                                        <div className="text-sm text-white/80 bg-white/5 rounded-lg p-2 border border-white/10">
                                            <p className="text-xs text-white/50 mb-1">غذاها:</p>
                                            <ul className="space-y-1">
                                                {r.chosenDishes.map((d) => (
                                                    <li
                                                        key={d.id}
                                                        className="flex justify-between text-xs border-b border-white/5 pb-1"
                                                    >
                                                        <span>{d.name}</span>
                                                        <span className="opacity-70">× {d.quantity}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-3 gap-2">
                                        <Button
                                            className={`${btn.deliver}`}
                                            onClick={() => updateStatus(r.id, STATUS.DELIVERED)}
                                            disabled={delivered}
                                        >
                                            <CheckCircle2 className="h-4 w-4 ml-1" />
                                            تحویل
                                        </Button>
                                        <Button
                                            className={`${btn.noShow}`}
                                            onClick={() => updateStatus(r.id, STATUS.NO_SHOW)}
                                            disabled={noShow}
                                        >
                                            <XCircle className="h-4 w-4 ml-1" />
                                            نیامد
                                        </Button>
                                        <Button
                                            className={`${btn.revert}`}
                                            onClick={() => updateStatus(r.id, STATUS.RESERVED)}
                                            disabled={reserved}
                                        >
                                            <RotateCcw className="h-4 w-4 ml-1" />
                                            بازگشت
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
