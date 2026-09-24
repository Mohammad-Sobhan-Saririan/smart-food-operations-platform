"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Image as ImageIcon, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { resolveMediaUrl } from '@/lib/mediaUrl';
import type { Product } from '@/types';
import { toast } from 'sonner';

const glassInputStyle = "bg-white/5 border-white/20 placeholder:text-white/40 focus-visible:ring-offset-0 focus-visible:ring-offset-[#001233] focus-visible:ring-indigo-400";

interface ProductDialogProps {
    product?: Partial<Product> | null;
    isOpen: boolean;
    onClose: () => void;
    onProductUpdate: () => void;
}

export const ProductDialog = ({ product, isOpen, onClose, onProductUpdate }: ProductDialogProps) => {
    const [formData, setFormData] = useState<Partial<Product>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null); // State for the selected file
    const [imagePreview, setImagePreview] = useState<string | null>(null); // State for the image preview URL
    const isEditMode = !!product?.id;


    useEffect(() => {
        if (isOpen) {
            if (isEditMode && product) {
                setFormData(product);
                setImagePreview(product.imageUrl || null); // Show existing image
            } else {
                setFormData({ name: '', price: 0, category: 'بار گرم', stock: 100, isDisabled: false, description: '' });
                setImagePreview(null); // Clear preview for new product
            }
            setImageFile(null); // Reset file input on open
        }
    }, [product, isOpen, isEditMode]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file)); // Create a temporary URL for preview
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value, type } = e.target;
        setFormData(prev => ({ ...prev, [id]: type === 'number' ? parseInt(value) || 0 : value }));
    };
    const handleSubmit = async () => {
        setIsLoading(true);
        const updatedFormData = { ...formData };

        try {
            // --- NEW UPLOAD LOGIC ---
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

                // 2. Add the new image URL to our product data
                // if image url not start with /images add it
                console.log(`uploadData.imageUrl ${uploadData.imageUrl}`)
                const newImageUrl = `${uploadData.imageUrl}`;
                updatedFormData.imageUrl = newImageUrl;
            }

            // 3. Now, submit the complete product data (with the new imageUrl if applicable)
            const url = isEditMode ? `${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/products/${product?.id}` : `${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/products`;
            const method = isEditMode ? 'PUT' : 'POST';
            const finalRes = await fetch(`${url}`, {
                method, headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(updatedFormData),
            });

            const finalData = await finalRes.json();
            if (!finalRes.ok) throw new Error(finalData.message);

            toast.success(finalData.message);
            onProductUpdate();
            onClose();

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
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent
                className="bg-[#001233]/90 backdrop-blur-xl border-white/20 text-white 
                sm:max-w-2xl flex flex-col h-[90vh] max-h-[600px] 
                [&>button]:left-4 [&>button]:top-4 [&>button]:right-auto [&>button]:text-white/70 [&>button:hover]:text-white"
                style={{ direction: 'rtl' }}
            >
                <DialogHeader className="text-right flex-shrink-0" style={{ textAlign: 'right' }}>
                    <DialogTitle>{isEditMode ? 'ویرایش محصول' : 'افزودن محصول جدید'}</DialogTitle>
                    <DialogDescription className="text-white/60">
                        جزئیات محصول را در زیر وارد کنید.
                    </DialogDescription>
                </DialogHeader>

                {/* --- NEW, RESPONSIVE FORM LAYOUT --- */}
                <div className="space-y-6 py-4 max-h-[70vh] overflow-y-auto pr-2 pl-4">

                    {/* 1. New, more prominent Image Uploader */}
                    <div className="space-y-2">
                        <Label className="text-center block">تصویر محصول</Label>
                        <div className="sm:w-56 h-56 w-auto rounded-lg bg-white/5 border-2 border-dashed border-white/20 flex items-center justify-center relative group mx-auto">
                            {imagePreview ? (
                                <Image
                                    src={resolveMediaUrl(imagePreview)}
                                    unoptimized
                                    alt="Product preview"
                                    fill
                                    className="rounded-md"
                                    style={{ objectFit: 'cover', borderRadius: '0.5rem' }}
                                />
                            ) : (
                                <div className="text-center text-white/40">
                                    <ImageIcon className="mx-auto h-12 w-12" />
                                    <p>تصویری انتخاب نشده</p>
                                </div>
                            )}
                            <Label htmlFor="image-upload" className="absolute inset-0 cursor-pointer bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-lg text-center">
                                <div className="flex flex-col items-center">
                                    <Upload className="h-8 w-8 mb-2" />
                                    <span>تغییر یا آپلود تصویر</span>
                                </div>
                            </Label>
                            <Input id="image-upload" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                        </div>
                    </div>
                    <div className="space-y-2"><Label htmlFor="name">نام محصول</Label><Input id="name" value={formData.name || ''} onChange={handleChange} className={glassInputStyle} /></div>

                    <div className="space-y-2"><Label htmlFor="description">توضیحات</Label><Textarea id="description" value={formData.description || ''} onChange={handleChange} className={glassInputStyle} /></div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                        <div className="space-y-2"><Label htmlFor="price">قیمت (لبخند)</Label><Input id="price" type="number" value={formData.price || 0} onChange={handleChange} className={glassInputStyle} /></div>

                        <div className="space-y-2"><Label htmlFor="stock">موجودی</Label><Input id="stock" type="number" value={formData.stock || 0} onChange={handleChange} className={glassInputStyle} /></div>
                    </div>

                    <div className="space-y-2"><Label htmlFor="category">دسته بندی</Label>
                        <Select value={formData.category} onValueChange={(value) => setFormData(p => ({ ...p, category: value as 'بار گرم' | 'بار سرد' }))} dir="rtl">
                            <SelectTrigger className={glassInputStyle}><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="بار گرم">بار گرم</SelectItem><SelectItem value="بار سرد">بار سرد</SelectItem></SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center pt-2">
                        <Switch id="isDisabled"
                            style={{ direction: 'ltr' }}
                            checked={formData.isDisabled || false}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isDisabled: checked }))}
                            className="bg-white/10 hover:bg-white/20 data-[state=checked]:bg-[#D63A4F] data-[state=unchecked]:bg-white/10 rounded-full h-6 relative"
                        />
                        <Label htmlFor="isDisabled" className="mr-2">غیرفعال کردن این محصول در منو</Label>
                    </div>
                </div>

                <DialogFooter className="border-t border-white/10 pt-4 flex-shrink-0">
                    <DialogClose asChild><Button type="button" variant="outline" className="bg-transparent hover:bg-white/10">انصراف</Button></DialogClose>
                    <div className="flex items-center gap-2">
                        {isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
                        <Button onClick={handleSubmit} disabled={isLoading} className="bg-[#D63A4F] text-white hover:bg-red-700">
                            {isEditMode ? 'ذخیره تغییرات' : 'ایجاد محصول'}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};