"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination, PaginationContent, PaginationItem } from "@/components/ui/pagination";
import { Loader2, ChevronRight, ChevronLeft, Filter } from "lucide-react";
import { toast } from "sonner";
import jalaali from "jalaali-js";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
    DialogClose,
} from "@/components/ui/dialog";
import {
    Select,
    SelectTrigger,
    SelectContent,
    SelectValue,
    SelectItem,
} from "@/components/ui/select";

// ---------------- Config ----------------
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
const PAGE_SIZE = 10;

// --------------- Types ------------------
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
    chosenDishes: {
        id: number;
        name: string;
        imageUrl: string;
        quantity: number;
    }[];
};

type MetaData = {
    mealTypes: { id: number; DisplayName: string }[];
    statuses: { id: number; nameFA: string }[];
    companies: { id: number; name: string }[];
};

type ApiListResponse = {
    data: ReservationRow[];
    meta: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
        week: { start: string; end: string }; // Jalali
    };
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
    // تبدیل امروز میلادی به شنبه جلالی هفته جاری (مبنای شما شنبه تا جمعه است)
    const now = new Date();
    // محاسبه‌ی شنبه‌ی جاری (با مبنای ایران: شنبه=0)
    // در JS: getDay(): 0=Sunday ... 6=Saturday
    // تبدیل: اگر امروز شنبه (JS=6) → diff=0
    // اگر امروز یکشنبه (JS=0) → diff=1 ... جمعه (JS=5) → diff=6
    const day = now.getDay(); // 0..6
    const diff = day === 6 ? 0 : day + 1; // مطابق منطق قبلی تو
    const start = new Date(now);
    start.setHours(12, 0, 0, 0);
    start.setDate(start.getDate() - diff);
    const j = jalaali.toJalaali(start);
    return `${j.jy}-${String(j.jm).padStart(2, "0")}-${String(j.jd).padStart(2, "0")}`;
}

// ---------------- Page -------------------
export default function ReservationsPage() {
    // Filters
    const [weekStart, setWeekStart] = useState<string>(getCurrentWeekStartJalali());
    const [companyId, setCompanyId] = useState<string>(""); // "" = all
    const [mealTypeId, setMealTypeId] = useState<string>("");
    const [statusId, setStatusId] = useState<string>("");
    const [search, setSearch] = useState<string>("");

    // Data
    const [meta, setMeta] = useState<MetaData | null>(null);
    const [rows, setRows] = useState<ReservationRow[]>([]);
    const [loading, setLoading] = useState<boolean>(false);

    // Pagination
    const [page, setPage] = useState<number>(1);
    const [totalPages, setTotalPages] = useState<number>(1);
    const [totalCount, setTotalCount] = useState<number>(0);

    // Selection for bulk actions
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    // Dialog for bulk
    const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
    const [pendingStatusId, setPendingStatusId] = useState<number | null>(null);

    // Fetch meta (companies, mealTypes, statuses)
    const fetchMeta = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/api/admin/restaurant/meta`, {
                credentials: "include",
            });
            if (!res.ok) throw new Error("meta failed");
            const data = (await res.json()) as MetaData;
            console.log("Meta data:", data);
            setMeta(data);
        } catch {
            toast.error("خطا در دریافت متادیتا");
        }
    }, []);


    // Fetch list
    const fetchList = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.set("weekStartJalali", weekStart);
            if (companyId) params.set("companyId", companyId);
            if (mealTypeId) params.set("mealTypeId", mealTypeId);
            if (statusId) params.set("statusId", statusId);
            if (search.trim()) params.set("search", search.trim());
            params.set("page", String(page));
            params.set("pageSize", String(PAGE_SIZE));

            const res = await fetch(`${API_URL}/api/admin/restaurant/reservations?${params.toString()}`, {
                credentials: "include",
            });
            if (!res.ok) throw new Error("fetch failed");
            const data = (await res.json()) as ApiListResponse;
            setRows(data.data);
            setTotalPages(data.meta.totalPages);
            setTotalCount(data.meta.total);
            // پاک کردن انتخاب‌ها با تغییر صفحه/فیلتر
            setSelectedIds([]);
        } catch {
            toast.error("خطا در دریافت رزروها");
        } finally {
            setLoading(false);
        }
    }, [API_URL, weekStart, companyId, mealTypeId, statusId, search, page]);

    useEffect(() => {
        fetchMeta();
    }, [fetchMeta]);

    useEffect(() => {
        fetchList();
    }, [fetchList]);

    // Week navigation
    const goPrevWeek = () => {
        setPage(1);
        setWeekStart((w) => jalaliAddDays(w, -7));
    };
    const goNextWeek = () => {
        setPage(1);
        setWeekStart((w) => jalaliAddDays(w, +7));
    };

    // Row selection
    const toggleSelect = (id: number) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };
    const selectAllCurrentPage = () => {
        const idsOnPage = rows.map((r) => r.id);
        setSelectedIds(idsOnPage);
    };
    const clearSelection = () => setSelectedIds([]);

    // Single status update
    const updateStatus = async (id: number, sId: number) => {
        try {
            await fetch(`${API_URL}/api/admin/restaurant/reservations/${id}/status`, {
                method: "PUT",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ statusId: sId }),
            });
            toast.success("وضعیت رزرو تغییر کرد");
            fetchList();
        } catch {
            toast.error("خطا در تغییر وضعیت");
        }
    };

    // Bulk: open dialog
    const openBulk = (sId: number) => {
        setPendingStatusId(sId);
        setBulkDialogOpen(true);
    };

    // Bulk: apply (selected or filtered)
    const applyBulk = async (mode: "selected" | "filtered") => {
        if (!pendingStatusId) return;

        try {
            if (mode === "selected") {
                if (selectedIds.length === 0) {
                    toast.warning("هیچ موردی انتخاب نشده است");
                    return;
                }
                const res = await fetch(`${API_URL}/api/admin/restaurant/reservations/bulk_status`, {
                    method: "PUT",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ statusId: pendingStatusId, ids: selectedIds }),
                });
                if (!res.ok) throw new Error();
            } else {
                // filtered
                const body = {
                    statusId: pendingStatusId,
                    scope: "filtered" as const,
                    filters: {
                        weekStartJalali: weekStart,
                        companyId: companyId ? Number(companyId) : undefined,
                        mealTypeId: mealTypeId ? Number(mealTypeId) : undefined,
                        statusId: statusId ? Number(statusId) : undefined,
                        search: search.trim() || undefined,
                    },
                };
                const res = await fetch(`${API_URL}/api/admin/restaurant/reservations/bulk_status`, {
                    method: "PUT",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                });
                if (!res.ok) throw new Error();
            }

            toast.success("عملیات گروهی انجام شد");
            setBulkDialogOpen(false);
            setPendingStatusId(null);
            fetchList();
        } catch {
            toast.error("خطا در عملیات گروهی");
        }
    };

    // Colored button helpers
    const btn = {
        approve: "bg-emerald-600 hover:bg-emerald-700 text-white",
        cancel: "bg-red-600 hover:bg-red-700 text-white",
        deliver: "bg-blue-600 hover:bg-blue-700 text-white",
        revert: "bg-gray-600 hover:bg-gray-700 text-white",
        soft: "bg-white/10 hover:bg-white/20 text-white",
    };

    // Mobile vs desktop: we reuse the previous layout approach (table for md+, cards for <md)
    return (
        <Card className="bg-white/10 border border-white/20 text-white">
            <CardHeader>
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                        <CardTitle
                            className="text-xl font-bold lg:text-3xl"
                        >رزروهای کاربران</CardTitle>
                    </div>
                    {/* Filters row */}
                    <div className="flex flex-wrap items-center gap-2 justify-end w-full lg:w-auto" dir="rtl">
                        {/* Week navigator */}
                        <div className="flex items-center gap-1">
                            <Button onClick={goPrevWeek} className={`${btn.soft} px-2`} title="هفته قبل">
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                            <div className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm">
                                هفته شروع: {weekStart}
                            </div>
                            <Button onClick={goNextWeek} className={`${btn.soft} px-2`} title="هفته بعد">
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Company */}
                        <Select value={companyId || "all"} onValueChange={(v) => setCompanyId(v === "all" ? "" : v)}>
                            <SelectTrigger className="w-40 bg-white/5 border-white/20 text-white">
                                <SelectValue placeholder="همه شرکت‌ها" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#001c4d] text-white border-white/20">
                                <SelectItem value="all">همه شرکت‌ها</SelectItem>
                                {meta?.companies?.map((c) => (
                                    <SelectItem key={c.id} value={String(c.id)}>
                                        {c.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Meal type */}
                        <Select value={mealTypeId || "all"} onValueChange={(v) => setMealTypeId(v === "all" ? "" : v)}>
                            <SelectTrigger className="w-36 bg-white/5 border-white/20 text-white">
                                <SelectValue placeholder="همه وعده‌ها" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#001c4d] text-white border-white/20">
                                <SelectItem value="all">همه وعده‌ها</SelectItem>
                                {meta?.mealTypes?.map((m) => (
                                    <SelectItem key={m.id} value={String(m.id)}>
                                        {m.DisplayName}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Status */}
                        <Select value={statusId || "all"} onValueChange={(v) => setStatusId(v === "all" ? "" : v)}>
                            <SelectTrigger className="w-40 bg-white/5 border-white/20 text-white">
                                <SelectValue placeholder="همه وضعیت‌ها" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#001c4d] text-white border-white/20">
                                <SelectItem value="all">همه وضعیت‌ها</SelectItem>
                                {meta?.statuses?.map((s) => (
                                    <SelectItem key={s.id} value={String(s.id)}>
                                        {s.nameFA}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>


                        {/* Search */}
                        <div className="relative">
                            <Filter className="absolute right-2 top-2.5 h-4 w-4 text-white/50 pointer-events-none" />
                            <Input
                                placeholder="جستجو نام کاربر..."
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                                className="w-44 bg-white/5 border-white/20 text-white placeholder:text-white/50 pr-8"
                            />
                        </div>
                    </div>

                    {/* Bulk actions + selection summary */}
                    <div className="flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
                        <div className="text-sm text-white/80" dir="rtl">
                            {totalCount > 0 ? (
                                <>
                                    مجموع نتایج: <span className="font-semibold">{totalCount}</span>
                                    {selectedIds.length > 0 && (
                                        <> • انتخاب‌شده: <span className="font-semibold">{selectedIds.length}</span></>
                                    )}
                                </>
                            ) : (
                                "نتیجه‌ای یافت نشد"
                            )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Button className={`${btn.approve}`} onClick={() => openBulk(2)}>تأیید همه</Button>
                            <Button className={`${btn.cancel}`} onClick={() => openBulk(3)}>لغو همه</Button>
                            <Button className={`${btn.deliver}`} onClick={() => openBulk(5)}>تحویل همه</Button>
                            <Button className={`${btn.revert}`} onClick={() => openBulk(1)}>بازگشت به رزرو</Button>

                            {/* select helpers */}
                            <Button variant="ghost" className="text-white/80 hover:text-white" onClick={selectAllCurrentPage}>
                                انتخاب همه‌ی این صفحه
                            </Button>
                            <Button variant="ghost" className="text-white/80 hover:text-white" onClick={clearSelection}>
                                لغو انتخاب
                            </Button>
                        </div>
                    </div>
                </div>
            </CardHeader>

            <CardContent dir="rtl">
                {loading ? (
                    <div className="flex justify-center p-10">
                        <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                ) : (
                    <>
                        {/* Desktop Table */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="min-w-full text-sm text-right border-separate border-spacing-y-6">
                                <thead>
                                    <tr className="text-white/70 text-sm">
                                        <th className="px-2">انتخاب</th>
                                        <th className="px-2">کاربر</th>
                                        <th className="px-2">شرکت</th>
                                        <th className="px-2">تاریخ</th>
                                        <th className="px-2">وعده</th>
                                        <th>
                                            غذاهای انتخابی
                                        </th>
                                        <th className="px-2">وضعیت</th>
                                        <th className="px-2 text-left">عملیات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((r) => (
                                        <tr key={r.id} className="bg-white/5 hover:bg-white/10 rounded-xl transition">
                                            <td className="px-2 align-middle">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.includes(r.id)}
                                                    onChange={() => toggleSelect(r.id)}
                                                    className="accent-[#D63A4F]"
                                                />
                                            </td>
                                            <td className="px-2 align-middle">{r.userName}</td>
                                            <td className="px-2 align-middle">{r.company}</td>
                                            <td className="px-2 align-middle">{r.date}</td>
                                            <td className="px-2 align-middle">{r.mealType}</td>
                                            <td className="px-2 align-middle">
                                                <div className="flex flex-col gap-1" >
                                                    {r.chosenDishes.map((d) => (
                                                        <div key={d.id} className="flex items-center gap-2">
                                                            {/* <img src={d.imageUrl} alt={d.name} className="w-8 h-8 rounded-md object-cover border border-white/20" /> */}
                                                            <span className="text-xs text-white/60">{d.quantity} پرس</span>
                                                            <span className="font-semibold">{d.name}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-2 align-middle">{r.status}</td>
                                            <td className="px-2 align-middle">
                                                <div className="flex gap-2 justify-start flex-wrap">
                                                    <Button size="sm" className={btn.approve} onClick={() => updateStatus(r.id, 2)}>تأیید</Button>
                                                    <Button size="sm" className={btn.cancel} onClick={() => updateStatus(r.id, 3)}>لغو</Button>
                                                    <Button size="sm" className={btn.deliver} onClick={() => updateStatus(r.id, 5)}>تحویل</Button>
                                                    <Button size="sm" className={btn.revert} onClick={() => updateStatus(r.id, 1)}>بازگشت</Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Cards */}
                        <div className="grid grid-cols-1 gap-4 md:hidden">
                            {rows.map((r) => (
                                <div key={r.id} className="bg-white/5 rounded-xl p-4 flex flex-col gap-2 shadow-md">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(r.id)}
                                                onChange={() => toggleSelect(r.id)}
                                                className="accent-[#D63A4F]"
                                            />
                                            <span className="font-semibold text-base">{r.userName}</span>
                                        </div>
                                        <span className="text-xs text-white/60">{r.company}</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-white/80">
                                        <span>تاریخ: {r.date}</span>
                                        <span>وعده: {r.mealType}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm">وضعیت:</span>
                                        <span className="text-sm font-semibold">{r.status}</span>
                                    </div>
                                    <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-white/10 mt-2">
                                        <Button size="sm" className={`flex-1 ${btn.approve}`} onClick={() => updateStatus(r.id, 2)}>تأیید</Button>
                                        <Button size="sm" className={`flex-1 ${btn.cancel}`} onClick={() => updateStatus(r.id, 3)}>لغو</Button>
                                        <Button size="sm" className={`flex-1 ${btn.deliver}`} onClick={() => updateStatus(r.id, 5)}>تحویل</Button>
                                        <Button size="sm" className={`flex-1 ${btn.revert}`} onClick={() => updateStatus(r.id, 1)}>بازگشت</Button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="mt-6">
                                <Pagination className="w-full">
                                    <PaginationContent className="flex flex-row items-center justify-center gap-2 w-full">
                                        <PaginationItem>
                                            <button
                                                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                                                disabled={page <= 1}
                                                className="px-2 py-1 sm:px-4 sm:py-2 text-sm sm:text-base rounded-lg bg-white/10 hover:bg-white/20 text-white disabled:opacity-50"
                                            >
                                                <span className="block sm:hidden">«</span>
                                                <span className="hidden sm:block text-sm">« صفحه قبلی</span>
                                            </button>
                                        </PaginationItem>

                                        <PaginationItem>
                                            <span className="text-sm sm:text-base px-2 py-1 sm:px-4 sm:py-2 rounded-lg text-white text-center">
                                                صفحه {page} از {totalPages}
                                            </span>
                                        </PaginationItem>

                                        <PaginationItem>
                                            <button
                                                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                                                disabled={page >= totalPages}
                                                className="px-2 py-1 sm:px-4 sm:py-2 text-sm sm:text-base rounded-lg bg-white/10 hover:bg-white/20 text-white disabled:opacity-50"
                                            >
                                                <span className="block sm:hidden">»</span>
                                                <span className="hidden sm:block text-sm">صفحه بعدی »</span>
                                            </button>
                                        </PaginationItem>
                                    </PaginationContent>
                                </Pagination>
                            </div>
                        )}
                    </>
                )}
            </CardContent>

            {/* Bulk dialog */}
            <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
                <DialogContent className="sm:max-w-md bg-[#0b1b46] text-white border border-white/20">
                    <DialogHeader>
                        <DialogTitle>اعمال عملیات گروهی</DialogTitle>
                        <DialogDescription className="text-white/70">
                            عملیات روی کدام رکوردها اعمال شود؟
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-2 text-sm" dir="rtl">
                        <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                            <div>فیلتر فعلی:</div>
                            <div className="text-white/80 mt-1">
                                هفته شروع: {weekStart}
                                {companyId && <> • شرکت: {meta?.companies.find(c => String(c.id) === companyId)?.name}</>}
                                {mealTypeId && <> • وعده: {meta?.mealTypes.find(m => String(m.id) === mealTypeId)?.DisplayName}</>}
                                {statusId && <> • وضعیت: {meta?.statuses.find(s => String(s.id) === statusId)?.nameFA}</>}
                                {search && <> • جستجو: «{search}»</>}
                            </div>
                        </div>
                        <div className="text-white/80">
                            انتخاب‌شده‌ها: {selectedIds.length} مورد
                        </div>
                    </div>
                    <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between">
                        <div className="flex gap-2">
                            <Button className={btn.approve} onClick={() => applyBulk("selected")}>اعمال روی انتخاب‌شده‌ها</Button>
                            <Button className={btn.deliver} onClick={() => applyBulk("filtered")}>اعمال روی نتایج فیلتر</Button>
                        </div>
                        <DialogClose asChild>
                            <Button variant="ghost" className="text-white/80 hover:text-white">انصراف</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
