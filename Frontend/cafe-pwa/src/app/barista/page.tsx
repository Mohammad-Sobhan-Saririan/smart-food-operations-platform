"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Clock, Search } from "lucide-react";
import { OrderTicket } from "@/components/barista/OrderTicket";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { useDebounce } from "@/hooks/useDebounce";
import { toast } from "sonner";
import { Order } from "@/types";


export default function BaristaDashboardPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    const fetchOrders = useCallback(async () => {
        const url = `${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/barista/orders?search=${debouncedSearchTerm}`;
        try {
            const res = await fetch(url, { credentials: 'include' });
            if (!res.ok) throw new Error("Failed to fetch orders");
            const data = await res.json();
            // We now filter for pending orders right after fetching
            setOrders((data.orders || []).filter((o: Order) => o.status === 'Pending'));
        } catch {
            if (loading) toast.error("خطایی در بارگزاری سفارشات رخ داده است!");
        } finally {
            if (loading) setLoading(false);
        }
    }, [loading, debouncedSearchTerm]);

    useEffect(() => {
        fetchOrders();
        const interval = setInterval(fetchOrders, 10000);
        return () => clearInterval(interval);
    }, [fetchOrders]);

    if (loading) {
        return <div className="flex justify-center items-center h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-white" /></div>;
    }

    return (
        <div style={{ direction: 'rtl' }}>
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold flex items-center gap-2 text-white">
                    <Clock /> سفارش‌های در انتظار ({orders.length})
                </h2>
                <div className="relative w-full md:max-w-sm">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/50" />
                    <Input
                        placeholder="جستجو با شماره سفارش یا نام کاربری..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pr-10 bg-white/10 border-white/20 text-white placeholder:text-white/40"
                    />
                </div>
            </div>
            {orders.length === 0 ? (
                <EmptyState
                    title="همه سفارش‌ها انجام شده!"
                    description="در حال حاضر هیچ سفارش در انتظاری وجود ندارد. کار عالی بود!"
                />
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {orders.map(order => (
                        <OrderTicket status={order.status} key={order.id} order={order} onUpdate={fetchOrders} />
                    ))}
                </div>
            )}
        </div>
    );
}