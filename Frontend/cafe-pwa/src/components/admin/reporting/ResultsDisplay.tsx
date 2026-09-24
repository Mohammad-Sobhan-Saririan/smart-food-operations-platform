"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartWidget } from "./ChartWidget";
import { ResultsTable } from "./ResultsTable";
import type { ReportDataRow, ChartConfig } from "@/types";
import { Save } from "lucide-react";

interface ResultsDisplayProps {
    chartConfig: ChartConfig;
    reportData: ReportDataRow[];
    onSave: () => void;
    isLoading: boolean;
}

export const ResultsDisplay = ({ chartConfig, reportData, onSave, isLoading }: ResultsDisplayProps) => (
    <Card className="bg-white/5 backdrop-blur-lg border border-white/20 text-white animate-fadeIn">
        <CardHeader>
            <div className="flex justify-between items-center">
                <CardTitle>مرحله ۲: نتیجه نهایی</CardTitle>
                <Button onClick={onSave} variant="outline" className="bg-transparent hover:bg-white/10 " disabled={isLoading}>
                    <Save className="ml-2 h-4 w-4" />
                    {isLoading ? "در حال ذخیره..." : "ذخیره این گزارش"}
                </Button>
            </div>
        </CardHeader>
        <CardContent>
            <div className="h-[350px] border border-white/10 rounded-lg p-4 mb-6">
                <ChartWidget widget={{ id: 'preview', chartConfig: { ...chartConfig, data: reportData }, reportName: '' }} />
            </div>
            <div>
                <h3 className="font-semibold text-lg mb-2">داده‌های جدول</h3>
                <ResultsTable data={reportData} />
            </div>
        </CardContent>
    </Card>
);