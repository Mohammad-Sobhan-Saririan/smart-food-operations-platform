"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Loader2, Package, User, Calendar, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Order } from '@/types';

// Define types for our data
interface OrderItem { id: string; name: string; quantity: number; price: number; }

// --- We create small helper components for a cleaner main component ---

const ReceiptHeader = ({ orderId }: { orderId: string }) => (
    <div className="flex justify-between items-start">
        <div>
            <h2 className="text-xl sm:text-2xl font-bold">فاکتور سفارش</h2>
            <p className="text-xs sm:text-sm text-white/60 mt-1" >
                شماره سفارش: <span className="font-mono" style={{
                    unicodeBidi: "plaintext",
                }}>{orderId}</span>
            </p>
        </div>
        <Package size={32} className="text-white/50 flex-shrink-0" />
    </div>
);

const ReceiptInfoRow = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | null }) => (
    <div className="flex flex-col sm:flex-row justify-between sm:items-center text-sm sm:text-base text-white/80">
        <span className="font-semibold flex items-center gap-2 mb-1 sm:mb-0">{icon}{label}</span>
        <span className="text-right">{value}</span>
    </div>
);

const ReceiptItemsList = ({ items }: { items: OrderItem[] }) => (
    <div className="space-y-3">
        <h3 className="font-semibold text-lg">اقلام سفارش</h3>
        {items.map((item) => (
            <div key={item.id} className="flex justify-between items-center text-sm">
                <p style={{ direction: "ltr" }} ><span className="text-white/60 font-mono text-xs" >{item.quantity} x </span>{item.name} </p>
                <p className="font-mono">{item.price.toLocaleString()}</p>
            </div>
        ))}
    </div>
);

export default function OrderSuccessPage() {
    const params = useParams();
    const orderId = params.orderId as string;

    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!orderId) return;

        const fetchOrderDetails = async () => {
            try {
                setLoading(true);
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/orders/${orderId}`);
                if (!res.ok) throw new Error('Could not find order details.');
                const data = await res.json();
                setOrder(data);
            } catch (error) {
                if (error instanceof Error) {
                    setError(error.message);
                } else {
                    toast.error("خطایی رخ داده است!");
                }
            } finally {
                setLoading(false);
            }
        };
        fetchOrderDetails();
    }, [orderId]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-[80vh]">
                <Loader2 className="h-10 w-10 animate-spin text-white" />
            </div>
        );
    }

    if (error || !order) {
        return <div className="text-center text-red-400 mt-20">{error || "Order not found."}</div>;
    }

    const items: OrderItem[] = JSON.parse(order.items);
    const formattedDate = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(order.createdAt));

    return (
        <div className="container mx-auto max-w-lg py-6 px-4 text-white" style={{ direction: 'rtl' }}>
            {/* بخش موفقیت - مینیمال و جمع‌وجور */}
            <div className="flex flex-col items-center text-center mt-4">
<CheckCircle2 className="h-24 w-24 text-teal-300" />
                <h1 className="text-xl sm:text-2xl font-bold mt-2">سفارش ثبت شد!</h1>
                <p className="text-sm sm:text-base text-white/70 mt-1">
                    رسید شما آماده است
                </p>
            </div>

            {/* کارت فاکتور - مینیمال و تمیز */}
            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl mt-6 p-5">
                {/* هدر */}
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h2 className="text-lg font-bold">فاکتور سفارش</h2>
                        <p className="text-xs text-white/60 mt-0.5">
                            شماره: <span className="font-mono">{order.id}</span>
                        </p>
                    </div>
                    <Package size={28} className="text-white/40" />
                </div>

                <Separator className="my-4 bg-white/20" />

                {/* اطلاعات پایه */}
                <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                        <span className="text-white/70 flex items-center gap-2">
                            <Calendar size={14} /> تاریخ
                        </span>
                        <span className="text-right">{formattedDate}</span>
                    </div>
                    {order.userName && (
                        <div className="flex justify-between">
                            <span className="text-white/70 flex items-center gap-2">
                                <User size={14} /> نام کاربر
                            </span>
                            <span>{order.userName}</span>
                        </div>
                    )}
                </div>

                <div className="my-4 border-t border-dashed border-white/20" />

                {/* لیست آیتم‌ها */}
                <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-white/80">اقلام سفارش</h3>
                    {items.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                            <p style={{ direction: "ltr" }} ><span className="text-white/60 font-mono text-xs" >{item.quantity} x </span>{item.name} </p>
                            <p className="font-mono">{item.price.toLocaleString()}</p>
                        </div>
                    ))}
                </div>

                <Separator className="my-4 bg-white/20" />

                {/* مبلغ نهایی */}
                <div className="flex justify-between text-lg font-bold">
                    <span>مبلغ نهایی</span>
                    <span>{order.totalAmount.toLocaleString()} لبخند</span>
                </div>

                {/* توضیحات سفارش - مینیمال */}
                {order.description || true ? (
                    <div className="mt-4">
                        <p className="text-xs font-medium text-white/80 mb-1.5">توضیحات:</p>
                        <p className="text-sm bg-white/10 rounded-lg px-3 py-2 leading-relaxed whitespace-pre-wrap">
                            {order.description || 'بدون توضیحات اضافی'}
                        </p>
                    </div>
                ) : null}

            </div>

            {/* دکمه بازگشت */}
            <div className="text-center mt-6">
                <Button asChild size="lg" className="bg-[#D63A4F] hover:bg-red-700 text-white font-medium w-full max-w-xs">
                    <Link href="/cafe">سفارش جدید بده</Link>
                </Button>
            </div>
        </div>
    );
}