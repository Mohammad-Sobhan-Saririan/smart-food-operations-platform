"use client";

// /admin/restaurant/menu/page.tsx

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, ArrowLeft, ArrowRight } from "lucide-react";
import type { RstDish, RstMealType } from "@/types";
import { AddDishDialog } from "@/components/admin/restaurant/AddDishDialog";
import { Label } from "@/components/ui/label";
import { MealCard } from "@/components/admin/MealCard";
import { getPersianWeekOfMonth } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import jalaali from "jalaali-js"; // 👈 اگر قبلاً اضافه نکردی: npm i jalaali-js
import { Company } from "@/app/restaurant/select-company/page";
import { ChevronDown } from "lucide-react";
import { CompanyDropdown } from "@/components/admin/CompaniesDropDown";
import { MultiCompanySelectDialog } from "@/components/admin/MultiCompanySelectDialog";
// API URL Prefix
const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

// --- Helper Functions ---
const getWeekStartDate = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay(); // 0=Sunday, 6=Saturday
    const diff = day === 6 ? 0 : day + 1; // برای شنبه =0، یکشنبه=1، دوشنبه=2 ...
    d.setDate(d.getDate() - diff);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

const daysOfWeek = [
    { index: 0, name: "شنبه" },
    { index: 1, name: "یکشنبه" },
    { index: 2, name: "دوشنبه" },
    { index: 3, name: "سه‌شنبه" },
    { index: 4, name: "چهارشنبه" },
    { index: 5, name: "پنج‌شنبه" },
    { index: 6, name: "جمعه" },
];

// --- Type Definitions ---
interface MenuOption {
    dayOfWeek: number;
    mealTypeId: number;
    dishId: number;
    isActive: boolean;
}
interface CellData {
    dishes: RstDish[];
    isActive: boolean;
}

export default function ManageWeeklyMenuPage() {
    const [currentWeek, setCurrentWeek] = useState(getWeekStartDate(new Date()));
    const [menuId, setMenuId] = useState<number | null>(null);
    const [options, setOptions] = useState<MenuOption[]>([]);
    const [allDishes, setAllDishes] = useState<RstDish[]>([]);
    const [allMealTypes, setAllMealTypes] = useState<RstMealType[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [unsavedDishKeys, setUnsavedDishKeys] = useState<Set<string>>(new Set());
    const [pageLoading, setPageLoading] = useState(true);

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [currentCell, setCurrentCell] = useState<{ day: number; meal: number } | null>(null);

    const [companies, setCompanies] = useState<Company[]>([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
    const [selectedCompanyName, setSelectedCompanyName] = useState<string>("");

    const [showCompanyDialog, setShowCompanyDialog] = useState(false);
    const [menuIds, setMenuIds] = useState<Record<number, number>>({});

    // --- Data Fetching ---
    useEffect(() => {
        const fetchMenuIds = async () => {
            try {
                console.log("Fetching menu Ids for week:", currentWeek);
                const weekStart = getWeekStartDate(currentWeek);
                const { jy, jm, jd } = jalaali.toJalaali(weekStart);
                const weekStartJalali = `${jy}-${String(jm).padStart(2, "0")}-${String(jd).padStart(2, "0")}`;

                const res = await fetch(
                    `${API_URL}/api/admin/restaurant/menu_Ids?date=${weekStartJalali}`,
                    { credentials: "include" }
                );

                if (!res.ok) throw new Error("Failed to fetch menu Ids");
                const data = await res.json();
                setMenuIds(data.menuIds || data || {});
            } catch (error: any) {
                toast.error(error.message);
            }
        };

        fetchMenuIds();
    }, [currentWeek]);


    useEffect(() => {
        const loadCompanies = async () => {
            setPageLoading(true);
            const res = await fetch(`${API_URL}/api/restaurant/rst_companies`, { credentials: "include" });
            const data = await res.json();
            setCompanies(data || []);

            const storedCompanyId = sessionStorage.getItem('rst_selectedCompanyId_admin');
            const storedCompanyName = sessionStorage.getItem('rst_selectedCompanyName_admin');
            if (storedCompanyId) {
                setSelectedCompanyId(Number(storedCompanyId));
            }
            if (storedCompanyName) {
                setSelectedCompanyName(storedCompanyName);
            }
            if (!storedCompanyId && data.length > 0) {
                // اگر شرکتی انتخاب نشده بود، اولین شرکت را انتخاب کن
                setSelectedCompanyId(data[0].id);
                setSelectedCompanyName(data[0].name);
                sessionStorage.setItem('rst_selectedCompanyId_admin', data[0].id.toString());
                sessionStorage.setItem('rst_selectedCompanyName_admin', data[0].name);
            }
        };
        loadCompanies();
    }, []);

    const handleSaveMenu = async () => {
        setShowCompanyDialog(true);
    };

    // 👇 وضعیت فعال بودن وعده‌ها
    const [mealVisibility, setMealVisibility] = useState<Record<number, boolean>>({});
    const handleNavigate = (onDismiss?: () => void, onConfirm?: () => void) => {
        if (unsavedDishKeys.size > 0) {
            console.log(`Unsaved changes detected:`, unsavedDishKeys);
            toast.custom((t) => (
                <div
                    className="flex flex-col gap-3 bg-[#1a1a1a]/90 border border-white/10 text-white px-4 py-3 rounded-xl shadow-lg backdrop-blur-md"
                    style={{ direction: "rtl" }}
                >
                    <div className="flex flex-col text-center sm:text-right">
                        <span className="font-medium text-sm sm:text-base">تغییرات ذخیره‌نشده داری</span>
                        <span className="text-xs sm:text-sm text-white/60">اگر بری، این تغییرات از بین می‌رن</span>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 mt-2">
                        <Button
                            variant="ghost"
                            className="border border-white/10 hover:bg-white/10 text-white/80 text-sm"
                            onClick={() => { toast.dismiss(t); onDismiss && onDismiss(); }}
                        >
                            ماندن
                        </Button>
                        <Button
                            className="bg-[#D63A4F] hover:bg-red-700 text-white text-sm"
                            onClick={() => {
                                toast.dismiss(t);
                                onConfirm && onConfirm();
                            }}
                        >
                            ترک صفحه
                        </Button>
                    </div>
                </div>
            ), { id: "unsaved-changes-toast", duration: Infinity });
        } else {
            onConfirm && onConfirm();
        }
    };
    // --- Data Fetching ---
    const fetchAllData = useCallback(async () => {
        setLoading(true);
        try {

            const dishesRes = await fetch(`${API_URL}/api/admin/restaurant/dishes`, { credentials: "include" });
            if (!dishesRes.ok) throw new Error("Failed to fetch dishes");
            const dishesData = await dishesRes.json();
            setAllDishes(dishesData || []);

            const mealsRes = await fetch(`${API_URL}/api/restaurant/meal-types`, { credentials: "include" });
            if (!mealsRes.ok) throw new Error("Failed to fetch meal types");
            const mealsData = await mealsRes.json();
            setAllMealTypes(mealsData);

            // 👇 فقط وعده ناهار فعال
            const visibility = Object.fromEntries(mealsData.map((m: any) => [m.id, m.DisplayName.includes("ناهار")]));
            setMealVisibility(visibility);

            // ✅ تبدیل تاریخ شروع هفته به شمسی (۱۴۰۳-۰۸-۱۲)
            const weekStart = getWeekStartDate(currentWeek);
            const { jy, jm, jd } = jalaali.toJalaali(weekStart);
            const weekStartJalali = `${jy}-${String(jm).padStart(2, "0")}-${String(jd).padStart(2, "0")}`;
            const menuRes = await fetch(`${API_URL}/api/admin/restaurant/menu?date=${weekStartJalali}&companyId=${selectedCompanyId}`, {
                credentials: "include",
            });
            if (!menuRes.ok) throw new Error("Failed to fetch menu data");
            const menuData = await menuRes.json();

            setMenuId(menuData.menu.id);
            setOptions(menuData.options || []);
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    }, [currentWeek, selectedCompanyId]);

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (unsavedDishKeys.size > 0) {
                e.preventDefault();
                e.returnValue = ""; // لازم برای فعال کردن پیام مرورگر
            }
        };
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [unsavedDishKeys]);


    useEffect(() => {
        if (selectedCompanyId !== null) {
            fetchAllData();
        }

    }, [fetchAllData, selectedCompanyId]);

    useEffect(() => {
        if (!loading) {
            setPageLoading(false);
        }
    }, [loading]);

    // --- Event Handlers ---
    const changeWeek = (direction: "next" | "prev") => {
        // check for unsaved changes
        handleNavigate(undefined, () => {
            setCurrentWeek((prevDate) => {
                console.log("Changing week from", prevDate);
                const newDate = new Date(prevDate);
                newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7));
                return newDate;
            });
            // remove unsaved changes indication
            setUnsavedDishKeys(new Set());
        });

    };



    const handleToggleActive = (day: number, meal: number, isActive: boolean) => {
        const otherOptions = options.filter((o) => !(o.dayOfWeek === day && o.mealTypeId === meal));
        const cellOptions = options.filter((o) => o.dayOfWeek === day && o.mealTypeId === meal);

        if (cellOptions.length > 0) {
            const updatedOptions = cellOptions.map((o) => ({ ...o, isActive }));
            setOptions([...otherOptions, ...updatedOptions]);
        } else {
            setOptions([...otherOptions, { dayOfWeek: day, mealTypeId: meal, dishId: -1, isActive }]);
        }
    };

    const handleOpenDishDialog = (day: number, meal: number) => {
        setCurrentCell({ day, meal });
        setIsDialogOpen(true);
    };

    const handleUpdateCellDishes = (selectedDishIds: number[]) => {
        if (!currentCell) return;
        const { day, meal } = currentCell;

        const otherOptions = options.filter((o) => !(o.dayOfWeek === day && o.mealTypeId === meal));
        const newCellOptions = selectedDishIds.map((dishId) => ({
            dayOfWeek: day,
            mealTypeId: meal,
            dishId: dishId,
            isActive: true,
        }));

        setOptions([...otherOptions, ...newCellOptions]);
        setUnsavedDishKeys((prev) => {
            const newSet = new Set(prev);
            selectedDishIds.forEach((id) => newSet.add(`${currentCell?.day}-${currentCell?.meal}-${id}`));
            return newSet;
        });

    };

    const handleRemoveDish = (day: number, meal: number, dishId: number) => {
        setOptions((prev) =>
            prev.filter((o) => !(o.dayOfWeek === day && o.mealTypeId === meal && o.dishId === dishId))
        );
        setUnsavedDishKeys((prev) => {
            const newSet = new Set(prev);
            newSet.add(`${day}-${meal}-${dishId}`);
            return newSet;
        });



    };

    const getCellData = (day: number, meal: number): CellData => {
        const cellOptions = options.filter(
            (o) => o.dayOfWeek === day && o.mealTypeId === meal && o.dishId !== -1
        );
        const dishIds = cellOptions.map((o) => o.dishId);
        const dishes = allDishes.filter((d) => dishIds.includes(d.id));

        const allCellOptions = options.filter((o) => o.dayOfWeek === day && o.mealTypeId === meal);
        const isActive =
            allCellOptions.length > 0 ? allCellOptions.every((o) => o.isActive) : true;

        return { dishes, isActive };
    };
    const handleConfirmCompanies = async (selectedCompanyIds: number[]) => {
        if (selectedCompanyIds.length === 0) {
            toast.warning("هیچ شرکتی انتخاب نشده است!");
            return;
        }

        setIsSaving(true);
        try {
            const finalOptions = options.filter(
                (o) => o.dishId !== -1 && mealVisibility[o.mealTypeId] !== false
            );

            const res = await fetch(`${API_URL}/api/admin/restaurant/menu`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    menuIds: selectedCompanyIds, // 👈 لیست شرکت‌ها
                    options: finalOptions,
                }),
            });

            if (!res.ok) throw new Error("خطا در ذخیره منو");

            toast.success("منوی هفتگی برای شرکت‌های انتخاب‌شده ذخیره شد ✅");
            setUnsavedDishKeys(new Set());
        } catch (error) {
            toast.error("خطا در ذخیره منو.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <>
            {pageLoading && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50">
                    <Loader2 className="h-12 w-12 text-white animate-spin" />
                </div>
            )}
            <div style={{ direction: "rtl" }}>
                <h1 className="lg:text-3xl md:text-2xl text-xl font-bold my-6 text-white">
                    مدیریت منوی هفتگی
                </h1>
                {/* 
                 a dropdown to show the selected company name and allow changing it
                */}
                {companies.length > 0 && (
                    <CompanyDropdown
                        companies={companies}
                        selectedCompanyId={selectedCompanyId}
                        setSelectedCompanyId={setSelectedCompanyId}
                        setSelectedCompanyName={setSelectedCompanyName}
                    />

                )}

                <Card className="bg-white/5 backdrop-blur-lg border border-white/20 text-white">
                    <CardHeader>
                        <div className="flex sm:flex-row justify-between items-center gap-4">
                            <Button
                                variant="ghost"
                                onClick={() => changeWeek("prev")}
                                className="hover:bg-white/10"
                            >
                                <ArrowRight className="ml-2" /> هفته قبل
                            </Button>
                            <CardTitle className="text-xl sm:text-2xl text-center">
                                {getPersianWeekOfMonth(currentWeek)}
                            </CardTitle>
                            <Button
                                variant="ghost"
                                onClick={() => changeWeek("next")}
                                className="hover:bg-white/10"
                            >
                                هفته بعد <ArrowLeft className="mr-2" />
                            </Button>
                        </div>
                    </CardHeader>

                    <CardContent className="!px-2 sm:!px-6">
                        {loading ? (
                            <div className="flex justify-center items-center h-64">
                                <Loader2 className="h-8 w-8 animate-spin" />
                            </div>
                        ) : (
                            <div className="space-y-12 w-full max-w-[1800px] mx-auto">
                                {allMealTypes.map((meal) => (
                                    <section key={meal.id}>
                                        <div className="flex items-center justify-between mb-6 border-r-4 border-[#D63A4F] pr-4">
                                            <h2 className="text-2xl font-bold text-white/90">{meal.DisplayName}</h2>
                                            <div className="flex items-center gap-2">
                                                <Label htmlFor={`meal-${meal.id}`} className="text-white/70 text-sm">
                                                    {/* اگر وعده فعال باشد، "فعال" */}
                                                    {mealVisibility[meal.id] ? "فعال" : "غیرفعال"}
                                                </Label>
                                                <Switch
                                                    style={{ direction: 'ltr' }}
                                                    id={`meal-${meal.id}`}
                                                    checked={mealVisibility[meal.id] ?? false}
                                                    onCheckedChange={(checked) =>
                                                        setMealVisibility((prev) => ({ ...prev, [meal.id]: checked }))
                                                    }
                                                    className="data-[state=checked]:bg-[#D63A4F] data-[state=unchecked]:bg-white/20"
                                                />
                                            </div>
                                        </div>

                                        {/* فقط وقتی وعده فعال است، گرید نمایش داده می‌شود */}
                                        <AnimatePresence mode="wait">
                                            {mealVisibility[meal.id] && (
                                                <motion.div
                                                    key={meal.id}
                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.95 }}
                                                    transition={{ duration: 0.4, ease: "easeInOut" }}
                                                    className="
                                                        grid gap-6
                                                        grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 auto-rows-fr
                                                    "
                                                >
                                                    {daysOfWeek.map((day, dayIndex) => {
                                                        const cellData = getCellData(dayIndex, meal.id);
                                                        return (
                                                            <MealCard
                                                                key={dayIndex}
                                                                dayName={day.name}
                                                                mealName={meal.DisplayName}
                                                                dishes={cellData.dishes}
                                                                isActive={cellData.isActive}
                                                                onToggle={(checked) =>
                                                                    handleToggleActive(dayIndex, meal.id, checked)
                                                                }
                                                                onEdit={() => handleOpenDishDialog(dayIndex, meal.id)}
                                                                onRemoveDish={(dishId) =>
                                                                    handleRemoveDish(dayIndex, meal.id, dishId)
                                                                }
                                                                date={new Date(
                                                                    new Date(currentWeek).setDate(
                                                                        currentWeek.getDate() + day.index
                                                                    )
                                                                )}
                                                                unsavedDishKeys={unsavedDishKeys} // 👈 تغییر از unsavedDishIds
                                                                dayIndex={dayIndex}
                                                                mealId={meal.id}
                                                            />
                                                        );
                                                    })}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                    </section>
                                ))}

                                <div className="flex justify-end mt-10">
                                    <Button
                                        onClick={handleSaveMenu}
                                        disabled={isSaving}
                                        className="
                                            bg-[#D63A4F] hover:bg-red-700 text-lg px-6 py-4 sm:px-4 sm:py-4 
                                            rounded-xl sm:rounded-xl shadow-lg transition-all 
                                            disabled:opacity-50 disabled:cursor-not-allowed
                                            text-sm sm:text-md
                                            "
                                    >
                                        {isSaving ? (
                                            <>
                                                <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2 animate-spin" />
                                                در حال ذخیره...
                                            </>
                                        ) : (
                                            "ذخیره نهایی تغییرات منو"
                                        )}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div >

            <AddDishDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                allDishes={allDishes}
                existingDishIds={
                    currentCell
                        ? getCellData(currentCell.day, currentCell.meal).dishes.map((d) => d.id)
                        : []
                }
                onSave={handleUpdateCellDishes}
            />

            {(menuIds && companies.length > 0) &&
                <MultiCompanySelectDialog
                    isOpen={showCompanyDialog}
                    onClose={() => setShowCompanyDialog(false)}
                    companies={companies}
                    menuIds={menuIds}
                    defaultSelectedId={selectedCompanyId}
                    onConfirm={handleConfirmCompanies}
                />}
        </>
    );
}
