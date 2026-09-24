"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ResultsTable } from "./ResultsTable";
import { ChartWidget } from "./ChartWidget";
import type { ReportDataRow, ChartConfig } from "@/types";
import { BarChart2, Save, Loader2 } from "lucide-react";

export interface ResultsCardProps {
    reportData: ReportDataRow[];
    chartConfig: ChartConfig | null;
    onGenerateChart: (chartPrompt: string) => Promise<void>;
    onSave: () => Promise<void>;
    isChartLoading: boolean;
    isSaveLoading: boolean;
    chartPrompt: string;
    setChartPrompt: (prompt: string) => void;
    onReset?: () => void;
}

export const ResultsCard = ({
    reportData,
    chartConfig,
    onGenerateChart,
    onSave,
    isChartLoading,
    isSaveLoading,
    chartPrompt,
    setChartPrompt,
    onReset,
}: ResultsCardProps) => {
    return (
        <Card className="bg-white/5 backdrop-blur-lg border border-white/20 text-white animate-fadeIn p-4 sm:p-6">
            <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                    <CardTitle className="text-lg sm:text-xl">نتایج گزارش</CardTitle>
                    <div className="flex flex-row justify-end space-x-2">
                        {onReset && (
                            <Button
                                onClick={onReset}
                                variant="ghost"
                                className="bg-[#D63A4F] hover:bg-red-700 cursor-pointer hover:text-white"
                            >
                                بازنشانی نمودار
                            </Button>
                        )}
                        <Button
                            onClick={onSave}
                            variant="ghost"
                            className="bg-[#D63A4F] hover:bg-red-700 cursor-pointer hover:text-white"
                            disabled={isSaveLoading}
                        >
                            <Save className="ml-2 h-4 w-4 hidden sm:inline-block" />
                            {isSaveLoading ? "در حال ذخیره..." : "ذخیره این گزارش"}
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="mb-6">
                    <h3 className="font-semibold text-lg mb-2">داده‌های جدول</h3>
                    <div className="overflow-x-auto">
                        <ResultsTable data={reportData} />
                    </div>
                </div>
                <div className="border-t border-white/10 pt-6">
                    {chartConfig ? (
                        <div>
                            <h3 className="font-semibold text-lg mb-4">نمودار</h3>
                            <div className="h-[250px] sm:h-[350px] p-4 border border-white/10 rounded-lg">
                                <ChartWidget widget={{ id: 'preview', chartConfig: { ...chartConfig, data: reportData }, reportName: '' }} />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <Label htmlFor="chart-prompt" className="text-lg font-semibold">مرحله ۲: ساخت نمودار (اختیاری)</Label>
                            <Textarea
                                id="chart-prompt"
                                value={chartPrompt}
                                onChange={(e) => setChartPrompt(e.target.value)}
                                placeholder="مثال: یک نمودار دایره‌ای"
                                className="bg-white/10 border-white/20 placeholder:text-white/40"
                            />
                            <div className="flex justify-end pt-2">
                                <Button
                                    onClick={() => onGenerateChart(chartPrompt)}
                                    disabled={isChartLoading}
                                    className="bg-indigo-600 hover:bg-indigo-700 cursor-pointer"
                                >
                                    {isChartLoading ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <BarChart2 className="ml-2 h-4 w-4" />}
                                    {isChartLoading ? "در حال ساخت..." : "ساخت نمودار"}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};