"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogClose,
    DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, PlusCircle, Trash2, MapPin, Edit2 } from 'lucide-react';
import { Floor } from '@/types'; // Ensure this import matches your types file

export default function ManageFloorsPage() {
    const [floors, setFloors] = useState<Floor[]>([]);
    const [loading, setLoading] = useState(true);
    const [newFloorName, setNewFloorName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingFloorId, setEditingFloorId] = useState<number | null>(null);
    const [editingFloorName, setEditingFloorName] = useState<string>('');
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    const fetchFloors = useCallback(async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/floors`, { credentials: 'include' });
            if (!res.ok) throw new Error("Failed to fetch floors.");
            const data = await res.json();
            setFloors(data);
        } catch (error: unknown) {
            if (error instanceof Error) {
                toast.error(error.message);
            } else {
                toast.error("An unknown error occurred.");
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchFloors(); }, [fetchFloors]);

    const handleAddFloor = async () => {
        if (!newFloorName.trim()) {
            toast.warning("لطفا نام طبقه را وارد کنید.");
            return;
        }
        setIsSubmitting(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/floors`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ name: newFloorName }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Could not add floor.");

            toast.success(`طبقه '${newFloorName}' با موفقیت اضافه شد.`);
            setNewFloorName('');
            fetchFloors(); // Refresh the list
        } catch (error) {
            if (error instanceof Error) {
                toast.error(error.message);
            } else {
                toast.error("خطایی رخ داده است!");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteFloor = async (floorId: number) => {
        if (!confirm("آیا از حذف این طبقه مطمئن هستید؟ این عمل قابل بازگشت نیست.")) return;

        const originalFloors = [...floors];
        setFloors(currentFloors => currentFloors.filter(f => f.id !== floorId));

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/floors/${floorId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            if (!res.ok) throw new Error("Deletion failed on the server.");
            toast.success("طبقه با موفقیت حذف شد.");
        } catch {
            toast.error("خطا در حذف طبقه. بازگردانی لیست.");
            setFloors(originalFloors);
        }
    };

    const handleEditFloor = (floor: Floor) => {
        setEditingFloorId(floor.id);
        setEditingFloorName(floor.name);
        setIsEditDialogOpen(true);
    };

    const handleUpdateFloor = async () => {
        if (!editingFloorName.trim()) {
            toast.warning("لطفا نام طبقه را وارد کنید.");
            return;
        }
        setIsSubmitting(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/floors/${editingFloorId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ name: editingFloorName }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Could not update floor.");

            toast.success(`طبقه '${editingFloorName}' با موفقیت ویرایش شد.`);
            setEditingFloorId(null);
            setEditingFloorName('');
            setIsEditDialogOpen(false);
            fetchFloors(); // Refresh the list
        } catch (error) {
            if (error instanceof Error) {
                toast.error(error.message);
            } else {
                toast.error("خطایی رخ داده است!");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={{ direction: 'rtl' }}>
            <Card className="bg-white/5 backdrop-blur-lg border border-white/20 text-white">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold flex items-center gap-2"><MapPin /> مدیریت طبقات</CardTitle>
                    <CardDescription className="text-white/60 pt-1">طبقاتی که سفارشات به آن‌ها ارسال می‌شود را در اینجا اضافه یا حذف کنید.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-2 mb-6 pb-6 border-b border-white/10">
                        <Input
                            placeholder="نام طبقه جدید (مثال: طبقه دوم - واحد مالی)"
                            value={newFloorName}
                            onChange={(e) => setNewFloorName(e.target.value)}
                            className="bg-white/10 border-white/20 placeholder:text-white/40"
                        />
                        <Button onClick={handleAddFloor} disabled={isSubmitting} className="bg-[#D63A4F] hover:bg-red-700">
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="ml-2 h-4 w-4" />}
                            افزودن
                        </Button>
                    </div>
                    <div className="space-y-3">
                        <h3 className="font-semibold text-lg">لیست طبقات موجود</h3>
                        {loading ? <Loader2 className="mx-auto h-6 w-6 animate-spin" /> :
                            floors.length > 0 ? floors.map(floor => (
                                <div key={floor.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-transparent hover:border-white/20 transition-colors">
                                    <span className="font-semibold">{floor.name}</span>
                                    <div className="flex items-center gap-2">
                                        <Button size="icon" variant="ghost" className="text-blue-500/70 hover:text-blue-500 hover:bg-blue-500/10 rounded-full" onClick={() => handleEditFloor(floor)}>
                                            <Edit2 size={18} />
                                        </Button>
                                        <Button size="icon" variant="ghost" className="text-red-500/70 hover:text-red-500 hover:bg-red-500/10 rounded-full" onClick={() => handleDeleteFloor(floor.id)}>
                                            <Trash2 size={18} />
                                        </Button>
                                    </div>
                                </div>
                            )) : <p className="text-white/60">هیچ طبقه‌ای ثبت نشده است.</p>
                        }
                    </div>
                </CardContent>
            </Card>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent
                    className="bg-[#001233]/90 backdrop-blur-xl border-white/20 text-white 
                [&>button]:left-4 [&>button]:top-4 [&>button]:right-auto [&>button]:text-white/70 [&>button:hover]:text-white"
                    style={{ direction: 'rtl' }}
                >
                    <DialogHeader className="text-right flex-shrink-0" style={{ textAlign: 'right' }}>
                        <DialogTitle>ویرایش طبقه</DialogTitle>
                        <DialogDescription>نام جدید طبقه را وارد کنید.</DialogDescription>
                    </DialogHeader>
                    <Input
                        value={editingFloorName}
                        onChange={(e) => setEditingFloorName(e.target.value)}
                        placeholder="نام جدید طبقه"
                        className="bg-white/10 border-white/20 placeholder:text-white/40"
                    />
                    <DialogFooter>
                        <Button onClick={handleUpdateFloor} disabled={isSubmitting} className="bg-[#D63A4F] hover:bg-[#D63A4F]/80">
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "ذخیره"}
                        </Button>
                        <DialogClose asChild>
                            <Button variant="ghost" className="border border-white/20">لغو</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}