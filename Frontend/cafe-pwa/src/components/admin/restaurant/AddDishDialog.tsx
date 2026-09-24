"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ArrowDownAZ, ArrowUpAZ, Search } from "lucide-react";
import type { RstDish } from "@/types";

interface AddDishDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (selectedDishIds: number[]) => void;
    allDishes: RstDish[];
    existingDishIds: number[];
}

export const AddDishDialog = ({
    isOpen,
    onClose,
    onSave,
    allDishes,
    existingDishIds,
}: AddDishDialogProps) => {
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [searchTerm, setSearchTerm] = useState("");
    const [sortAsc, setSortAsc] = useState(true);

    useEffect(() => {
        if (isOpen) {
            setSelectedIds(new Set(existingDishIds));
            setSearchTerm("");
            setSortAsc(true);
        }
    }, [isOpen, existingDishIds]);

    const handleCheckChange = (dishId: number, checked: boolean) => {
        const newSet = new Set(selectedIds);
        checked ? newSet.add(dishId) : newSet.delete(dishId);
        setSelectedIds(newSet);
    };

    const handleSave = () => {
        onSave(Array.from(selectedIds));
        onClose();
    };

    const filteredAndSortedDishes = useMemo(() => {
        const filtered = allDishes.filter((d) =>
            d.name.toLowerCase().includes(searchTerm.toLowerCase().trim())
        );
        filtered.sort((a, b) =>
            sortAsc
                ? a.name.localeCompare(b.name, "fa")
                : b.name.localeCompare(a.name, "fa")
        );
        return filtered;
    }, [allDishes, searchTerm, sortAsc]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent
                className="
                bg-[#001233]/95 backdrop-blur-xl border-white/20 text-white
                max-w-lg sm:max-w-xl md:max-w-2xl
                w-[90vw] sm:w-auto
                max-h-[85vh]
                flex flex-col
                rounded-2xl p-4
                "
                style={{ direction: "rtl" }}
            >
                <DialogHeader className="text-right pb-2">
                    <DialogTitle className="text-lg sm:text-xl font-bold">
                        انتخاب غذاها
                    </DialogTitle>
                </DialogHeader>

                {/* 🔍 Search & Sort Controls */}
                <div className="flex items-center gap-2 mb-3">
                    <div className="relative flex-grow">
                        <Search
                            size={16}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40"
                        />
                        <Input
                            type="text"
                            placeholder="جستجوی غذا..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-white/10 border-white/20 text-white placeholder:text-white/40 pr-8 focus-visible:ring-[#D63A4F]"
                        />
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSortAsc((prev) => !prev)}
                        className="h-10 w-10 text-white/70 hover:text-white hover:bg-white/10"
                        title="مرتب‌سازی بر اساس حروف الفبا"
                    >
                        {sortAsc ? <ArrowDownAZ size={18} /> : <ArrowUpAZ size={18} />}
                    </Button>
                </div>

                {/* ✅ Scrollable List (fixed ~5 items height) */}
                <div
                    className="
            flex-grow overflow-y-auto scrollbar-none
            border-t border-white/10 pt-2 pb-4 space-y-2
            max-h-[240px]
          "
                >
                    {filteredAndSortedDishes.length > 0 ? (
                        filteredAndSortedDishes.map((dish) => (
                            <div
                                key={dish.id}
                                className="flex items-center gap-2 p-2 rounded-md hover:bg-white/10 transition"
                            >
                                <Checkbox
                                    id={`dish-${dish.id}`}
                                    checked={selectedIds.has(dish.id)}
                                    onCheckedChange={(checked) =>
                                        handleCheckChange(dish.id, !!checked)
                                    }
                                    className="border-white/50"
                                />
                                <Label
                                    htmlFor={`dish-${dish.id}`}
                                    className="flex-grow text-base cursor-pointer truncate"
                                >
                                    {dish.name}
                                </Label>
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-white/50 py-8">
                            هیچ غذایی مطابق جستجو یافت نشد
                        </p>
                    )}
                </div>

                {/* Footer */}
                <DialogFooter className="flex justify-between gap-3 pt-3 border-t border-white/10 mt-auto">
                    <DialogClose asChild>
                        <Button
                            type="button"
                            variant="outline"
                            className="bg-transparent hover:bg-white/10 border-white/20 text-white w-full sm:w-auto"
                        >
                            انصراف
                        </Button>
                    </DialogClose>
                    <Button
                        onClick={handleSave}
                        className="bg-[#D63A4F] hover:bg-red-700 text-white w-full sm:w-auto"
                    >
                        ذخیره انتخاب‌ها
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
