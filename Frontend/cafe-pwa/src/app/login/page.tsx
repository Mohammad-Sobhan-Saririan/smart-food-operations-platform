"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Coffee } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
    const router = useRouter();
    const { user, setUser } = useAuthStore();
    const [employeeNumber, setEmployeeNumber] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // if user is already logged in, redirect to home\
    useEffect(() => {
        if (user) {
            router.push("/");
        }
    }, [user, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ employeeNumber, password, rememberMe }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to login');

            console.log("Login successful:", data.user);
            setUser(data.user);
            if (!localStorage.getItem('deviceId')) {
                localStorage.setItem('deviceId', crypto.randomUUID());
            }
            // const deviceId = localStorage.getItem('deviceId')!;
            router.push('/');
        } catch (error) {
            if (error instanceof Error) {
                setError(error.message);
                toast.error(error.message);
            } else {
                toast.error("خطایی رخ داده است!");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center p-4">
            <Coffee className="w-24 h-24 text-teal-300 mb-4" aria-label="Smart Food Operations" />

            <Card className="w-full max-w-xs sm:max-w-sm bg-white/10 backdrop-blur-2xl border-2 border-white/10 text-white shadow-2xl">
                <CardHeader className="items-center text-start">
                    <CardTitle className="text-xl sm:text-2xl font-bold">ورود به حساب کاربری</CardTitle>
                    <CardDescription className="text-white/60 pt-1 text-sm sm:text-md">
                        نام کاربری و رمز عبور خود را وارد کنید
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="employeeNumber">نام کاربری</Label>
                            <Input
                                id="employeeNumber"
                                value={employeeNumber}
                                onChange={(e) => setEmployeeNumber(e.target.value)}
                                required
                                className="bg-white/5 border-white/20 placeholder:text-white/40"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">رمز عبور</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="bg-white/5 border-white/20 placeholder:text-white/40"
                            />
                        </div>

                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="remember-me"
                                checked={rememberMe}
                                onCheckedChange={(checked) => setRememberMe(!!checked)}
                            />
                            <Label htmlFor="remember-me" className="text-sm font-medium leading-none cursor-pointer">
                                مرا به خاطر بسپار
                            </Label>
                        </div>

                        {error && <p className="text-sm text-red-400 pt-2 text-center">{error}</p>}

                        <Button
                            type="submit"
                            className="w-full !mt-2 bg-[#D63A4F] hover:bg-red-700 font-bold text-base sm:text-lg"
                            disabled={isLoading}
                        >
                            {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 'ورود'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}