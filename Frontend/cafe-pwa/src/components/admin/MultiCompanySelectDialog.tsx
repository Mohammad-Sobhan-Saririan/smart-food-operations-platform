"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { Company } from "@/app/restaurant/select-company/page";

interface MultiCompanySelectDialogProps {
    isOpen: boolean;
    onClose: () => void;
    companies: Company[];
    menuIds: Record<number, number>;
    defaultSelectedId: number | null;
    onConfirm: (selectedCompanyIds: number[]) => void;
}

export function MultiCompanySelectDialog({
    isOpen,
    onClose,
    companies,
    menuIds,
    defaultSelectedId,
    onConfirm,
}: MultiCompanySelectDialogProps) {
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [selectAll, setSelectAll] = useState(false);


    useEffect(() => {
        if (defaultSelectedId) setSelectedIds([defaultSelectedId]);
    }, [defaultSelectedId]);

    const toggleCompany = (id: number) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter((c) => c !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const handleConfirm = () => {
        if (selectAll) {
            // map selected ids to them ids in menuIds
            const allIds = companies.map((c) => c.id);
            const menuMappedIds = allIds.map((id) => menuIds[id]);
            console.log("Selected Company IDs with Menu IDs:", menuMappedIds);

            onConfirm(menuMappedIds);
        } else if (selectedIds.length === 0) {
            alert("حداقل یک شرکت باید انتخاب شود.");
            return;
        } else {
            const menuMappedIds = selectedIds.map((id) => menuIds[id]);
            console.log("Selected Company IDs with Menu IDs:", menuMappedIds);
            onConfirm(menuMappedIds);
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="bg-white/10 border border-white/20 backdrop-blur-xl rounded-2xl p-6 w-[90%] max-w-lg text-white relative"
                    >
                        {/* Header */}
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-semibold">انتخاب شرکت‌ها</h2>
                            <button
                                onClick={onClose}
                                className="text-white/70 hover:text-white transition-colors"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        {/* گزینه همه شرکت‌ها */}
                        <div
                            className={`cursor-pointer flex items-center justify-between px-4 py-3 mb-4 rounded-xl border transition-all ${selectAll
                                ? "bg-[#D63A4F]/30 border-[#D63A4F]/60"
                                : "border-white/20 hover:bg-white/10"
                                }`}
                            onClick={() => {
                                setSelectAll(!selectAll);
                                if (!selectAll) setSelectedIds(companies.map((c) => c.id));
                                else setSelectedIds([]);
                            }}
                        >
                            <span className="font-medium">همه شرکت‌ها</span>
                            {selectAll && <span className="text-[#D63A4F] font-bold">✓</span>}
                        </div>

                        {/* لیست شرکت‌ها */}
                        <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                            {companies.map((company) => (
                                <div
                                    key={company.id}
                                    onClick={() => {
                                        if (selectAll) {
                                            setSelectAll(false);
                                            setSelectedIds([company.id]);
                                        } else toggleCompany(company.id);
                                    }}
                                    className={`cursor-pointer flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${selectedIds.includes(company.id)
                                        ? "bg-[#D63A4F]/30 border-[#D63A4F]/60"
                                        : "border-white/20 hover:bg-white/10"
                                        }`}
                                >
                                    <span>{company.name}</span>
                                    {selectedIds.includes(company.id) && (
                                        <span className="text-[#D63A4F] font-bold">✓</span>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* دکمه‌ها */}
                        <div className="flex justify-end gap-4 mt-6">
                            <Button
                                variant="ghost"
                                className="text-white/80 border border-white/20 hover:bg-white/10"
                                onClick={onClose}
                            >
                                انصراف
                            </Button>
                            <Button
                                onClick={handleConfirm}
                                className="bg-gradient-to-r from-[#D63A4F] to-red-600 hover:opacity-90 text-white"
                            >
                                تایید و ذخیره
                            </Button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
