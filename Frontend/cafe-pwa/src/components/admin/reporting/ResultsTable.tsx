"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ReportDataRow } from "@/types";

export const ResultsTable = ({ data }: { data: ReportDataRow[] }) => {
    if (!data || data.length === 0) {
        return <p className="text-white/70">گزارش نتیجه‌ای در بر نداشت.</p>;
    }

    // Get the headers from the first row of data
    const headers = Object.keys(data[0]);

    return (
        <div className="rounded-lg border border-white/10 mt-4 max-h-[400px] overflow-y-auto">
            <Table>
                <TableHeader>
                    <TableRow className="border-b-white/10 hover:bg-transparent">
                        {headers.map(header => (
                            <TableHead key={header} className="text-right text-white font-bold">{header}</TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((row, rowIndex) => (
                        <TableRow key={rowIndex} className="border-b-white/10">
                            {headers.map(header => (
                                <TableCell key={header} className="text-right font-mono text-sm">
                                    {row[header]}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
};