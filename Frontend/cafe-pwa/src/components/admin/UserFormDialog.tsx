"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogClose,
    DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { User } from "@/types";

interface UserFormDialogProps {
    user?: User | null;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
}

export const glassInputStyle =
    "bg-white/5 border-white/20 placeholder:text-white/40 focus-visible:ring-indigo-400 focus-visible:ring-offset-0 focus-visible:ring-offset-[#001233]";

export const UserFormDialog = ({
    user,
    isOpen,
    onClose,
    onUpdate,
}: UserFormDialogProps) => {
    const [formData, setFormData] = useState<Partial<User>>({});
    const [isLoading, setIsLoading] = useState(false);
    const isEditMode = !!user?.id;

    useEffect(() => {
        if (isOpen) {
            if (isEditMode) {
                setFormData(user);
            } else {
                setFormData({
                    role: "user",
                    creditLimit: 1000,
                    creditBalance: 1000,
                    name: "",
                    email: "",
                    employeeNumber: "",
                });
            }
        }
    }, [user, isOpen, isEditMode]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value, type } = e.target;
        setFormData((prev) => ({
            ...prev,
            [id]: type === "number" ? parseInt(value) || 0 : value,
        }));
    };

    const handleRoleChange = (value: User["role"]) =>
        setFormData((prev) => ({ ...prev, role: value }));

    const handleSubmit = async () => {
        setIsLoading(true);
        try {
            const url = isEditMode
                ? `${process.env.NEXT_PUBLIC_API_URL ?? ""}/api/admin/users/${user.id}`
                : `${process.env.NEXT_PUBLIC_API_URL ?? ""}/api/admin/users`;
            const method = isEditMode ? "PUT" : "POST";

            const res = await fetch(`${url}`, {
                method,
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(formData),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || "خطایی رخ داده است.");
            }

            const successData = await res.json();
            toast.success(successData.message);
            onUpdate();
            onClose();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "خطایی رخ داده است!");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent
                className="
          bg-[#001233]/85 backdrop-blur-xl border-white/20 text-white 
          sm:max-w-lg w-[95vw] rounded-2xl
          [&>button]:left-4 [&>button]:top-4 [&>button]:right-auto 
          [&>button]:text-white/70 [&>button:hover]:text-white
        "
                style={{ direction: "rtl" }}
            >
                <DialogHeader>
                    <DialogTitle className="text-right text-xl font-bold">
                        {isEditMode ? "ویرایش کاربر" : "افزودن کاربر جدید"}
                    </DialogTitle>
                    <DialogDescription className="text-right text-white/60 mt-1">
                        {isEditMode
                            ? `در حال ویرایش اطلاعات ${user?.name}`
                            : "اطلاعات کاربر جدید را وارد کنید"}
                    </DialogDescription>
                </DialogHeader>

                {/* فیلدها */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
                    <div>
                        <Label htmlFor="name" className="text-white/80 text-sm">
                            نام
                        </Label>
                        <Input
                            id="name"
                            value={formData.name || ""}
                            onChange={handleChange}
                            className={glassInputStyle}
                        />
                    </div>

                    <div>
                        <Label htmlFor="employeeNumber" className="text-white/80 text-sm">
                            شماره کارمندی / نام کاربری
                        </Label>
                        <Input
                            id="employeeNumber"
                            value={formData.employeeNumber || ""}
                            onChange={handleChange}
                            className={glassInputStyle}
                        />
                    </div>

                    <div className="sm:col-span-2">
                        <Label htmlFor="email" className="text-white/80 text-sm">
                            ایمیل
                        </Label>
                        <Input
                            id="email"
                            type="email"
                            value={formData.email || ""}
                            onChange={handleChange}
                            className={glassInputStyle}
                        />
                    </div>

                    {!isEditMode && (
                        <div className="sm:col-span-2">
                            <Label htmlFor="password" className="text-white/80 text-sm">
                                رمز عبور اولیه
                            </Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="رمز عبور اولیه را وارد کنید"
                                onChange={handleChange}
                                className={glassInputStyle}
                            />
                        </div>
                    )}

                    <div>
                        <Label className="text-white/80 text-sm">نقش</Label>
                        <Select
                            value={formData.role}
                            onValueChange={handleRoleChange}
                        >
                            <SelectTrigger className={glassInputStyle}>
                                <SelectValue placeholder="انتخاب نقش" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="user">کاربر عادی</SelectItem>
                                <SelectItem value="barista">باریستا</SelectItem>
                                <SelectItem value="admin">ادمین</SelectItem>
                                <SelectItem value="HR">منابع انسانی</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label htmlFor="creditBalance" className="text-white/80 text-sm">
                            میزان اعتبار
                        </Label>
                        <Input
                            id="creditBalance"
                            type="number"
                            value={formData.creditBalance || 0}
                            onChange={handleChange}
                            className={glassInputStyle}
                        />
                    </div>
                </div>

                <DialogFooter className="flex justify-between pt-4">
                    <DialogClose asChild>
                        <Button
                            type="button"
                            variant="outline"
                            className="bg-transparent border-white/30 text-white hover:bg-white/10"
                        >
                            انصراف
                        </Button>
                    </DialogClose>
                    <Button
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="bg-[#D63A4F] text-white hover:bg-red-700 px-6"
                    >
                        {isEditMode ? "ذخیره تغییرات" : "ایجاد کاربر"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
