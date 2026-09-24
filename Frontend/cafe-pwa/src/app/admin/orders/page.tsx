"use client";

import { useState, useEffect, useCallback } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardFooter, CardTitle } from "@/components/ui/card";
import { Pagination, PaginationContent, PaginationItem } from "@/components/ui/pagination";
import { CheckCircle, Clock, Loader2, MoreHorizontal, XCircle } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@radix-ui/react-dropdown-menu";
import { SortableHeader } from "@/components/admin/SortableHeader";
import { statusTranslations } from "@/types"; // Import the status translations
interface Order {
    id: string;
    userName: string | null;
    createdAt: string;
    totalAmount: number;
    status: 'Pending' | 'Completed' | 'Cancelled';
}

const statusVariantMap: { [key in Order['status']]: 'default' | 'secondary' | 'destructive' } = {
    Pending: "default",
    Completed: "secondary",
    Cancelled: "destructive",
};


const statuses: Order['status'][] = ['Pending', 'Completed', 'Cancelled'];

export default function ManageOrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const debouncedSearchTerm = useDebounce(searchTerm, 500);
    const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' as 'asc' | 'desc' });

    // This useEffect hook now handles all data fetching.
    // It will re-run whenever the search term, filter, or current page changes.
    const fetchOrders = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                search: debouncedSearchTerm,
                status: statusFilter,
                page: page.toString(),
                sortBy: sortConfig.key,
                sortOrder: sortConfig.direction,
            });
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/admin/orders?${params.toString()}`, { credentials: 'include' });
            if (!res.ok) throw new Error("Failed to fetch orders");
            const data = await res.json();
            setOrders(data.orders || []);
            setTotalPages(data.pagination?.totalPages || 1);
        } catch {
            toast.error("خطایی در بارگزاری سفارشات رخ داده است!");
        } finally {
            setLoading(false);
        }
    }, [debouncedSearchTerm, statusFilter, sortConfig]); // Add sortConfig to dependencies


    // This useEffect resets the page to 1 whenever a filter changes
    // This useEffect now also depends on sortConfig
    useEffect(() => {
        fetchOrders(currentPage);
    }, [fetchOrders, currentPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearchTerm, statusFilter, sortConfig]);

    // Function to handle clicking on a sortable header
    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };


    const handleStatusUpdate = async (orderId: string, status: Order['status']) => {
        try {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/admin/orders/${orderId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ status }),
            });
            toast.success("وضعیت سفارش با موفقیت بروز شد.");
            // Manually update the specific order in the local state for an instant UI update
            setOrders(prevOrders => prevOrders.map(o => o.id === orderId ? { ...o, status } : o));
        } catch {
            toast.error("خطا در بروزرسانی وضعیت.");
        }
    };


    return (
        <Card className="bg-white/5 backdrop-blur-lg border border-white/20 text-white" style={{ direction: 'rtl' }}>
            <CardHeader>
                <CardTitle className="text-2xl font-bold">مدیریت سفارش‌ها</CardTitle>

                {/* --- FIX #1: Responsive Header Controls --- */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-4">
                    {/* Filter buttons now wrap on small screens */}
                    <div className="flex items-center gap-1 p-0.5 bg-white/10 rounded-lg flex-wrap justify-center">
                        <Button
                            onClick={() => setStatusFilter('All')}
                            variant={statusFilter === 'All' ? 'secondary' : 'ghost'}
                            className="h-8 text-xs sm:text-sm px-2 sm:px-4"
                        >
                            همه
                        </Button>
                        {statuses.map(s => (
                            <Button
                                key={s}
                                onClick={() => setStatusFilter(s)}
                                variant={statusFilter === s ? 'secondary' : 'ghost'}
                                className="h-8 text-xs sm:text-sm px-2 sm:px-4"
                            >
                                {statusTranslations[s]}
                            </Button>
                        ))}
                    </div>
                    <Input placeholder="جستجو..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full md:max-w-sm" />
                </div>
            </CardHeader>

            <CardContent>
                {/* Use overflow-x-auto to allow horizontal scrolling on very small tables if needed */}
                <div className="rounded-lg border border-white/10 overflow-x-auto">
                    <Table className="min-w-[640px]">
                        <TableHeader>
                            <TableRow className="border-b-white/10 hover:bg-transparent">
                                {/* ... and replace its contents with this: */}
                                <SortableHeader columnKey="id" title="شماره سفارش" sortConfig={sortConfig} onSort={handleSort} />

                                {/* We add the responsive classes directly to the SortableHeader */}
                                <SortableHeader columnKey="userName" title="کاربر" sortConfig={sortConfig} onSort={handleSort} className="hidden sm:table-cell" />
                                <SortableHeader columnKey="createdAt" title="تاریخ" sortConfig={sortConfig} onSort={handleSort} className="hidden md:table-cell" />

                                <SortableHeader columnKey="status" title="وضعیت" sortConfig={sortConfig} onSort={handleSort} />
                                <SortableHeader columnKey="totalAmount" title="مبلغ کل" sortConfig={sortConfig} onSort={handleSort} />

                                {/* The 'Actions' column is not sortable, so it remains a normal TableHead */}
                                <TableHead className="text-right text-white">اقدامات</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (<TableRow><TableCell colSpan={6} className="text-center h-24"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>) : (
                                orders.map((order) => (
                                    <TableRow key={order.id} className="border-white/10 hover:bg-white/5">
                                        <TableCell className="font-mono text-xs">{order.id}</TableCell>
                                        <TableCell className="text-right hidden sm:table-cell">{order.userName || 'مهمان'}</TableCell>
                                        <TableCell className="text-right hidden md:table-cell">{new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(order.createdAt))}</TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant={statusVariantMap[order.status] || 'default'} style={{
                                                backgroundColor: order.status === 'Pending' ? '#f0ad4e' : order.status === 'Completed' ? '#5cb85c' : '#d9534f',
                                                color: 'white',
                                            }}>
                                                {statusTranslations[order.status]}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-medium">{order.totalAmount.toLocaleString()}</TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0 hover:bg-white/10"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                {/* --- FIX #3: Responsive Dropdown Menu --- */}
                                                <DropdownMenuContent
                                                    align="end"
                                                    className="bg-[#001233]/90 backdrop-blur-lg border-white/20 text-white w-[200px] border border-solid border-white/10 rounded-lg shadow-lg p-4"
                                                >
                                                    {/* \    align-items: center;
                                                        display: flex
                                                    ;
                                                        flex-direction: row;
                                                        justify-content: space-around; */}
                                                    <DropdownMenuItem onClick={() => handleStatusUpdate(order.id, 'Completed')}
                                                        className="focus:bg-green-500/20 focus:text-white flex items-center justify-between h-8">
                                                        <CheckCircle className="ml-2 h-4 w-4 text-green-500" />تکمیل کردن
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleStatusUpdate(order.id, 'Pending')}
                                                        className="focus:bg-yellow-500/20 focus:text-white flex items-center justify-between h-8">
                                                        <Clock className="ml-2 h-4 w-4 text-yellow-500" />بازگردانی به در انتظار
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleStatusUpdate(order.id, 'Cancelled')}
                                                        className="text-red-500 focus:text-red-500 focus:bg-red-500/20 flex items-center justify-between h-8">
                                                        <XCircle className="ml-2 h-4 w-4" />لغو کردن
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
            <CardFooter>
                {/* The pagination component now uses simpler state */}
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
            </CardFooter>
        </Card >
    );
}