"use client";

import { useState, useEffect } from 'react';
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, X, Edit, KeyRound } from "lucide-react";
import { toast } from 'sonner';
import type { User } from '@/types'; // Import User as a type
import type { Floor } from '@/types'; // Import Floor type
import { cn } from '@/lib/utils';
import { ChangePasswordDialog } from './ChangePasswordDialog';

const glassInputStyle = "bg-white/5 border-white/20 read-only:border-transparent read-only:bg-transparent read-only:h-auto read-only:cursor-default focus-visible:ring-indigo-400";

const InfoRow = ({ label, value }: { label: string, value: string | number | null | undefined }) => (
    <div className="space-y-1">
        <p className="text-sm text-white/60">{label}</p>
        <p className="font-semibold text-white text-lg">{value || 'ثبت نشده'}</p>
    </div>
);

export const AccountDetails = () => {
    const { user, setUser } = useAuthStore();
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<Partial<User> | null>(user);
    const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
    // const [isLoading, setIsLoading] = useState(false);

    // --- NEW: State and effect to fetch floors ---
    const [floors, setFloors] = useState<Floor[]>([]);
    useEffect(() => {
        const fetchFloors = async () => {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/floors`);
                if (res.ok) {
                    setFloors(await res.json());
                }
            } catch (error) {
                console.error("Failed to fetch floors", error);
            }
        };
        fetchFloors();
    }, []);
    // ---

    useEffect(() => { setFormData(user); }, [user]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData((prev: Partial<User> | null) => prev ? { ...prev, [e.target.id]: e.target.value } : null);
    };

    const handleFloorChange = (floorId: string) => {
        setFormData(prev => prev ? { ...prev, defaultFloorId: Number(floorId) } : null);
    };

    const handleSaveChanges = async () => {
        // setIsLoading(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/users/profile`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
                // We send the entire formData, which now includes the new defaultFloorId
                body: JSON.stringify(formData),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            setUser(data.user); // Update global state with the new user info (including defaultFloorName)
            toast.success("پروفایل با موفقیت بروز شد!");
            setIsEditing(false);
        } catch (error: unknown) {
            if (error instanceof Error) {
                toast.error(error.message);
            } else {
                toast.error("خطایی رخ داده است!");
            }
        } finally {
            // setIsLoading(false);
        }
    };

    if (!user) return null;

    return (
        <>
            <Card className={cn("bg-white/5 backdrop-blur-lg border border-white/20 text-white transition-all duration-300", isEditing && "ring-2 ring-indigo-500 border-indigo-500/50")}>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="text-2xl">اطلاعات حساب</CardTitle>
                            <CardDescription className="text-white/60 pt-1">
                                {isEditing ? "اطلاعات خود را در زیر ویرایش کنید." : "اطلاعات شخصی شما."}
                            </CardDescription>
                        </div>
                        {!isEditing ? (
                            <Button variant="outline" className="bg-white/10 hover:bg-white/20" onClick={() => setIsEditing(true)}>
                                <Edit className="ml-2 h-4 w-4" /> ویرایش
                            </Button>
                        ) : (
                            <div className="flex gap-2">
                                <Button variant="ghost" onClick={() => { setIsEditing(false); setFormData(user); }}><X className="ml-2 h-4 w-4" /> انصراف</Button>
                                <Button onClick={handleSaveChanges} className="bg-[#D63A4F] hover:bg-red-700"><Save className="ml-2 h-4 w-4" /> ذخیره</Button>
                            </div>
                        )}
                    </div>
                </CardHeader>                <CardContent className="border-t border-white/10 pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        {isEditing ? (
                            <>
                                {/* --- EDITING VIEW --- */}
                                <div className="space-y-2"><Label>نام کامل</Label><Input id="name" value={formData?.name || ''} onChange={handleInputChange} className={glassInputStyle} /></div>
                                <div className="space-y-2"><Label>شماره تماس</Label><Input id="phone" value={formData?.phone || ''} onChange={handleInputChange} className={glassInputStyle} /></div>
                                <div className="space-y-2"><Label>ایمیل</Label><Input id="email" value={formData?.email || ''} readOnly className={`${glassInputStyle} opacity-60 cursor-not-allowed`} /></div>
                                <div className="space-y-2"><Label>موقعیت شغلی</Label><Input id="position" value={formData?.position || ''} onChange={handleInputChange} className={glassInputStyle} /></div>
                                <div className="space-y-2">
                                    <Label>موجودی حساب: </Label>
                                    <Input
                                        id="creditBalance"
                                        value={formData?.creditBalance?.toString() || ''}
                                        readOnly
                                        className={`${glassInputStyle} opacity-60 cursor-not-allowed`}
                                    />
                                </div>
                                {/* --- NEW: Floor Selector in Edit Mode --- */}
                                <div className="space-y-2">
                                    <Label htmlFor="defaultFloorId">طبقه پیش‌فرض</Label>
                                    <Select value={formData?.defaultFloorId?.toString() || ''} onValueChange={handleFloorChange} dir="rtl">
                                        <SelectTrigger className={`border border-white/40 focus-visible:ring-2 focus-visible:ring-indigo-500 p-2 hover:bg-white/10`}>
                                            <SelectValue placeholder="یک طبقه را انتخاب کنید" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white/10 border border-white/20 backdrop-blur-md text-white">
                                            {floors.map(floor => (
                                                <SelectItem key={floor.id} value={floor.id.toString()} className="hover:bg-indigo-500 hover:text-white ">
                                                    {floor.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* --- READ-ONLY VIEW --- */}
                                <InfoRow label="نام کامل" value={user.name} />
                                <InfoRow label="شماره تماس" value={user.phone} />
                                <InfoRow label="ایمیل" value={user.email} />
                                <InfoRow label="موقعیت شغلی" value={user.position} />
                                <InfoRow label="موجودی حساب" value={`${user.creditBalance.toLocaleString()} لبخند`} />

                                {/* --- NEW: Display Default Floor --- */}
                                <InfoRow label="طبقه پیش‌فرض" value={floors.find(floor => floor.id === user.defaultFloorId)?.name || 'ثبت نشده'} />
                            </>
                        )}
                    </div>
                </CardContent>
                <CardFooter className="border-t border-white/10 pt-4 flex justify-end">
                    <Button variant="secondary" onClick={() => setIsPasswordDialogOpen(true)}><KeyRound className="ml-2 h-4 w-4" /> تغییر رمز عبور</Button>
                </CardFooter>
            </Card>

            <ChangePasswordDialog isOpen={isPasswordDialogOpen} onClose={() => setIsPasswordDialogOpen(false)} />
        </>
    );
};