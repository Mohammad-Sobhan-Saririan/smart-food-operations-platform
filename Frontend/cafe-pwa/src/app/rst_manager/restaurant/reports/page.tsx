"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import jalaali from "jalaali-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectTrigger,
    SelectContent,
    SelectItem,
    SelectValue,
} from "@/components/ui/select";
import {
    Tabs,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import {
    Loader2,
    CalendarDays,
    FileDown,
    Building2,
    Users2,
    ChevronRight,
    ChevronLeft,
    ArrowDownToLine,
    Printer,
    UtensilsCrossed,
    Filter,
    PieChart,
} from "lucide-react";
import { toast } from "sonner";

// ---------------- Config ----------------
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

// ---------------- Visual Design Tokens ----------------
// پالت و کلاس‌های مشترک برای یکدستی ظاهری
const palette = {
    bgGradient: "from-[#2c4185]  to-[#154b96]",
    glass: "bg-white/8 border-white/10 backdrop-blur-md",
    glassSofter: "bg-white/6 border-white/10 backdrop-blur-md",
    text: "text-white",
    subText: "text-white/70",
    subtleText: "text-white/60",
    softDivider: "h-px w-full bg-gradient-to-l from-transparent via-white/12 to-transparent",
    // رنگ‌های تأکیدی خیلی ملایم
    sky: {
        chip: "bg-sky-400/10 border-sky-300/15 text-sky-100",
        text: "text-sky-200",
    },
    emerald: {
        chip: "bg-emerald-400/10 border-emerald-300/15 text-emerald-100",
        text: "text-emerald-200",
    },
    amber: { text: "text-amber-200" },
    rose: { text: "text-rose-200" },
    violet: { text: "text-violet-200" },
};

const btn = {
    primary: "bg-white/10 hover:bg-white/14 border border-white/15",
    accent: "bg-[#16a34a]/80 hover:bg-[#16a34a]/90 text-white",
    accentBlue: "bg-[#0ea5e9]/80 hover:bg-[#0ea5e9]/90 text-white",
    danger: "bg-[#e11d48]/80 hover:bg-[#e11d48]/90 text-white",
    ghost: "bg-white/6 hover:bg-white/10 border border-white/10",
};

// ---------------- Constants ----------------
const DAYS = [
    { idx: 0, name: "شنبه" },
    { idx: 1, name: "یکشنبه" },
    { idx: 2, name: "دوشنبه" },
    { idx: 3, name: "سه‌شنبه" },
    { idx: 4, name: "چهارشنبه" },
    { idx: 5, name: "پنج‌شنبه" },
    { idx: 6, name: "جمعه" },
];
const DAYS_FA = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه"] as const;

// --------------- Types ------------------
type MetaData = {
    mealTypes: { id: number; DisplayName: string }[];
    statuses: { id: number; nameFA: string }[];
    companies: { id: number; name: string }[];
};

// Daily
type CompanyCard = {
    companyId: number;
    companyName: string;
    totalReservations: number;
    dishes: { dishId: number; dishName: string; count: number }[];
};
type UserRow = {
    userId: string;
    userName: string;
    companyId: number;
    companyName: string;
    items: { dishId: number; dishName: string; quantity: number; mealTypeName: string }[];
};
type DailyBreakdownResponse = {
    day: string; // Jalali
    companyCards: CompanyCard[];
    users: UserRow[];
};

// Weekly
type DailySummary = {
    date: string; // yyyy-mm-dd (Jalali)
    totalReservations: number;
    delivered: number;
    canceled: number;
    noShow: number;
    confirmed: number;
    uniqueUsers: number;
    activeCompanies: number;
};
type CompanyDaily = {
    date: string;
    companyId: number;
    companyName: string;
    totalReservations: number;
    delivered: number;
    canceled: number;
    noShow: number;
    topDishes: { dishName: string; count: number }[];
};
type DishDaily = {
    date: string;
    mealTypeId: number;
    mealTypeName: string;
    dishId: number;
    dishName: string;
    totalCount: number;
    delivered: number;
    canceled: number;
    noShow: number;
};

// -------------- Jalali helpers --------------
function jalaliAddDays(jDateStr: string, days: number) {
    const [jy, jm, jd] = jDateStr.split("-").map(Number);
    const g = jalaali.toGregorian(jy, jm, jd);
    const date = new Date(Date.UTC(g.gy, g.gm - 1, g.gd));
    date.setUTCDate(date.getUTCDate() + days);
    const j = jalaali.toJalaali(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
    return `${j.jy}-${String(j.jm).padStart(2, "0")}-${String(j.jd).padStart(2, "0")}`;
}
function getCurrentWeekStartJalali() {
    const now = new Date();
    const day = now.getDay(); // 0=Sun ... 6=Sat
    const diff = day === 6 ? 0 : day + 1; // شنبه=0
    const start = new Date(now);
    start.setHours(12, 0, 0, 0);
    start.setDate(start.getDate() - diff);
    const j = jalaali.toJalaali(start);
    return `${j.jy}-${String(j.jm).padStart(2, "0")}-${String(j.jd).padStart(2, "0")}`;
}

// ---------------- Page -------------------
export default function RestaurantReportsPage() {
    const [mode, setMode] = useState<"daily" | "weekly">("weekly");
    const printWinRef = useRef<Window | null>(null);
    const isPrintingRef = useRef(false);
    // Shared filters
    const [weekStart, setWeekStart] = useState<string>(getCurrentWeekStartJalali());
    const [companyId, setCompanyId] = useState<string>("all");
    const [mealTypeId, setMealTypeId] = useState<string>("all");
    const [statusId, setStatusId] = useState<string>("all");
    const [search, setSearch] = useState("");

    // Daily-only filter
    const [dayIndex, setDayIndex] = useState<number>(0);
    const activeDate = useMemo(() => jalaliAddDays(weekStart, dayIndex), [weekStart, dayIndex]);

    // Meta + week starts
    const [weekStarts, setWeekStarts] = useState<string[]>([]);
    const [meta, setMeta] = useState<MetaData | null>(null);
    const [loadingMeta, setLoadingMeta] = useState(false);

    // Daily data
    const [loadingDaily, setLoadingDaily] = useState(false);
    const [companyCards, setCompanyCards] = useState<CompanyCard[]>([]);
    const [users, setUsers] = useState<UserRow[]>([]);

    // Weekly data
    const [loadingWeekly, setLoadingWeekly] = useState(false);
    const [daily, setDaily] = useState<DailySummary[]>([]);
    const [byCompany, setByCompany] = useState<CompanyDaily[]>([]);
    const [byDish, setByDish] = useState<DishDaily[]>([]);

    // safety
    const mountedRef = useRef(true);
    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    // Week starts
    const fetchWeekStarts = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/api/admin/restaurant/reports/week_starts`, {
                credentials: "include",
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.message || "week_starts failed");
            if (mountedRef.current) setWeekStarts(Array.isArray(data.weekStarts) ? data.weekStarts : []);
        } catch {
            // silent fallback
        }
    }, []);

    // Meta
    const fetchMeta = useCallback(async () => {
        setLoadingMeta(true);
        try {
            const res = await fetch(`${API_URL}/api/admin/restaurant/meta`, { credentials: "include" });
            if (!res.ok) throw new Error("meta failed");
            const data = (await res.json()) as MetaData;
            if (mountedRef.current) setMeta(data);
        } catch {
            toast.error("خطا در دریافت متادیتا");
        } finally {
            if (mountedRef.current) setLoadingMeta(false);
        }
    }, []);

    useEffect(() => {
        fetchWeekStarts();
        fetchMeta();
    }, [fetchMeta, fetchWeekStarts]);

    // Daily API
    const fetchDaily = useCallback(async () => {
        setLoadingDaily(true);
        try {
            const params = new URLSearchParams();
            params.set("weekStartJalali", weekStart);
            params.set("dayIndex", String(dayIndex));
            if (companyId !== "all") params.set("companyId", companyId);
            if (mealTypeId !== "all") params.set("mealTypeId", mealTypeId);
            if (statusId !== "all") params.set("statusId", statusId);
            if (search.trim()) params.set("search", search.trim());

            const res = await fetch(
                `${API_URL}/api/admin/restaurant/reports/daily_breakdown?${params.toString()}`,
                { credentials: "include" }
            );
            const data: DailyBreakdownResponse = await res.json();
            if (!res.ok) throw new Error((data as any)?.message || "fetch failed");
            if (mountedRef.current) {
                setCompanyCards(data.companyCards || []);
                setUsers(data.users || []);
            }
        } catch {
            toast.error("خطا در دریافت گزارش روزانه");
            if (mountedRef.current) {
                setCompanyCards([]);
                setUsers([]);
            }
        } finally {
            if (mountedRef.current) setLoadingDaily(false);
        }
    }, [weekStart, dayIndex, companyId, mealTypeId, statusId, search]);

    // Weekly API
    const fetchWeekly = useCallback(async () => {
        setLoadingWeekly(true);
        try {
            const params = new URLSearchParams();
            params.set("weekStartJalali", weekStart);
            if (companyId !== "all") params.set("companyId", companyId);
            if (mealTypeId !== "all") params.set("mealTypeId", mealTypeId);
            if (statusId !== "all") params.set("statusId", statusId);
            if (search.trim()) params.set("search", search.trim());

            const res = await fetch(
                `${API_URL}/api/admin/restaurant/reports/weekly?${params.toString()}`,
                { credentials: "include" }
            );
            if (!res.ok) throw new Error("fetch failed");
            const data = await res.json();
            if (mountedRef.current) {
                setDaily(data?.daily ?? []);
                setByCompany(data?.byCompany ?? []);
                setByDish(data?.byDish ?? []);
            }
        } catch {
            toast.error("خطا در دریافت گزارش هفتگی");
        } finally {
            if (mountedRef.current) setLoadingWeekly(false);
        }
    }, [weekStart, companyId, mealTypeId, statusId, search]);

    useEffect(() => {
        if (mode === "daily") fetchDaily();
        else fetchWeekly();
    }, [mode, fetchDaily, fetchWeekly]);

    useEffect(() => {
        if (mode === "daily") fetchDaily();
    }, [fetchDaily, mode]);
    useEffect(() => {
        if (mode === "weekly") fetchWeekly();
    }, [fetchWeekly, mode]);

    // Summaries
    const dailySummary = useMemo(() => {
        const companiesWithOrders = companyCards.filter((c) => c.totalReservations > 0).length;
        const totalDishes = companyCards.reduce(
            (acc, c) => acc + c.dishes.reduce((s, d) => s + d.count, 0),
            0
        );
        const totalUsers = users.length;
        return { companiesWithOrders, totalDishes, totalUsers };
    }, [companyCards, users]);

    const summaryTotal = useMemo(() => daily.reduce((a, d) => a + d.totalReservations, 0), [daily]);
    const summaryDelivered = useMemo(() => daily.reduce((a, d) => a + d.delivered, 0), [daily]);
    const summaryCanceled = useMemo(() => daily.reduce((a, d) => a + d.canceled, 0), [daily]);
    const summaryNoShow = useMemo(() => daily.reduce((a, d) => a + d.noShow, 0), [daily]);
    const summaryConfirmed = useMemo(() => daily.reduce((a, d) => a + d.confirmed, 0), [daily]);
    const summaryActiveCompanies = useMemo(() => new Set(byCompany.map((b) => b.companyId)).size, [byCompany]);
    const summaryUniqueUsers = useMemo(() => daily.reduce((a, d) => a + d.uniqueUsers, 0), [daily]);

    // تبدیل ارقام 0-9 به فارسی
    const faNum = (val: string | number) => {
        const s = String(val ?? "");
        const map: Record<string, string> = { "0": "۰", "1": "۱", "2": "۲", "3": "۳", "4": "۴", "5": "۵", "6": "۶", "7": "۷", "8": "۸", "9": "۹" };
        return s.replace(/[0-9]/g, (d) => map[d]);
    };

    // اعمال ایمن فیلترهای فعلی روی users (افزون بر فیلتر سرور)
    const applyPrintFilters = (rawUsers: UserRow[]) => {
        let list = [...rawUsers];

        // شرکت
        if (companyId !== "all") {
            const cid = Number(companyId);
            list = list.filter(u => u.companyId === cid);
        }

        // جستجو (نام/غذا/شرکت)
        const q = search.trim();
        if (q) {
            const ql = q.toLowerCase();
            list = list
                .map(u => ({
                    ...u,
                    items: u.items.filter(it =>
                        u.userName?.toLowerCase().includes(ql) ||
                        u.companyName?.toLowerCase().includes(ql) ||
                        it.dishName?.toLowerCase().includes(ql) ||
                        it.mealTypeName?.toLowerCase().includes(ql)
                    )
                }))
                .filter(u => u.items.length > 0 || (u.userName?.toLowerCase().includes(ql)));
        }

        // وعده
        if (mealTypeId !== "all") {
            const _list = list.map(u => ({
                ...u,
                items: u.items.filter(it => String(it.mealTypeName || "") === String(
                    meta?.mealTypes.find(m => String(m.id) === String(mealTypeId))?.DisplayName ?? ""
                ))
            }));
            list = _list.filter(u => u.items.length > 0);
        }

        // وضعیت (در ساختار UserRow موردی نداریم؛ فرض می‌گیریم سرور فیلتر کرده)
        // اگر لازم شد اینجا هم اضافه می‌کنیم.

        return list;
    };
    // CSV (Daily)
    const downloadCSV = (filename: string, rows: string[][]) => {
        const bom = "\uFEFF";
        const csv = rows
            .map((r) =>
                r
                    .map((cell) => {
                        const s = String(cell ?? "");
                        if (/[,"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
                        return s;
                    })
                    .join(",")
            )
            .join("\n");
        const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };
    const exportCompanyCSV = () => {
        const header = ["تاریخ", "شرکت", "غذا", "تعداد کل"];
        const rows: string[][] = [header];
        companyCards.forEach((c) => {
            if (c.dishes.length === 0) rows.push([activeDate, c.companyName, "-", "0"]);
            else c.dishes.forEach((d) => rows.push([activeDate, c.companyName, d.dishName, String(d.count)]));
        });
        downloadCSV(`company-dishes-${activeDate}.csv`, rows);
    };
    const exportUsersCSV = () => {
        const header = ["تاریخ", "شرکت", "کاربر", "وعده", "غذا", "تعداد"];
        const rows: string[][] = [header];
        users.forEach((u) => {
            if (u.items.length === 0) rows.push([activeDate, u.companyName || "-", u.userName, "-", "-", "0"]);
            else
                u.items.forEach((it) =>
                    rows.push([activeDate, u.companyName || "-", u.userName, it.mealTypeName || "-", it.dishName, String(it.quantity)])
                );
        });
        downloadCSV(`users-orders-${activeDate}.csv`, rows);
    };

    const buildDailyUsersPrintHTML = (activeDate: string, usersAll: UserRow[]) => {
        // 1) ابتدا فهرست نهایی برای پرینت را مطابق فیلترهای فعلی بسازیم
        const users = applyPrintFilters(usersAll);

        // 2) گروهبندی بر اساس شرکت
        const byCompany = new Map<string, UserRow[]>();
        users.forEach(u => {
            const key = u.companyName || "بدون شرکت";
            if (!byCompany.has(key)) byCompany.set(key, []);
            byCompany.get(key)!.push(u);
        });

        // 3) خلاصه‌ها
        const totalUsers = users.length;
        const totalItems = users.reduce((acc, u) => acc + u.items.reduce((s, it) => s + (it.quantity ?? 0), 0), 0);
        const companiesWithOrders = new Set(users.map(u => u.companyName || "بدون شرکت")).size;

        // 4) Use a system font stack in the public edition.
        const styles = `
    @page { size: A4; margin: 16mm; }
    *{ box-sizing: border-box; }
    html, body { height: 100%; }
    body {
      direction: rtl; color: #0f172a;
      font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Tahoma", sans-serif;
      background: #fff;
    }
    .wrap { max-width: 1040px; margin: 0 auto; padding: 8px 4px; }
    header.h { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 12px; }
    .ttl { font-weight: 700; font-size: 18px; letter-spacing: -0.2px; }
    .meta { font-size: 12px; color: #475569; }
    .chips { display: flex; gap: 8px; flex-wrap: wrap; margin: 12px 0 18px; }
    .chip { font-size: 11px; padding: 6px 10px; border: 1px solid #e2e8f0; border-radius: 999px; background: #f8fafc; }
    section.sec { page-break-inside: avoid; margin: 16px 0; }
    .chead { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .cname { font-weight: 700; font-size: 14px; }
    .badges { display: flex; gap: 8px; }
    .badge { background: #eef2ff; color: #3730a3; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 700; }
    .tbl-wrap { border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; }
    table.tbl { width: 100%; border-collapse: separate; border-spacing: 0; }
    thead th {
      background: #0b3b86; color: #fff; font-weight: 700; font-size: 12px; text-align: right; padding: 10px 10px;
    }
    tbody tr { background: #ffffff; }
    tbody tr:nth-child(even) { background: #f9fafb; }
    td { border-top: 1px solid #eef2f7; padding: 9px 10px; font-size: 12px; vertical-align: top; }
    .qty { font-weight: 700; color: #0d9488; white-space: nowrap; }
    .muted { color: #64748b; }
    .nowrap { white-space: nowrap; }
    footer.foot { display: flex; justify-content: space-between; margin-top: 12px; font-size: 11px; color: #64748b; }
    @media print {
      thead th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  `;

        // 6) ردیف‌ها با «پرس» و ارقام فارسی
        const renderRows = (u: UserRow) => {
            const list = u.items.length ? u.items : [{ dishId: -1, dishName: "—", quantity: 0, mealTypeName: "—" }];
            return list.map(it => `
      <tr>
        <td>${u.userName}</td>
        <td>${it.mealTypeName || "—"}</td>
        <td class="nowrap">${it.dishName}</td>
        <td class="qty">${faNum(it.quantity)}&nbsp;پرس</td>
        <td class="muted">${u.companyName || "—"}</td>
      </tr>
    `).join("");
        };

        // 7) سکشن شرکت‌ها
        const companySections = Array.from(byCompany.entries()).map(([comp, list]) => {
            const compTotal = list.reduce((acc, u) => acc + u.items.reduce((s, it) => s + (it.quantity ?? 0), 0), 0);
            const compUsers = list.length;
            return `
      <section class="sec">
        <div class="chead">
          <div class="cname">${comp}</div>
          <div class="badges">
            <span class="badge">کل آیتم‌ها: ${faNum(compTotal)}</span>
            <span class="badge">کاربران: ${faNum(compUsers)}</span>
          </div>
        </div>
        <div class="tbl-wrap">
          <table class="tbl">
            <thead>
              <tr><th>کاربر</th><th>وعده</th><th>غذا</th><th>تعداد</th><th>شرکت</th></tr>
            </thead>
            <tbody>
              ${list.map(renderRows).join("")}
            </tbody>
          </table>
        </div>
      </section>
    `;
        }).join("");

        // 8) تاریخ و خلاصه‌ها هم فارسی
        const faDate = faNum(activeDate);

        return `
    <!doctype html>
    <html lang="fa" dir="rtl">
      <head>
        <meta charset="utf-8" />
        <title>گزارش روزانه کاربران - ${faDate}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>${styles}</style>
      </head>
      <body>
        <div class="wrap">
          <header class="h">
            <div class="ttl">گزارش روزانه کاربران</div>
            <div class="meta">تاریخ (جلالی): <b>${faDate}</b></div>
          </header>

          <div class="chips">
            <div class="chip">کل آیتم‌های غذا: <b>${faNum(totalItems)}</b></div>
            <div class="chip">تعداد کاربران: <b>${faNum(totalUsers)}</b></div>
            <div class="chip">شرکت‌های دارای سفارش: <b>${faNum(companiesWithOrders)}</b></div>
          </div>

          ${companySections || `<div class="meta">داده‌ای مطابق فیلترهای انتخابی یافت نشد.</div>`}

          <footer class="foot">
            <div>تولید شده توسط پنل رستوران</div>
            <div>زمان چاپ: ${faNum(new Date().toLocaleString("fa-IR"))}</div>
          </footer>
        </div>

        <script>
          (function(){
            if (window.__printedOnce) return;
            window.__printedOnce = true;

            // صبر کوتاه برای آماده شدن فونت‌ها
            const doPrint = () => setTimeout(() => window.print(), 300);
            if (document.fonts && document.fonts.ready) {
              document.fonts.ready.then(doPrint).catch(doPrint);
            } else {
              doPrint();
            }
            window.addEventListener('afterprint', () => {}, { once: true });
          })();
        </script>
      </body>
    </html>
  `;
    };

    const handlePrintDailyUsersPopup = () => {
        try {
            if (!users.length) {
                toast.info("داده‌ای برای پرینت وجود ندارد");
                return;
            }
            if (isPrintingRef.current) return; // جلوگیری از دوبار کلیک
            isPrintingRef.current = true;

            // پنجره را همان لحظه کلیک باز کن
            if (!printWinRef.current || printWinRef.current.closed) {
                printWinRef.current = window.open("", "_blank", "noopener,noreferrer,width=1024,height=768");
            } else {
                try { printWinRef.current.focus(); } catch { }
            }

            // اگر بلاک شد، آی‌فریم fallback (بدون پنجره)
            if (!printWinRef.current) {
                const html = buildDailyUsersPrintHTML(activeDate, users);
                const iframe = document.createElement("iframe");
                iframe.style.position = "fixed";
                iframe.style.right = "0"; iframe.style.bottom = "0";
                iframe.style.width = "0"; iframe.style.height = "0"; iframe.style.opacity = "0";
                iframe.setAttribute("sandbox", "allow-modals allow-same-origin allow-scripts");
                document.body.appendChild(iframe);
                iframe.srcdoc = html;
                iframe.onload = () => {
                    try { iframe.contentWindow?.print(); } catch { }
                    setTimeout(() => { document.body.removeChild(iframe); isPrintingRef.current = false; }, 1500);
                };
                return;
            }

            const w = printWinRef.current;

            // تمپلیت ساده (اختیاری) — می‌تونی حذفش کنی
            w.document.open();
            w.document.write(`<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"/><title>آماده‌سازی…</title>
      <style>body{font-family:system-ui,Tahoma,sans-serif;direction:rtl;padding:24px} .m{color:#64748b}</style>
    </head><body><h3>در حال آماده‌سازی گزارش…</h3><p class="m">لطفاً چند لحظه صبر کنید.</p></body></html>`);
            w.document.close();

            // HTML نهایی را مستقیم بنویس (بدون تغییر آدرس/صفحه دوم)
            const finalHTML = buildDailyUsersPrintHTML(activeDate, users);
            setTimeout(() => {
                try {
                    w.document.open();
                    w.document.write(finalHTML);
                    w.document.close();
                } finally {
                    // بعد از کمی زمان، قفل را باز کن (برای کلیک مجدد آگاهانه)
                    setTimeout(() => { isPrintingRef.current = false; }, 1200);
                }
            }, 60);

        } catch (e) {
            isPrintingRef.current = false;
            toast.error(e instanceof Error ? e.message : "خطا در ساخت نسخه PDF");
        }
    };

    // Excel (Weekly)
    const handleExportExcel = async () => {
        try {
            const XLSX = await import("xlsx");
            const wb = XLSX.utils.book_new();

            const dailyRows = daily.map((d) => {
                const [jy, jm, jd] = d.date.split("-").map(Number) as [number, number, number];
                const g = jalaali.toGregorian(jy, jm, jd);
                const dow = DAYS_FA[(new Date(g.gy, g.gm - 1, g.gd).getDay() + 1) % 7] ?? "";
                return {
                    "روز": dow,
                    "تاریخ (جلالی)": d.date,
                    "کل رزروها": d.totalReservations,
                    "تحویل‌شده": d.delivered,
                    "تأیید‌شده": d.confirmed,
                    "لغو": d.canceled,
                    "عدم حضور": d.noShow,
                    "کاربران یکتا": d.uniqueUsers,
                    "شرکت‌های فعال": d.activeCompanies,
                };
            });
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dailyRows), "گزارش روزانه");

            const companyRows = byCompany.map((c) => ({
                "تاریخ (جلالی)": c.date,
                "شرکت": c.companyName,
                "کل رزروها": c.totalReservations,
                "تحویل‌شده": c.delivered,
                "لغو": c.canceled,
                "عدم حضور": c.noShow,
                "غذاهای برتر": (c.topDishes || []).map((td) => `${td.dishName} (${td.count})`).join("، "),
            }));
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(companyRows), "گزارش شرکت‌ها");

            const dishRows = byDish.map((d) => ({
                "تاریخ (جلالی)": d.date,
                "وعده": d.mealTypeName,
                "نام غذا": d.dishName,
                "کل": d.totalCount,
                "تحویل‌شده": d.delivered,
                "لغو": d.canceled,
                "عدم حضور": d.noShow,
            }));
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dishRows), "گزارش غذاها");

            XLSX.writeFile(wb, `گزارش-هفتگی-رستوران-${weekStart}.xlsx`, { bookType: "xlsx" });
            toast.success("خروجی اکسل آماده شد");
        } catch {
            toast.error("خطا در ساخت فایل اکسل");
        }
    };

    // UI helpers
    const SummaryCard = (
        title: string,
        value: number | string,
        accentClass?: string,
    ) => (
        <div className={`rounded-2xl ${palette.glass} ${accentClass ?? ""} px-4 py-3 shadow-sm transition`}>
            <div className={`text-xs ${palette.subText}`}>{title}</div>
            <div className="mt-1 text-xl font-semibold text-white">{value}</div>
        </div>
    );

    const goPrevWeek = () => setWeekStart((w) => jalaliAddDays(w, -7));
    const goNextWeek = () => setWeekStart((w) => jalaliAddDays(w, +7));

    return (
        <div className={`space-y-6 ${palette.text}`} dir="rtl">
            {/* Header + actions */}
            <Card className={`bg-gradient-to-br ${palette.bgGradient} border border-white/10`}>
                <CardHeader className="gap-4">
                    <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <PieChart className="h-5 w-5 text-white/80" />
                            گزارش رستوران
                        </CardTitle>

                        <div className="flex flex-wrap items-center gap-2">
                            {mode === "weekly" ? (
                                <Button onClick={handleExportExcel} className={`${btn.accent} shadow-sm`}>
                                    <ArrowDownToLine className="h-4 w-4 ml-2" />
                                    خروجی اکسل (هفتگی)
                                </Button>
                            ) : (
                                <>
                                    <Button
                                        onClick={exportCompanyCSV}
                                        className={`${btn.accent} shadow-sm`}
                                        disabled={loadingDaily || companyCards.length === 0}
                                    >
                                        <FileDown className="h-4 w-4 ml-2" />
                                        CSV شرکت/غذا
                                    </Button>
                                    <Button
                                        onClick={exportUsersCSV}
                                        className={`${btn.accentBlue} shadow-sm`}
                                        disabled={loadingDaily || users.length === 0}
                                    >
                                        <FileDown className="h-4 w-4 ml-2" />
                                        CSV کاربران
                                    </Button>
                                    <Button
                                        onClick={handlePrintDailyUsersPopup}
                                        disabled={loadingDaily || users.length === 0}
                                        className={`${btn.primary} disabled:opacity-60`}
                                        title="نسخه PDF روزانه (پنجره مستقل)"
                                    >
                                        <Printer className="h-4 w-4 ml-2" />
                                        نسخه PDF روزانه
                                    </Button>
                                </>
                            )}
                            {/* <Button onClick={() => window.print()} className={`${btn.ghost} text-white/90`}>
                                <Printer className="h-4 w-4 ml-2" />
                                چاپ
                            </Button> */}
                        </div>
                    </div>

                    {/* Mode tabs */}
                    <Tabs value={mode} onValueChange={(v) => setMode(v as any)} className="w-full">
                        <TabsList className={`${palette.glass} shadow-sm`}>
                            <TabsTrigger value="weekly">گزارش هفتگی</TabsTrigger>
                            <TabsTrigger value="daily">گزارش روزانه</TabsTrigger>
                        </TabsList>
                    </Tabs>

                    {/* Filters */}
                    <div className="flex flex-col gap-3">
                        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3">
                            {/* Week navigator */}
                            <div className="flex items-center gap-2">
                                <Button onClick={goPrevWeek} className={`${btn.primary} px-2 text-white/90`}>
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                                <div className={`px-3 py-2 rounded-xl ${palette.glass} text-sm text-left`}>
                                    <CalendarDays className="inline-block h-4 w-4 ml-2 opacity-80" />
                                    شروع هفته: <span className="font-semibold">{weekStart}</span>
                                </div>
                                <Button onClick={goNextWeek} className={`${btn.primary} px-2 text-white/90`}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                            </div>

                            {/* WeekStart from DB */}
                            <div className="min-w-[180px]">
                                <Select value={weekStart} onValueChange={setWeekStart}>
                                    <SelectTrigger className={`${palette.glass} ${palette.text}`}>
                                        <SelectValue placeholder="شروع هفته" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#0e1b35]/95 text-white border-white/10">
                                        {(weekStarts.length ? weekStarts : [weekStart]).map((ws) => (
                                            <SelectItem key={ws} value={ws}>
                                                {ws}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Day select - only daily */}
                            {mode === "daily" && (
                                <div className="min-w-[180px]">
                                    <Select value={String(dayIndex)} onValueChange={(v) => setDayIndex(Number(v))}>
                                        <SelectTrigger className={`${palette.glass} ${palette.text}`}>
                                            <SelectValue placeholder="روز هفته" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-[#0e1b35]/95 text-white border-white/10">
                                            {DAYS.map((d) => (
                                                <SelectItem key={d.idx} value={String(d.idx)}>
                                                    {d.name}{" "}
                                                    <span className="text-xs opacity-70">({jalaliAddDays(weekStart, d.idx)})</span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>

                        {/* Filter controls */}
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                            <Select value={companyId} onValueChange={(v) => setCompanyId(v)} disabled={loadingMeta}>
                                <SelectTrigger className={`${palette.glass} ${palette.text}`}>
                                    <SelectValue placeholder="شرکت" />
                                </SelectTrigger>
                                <SelectContent className="bg-[#0e1b35]/95 text-white border-white/10">
                                    <SelectItem value="all">
                                        <div className="flex items-center gap-2">
                                            <Building2 className="h-4 w-4 opacity-80" />
                                            همه شرکت‌ها
                                        </div>
                                    </SelectItem>
                                    {meta?.companies.map((c) => (
                                        <SelectItem key={c.id} value={String(c.id)}>
                                            {c.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={mealTypeId} onValueChange={(v) => setMealTypeId(v)} disabled={loadingMeta}>
                                <SelectTrigger className={`${palette.glass} ${palette.text}`}>
                                    <SelectValue placeholder="وعده" />
                                </SelectTrigger>
                                <SelectContent className="bg-[#0e1b35]/95 text-white border-white/10">
                                    <SelectItem value="all">
                                        <div className="flex items-center gap-2">
                                            <UtensilsCrossed className="h-4 w-4 opacity-80" />
                                            همه وعده‌ها
                                        </div>
                                    </SelectItem>
                                    {meta?.mealTypes.map((m) => (
                                        <SelectItem key={m.id} value={String(m.id)}>
                                            {m.DisplayName}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={statusId} onValueChange={(v) => setStatusId(v)} disabled={loadingMeta}>
                                <SelectTrigger className={`${palette.glass} ${palette.text}`}>
                                    <SelectValue placeholder="وضعیت" />
                                </SelectTrigger>
                                <SelectContent className="bg-[#0e1b35]/95 text-white border-white/10">
                                    <SelectItem value="all">همه وضعیت‌ها</SelectItem>
                                    {meta?.statuses.map((s) => (
                                        <SelectItem key={s.id} value={String(s.id)}>
                                            {s.nameFA}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <div className="relative">
                                <Filter className="absolute right-3 top-2.5 h-4 w-4 text-white/50 pointer-events-none" />
                                <Input
                                    placeholder="جستجو (نام/غذا/شرکت)"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className={`${palette.glass} ${palette.text} placeholder:text-white/50 pr-8`}
                                />
                            </div>

                            <Button
                                onClick={() => (mode === "daily" ? fetchDaily() : fetchWeekly())}
                                className={`${btn.primary} text-white/90`}
                            >
                                اعمال فیلتر
                            </Button>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* Summary tiles */}
            {mode === "weekly" ? (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                    {SummaryCard("کل رزروها", loadingWeekly ? "—" : summaryTotal)}
                    {SummaryCard("تحویل‌شده", loadingWeekly ? "—" : summaryDelivered, palette.sky.chip)}
                    {SummaryCard("تأیید‌شده", loadingWeekly ? "—" : summaryConfirmed, palette.glass)}
                    {SummaryCard("عدم حضور", loadingWeekly ? "—" : summaryNoShow, palette.glass)}
                    {SummaryCard("لغو", loadingWeekly ? "—" : summaryCanceled, palette.glass)}
                    {SummaryCard("شرکت‌های فعال", loadingWeekly ? "—" : summaryActiveCompanies, palette.glass)}
                </div>
            ) : (
                <div className="grid grid-cols-3 gap-2 w-full md:w-auto">
                    {SummaryCard("شرکت دارای سفارش", dailySummary.companiesWithOrders)}
                    {SummaryCard("کل آیتم‌های غذا", dailySummary.totalDishes)}
                    {SummaryCard("تعداد کاربران", dailySummary.totalUsers)}
                </div>
            )}

            {/* ---------------- WEEKLY CONTENT ---------------- */}
            {mode === "weekly" && (
                <>
                    {/* Daily summary table */}
                    <Card className={`${palette.glass}`}>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <CalendarDays className="h-5 w-5 text-white/80" />
                                گزارش روزانه
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loadingWeekly ? (
                                <div className="flex justify-center py-10">
                                    <Loader2 className="h-8 w-8 animate-spin text-white/70" />
                                </div>
                            ) : daily.length === 0 ? (
                                <div className="text-center text-white/70 py-10">داده‌ای یافت نشد.</div>
                            ) : (
                                <>
                                    <div className="hidden md:block overflow-x-auto">
                                        <table className="min-w-full text-sm text-right border-separate border-spacing-y-6">
                                            <thead>
                                                <tr className="text-white/60 text-sm">
                                                    <th className="px-2 font-normal">روز</th>
                                                    <th className="px-2 font-normal">تاریخ</th>
                                                    <th className="px-2 font-normal">کل</th>
                                                    <th className="px-2 font-normal">تحویل</th>
                                                    <th className="px-2 font-normal">تأیید</th>
                                                    <th className="px-2 font-normal">لغو</th>
                                                    <th className="px-2 font-normal">عدم حضور</th>
                                                    <th className="px-2 font-normal">کاربران یکتا</th>
                                                    <th className="px-2 font-normal">شرکت‌های فعال</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {daily.map((d) => {
                                                    const g = jalaali.toGregorian(
                                                        ...(d.date.split("-").map(Number) as [number, number, number])
                                                    );
                                                    const dow = DAYS_FA[(new Date(g.gy, g.gm - 1, g.gd).getDay() + 1) % 7];;
                                                    return (
                                                        <tr key={d.date} className="bg-white/6 rounded-xl transition">
                                                            <td className="px-2 py-2">{dow}</td>
                                                            <td className="px-2 py-2">{d.date}</td>
                                                            <td className="px-2 py-2 font-semibold">{d.totalReservations}</td>
                                                            <td className={`px-2 py-2 ${palette.sky.text}`}>{d.delivered}</td>
                                                            <td className="px-2 py-2">{d.confirmed}</td>
                                                            <td className={`px-2 py-2 ${palette.rose.text}`}>{d.canceled}</td>
                                                            <td className={`px-2 py-2 ${palette.amber.text}`}>{d.noShow}</td>
                                                            <td className="px-2 py-2">{d.uniqueUsers}</td>
                                                            <td className="px-2 py-2">{d.activeCompanies}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Mobile cards */}
                                    <div className="grid grid-cols-1 gap-3 md:hidden">
                                        {daily.map((d) => {
                                            const g = jalaali.toGregorian(
                                                ...(d.date.split("-").map(Number) as [number, number, number])
                                            );
                                            const dow = DAYS_FA[(new Date(g.gy, g.gm - 1, g.gd).getDay() + 1) % 7];;
                                            return (
                                                <div key={d.date} className={`rounded-2xl ${palette.glass} p-4 space-y-2`}>
                                                    <div className="flex items-center justify-between">
                                                        <div className="font-semibold">{dow}</div>
                                                        <div className={`${palette.subtleText} text-xs`}>{d.date}</div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                                        <div className={`${palette.glassSofter} rounded-lg p-2`}>کل: <b>{d.totalReservations}</b></div>
                                                        <div className={`${palette.glassSofter} rounded-lg p-2`}>تحویل: <b>{d.delivered}</b></div>
                                                        <div className={`${palette.glassSofter} rounded-lg p-2`}>تأیید: <b>{d.confirmed}</b></div>
                                                        <div className={`${palette.glassSofter} rounded-lg p-2`}>لغو: <b>{d.canceled}</b></div>
                                                        <div className={`${palette.glassSofter} rounded-lg p-2`}>عدم حضور: <b>{d.noShow}</b></div>
                                                        <div className={`${palette.glassSofter} rounded-lg p-2`}>کاربر یکتا: <b>{d.uniqueUsers}</b></div>
                                                    </div>
                                                    <div className={`${palette.subtleText} text-xs`}>شرکت‌های فعال: <b>{d.activeCompanies}</b></div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* Companies (weekly) */}
                    <Card className={`${palette.glass}`}>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Building2 className="h-5 w-5 text-white/80" />
                                گزارش شرکت‌ها (تفکیک روز)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loadingWeekly ? (
                                <div className="flex justify-center py-10">
                                    <Loader2 className="h-8 w-8 animate-spin text-white/70" />
                                </div>
                            ) : byCompany.length === 0 ? (
                                <div className="text-center text-white/70 py-10">داده‌ای یافت نشد.</div>
                            ) : (
                                <div className="space-y-6">
                                    {Array.from(new Map(byCompany.map((c) => [c.date, true])).keys()).map((date) => {
                                        const dayRows = byCompany.filter((c) => c.date === date);
                                        const g = jalaali.toGregorian(...(date.split("-").map(Number) as [number, number, number]));
                                        const dow = DAYS_FA[(new Date(g.gy, g.gm - 1, g.gd).getDay() + 1) % 7];;
                                        return (
                                            <div key={date} className={`${palette.glass} rounded-2xl`}>
                                                <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                                                    <div className="font-semibold">{dow}</div>
                                                    <div className={`${palette.subtleText} text-xs`}>{date}</div>
                                                </div>

                                                <div className="hidden md:block overflow-x-auto p-3">
                                                    <table className="min-w-full text-sm text-right">
                                                        <thead>
                                                            <tr className="text-white/60 text-sm">
                                                                <th className="px-2 font-normal">شرکت</th>
                                                                <th className="px-2 font-normal">کل</th>
                                                                <th className="px-2 font-normal">تحویل</th>
                                                                <th className="px-2 font-normal">لغو</th>
                                                                <th className="px-2 font-normal">عدم حضور</th>
                                                                <th className="px-2 font-normal">غذاهای برتر</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {dayRows.map((r, idx) => (
                                                                <tr key={`${r.companyId}-${idx}`} className="bg-white/6 rounded-xl">
                                                                    <td className="px-2 py-2">{r.companyName}</td>
                                                                    <td className="px-2 py-2 font-semibold">{r.totalReservations}</td>
                                                                    <td className={`px-2 py-2 ${palette.sky.text}`}>{r.delivered}</td>
                                                                    <td className={`px-2 py-2 ${palette.rose.text}`}>{r.canceled}</td>
                                                                    <td className={`px-2 py-2 ${palette.amber.text}`}>{r.noShow}</td>
                                                                    <td className="px-2 py-2 text-xs">
                                                                        {(r.topDishes ?? []).map((td) => `${td.dishName} (${td.count})`).join("، ")}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>

                                                {/* Mobile cards */}
                                                <div className="grid grid-cols-1 gap-3 p-3 md:hidden">
                                                    {dayRows.map((r, idx) => (
                                                        <div key={`${r.companyId}-${idx}`} className={`${palette.glass} rounded-xl p-3 space-y-2`}>
                                                            <div className="flex items-center justify-between">
                                                                <div className="font-semibold">{r.companyName}</div>
                                                                <div className={`${palette.subtleText} text-xs`}>کل: {r.totalReservations}</div>
                                                            </div>
                                                            <div className="grid grid-cols-3 gap-2 text-xs">
                                                                <div className={`${palette.glassSofter} rounded-lg p-2`}>تحویل: <b>{r.delivered}</b></div>
                                                                <div className={`${palette.glassSofter} rounded-lg p-2`}>لغو: <b>{r.canceled}</b></div>
                                                                <div className={`${palette.glassSofter} rounded-lg p-2`}>عدم حضور: <b>{r.noShow}</b></div>
                                                            </div>
                                                            {(r.topDishes?.length ?? 0) > 0 && (
                                                                <div className="text-xs">
                                                                    غذاهای برتر: {(r.topDishes ?? []).map((td) => `${td.dishName} (${td.count})`).join("، ")}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Dishes (weekly) */}
                    <Card className={`${palette.glass}`}>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <UtensilsCrossed className="h-5 w-5 text-white/80" />
                                گزارش غذاها (تفکیک روز و وعده)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loadingWeekly ? (
                                <div className="flex justify-center py-10">
                                    <Loader2 className="h-8 w-8 animate-spin text-white/70" />
                                </div>
                            ) : byDish.length === 0 ? (
                                <div className="text-center text-white/70 py-10">داده‌ای یافت نشد.</div>
                            ) : (
                                <>
                                    <div className="hidden md:block overflow-x-auto">
                                        <table className="min-w-full text-sm text-right border-separate border-spacing-y-6">
                                            <thead>
                                                <tr className="text-white/60 text-sm">
                                                    <th className="px-2 font-normal">روز</th>
                                                    <th className="px-2 font-normal">تاریخ</th>
                                                    <th className="px-2 font-normal">وعده</th>
                                                    <th className="px-2 font-normal">غذا</th>
                                                    <th className="px-2 font-normal">کل</th>
                                                    <th className="px-2 font-normal">تحویل</th>
                                                    <th className="px-2 font-normal">لغو</th>
                                                    <th className="px-2 font-normal">عدم حضور</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {byDish.map((d, i) => {
                                                    const g = jalaali.toGregorian(
                                                        ...(d.date.split("-").map(Number) as [number, number, number])
                                                    );
                                                    const dow = DAYS_FA[(new Date(g.gy, g.gm - 1, g.gd).getDay() + 1) % 7];;
                                                    return (
                                                        <tr key={`${d.date}-${d.dishId}-${i}`} className="bg-white/6 rounded-xl">
                                                            <td className="px-2 py-2">{dow}</td>
                                                            <td className="px-2 py-2">{d.date}</td>
                                                            <td className="px-2 py-2">{d.mealTypeName}</td>
                                                            <td className="px-2 py-2 font-medium">{d.dishName}</td>
                                                            <td className="px-2 py-2">{d.totalCount}</td>
                                                            <td className={`px-2 py-2 ${palette.sky.text}`}>{d.delivered}</td>
                                                            <td className={`px-2 py-2 ${palette.rose.text}`}>{d.canceled}</td>
                                                            <td className={`px-2 py-2 ${palette.amber.text}`}>{d.noShow}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Mobile cards */}
                                    <div className="grid grid-cols-1 gap-3 md:hidden">
                                        {byDish.map((d, i) => {
                                            const g = jalaali.toGregorian(
                                                ...(d.date.split("-").map(Number) as [number, number, number])
                                            );
                                            const dow = DAYS_FA[(new Date(g.gy, g.gm - 1, g.gd).getDay() + 1) % 7];;
                                            return (
                                                <div key={`${d.date}-${d.dishId}-${i}`} className={`${palette.glass} rounded-2xl p-4 space-y-2`}>
                                                    <div className="flex items-center justify-between">
                                                        <div className="font-semibold">{d.dishName}</div>
                                                        <div className={`${palette.subtleText} text-xs`}>{d.mealTypeName}</div>
                                                    </div>
                                                    <div className={`${palette.subtleText} text-xs`}>
                                                        {dow} • {d.date}
                                                    </div>
                                                    <div className="grid grid-cols-4 gap-2 text-xs">
                                                        <div className={`${palette.glassSofter} rounded-lg p-2`}>کل: <b>{d.totalCount}</b></div>
                                                        <div className={`${palette.glassSofter} rounded-lg p-2`}>تحویل: <b>{d.delivered}</b></div>
                                                        <div className={`${palette.glassSofter} rounded-lg p-2`}>لغو: <b>{d.canceled}</b></div>
                                                        <div className={`${palette.glassSofter} rounded-lg p-2`}>عدم حضور: <b>{d.noShow}</b></div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}

            {/* ---------------- DAILY CONTENT ---------------- */}
            {mode === "daily" && (
                <Card className={`${palette.glass}`}>
                    <CardHeader className="space-y-4">
                        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
                            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                                <CalendarDays className="h-5 w-5 text-white/80" />
                                گزارش روزانه‌ی رستوران
                            </CardTitle>

                            <div className="flex items-center gap-1">
                                <Button
                                    onClick={() => setWeekStart((w) => jalaliAddDays(w, -7))}
                                    className={`${btn.primary} px-2 text-white/90`}
                                    title="هفته قبل"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                                <div className={`px-3 py-2 rounded-xl ${palette.glass} text-sm text-left`}>
                                    شروع هفته: <span className="font-semibold">{weekStart}</span>
                                </div>
                                <Button
                                    onClick={() => setWeekStart((w) => jalaliAddDays(w, +7))}
                                    className={`${btn.primary} px-2 text-white/90`}
                                    title="هفته بعد"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* جستجوی نام کاربر */}
                        <div className="relative">
                            <Users2 className="absolute right-3 top-2.5 h-4 w-4 text-white/50" />
                            <Input
                                placeholder="جستجوی نام کاربر..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className={`${palette.glass} ${palette.text} placeholder:text-white/50 pr-8`}
                            />
                        </div>

                        {/* خروجی + خلاصه */}
                        <div className="flex flex-col-reverse md:flex-row md:items-center md:justify-between gap-3">
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    onClick={exportCompanyCSV}
                                    disabled={loadingDaily || companyCards.length === 0}
                                    className={`${btn.accent} disabled:opacity-60`}
                                >
                                    <FileDown className="h-4 w-4 ml-2" />
                                    CSV شرکت/غذا
                                </Button>
                                <Button
                                    onClick={exportUsersCSV}
                                    disabled={loadingDaily || users.length === 0}
                                    className={`${btn.accentBlue} disabled:opacity-60`}
                                >
                                    <FileDown className="h-4 w-4 ml-2" />
                                    CSV کاربران
                                </Button>
                                <Button
                                    onClick={handlePrintDailyUsersPopup}
                                    disabled={loadingDaily || users.length === 0}
                                    className={`${btn.primary} disabled:opacity-60`}
                                    title="نسخه PDF روزانه (پنجره مستقل)"
                                >
                                    <Printer className="h-4 w-4 ml-2" />
                                    نسخه PDF روزانه
                                </Button>
                            </div>

                            <div className="grid grid-cols-3 gap-2 w-full md:w-auto">
                                {SummaryCard("شرکت دارای سفارش", dailySummary.companiesWithOrders)}
                                {SummaryCard("کل آیتم‌های غذا", dailySummary.totalDishes)}
                                {SummaryCard("تعداد کاربران", dailySummary.totalUsers)}
                            </div>
                        </div>
                    </CardHeader>

                    <div className={palette.softDivider} />

                    <CardContent className="space-y-10">
                        {loadingDaily ? (
                            <div className="flex justify-center py-16">
                                <Loader2 className="h-8 w-8 animate-spin text-white/70" />
                            </div>
                        ) : (
                            <>
                                {/* شرکت‌ها */}
                                <section aria-label="by-company" className="space-y-6">
                                    <h3 className="text-base font-semibold flex items-center gap-2">
                                        <Building2 className="h-4 w-4 text-white/80" />
                                        سفارش‌های روز {activeDate} به تفکیک شرکت و غذا
                                    </h3>

                                    {companyCards.length === 0 ? (
                                        <div className={palette.subText}>داده‌ای برای این روز یافت نشد.</div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                            {companyCards.map((c) => (
                                                <div
                                                    key={c.companyId}
                                                    className={`rounded-2xl ${palette.glass} p-4 transition`}
                                                >
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="font-semibold">{c.companyName}</div>
                                                        <span className={`${palette.subtleText} text-xs`}>
                                                            کل رزرو:{" "}
                                                            <span className="text-white font-semibold">{c.totalReservations}</span>
                                                        </span>
                                                    </div>

                                                    <div className="flex flex-wrap gap-2 mt-1">
                                                        {c.dishes.length === 0 ? (
                                                            <span className="text-xs text-white/55">بدون انتخاب غذا</span>
                                                        ) : (
                                                            c.dishes.map((d) => (
                                                                <span
                                                                    key={d.dishId}
                                                                    className={`text-xs px-3 py-1 rounded-full ${palette.sky.chip}`}
                                                                    title={d.dishName}
                                                                >
                                                                    {d.dishName} <span className="opacity-70">×{d.count}</span>
                                                                </span>
                                                            ))
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </section>

                                <div className={palette.softDivider} />

                                {/* کاربران */}
                                <section aria-label="by-users" className="space-y-6">
                                    <h3 className="text-base font-semibold flex items-center gap-2">
                                        <Users2 className="h-4 w-4 text-white/80" />
                                        سفارش‌های کاربران در روز {activeDate}
                                    </h3>

                                    {users.length === 0 ? (
                                        <div className={palette.subText}>اطلاعی برای نمایش وجود ندارد.</div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                            {users.map((u) => (
                                                <div key={u.userId} className={`rounded-2xl ${palette.glass} p-4`}>
                                                    <div className="flex items-center justify-between">
                                                        <div className="font-semibold">{u.userName}</div>
                                                        <span className={`${palette.subtleText} text-xs`}>{u.companyName || "—"}</span>
                                                    </div>

                                                    <div className="mt-3 space-y-2">
                                                        {u.items.length === 0 ? (
                                                            <div className="text-xs text-white/55">آیتمی ثبت نشده</div>
                                                        ) : (
                                                            u.items.map((it, idx) => (
                                                                <div
                                                                    key={idx}
                                                                    className="flex justify-between text-xs border-b border-white/10 pb-1"
                                                                >
                                                                    <span className="opacity-90">
                                                                        <span className={palette.sky.text}>{it.mealTypeName}</span> • {it.dishName}
                                                                    </span>
                                                                    <span className={`${palette.emerald.text} font-semibold`}>×{it.quantity}</span>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </section>
                            </>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
