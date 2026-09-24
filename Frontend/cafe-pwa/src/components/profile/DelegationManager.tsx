"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, UserPlus, Trash2, ShieldCheck, Search, Info, UserX, AlertCircle, CalendarDays, Mail } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// ایمپورت‌های مربوط به تاریخ‌پیکر شمسی
import DatePicker from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
// import transition from "react-element-popper/animations/transition";
import "react-multi-date-picker/styles/layouts/mobile.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export function DelegationManager() {
    const [delegates, setDelegates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    const [selectedUser, setSelectedUser] = useState<any | null>(null);
    const [priority, setPriority] = useState("1");
    const [endDate, setEndDate] = useState<any>(null); // برای تاریخ‌پیکر

    const fetchDelegates = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/restaurant/delegates`, { credentials: "include" });
            setDelegates(await res.json());
        } catch (e) { toast.error("خطا در بارگذاری لیست"); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchDelegates(); }, []);

    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (searchQuery.length >= 2) {
                setIsSearching(true);
                setHasSearched(true);
                try {
                    const res = await fetch(`${API_URL}/api/restaurant/users/search?q=${encodeURIComponent(searchQuery)}`, { credentials: "include" });
                    setSearchResults(await res.json());
                } catch (e) { } finally { setIsSearching(false); }
            } else {
                setSearchResults([]);
                setHasSearched(false);
            }
        }, 400);
        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    const handleAddDelegate = async () => {
        if (!selectedUser) return;

        // تبدیل شیء تاریخ به رشته شمسی YYYY/MM/DD برای ارسال به بک‌ند
        const formattedDate = endDate ? endDate.format?.("YYYY/MM/DD") : null;

        try {
            const res = await fetch(`${API_URL}/api/restaurant/delegates`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    delegateId: selectedUser.id,
                    priority: Number(priority),
                    endDate: formattedDate
                }),
                credentials: "include"
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);

            toast.success("جانشین با موفقیت اضافه شد");
            setSelectedUser(null);
            setSearchQuery("");
            setEndDate(null);
            fetchDelegates();
        } catch (err: any) { toast.error(err.message); }
    };

    const handleRemove = async (id: number) => {
        try {
            const res = await fetch(`${API_URL}/api/restaurant/delegates/${id}`, { method: "DELETE", credentials: "include" });
            if (!res.ok) throw new Error();
            toast.success("جانشین حذف و اولویت‌ها بازتنظیم شدند");
            fetchDelegates();
        } catch (e) { toast.error("خطا در عملیات حذف"); }
    };

    return (
        <div className="space-y-6 text-right" style={{ direction: "rtl" }}>

            {/* راهنما */}
            <Card className="bg-indigo-500/10 border-indigo-500/20 text-white overflow-hidden">
                <CardContent className="p-5 flex items-start gap-4">
                    <div className="p-3 bg-indigo-500/20 rounded-2xl">
                        <Info className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div className="space-y-1">
                        <h4 className="font-bold text-indigo-200 text-sm">سیستم تفویض اختیار</h4>
                        <p className="text-xs text-indigo-100/60 leading-relaxed">
                            در این بخش می‌توانید افرادی را انتخاب کنید تا فرآیند رزرو غذای شما را انجام دهند.
                            <strong> اولویت ۱ </strong> بالاترین سطح جانشینی است.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* جستجو و افزودن */}
            <Card className="bg-white/5 border-white/10 text-white backdrop-blur-md !overflow-visible relative z-30">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-indigo-400" /> انتخاب جانشین جدید
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 !overflow-visible">
                    <div className="relative !overflow-visible">
                        <div className="relative z-40">
                            <Search className="absolute right-3 top-3 w-4 h-4 text-white/40" />
                            <Input
                                placeholder="جستجوی نام، شماره کارمندی یا ایمیل..."
                                className="bg-white/5 border-white/10 pr-10"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {isSearching && <Loader2 className="absolute left-3 top-3 w-4 h-4 animate-spin text-indigo-400" />}
                        </div>

                        {/* لیست نتایج جستجو */}
                        <AnimatePresence>
                            {hasSearched && !isSearching && (
                                <motion.div
                                    initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                    className="absolute left-0 right-0 top-full mt-2 z-[100] bg-[#121212] border border-white/15 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-2xl"
                                >
                                    {searchResults.length > 0 ? (
                                        searchResults.map(u => (
                                            <div
                                                key={u.id}
                                                onClick={() => { setSelectedUser(u); setSearchResults([]); setHasSearched(false); setSearchQuery(""); }}
                                                className="p-4 hover:bg-white/10 cursor-pointer flex justify-between items-center border-b border-white/5 last:border-0 transition-colors"
                                            >
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-sm">{u.name}</span>
                                                    <span className="text-[10px] text-white/40">{u.email}</span>
                                                </div>
                                                <span className="text-xs bg-white/5 px-2 py-1 rounded-lg border border-white/10">{u.employeeNumber}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-10 text-center text-white/30 text-sm">کاربری یافت نشد</div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* فرم تنظیمات جانشین (با دیت‌پیکر جدید) */}
                    <AnimatePresence>
                        {selectedUser && (
                            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="pt-4 border-t border-white/10">
                                <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                    <div className="md:col-span-1">
                                        <p className="text-[10px] text-white/40 mb-1.5 mr-1">جانشین:</p>
                                        <div className="bg-white/5 p-2.5 rounded-xl border border-white/10 font-bold text-indigo-300 text-sm truncate">{selectedUser.name}</div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-white/40 mb-1.5 mr-1">رتبه اولویت:</p>
                                        <Input type="number" min="1" value={priority} onChange={e => setPriority(e.target.value)} className="bg-white/5 border-white/10 h-10" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-white/40 mb-1.5 mr-1">اعتبار تا تاریخ:</p>
                                        <div className="relative">
                                            <DatePicker
                                                value={endDate}
                                                onChange={setEndDate}
                                                calendar={persian}
                                                locale={persian_fa}
                                                // animations={[transition()]}
                                                calendarPosition="bottom-right"
                                                inputClass="bg-white/5 border border-white/10 h-10 w-full rounded-xl px-4 py-2 text-sm text-left font-mono focus:outline-none focus:ring-2 ring-indigo-500/30 transition-all"
                                                containerClassName="w-full"
                                                placeholder="انتخاب تاریخ..."
                                            />
                                            <CalendarDays className="absolute left-3 top-2.5 w-4 h-4 text-white/20 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button onClick={() => setSelectedUser(null)} variant="ghost" className="h-10 text-white/40">انصراف</Button>
                                        <Button onClick={handleAddDelegate} className="h-10 flex-1 bg-indigo-600 hover:bg-indigo-700">ثبت</Button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </CardContent>
            </Card>

            {/* جدول نمایش لیست جانشین‌ها */}
            <Card className="bg-white/5 border-white/10 text-white backdrop-blur-md overflow-hidden">
                <CardHeader className="bg-white/[0.02] border-b border-white/5">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-emerald-400" /> جانشین‌های فعلی
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? <div className="flex justify-center py-10 text-white/20"><Loader2 className="animate-spin" /></div> :
                        delegates.length === 0 ? <p className="py-16 text-center text-white/20">لیست خالی است</p> : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-right">
                                    <thead className="text-white/30 text-[10px] uppercase tracking-widest bg-white/[0.01]">
                                        <tr>
                                            <th className="px-6 py-4 font-medium">مشخصات</th>
                                            <th className="px-6 py-4 font-medium">رتبه</th>
                                            <th className="px-6 py-4 font-medium">اعتبار</th>
                                            <th className="px-6 py-4 font-medium text-left">عملیات</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {delegates.map(d => (
                                            <tr key={d.delegationId} className="hover:bg-white/[0.02] transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-sm text-white/90">{d.name}</div>
                                                    <div className="text-[10px] text-white/30">{d.employeeNumber}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">رتبه {d.priority}</span>
                                                </td>
                                                <td className="px-6 py-4 text-[11px] text-white/50 font-mono" style={{ direction: 'ltr' }}>{d.endDate || 'نامحدود'}</td>
                                                <td className="px-6 py-4 text-left">
                                                    <Button size="icon" variant="ghost" onClick={() => handleRemove(d.delegationId)} className="text-white/10 hover:text-red-400 hover:bg-red-400/10">
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                </CardContent>
            </Card>
        </div>
    );
}