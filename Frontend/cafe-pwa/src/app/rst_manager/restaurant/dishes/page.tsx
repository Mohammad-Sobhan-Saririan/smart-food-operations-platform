"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, PlusCircle, Edit, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import type { RstDish } from "@/types";
import { DishFormDialog } from "@/components/admin/restaurant/DishFormDialog";
import Image from "next/image";
import { resolveMediaUrl } from '@/lib/mediaUrl';
import { motion, AnimatePresence } from "framer-motion";

export default function ManageDishesPage() {
    const [dishes, setDishes] = useState<RstDish[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDish, setSelectedDish] = useState<Partial<RstDish> | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [search, setSearch] = useState("");

    const fetchDishes = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ""}/api/admin/restaurant/dishes`, {
                credentials: "include",
            });
            if (!res.ok) throw new Error("خطا در دریافت لیست غذاها");
            const data = await res.json();
            setDishes(data);
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDishes();
    }, [fetchDishes]);

    const handleAdd = () => {
        setSelectedDish(null);
        setIsDialogOpen(true);
    };

    const handleEdit = (dish: RstDish) => {
        setSelectedDish(dish);
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm("آیا از حذف این غذا اطمینان دارید؟")) return;
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ""}/api/admin/restaurant/dishes/${id}`, {
                method: "DELETE",
                credentials: "include",
            });
            if (!res.ok) throw new Error("خطا در حذف غذا");
            toast.success("غذا حذف شد");
            fetchDishes();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    // فیلتر جستجو
    const filteredDishes = useMemo(() => {
        return dishes.filter((d) =>
            d.name.toLowerCase().includes(search.toLowerCase())
        );
    }, [search, dishes]);

    return (
        <>
            <Card className="bg-white/10 border border-white/20 text-white" dir="rtl">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <CardTitle className="text-xl font-bold">مدیریت غذاها</CardTitle>

                        {/* نوار ابزار بالا */}
                        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                            <div className="relative flex-1 sm:w-64">
                                <Search className="absolute right-3 top-2.5 h-4 w-4 text-white/50" />
                                <Input
                                    placeholder="جستجوی نام غذا..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="bg-white/5 border-white/20 text-white placeholder:text-white/50 pr-8"
                                />
                            </div>

                            <Button
                                onClick={handleAdd}
                                className="bg-[#D63A4F] hover:bg-red-700 flex items-center gap-2"
                            >
                                <PlusCircle className="h-4 w-4" />
                                افزودن غذا
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : filteredDishes.length === 0 ? (
                        <div className="text-center text-white/70 py-10">
                            هیچ غذایی یافت نشد.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            <AnimatePresence>
                                {filteredDishes.map((dish) => (
                                    <motion.div
                                        key={dish.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        transition={{ duration: 0.2 }}
                                        className="relative bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:bg-white/10 transition-all group shadow-md"
                                    >
                                        {/* تصویر غذا */}
                                        <div className="relative h-40 w-full overflow-hidden">
                                            {dish.imageUrl ? (
                                                <Image
                                                    src={resolveMediaUrl(dish.imageUrl)}
                                                    unoptimized
                                                    alt={dish.name}
                                                    fill
                                                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                                                />
                                            ) : (
                                                <div className="h-full w-full bg-white/10 flex items-center justify-center text-white/50 text-sm">
                                                    بدون تصویر
                                                </div>
                                            )}
                                        </div>

                                        {/* متن و اقدامات */}
                                        <div className="p-4 flex flex-col gap-2">
                                            <h3 className="font-semibold text-base line-clamp-1">{dish.name}</h3>
                                            {dish.description && (
                                                <p className="text-sm text-white/70 line-clamp-2">
                                                    {dish.description}
                                                </p>
                                            )}
                                            <div className="flex justify-between items-center mt-3">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleEdit(dish)}
                                                    className="text-blue-400 hover:text-blue-300 hover:bg-white/10"
                                                >
                                                    <Edit size={18} />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDelete(dish.id!)}
                                                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                                >
                                                    <Trash2 size={18} />
                                                </Button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </CardContent>
            </Card>

            <DishFormDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                dish={selectedDish}
                onUpdate={fetchDishes}
            />
        </>
    );
}
