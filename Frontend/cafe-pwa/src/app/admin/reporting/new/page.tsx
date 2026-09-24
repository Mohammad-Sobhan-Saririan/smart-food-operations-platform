"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from "sonner";
import type { ReportDataRow, ChartConfig } from "@/types";
import { QueryInputCard } from "@/components/admin/reporting/QueryInputCard";
import { ResultsCard } from "@/components/admin/reporting/ResultsCard";
import { Loader2 } from "lucide-react";

export default function ReportingWorkshopPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [isChartLoading, setIsChartLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [nlQuery, setNlQuery] = useState('');
    const [reportData, setReportData] = useState<ReportDataRow[] | null>(null);
    const [chartConfig, setChartConfig] = useState<ChartConfig | null>(null);
    const [generatedSql, setGeneratedSql] = useState('');
    const [chartPrompt, setChartPrompt] = useState(''); // This state is now correctly managed

    const router = useRouter();
    const searchParams = useSearchParams();

    const handleRunQuery = useCallback(async (queryToRun: string) => {
        if (!queryToRun) { toast.warning("لطفا سوال خود را وارد کنید."); return; }
        setIsLoading(true);
        setReportData(null);
        setChartConfig(null);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/reports/run`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
                body: JSON.stringify({ nl_query: queryToRun }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            setReportData(data.results);
            setGeneratedSql(data.sqlQuery);
            toast.success("داده‌های گزارش با موفقیت دریافت شد.");
        } catch (error) {
            if (error instanceof Error) {
                toast.error(error.message);
            } else {
                toast.error("خطایی رخ داده است!");
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const queryFromUrl = searchParams.get('query');
        if (queryFromUrl) {
            const decodedQuery = decodeURIComponent(queryFromUrl);
            setNlQuery(decodedQuery);
            // We now wait for the user to click "Run Report" again, which is a clearer UX.
            // The text area is pre-filled, giving them a chance to modify it before running.
            router.replace('/admin/reporting/new'); // Clean URL
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run only once on initial load

    const handleGenerateChart = async () => { // The chart prompt is now read from state
        if (!reportData) return;
        setIsChartLoading(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/reports/generate-chart`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
                body: JSON.stringify({ data: reportData, userQuery: nlQuery, chartPrompt }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            setChartConfig(data.chartConfig);
            toast.success("نمودار با موفقیت ساخته شد.");
        } catch (error) {
            if (error instanceof Error) {
                toast.error(error.message);
            } else {
                toast.error("خطایی رخ داده است!");
            }
        } finally {
            setIsChartLoading(false);
        }
    };

    // This function now correctly reads from the state, not from a prop
    const handleSaveReport = async () => {
        const reportName = prompt("لطفا یک نام برای این گزارش وارد کنید:");
        if (!reportName) return;
        setIsSaving(true);
        try {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/reports/save`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
                body: JSON.stringify({
                    name: reportName,
                    nl_query: nlQuery,
                    sql_query: generatedSql,
                    viz_type: chartConfig ? chartConfig.chartType : 'table',
                    chart_config: chartConfig ? JSON.stringify(chartConfig) : null,
                }),
            });
            toast.success("گزارش با موفقیت ذخیره شد!");
        } catch (error) {
            if (error instanceof Error) {
                toast.error(error.message);
            } else {
                toast.error("خطایی رخ داده است!");
            }
        } finally {
            setIsSaving(false);
        }
    };

    // This function resets the page to its initial state
    const handleReset = () => {
        setNlQuery('');
        setReportData(null);
        setChartConfig(null);
        setGeneratedSql('');
        setIsLoading(false);
    };

    return (
        <div className="space-y-8" style={{ direction: 'rtl' }}>
            <QueryInputCard
                nlQuery={nlQuery}
                setNlQuery={setNlQuery}
                onRun={() => handleRunQuery(nlQuery)}
                isLoading={isLoading}
            />

            {isLoading && (
                <div className="text-center text-white">
                    <Loader2 className="w-12 h-12 animate-spin mx-auto text-teal-300" />
                    <p className="text-lg font-semibold mt-2 text-white/80">در حال دریافت داده‌ها...</p>
                </div>
            )}

            {reportData && !isLoading && (
                <ResultsCard
                    reportData={reportData}
                    chartConfig={chartConfig}
                    onGenerateChart={() => handleGenerateChart()} // Pass the handler
                    onSave={() => handleSaveReport()} // Corrected save handler
                    isChartLoading={isChartLoading}
                    isSaveLoading={isSaving}
                    onReset={handleReset}
                    // --- THIS IS THE KEY FIX ---
                    // We now correctly pass the state and the state setter function
                    chartPrompt={chartPrompt}
                    setChartPrompt={setChartPrompt}
                />
            )}
        </div>
    );
}