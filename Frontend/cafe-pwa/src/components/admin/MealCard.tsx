"use client";

// /components/admin/MealCard.tsx

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { PlusCircle, XCircle, CalendarDays, Trash } from "lucide-react";
import type { RstDish } from "@/types";

interface MealCardProps {
    dayName: string;
    mealName: string;
    dishes: RstDish[];
    isActive: boolean;
    date?: Date;
    onToggle: (checked: boolean) => void;
    onEdit: () => void;
    onRemoveDish: (dishId: number) => void;
    unsavedDishKeys?: Set<string>;
    dayIndex?: number;
    mealId?: number;
}

export const MealCard = ({
    dayName,
    mealName,
    dishes,
    isActive,
    date,
    unsavedDishKeys,
    dayIndex,
    mealId,
    onToggle,
    onEdit,
    onRemoveDish,
}: MealCardProps) => {
    const formattedDate = date
        ? new Intl.DateTimeFormat("fa-IR", {
            day: "2-digit",
            month: "short",
        }).format(date)
        : "";

    return (
        <div
            className={`relative flex flex-col rounded-3xl border p-4 transition-all duration-300 overflow-hidden backdrop-blur-xl
                ${isActive
                    ? "bg-gradient-to-br from-emerald-400/10 to-emerald-700/5 border-emerald-400/20 hover:from-emerald-400/15"
                    : "bg-white/5 opacity-70 border-white/10"
                }
            `}
        >

            {/* Header */}
            <div className="flex justify-between items-start mb-3">
                <div>
                    <h3 className="text-base font-bold truncate">{dayName}</h3>
                    <p className="text-xs text-white/60">{mealName}</p>
                </div>
                <div className="shrink-0 scale-90 origin-top-right">
                    <Switch
                        style={{ direction: 'ltr' }}
                        checked={isActive}
                        onCheckedChange={onToggle}
                        className="data-[state=checked]:bg-[#D63A4F] data-[state=unchecked]:bg-white/20"
                    />
                </div>
            </div>

            {/* Date */}
            {formattedDate && (
                <div className="flex items-center gap-1 text-xs text-white/60 mb-2">
                    <CalendarDays size={14} />
                    <span>{formattedDate}</span>
                </div>
            )}

            {/* Dishes List */}
            <div className="flex-grow space-y-2 overflow-y-auto scrollbar-none">
                {dishes.length > 0 ? (
                    dishes.map((dish) => {
                        const key = `${dayIndex}-${mealId}-${dish.id}`;
                        const isUnsaved = unsavedDishKeys?.has(key);

                        return (
                            <div
                                key={dish.id}
                                className={`
                                    flex justify-between items-center rounded-xl px-3 py-2 text-sm transition border
                                    ${isUnsaved
                                        ? "bg-red-500/40 border-red-400/30 hover:bg-red-500/80"
                                        : "bg-emerald-400/40 border-emerald-300/30 hover:bg-emerald-400/80"
                                    }
                                `}
                            >
                                <span className="truncate">{dish.name}</span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-red-400 hover:text-white hover:bg-transparent"
                                    onClick={() => onRemoveDish(dish.id)}
                                >
                                    <Trash size={16} />
                                </Button>
                            </div>
                        );
                    })
                ) : (
                    <p className="text-sm text-white/40 text-center py-8">
                        غذایی انتخاب نشده
                    </p>
                )}
            </div>

            {/* Footer */}
            <div className="pt-4 mt-3 border-t border-white/10">
                <Button
                    size="sm"
                    variant="ghost"
                    className={`w-full text-sm font-medium border border-white/10 rounded-xl py-2 whitespace-nowrap overflow-hidden text-ellipsis transition-all
                            ${isActive
                            ? "hover:bg-[#D63A4F] hover:text-white"
                            : "opacity-50 cursor-not-allowed"
                        }`}
                    onClick={onEdit}
                    disabled={!isActive}
                >
                    <span
                        className="
                    sm:text-xs
                    truncate">افزودن / ویرایش غذا</span>
                </Button>
            </div>
        </div>
    );
};
