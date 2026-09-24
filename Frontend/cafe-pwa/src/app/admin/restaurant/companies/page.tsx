"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

type Company = { id: number; name: string };

export default function CompaniesPage() {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [newName, setNewName] = useState("");
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editValue, setEditValue] = useState("");

    const fetchCompanies = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/admin/restaurant/companies`, {
                credentials: "include",
            });
            const data = await res.json();
            setCompanies(data);
        } catch {
            toast.error("خطا در دریافت شرکت‌ها");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCompanies();
    }, []);

    const addCompany = async () => {
        if (!newName.trim()) return toast.warning("نام شرکت را وارد کنید");
        try {
            const res = await fetch(`${API_URL}/api/admin/restaurant/companies`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newName.trim() }),
            });
            if (!res.ok) throw new Error();
            toast.success("شرکت افزوده شد");
            setNewName("");
            fetchCompanies();
        } catch {
            toast.error("خطا در افزودن شرکت");
        }
    };

    const deleteCompany = async (id: number) => {
        if (!confirm("آیا از حذف شرکت اطمینان دارید؟")) return;
        try {
            await fetch(`${API_URL}/api/admin/restaurant/companies/${id}`, {
                method: "DELETE",
                credentials: "include",
            });
            toast.success("شرکت حذف شد");
            fetchCompanies();
        } catch {
            toast.error("خطا در حذف شرکت");
        }
    };

    const startEdit = (id: number, current: string) => {
        setEditingId(id);
        setEditValue(current);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditValue("");
    };

    const saveEdit = async (id: number) => {
        if (!editValue.trim()) return toast.warning("نام شرکت نمی‌تواند خالی باشد");
        try {
            const res = await fetch(`${API_URL}/api/admin/restaurant/companies/${id}`, {
                method: "PUT",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: editValue.trim() }),
            });
            if (!res.ok) throw new Error();
            toast.success("ویرایش انجام شد");
            setEditingId(null);
            setEditValue("");
            fetchCompanies();
        } catch {
            toast.error("خطا در ویرایش شرکت");
        }
    };

    return (
        <Card className="bg-white/10 border border-white/20 text-white">
            <CardHeader>
                <CardTitle>مدیریت شرکت‌ها</CardTitle>
            </CardHeader>

            <CardContent>
                {/* افزودن شرکت جدید */}
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                    <Input
                        placeholder="نام شرکت جدید"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="bg-white/5 border-white/20 text-white placeholder:text-white/50 flex-1"
                    />
                    <Button onClick={addCompany} className="bg-[#D63A4F] hover:bg-red-700 flex items-center gap-2">
                        <Plus size={16} />
                        افزودن
                    </Button>
                </div>

                {loading ? (
                    <div className="flex justify-center p-10">
                        <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {companies.map((c) => (
                            <div
                                key={c.id}
                                className="bg-white/5 hover:bg-white/10 transition border border-white/10 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3"
                            >
                                {editingId === c.id ? (
                                    <div className="flex flex-1 items-center gap-2 w-full">
                                        <Input
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            className="bg-white/10 border-white/20 text-white placeholder:text-white/50 flex-1"
                                        />
                                        <Button
                                            size="icon"
                                            className="bg-emerald-600 hover:bg-emerald-700"
                                            onClick={() => saveEdit(c.id)}
                                        >
                                            <Check size={16} />
                                        </Button>
                                        <Button size="icon" variant="ghost" onClick={cancelEdit}>
                                            <X size={16} />
                                        </Button>
                                    </div>
                                ) : (
                                    <>
                                        <span className="text-sm font-medium text-center sm:text-right flex-1">
                                            {c.name}
                                        </span>
                                        <div className="flex gap-2">
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="hover:bg-white/10"
                                                onClick={() => startEdit(c.id, c.name)}
                                            >
                                                <Pencil size={16} />
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="hover:bg-red-500/10 text-red-400"
                                                onClick={() => deleteCompany(c.id)}
                                            >
                                                <Trash2 size={16} />
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
