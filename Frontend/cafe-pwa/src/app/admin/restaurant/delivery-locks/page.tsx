"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectValue, SelectItem } from "@/components/ui/select";
import { Loader2, Copy, Trash2, PlusCircle, Clock } from "lucide-react";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

type LockRow = {
    id: number;
    token: string;
    userId: string;
    userName: string;
    filters: string;
    expiresAt: string;
    createdAt: string;
    isRevoked: number;
    deletedAt?: string | null;
};

export default function DeliveryLocksPage() {
    const router = useRouter();
    const [locks, setLocks] = useState<LockRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
    const [weeks, setWeeks] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);

    const [form, setForm] = useState({
        userId: "",
        weekStartJalali: "",
        day: 0,
        companyId: "",
        mealTypeId: "",
        ttlMinutes: 30,
    });

    const handleCriticalError = (msg: string) => {
        toast.error(msg || "دسترسی نامعتبر است");
        setError(msg);
        setTimeout(() => router.push("/admin"), 2000);
    };

    const fetchWeeks = async () => {
        try {
            const res = await fetch(`${API_URL}/api/admin/restaurant/weeks`, { credentials: "include" });
            const data = await res.json();
            if (data?.message?.includes("کد قفل نامعتبر")) {
                handleCriticalError(data.message);
                return;
            }
            setWeeks(Array.isArray(data) ? data : []);
        } catch {
            handleCriticalError("خطا در دریافت هفته‌ها");
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await fetch(`${API_URL}/api/admin/users`, { credentials: "include" });
            const data = await res.json();
            if (data?.message?.includes("کد قفل نامعتبر")) {
                handleCriticalError(data.message);
                return;
            }
            setUsers(Array.isArray(data) ? data : []);
        } catch {
            handleCriticalError("خطا در دریافت کاربران");
        }
    };

    const fetchLocks = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/admin/restaurant/delivery/locks`, {
                credentials: "include",
            });
            const data = await res.json();
            if (data?.message?.includes("کد قفل نامعتبر")) {
                handleCriticalError(data.message);
                return;
            }
            setLocks(Array.isArray(data) ? data : []);
        } catch {
            handleCriticalError("خطا در دریافت لینک‌ها");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        Promise.all([fetchLocks(), fetchUsers(), fetchWeeks()]).finally(() => setLoading(false));
    }, []);

    const createLock = async () => {
        if (!form.userId || !form.weekStartJalali) {
            toast.warning("کاربر و شروع هفته را انتخاب کنید");
            return;
        }
        setCreating(true);
        try {
            const res = await fetch(`${API_URL}/api/admin/restaurant/delivery/locks`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: form.userId,
                    filters: {
                        weekStartJalali: form.weekStartJalali,
                        day: form.day,
                        companyId: form.companyId ? Number(form.companyId) : undefined,
                        mealTypeId: form.mealTypeId ? Number(form.mealTypeId) : undefined,
                    },
                    ttlMinutes: form.ttlMinutes,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                if (data?.message?.includes("کد قفل")) return handleCriticalError(data.message);
                throw new Error(data.message);
            }
            toast.success("لینک جدید ساخته شد");
            fetchLocks();
        } catch (e: any) {
            toast.error(e.message || "خطا در ساخت لینک");
        } finally {
            setCreating(false);
        }
    };

    const revokeLock = async (id: number) => {
        if (!confirm("آیا از لغو لینک اطمینان دارید؟")) return;
        try {
            const res = await fetch(`${API_URL}/api/admin/restaurant/delivery/locks/${id}/revoke`, {
                method: "PUT",
                credentials: "include",
            });
            const data = await res.json();
            if (data?.message?.includes("کد قفل")) return handleCriticalError(data.message);
            toast.success("لینک لغو شد");
            fetchLocks();
        } catch {
            handleCriticalError("خطا در لغو لینک");
        }
    };

    if (loading && !error)
        return (
            <div className="flex justify-center items-center min-h-[70vh] text-white">
                <Loader2 className="h-10 w-10 animate-spin text-red-400" />
            </div>
        );

    if (error)
        return (
            <div className="flex flex-col justify-center items-center min-h-[70vh] text-center text-white/70 gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-red-400" />
                <p>خطا: {error}</p>
                <p>در حال بازگشت به داشبورد...</p>
            </div>
        );

    return (
        <Card className="bg-white/10 border border-white/20 text-white" dir="rtl">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                    <Clock className="h-5 w-5" />
                    مدیریت لینک‌های تحویل غذا
                </CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* فرم ساخت لینک */}
                <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex flex-col gap-4">
                    <h3 className="font-semibold text-base border-b border-white/10 pb-2">
                        صدور لینک جدید تحویل غذا
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-right">
                        <div className="flex flex-col gap-1">
                            <label className="text-sm text-white/70">کاربر</label>
                            <Select value={form.userId} onValueChange={(v) => setForm({ ...form, userId: v })}>
                                <SelectTrigger className="bg-white/5 border-white/20 text-white">
                                    <SelectValue placeholder="انتخاب کاربر" />
                                </SelectTrigger>
                                <SelectContent className="bg-[#001c4d] text-white border-white/20">
                                    {users.map((u) => (
                                        <SelectItem key={u.id} value={u.id}>
                                            {u.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-sm text-white/70">شروع هفته</label>
                            <Select
                                value={form.weekStartJalali}
                                onValueChange={(v) => setForm({ ...form, weekStartJalali: v })}
                            >
                                <SelectTrigger className="bg-white/5 border-white/20 text-white">
                                    <SelectValue placeholder="انتخاب هفته" />
                                </SelectTrigger>
                                <SelectContent className="bg-[#001c4d] text-white border-white/20">
                                    {weeks.map((w) => (
                                        <SelectItem key={w} value={w}>
                                            {w}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-sm text-white/70">روز هفته</label>
                            <Select
                                value={String(form.day)}
                                onValueChange={(v) => setForm({ ...form, day: Number(v) })}
                            >
                                <SelectTrigger className="bg-white/5 border-white/20 text-white">
                                    <SelectValue placeholder="انتخاب روز" />
                                </SelectTrigger>
                                <SelectContent className="bg-[#001c4d] text-white border-white/20">
                                    <SelectItem value="0">شنبه</SelectItem>
                                    <SelectItem value="1">یکشنبه</SelectItem>
                                    <SelectItem value="2">دوشنبه</SelectItem>
                                    <SelectItem value="3">سه‌شنبه</SelectItem>
                                    <SelectItem value="4">چهارشنبه</SelectItem>
                                    <SelectItem value="5">پنج‌شنبه</SelectItem>
                                    <SelectItem value="6">جمعه</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-sm text-white/70">مدت اعتبار (دقیقه)</label>
                            <Input
                                type="number"
                                min={10}
                                max={720}
                                placeholder="مثلاً ۳۰"
                                value={form.ttlMinutes}
                                onChange={(e) => setForm({ ...form, ttlMinutes: Number(e.target.value) })}
                                className="bg-white/5 border-white/20 text-white placeholder:text-white/50"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <Button
                            onClick={createLock}
                            disabled={creating}
                            className="bg-[#D63A4F] hover:bg-red-700 mt-3 flex items-center gap-2 px-6"
                        >
                            {creating ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <PlusCircle className="h-4 w-4" />
                            )}
                            ایجاد لینک
                        </Button>
                    </div>
                </div>

                {/* لیست لینک‌ها */}
                {locks.length === 0 ? (
                    <p className="text-center text-white/70">هیچ لینکی ثبت نشده است.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {locks.map((lock) => {
                            const expMs = Number(lock.expiresAt);
                            const expDate = Number.isFinite(expMs) ? new Date(expMs) : new Date(lock.expiresAt);
                            const expired = Date.now() > expDate.getTime();
                            return (
                                <div
                                    key={lock.id}
                                    className={`p-4 rounded-xl border transition-all duration-200 ${lock.isRevoked
                                        ? "border-red-400/40 bg-red-600/10"
                                        : expired
                                            ? "border-yellow-400/40 bg-yellow-600/10"
                                            : "border-white/20 bg-white/5 hover:bg-white/10"
                                        } flex flex-col gap-2`}
                                >
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-medium">{lock.userName || "بدون نام"}</h3>
                                        <span className="text-xs opacity-70">
                                            {new Date(lock.createdAt).toLocaleDateString("fa-IR")}
                                        </span>
                                    </div>
                                    <p className="text-xs opacity-70">
                                        انقضا:{" "}
                                        {expDate.toLocaleString("fa-IR", {
                                            timeZone: "Asia/Tehran",
                                            hour12: false,
                                        })}
                                    </p>
                                    <p className="text-xs opacity-60">
                                        وضعیت:{" "}
                                        {lock.isRevoked ? "لغو شده" : expired ? "منقضی" : "فعال"}
                                    </p>

                                    <div className="flex gap-2 mt-2 flex-wrap">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                navigator.clipboard.writeText(
                                                    `${window.location.origin}/rst_manager/restaurant/delivery?lockCode=${lock.token}`
                                                );
                                                toast.success("لینک کپی شد");
                                            }}
                                            className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
                                        >
                                            <Copy size={14} />
                                            کپی لینک
                                        </Button>
                                        {!lock.isRevoked && !expired && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => revokeLock(lock.id)}
                                                className="flex items-center gap-1 text-red-400 hover:text-red-300"
                                            >
                                                <Trash2 size={14} />
                                                لغو
                                            </Button>
                                        )}
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
