"use client";

import { Button } from "@/components/ui/button";
import { TableHead } from "@/components/ui/table";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SortableHeaderProps {
    columnKey: string;
    title: string;
    sortConfig: { key: string; direction: 'asc' | 'desc' };
    onSort: (key: string) => void;
    className?: string; // 1. Add className to the props
}

export const SortableHeader = ({ columnKey, title, sortConfig, onSort, className }: SortableHeaderProps) => {
    const isSorted = sortConfig.key === columnKey;
    const SortIcon = isSorted ? (sortConfig.direction === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;

    return (
        // 2. Apply the className here using the 'cn' utility
        <TableHead className={cn("text-right text-white", className)}>
            <Button
                variant="ghost"
                onClick={() => onSort(columnKey)}
                className={cn(
                    "p-0 hover:bg-transparent text-white hover:text-[#e95212]",
                    isSorted && "text-[#D63A4F] font-bold hover:text-[#D63A4F]",
                )}
            >
                {title}
                <SortIcon className="mr-2 h-4 w-4" />
            </Button>
        </TableHead>
    );
};