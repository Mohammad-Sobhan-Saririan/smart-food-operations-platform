"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import type { RstDish } from '@/types';
import { Upload, ImageIcon, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { resolveMediaUrl } from '@/lib/mediaUrl';

const glassInputStyle = "bg-white/5 border-white/20 placeholder:text-white/40 focus-visible:ring-offset-0 focus-visible:ring-offset-[#001233] focus-visible:ring-indigo-400";

interface DishFormDialogProps {
    dish?: Partial<RstDish> | null;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
}

export const DishFormDialog = ({ dish, isOpen, onClose, onUpdate }: DishFormDialogProps) => {
    const [formData, setFormData] = useState<Partial<RstDish>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const isEditMode = !!dish?.id;

    useEffect(() => {
        if (isOpen) {
            if (isEditMode && dish) {
                setFormData(dish);
                setImagePreview(dish.imageUrl || null);
            } else {
                setFormData({ name: '', description: '', imageUrl: '' });
                setImagePreview(null);
            }
            setImageFile(null);
        }
    }, [dish, isOpen, isEditMode]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }));
    };

    const handleSubmit = async () => {
        setIsLoading(true);
        const updatedFormData = { ...formData };

        try {
            // 1. If a new image file was selected, upload it first.
            if (imageFile) {
                const uploadFormData = new FormData();
                uploadFormData.append('image', imageFile);

                const uploadRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/upload`, {
                    method: 'POST',
                    credentials: 'include',
                    body: uploadFormData,
                });
                const uploadData = await uploadRes.json();
                if (!uploadRes.ok) throw new Error(uploadData.message || 'Image upload failed.');
                const newImageUrl = `http://localhost:5001${uploadData.imageUrl}`;
                updatedFormData.imageUrl = newImageUrl;
            }

            // 2. Now, submit the complete product data
            const url = isEditMode ? `${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/admin/restaurant/dishes/${dish!.id}` : `${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/admin/restaurant/dishes`;
            const method = isEditMode ? 'PUT' : 'POST';

            const finalRes = await fetch(url, {
                method, headers: { 'Content-Type': 'application/json' }, credentials: 'include',
                body: JSON.stringify(updatedFormData),
            });

            const finalData = await finalRes.json();
            if (!finalRes.ok) throw new Error(finalData.message);

            toast.success(finalData.message);
            onUpdate();
            onClose();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-[#001233]/90 backdrop-blur-xl border-white/20 text-white [&>button]:left-4 ...">
                <DialogHeader className="text-right"><DialogTitle>{isEditMode ? 'ویرایش غذا' : 'افزودن غذای جدید'}</DialogTitle></DialogHeader>
                <div className="grid gap-6 py-4 max-h-[70vh] overflow-y-auto pr-2" style={{ direction: 'rtl' }}>

                    <div className="space-y-2">
                        <Label>تصویر غذا</Label>
                        <div className="w-full h-48 rounded-lg bg-white/5 border-2 border-dashed border-white/20 flex items-center justify-center relative group">
                            {imagePreview ? (
                                <Image src={resolveMediaUrl(imagePreview)} unoptimized alt="Preview" fill className="rounded-md object-cover" />
                            ) : (
                                <div className="text-center text-white/40"><ImageIcon className="mx-auto h-12 w-12" /><p>تصویری انتخاب نشده</p></div>
                            )}
                            <Label htmlFor="image-upload" className="absolute inset-0 cursor-pointer bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity rounded-lg">
                                <Upload className="h-8 w-8 mb-2" /><span>تغییر یا آپلود تصویر</span>
                            </Label>
                            <Input id="image-upload" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                        </div>
                    </div>

                    <div className="space-y-2"><Label htmlFor="name">نام غذا</Label><Input id="name" value={formData.name || ''} onChange={handleChange} className={glassInputStyle} /></div>
                    <div className="space-y-2"><Label htmlFor="description">توضیحات</Label><Textarea id="description" value={formData.description || ''} onChange={handleChange} className={glassInputStyle} /></div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="outline" className="bg-transparent hover:bg-white/10">انصراف</Button></DialogClose>
                    <div className="flex items-center gap-2">
                        {isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
                        <Button onClick={handleSubmit} disabled={isLoading} className="bg-[#D63A4F] text-white hover:bg-red-700">ذخیره</Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};