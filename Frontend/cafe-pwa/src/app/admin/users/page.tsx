"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserFormDialog } from "@/components/admin/UserFormDialog";
import { useDebounce } from "@/hooks/useDebounce";
import type { User } from "@/types";
import { Loader2, UserCircle2 } from "lucide-react";

export default function ManageUsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            const url = `${process.env.NEXT_PUBLIC_API_URL ?? ""}/api/admin/users?search=${debouncedSearchTerm}`;
            const res = await fetch(url, { credentials: "include" });
            if (!res.ok) throw new Error("Failed to fetch users");
            setUsers(await res.json());
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [debouncedSearchTerm]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleAddUser = () => {
        setSelectedUser(null);
        setIsDialogOpen(true);
    };

    const handleEditUser = (user: User) => {
        setSelectedUser(user);
        setIsDialogOpen(true);
    };

    return (
        <>
            <Card
                className="bg-white/5 backdrop-blur-lg border border-white/10 text-white"
                style={{ direction: "rtl" }}
            >
                <CardHeader className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <CardTitle className="text-2xl font-bold">مدیریت کاربران</CardTitle>
                    <div className="flex flex-col sm:flex-row-reverse items-stretch sm:items-center gap-2 w-full md:w-auto">
                        <Input
                            placeholder="جستجو بر اساس نام یا شماره کارمندی..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="max-w-sm text-sm bg-white/10 border-white/20 placeholder:text-white/50"
                        />
                        <Button
                            onClick={handleAddUser}
                            className="bg-[#D63A4F] hover:bg-red-700 text-sm"
                        >
                            افزودن کاربر جدید
                        </Button>
                    </div>
                </CardHeader>

                <CardContent>
                    {/* Desktop Table */}
                    <div className="hidden md:block rounded-lg border border-white/10 overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-b-white/10 hover:bg-transparent">
                                    <TableHead className="text-right text-white">نام</TableHead>
                                    <TableHead className="text-right text-white">
                                        شماره کارمندی
                                    </TableHead>
                                    <TableHead className="text-right text-white">نقش</TableHead>
                                    <TableHead className="text-right text-white">
                                        اعتبار باقیمانده
                                    </TableHead>
                                    <TableHead className="text-right text-white">اقدامات</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-24">
                                            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    users.map((user) => (
                                        <TableRow
                                            key={user.id}
                                            className="border-white/10 hover:bg-white/5"
                                        >
                                            <TableCell className="font-medium text-right">
                                                {user.name}
                                            </TableCell>
                                            <TableCell className="font-mono text-xs text-right">
                                                {user.employeeNumber}
                                            </TableCell>
                                            <TableCell className="text-right">{user.role}</TableCell>
                                            <TableCell className="text-right font-mono">
                                                {user.creditBalance.toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="bg-[#D63A4F] hover:bg-red-700 hover:text-white"
                                                    onClick={() => handleEditUser(user)}
                                                >
                                                    ویرایش
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="grid md:hidden grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                        {loading ? (
                            <div className="flex justify-center items-center h-24 col-span-full">
                                <Loader2 className="h-6 w-6 animate-spin text-white" />
                            </div>
                        ) : users.length === 0 ? (
                            <p className="text-center text-white/70 col-span-full">
                                کاربری یافت نشد.
                            </p>
                        ) : (
                            users.map((user) => (
                                <div
                                    key={user.id}
                                    className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-2 backdrop-blur-md"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                                                <UserCircle2 className="w-5 h-5 text-white/70" />
                                            </div>
                                            <div>
                                                <p className="font-semibold">{user.name}</p>
                                                <p className="text-xs text-white/60">
                                                    #{user.employeeNumber}
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="bg-[#D63A4F] hover:bg-red-700 text-xs text-white"
                                            onClick={() => handleEditUser(user)}
                                        >
                                            ویرایش
                                        </Button>
                                    </div>

                                    <div className="text-xs text-white/70 flex justify-between border-t border-white/10 pt-2 mt-2">
                                        <span>نقش: {user.role}</span>
                                        <span>
                                            اعتبار: {user.creditBalance.toLocaleString()} تومان
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>

            <UserFormDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                user={selectedUser}
                onUpdate={() => {
                    fetchUsers();
                    setIsDialogOpen(false);
                }}
            />
        </>
    );
}
