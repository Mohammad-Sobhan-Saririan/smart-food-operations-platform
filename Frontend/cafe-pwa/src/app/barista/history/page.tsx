"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Archive } from "lucide-react";
import { OrderTicket } from "@/components/barista/OrderTicket";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination, PaginationContent, PaginationItem } from "@/components/ui/pagination";
import { toast } from "sonner";
import type { Order } from '@/types';

export default function BaristaHistoryPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchPastOrders = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/barista/history?page=${currentPage}`, { credentials: 'include' });
            if (!res.ok) throw new Error("Failed to fetch order history.");
            const data = await res.json();
            setOrders(data.orders || []);
            setTotalPages(data.pagination?.totalPages || 1);
        } catch {
            toast.error("خطایی در بارگزاری تاریخچه سفارشات بوجود آمده است!");
        } finally {
            setLoading(false);
        }
    }, [currentPage]);

    useEffect(() => { fetchPastOrders(); }, [fetchPastOrders]);

    if (loading) {
        return <div className="flex justify-center items-center h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-white" /></div>;
    }

    return (
        <div style={{ direction: 'rtl' }}>
            <h2 className="text-2xl font-semibold flex items-center gap-2 text-white mb-6">
                <Archive /> تاریخچه سفارشات
            </h2>
            {orders.length === 0 ? (
                <EmptyState title="تاریخچه خالی است" description="هنوز سفارشی تکمیل یا لغو نشده است." />
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {orders.map(order => (
                            <OrderTicket status={order.status} key={order.id} order={order} onUpdate={fetchPastOrders} />
                        ))}
                    </div>
                    {totalPages > 1 && (
                        <div className="w-full px-4 py-2">

                            <Pagination className="w-full">
                                <PaginationContent className="flex flex-row items-center justify-center gap-2 w-full">
                                    <PaginationItem>
                                        <button
                                            onClick={() => setCurrentPage(p => p - 1)}
                                            disabled={currentPage <= 1}
                                            className="px-2 py-1 sm:px-4 sm:py-2 text-sm sm:text-base rounded-lg bg-white/10 hover:bg-white/20 text-white disabled:opacity-50"
                                        >
                                            <span className="block sm:hidden">«</span>
                                            <span className="hidden sm:block text-sm">« صفحه قبلی</span>
                                        </button>
                                    </PaginationItem>

                                    <PaginationItem>
                                        <span className="text-sm sm:text-base px-2 py-1 sm:px-4 sm:py-2 rounded-lg text-white text-center">
                                            صفحه {currentPage} از {totalPages}
                                        </span>
                                    </PaginationItem>

                                    <PaginationItem>
                                        <button
                                            onClick={() => setCurrentPage(p => p + 1)}
                                            disabled={currentPage >= totalPages}
                                            className="px-2 py-1 sm:px-4 sm:py-2 text-sm sm:text-base rounded-lg bg-white/10 hover:bg-white/20 text-white disabled:opacity-50"
                                        >
                                            <span className="block sm:hidden">»</span>
                                            <span className="hidden sm:block text-sm">صفحه بعدی »</span>
                                        </button>
                                    </PaginationItem>
                                </PaginationContent>
                            </Pagination>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}