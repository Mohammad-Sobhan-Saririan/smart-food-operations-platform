"use client";

import { useEffect, useState } from 'react';
import type { CartItem } from '@/store/cartStore'; // Reuse CartItem type
import { Loader2, Package, Calendar, Tag, BadgeCheck } from 'lucide-react';
import { Order } from '@/types'; // Import Order type
import { statusTranslations } from '@/types'; // Import status translations

const OrderCard = ({ order }: { order: Order }) => {
    const items: CartItem[] = JSON.parse(order.items);
    const formattedDate = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(order.createdAt));

    return (
        <div className="bg-white/5 backdrop-blur-lg border border-white/20 p-4 rounded-xl shadow-sm text-white">
            <div className="flex flex-wrap justify-between items-center gap-4 mb-4 pb-4 border-b border-white/10">
                <div>
                    <p className="text-sm text-white/60 flex items-center gap-2"><Package size={16} /> شماره سفارش</p>
                    <p className="font-mono text-sm">{order.id}</p>
                </div>
                <div>
                    <p className="text-sm text-white/60 flex items-center gap-2"><Calendar size={16} /> تاریخ سفارش</p>
                    <p>{formattedDate}</p>
                </div>
                <div>
                    <p className="text-sm text-white/60 flex items-center gap-2"><Tag size={16} /> مبلغ کل</p>
                    <p className="font-bold text-lg">{items.reduce((total, item) => total + (item.price * item.quantity), 0).toLocaleString()} لبخند</p>
                </div>
                <div>
                    <p className="text-sm text-white/60 flex items-center gap-2 mb-1"><BadgeCheck size={16} /> وضعیت</p>
                    <span
                        className={`text-xs font-medium me-2 px-2.5 py-0.5 rounded-full ${order.status === 'Completed'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                            : order.status === 'Pending'
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                            }`}
                    >
                        {statusTranslations[order.status]}
                    </span>
                </div>
            </div>
            <div className="mb-4">
                <p className="text-sm font-semibold text-white/90 mb-2">توضیحات سفارش:</p>
                {order.description ? (
                    <p className="text-base text-white bg-white/10 rounded-lg p-3 leading-relaxed whitespace-pre-wrap">
                        {order.description}
                    </p>
                ) : (
                    <p className="text-sm text-white/50 italic">
                        بدون توضیحات اضافی
                    </p>
                )}
            </div>
            <div>
                <h4 className="font-semibold mb-2">اقلام سفارش:</h4>
                <ul className="space-y-1 text-sm text-white/90">
                    {items.map(item => (
                        <li key={item.id} className="flex justify-between">
                            <span style={{ direction: "ltr" }} ><span className="text-white/60 " >{item.quantity} x </span>{item.name} </span>

                            <span>{(item.price * item.quantity).toLocaleString()}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export const OrderHistory = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                setLoading(true);
                // Add credentials: 'include' to the fetch call
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/orders`, {
                    credentials: 'include'
                });
                if (!res.ok) throw new Error('Failed to fetch orders');
                const data = await res.json();
                setOrders(data);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchOrders();
    }, []);

    if (loading) {
        return <div className="flex justify-center p-10"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (orders.length === 0) {
        return <p>شما تاکنون هیچ سفارشی ثبت نکرده‌اید.</p>;
    }

    return (
        <div className="space-y-6">
            {orders.map(order => (
                <OrderCard key={order.id} order={order} />
            ))}
        </div>
    );
};