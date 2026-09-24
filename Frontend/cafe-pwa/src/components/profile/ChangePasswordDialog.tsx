"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

const glassInputStyle = "bg-white/5 border-white/20 placeholder:text-white/40 focus-visible:ring-offset-0 focus-visible:ring-offset-[#001233] focus-visible:ring-indigo-400";

interface ChangePasswordDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ChangePasswordDialog = ({ isOpen, onClose }: ChangePasswordDialogProps) => {
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showOldPassword, setShowOldPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast.error("رمز عبورهای جدید مطابقت ندارند.");
            return;
        }
        setIsLoading(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/users/password`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ oldPassword, newPassword }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            toast.success(data.message);
            onClose(); // Close the dialog on success
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
            <DialogContent className="bg-[#001233]/90 backdrop-blur-xl border-white/20 text-white [&>button]:left-4 [&>button]:top-4 [&>button]:right-auto" style={{ direction: 'rtl' }}>
                <DialogHeader className="text-right"
                    style={{ textAlign: 'right' }}>
                    <DialogTitle>تغییر رمز عبور</DialogTitle>
                    <DialogDescription className="text-white/60">برای امنیت، رمز عبور فعلی خود را وارد کنید.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="oldPassword">رمز عبور فعلی</Label>
                        <div className="relative flex items-center">
                            <Button
                                type="button"
                                className="absolute inset-y-0 left-2 flex items-center hover:shadow-lg hover:rounded-full hover:bg-white/80"
                                onClick={() => setShowOldPassword(!showOldPassword)}
                                variant="ghost"
                            >
                                {showOldPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                            <Input
                                id="oldPassword"
                                type={showOldPassword ? 'text' : 'password'}
                                value={oldPassword}
                                onChange={(e) => setOldPassword(e.target.value)}
                                required
                                className={`${glassInputStyle} pl-10`} // Add padding to the left for the button
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="newPassword">رمز عبور جدید</Label>
                        <div className="relative flex items-center">
                            <Button
                                type="button"
                                className="absolute inset-y-0 left-2 flex items-center hover:shadow-lg hover:rounded-full hover:bg-white/80"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                variant="ghost"
                            >
                                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                            <Input
                                id="newPassword"
                                type={showNewPassword ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                className={`${glassInputStyle} pl-10`} // Add padding to the left for the button
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">تکرار رمز عبور جدید</Label>
                        <div className="relative flex items-center">
                            <Button
                                type="button"
                                className="absolute inset-y-0 left-2 flex items-center hover:shadow-lg hover:rounded-full hover:bg-white/80"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                variant="ghost"
                            >
                                {showConfirmPassword ? <EyeOff className="h-4 w-4 hover:shadow-lg hover:rounded-full hover:bg-white/80" /> : <Eye className="h-4 w-4 hover:shadow-lg hover:rounded-full hover:bg-white/80" />}
                            </Button>
                            <Input
                                id="confirmPassword"
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                className={`${glassInputStyle} pl-10`} // Add padding to the left for the button
                            />
                        </div>
                    </div>
                    <DialogFooter className="pt-4">
                        <DialogClose asChild><Button type="button" variant="outline" className="bg-transparent hover:bg-white/10">انصراف</Button></DialogClose>
                        <Button type="submit" disabled={isLoading} className="bg-[#D63A4F] hover:bg-red-700">{isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'بروزرسانی رمز عبور'}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};