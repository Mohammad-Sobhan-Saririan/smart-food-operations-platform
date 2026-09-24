"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function ManageCreditsPage() {
    const [allUsersAmount, setAllUsersAmount] = useState('');
    const [groupAmount, setGroupAmount] = useState('');
    const [groupPosition, setGroupPosition] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isCreditSystemEnabled, setIsCreditSystemEnabled] = useState(true);

    const handleUpdate = async (operation: 'set' | 'add', amount: string, filter?: object) => {
        setIsLoading(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/admin/credits/bulk-update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ amount, operation, filter }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'An error occurred.');

            toast.success(data.message);
        } catch (error) {
            if (error instanceof Error) {
                toast.error(error.message);
            } else {
                toast.error("خطایی رخ داده است!");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const toggleCreditSystem = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/admin/credits/change-system-status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ isEnabled: !isCreditSystemEnabled }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'An error occurred.');

            setIsCreditSystemEnabled(!isCreditSystemEnabled);
            toast.success(data.message);
        } catch (error) {
            if (error instanceof Error) {
                toast.error(error.message);
            } else {
                toast.error("خطایی رخ داده است!");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div dir="rtl" className="">
            <h2 className="text-2xl font-semibold mb-4">مدیریت اعتبار کاربران</h2>
            <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <Button onClick={toggleCreditSystem} disabled={isLoading} className="w-full sm:w-auto bg-[#D63A4F] hover:bg-red-700 text-white cursor-pointer">
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isCreditSystemEnabled ? 'غیرفعال کردن سیستم اعتبار' : 'فعال کردن سیستم اعتبار'}
                </Button>
                <div className="flex flex-row items-start sm:items-center gap-2 text-sm font-medium">
                    <span>وضعیت سیستم اعتبار:</span>
                    <div className={`h-4 w-4 rounded-full ${isCreditSystemEnabled ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                    <span className={isCreditSystemEnabled ? 'text-green-500' : 'text-red-500'}>
                        {isCreditSystemEnabled ? 'فعال' : 'غیرفعال'}
                    </span>
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Card for updating ALL users */}
                <Card className="bg-white/5 backdrop-blur-lg border border-white/20 text-white transition-all duration-300">
                    <CardHeader>
                        <CardTitle>بروزرسانی تمام کاربران</CardTitle>
                        <CardDescription className="text-white/60">تنظیم یا افزودن اعتبار برای تمام کاربران سیستم.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Label htmlFor="all-users-amount" className="pb-2"
                        >مقدار</Label>
                        <Input
                            id="all-users-amount"
                            type="number"
                            placeholder="مثال: ۱۰۰۰۰۰۰"
                            value={allUsersAmount}
                            onChange={(e) => setAllUsersAmount(e.target.value)}
                        />
                    </CardContent>
                    <CardFooter className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => handleUpdate('add', allUsersAmount)} disabled={isLoading} className=" cursor-pointer">
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            افزودن به اعتبارها
                        </Button>
                        <Button onClick={() => handleUpdate('set', allUsersAmount)} disabled={isLoading} className="bg-[#D63A4F] hover:bg-red-700 cursor-pointer">
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            تنظیم اعتبارها
                        </Button>
                    </CardFooter>
                </Card>

                <Card className="bg-white/5 backdrop-blur-lg border border-white/20 text-white transition-all duration-300">
                    <CardHeader>
                        <CardTitle>بروزرسانی بر اساس گروه</CardTitle>
                        <CardDescription className="text-white/60"
                        >تنظیم یا افزودن اعتبار برای کاربران با موقعیت خاص.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="group-position" className="pb-2">موقعیت</Label>
                            <Input
                                id="group-position"
                                placeholder="مثال: توسعه‌دهنده"
                                value={groupPosition}
                                onChange={(e) => setGroupPosition(e.target.value)}
                            />
                        </div>
                        <div>
                            <Label htmlFor="group-amount" className="pb-2">مقدار</Label>
                            <Input
                                id="group-amount"
                                type="number"
                                placeholder="مثال: ۱۵۰۰۰۰۰"
                                value={groupAmount}
                                onChange={(e) => setGroupAmount(e.target.value)}
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => handleUpdate('add', groupAmount, { position: groupPosition })} disabled={isLoading || !groupPosition}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            افزودن به گروه
                        </Button>
                        <Button onClick={() => handleUpdate('set', groupAmount, { position: groupPosition })} disabled={isLoading || !groupPosition}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            تنظیم برای گروه
                        </Button>
                    </CardFooter>
                </Card>

            </div>
        </div>
    );
}