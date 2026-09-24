"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, PlusCircle, Trash2, History } from "lucide-react";
import type { SavedReport } from "@/types";

export default function SavedReportsPage() {
    const [reports, setReports] = useState<SavedReport[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const fetchSavedReports = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/reports/saved`, { credentials: 'include' });
            if (!res.ok) throw new Error("Failed to fetch saved reports.");
            const data = await res.json();
            setReports(data);
        } catch (error) {
            if (error instanceof Error) {
                toast.error(error.message);
            } else {
                toast.error("خطایی رخ داده است!");
            }
        }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchSavedReports(); }, [fetchSavedReports]);


    const handleDeleteReport = async (reportId: string) => {
        if (!confirm("Are you sure you want to delete this report?")) return;
        try {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/reports/${reportId}`, { method: 'DELETE', credentials: 'include' });
            toast.success("Report deleted successfully.");
            // This will now work correctly and refresh the list
            fetchSavedReports();
        } catch (error) {
            if (error instanceof Error) {
                toast.error(error.message);
            } else {
                toast.error("خطایی رخ داده است!");
            }
        }
    };

    const handleRerun = (nl_query: string) => {
        const params = new URLSearchParams({ query: nl_query });
        router.push(`/admin/reporting/new?${params.toString()}`);
    };

    if (loading) return <div className="flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-white" /></div>;

    return (
        <div style={{ direction: 'rtl' }}>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-white text-lg md:text-2xl lg:text-3xl"
                >گزارش‌های ذخیره شده</h2>
                <Button
                    onClick={() => router.push('/admin/reporting/new')}
                    className="bg-[#D63A4F] hover:bg-red-700 text-xs md:text-base px-3 py-2 lg:text-sm font-semibold"
                >
                    <PlusCircle className="ml-2 h-4 w-4 md:h-5 md:w-5 sm:hide lg:inline-block md:inline-block hidden" />
                    ایجاد گزارش جدید
                </Button>
            </div>
            {reports.length === 0 ? (
                <p className="text-white/70">هنوز هیچ گزارشی ذخیره نشده است. برای شروع یک گزارش جدید ایجاد کنید.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {reports.map(report => (
                        <Card key={report.id} className="bg-white/5 backdrop-blur-lg border border-white/20 text-white flex flex-col">
                            <CardHeader>
                                <CardTitle className="text-sm sm:text-lg font-semibold">
                                    نام گزارش: <span className="text-indigo-400 text-base sm:text-base lg:text-xl font-bold">{report.name}</span>
                                </CardTitle>
                                <CardDescription className="text-white/60 pt-1 text-sm sm:text-base">
                                    تاریخ ایجاد: {new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date(report.createdAt))}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                درخواست کاربر:
                                <p className="text-sm text-white/80 border-r-2 border-indigo-400 pr-3 italic">
                                    {report.nl_query}
                                </p>
                            </CardContent>
                            <CardFooter className="flex justify-end gap-2 border-t border-white/10 pt-4">
                                <Button variant="ghost" size="icon" className="text-red-500/80 hover:text-red-500" onClick={() => handleDeleteReport(report.id)}><Trash2 size={18} /></Button>
                                <Button onClick={() => handleRerun(report.nl_query)} className="bg-[#D63A4F] hover:bg-red-700 text-xs sm:text-sm font-semibold">
                                    <History className="ml-2 h-4 w-4 hidden sm:inline-block" />
                                    اجرای مجدد
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}