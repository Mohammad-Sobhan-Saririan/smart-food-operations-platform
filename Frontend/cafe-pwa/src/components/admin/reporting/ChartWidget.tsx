"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import type { ChartConfig, ReportDataRow } from '@/types';


interface Widget {

    id: string;
    reportName: string;
    chartConfig: ChartConfig & { data?: ReportDataRow[] };
}

const COLORS = ['#4f46e5', '#818cf8', '#a78bfa', '#f472b6', '#fb923c'];

export const ChartWidget = ({ widget }: { widget: Widget }) => {
    const { chartConfig, reportName } = widget;
    // The data now lives inside the chartConfig
    const data = chartConfig.data || [];

    return (
        <div className="w-full h-full flex flex-col text-white">
            <h3 className="font-semibold mb-4 text-center">{reportName}</h3>
            <ResponsiveContainer width="100%" height="100%">
                {chartConfig.chartType === 'bar' ? (
                    <BarChart data={data}>
                        <XAxis dataKey={chartConfig.xAxisKey} stroke="rgba(255, 255, 255, 0.7)" fontSize={12} />
                        <YAxis stroke="rgba(255, 255, 255, 0.7)" fontSize={12} />
                        <Tooltip contentStyle={{ backgroundColor: '#001233', border: '1px solid rgba(255,255,255,0.2)' }} />
                        <Legend />
                        {chartConfig.dataKeys.map((key, index) => (
                            <Bar key={key} dataKey={key} fill={chartConfig.colors[index % chartConfig.colors.length]} />
                        ))}
                    </BarChart>
                ) : chartConfig.chartType === 'pie' ? (
                    <PieChart>
                        {/* This now uses the dynamic keys from the AI's response */}
                        <Pie data={data} dataKey={chartConfig.dataKeys[0]} nameKey={chartConfig.xAxisKey} cx="50%" cy="50%" outerRadius="80%" label>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#001233', border: '1px solid rgba(255,255,255,0.2)' }} />
                        <Legend />
                    </PieChart>
                ) : (
                    <div className="flex items-center justify-center h-full text-white/50">نمودار پشتیبانی نمی‌شود</div>
                )}
            </ResponsiveContainer>
        </div>
    );
};