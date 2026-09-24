"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import { faIR } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import type { Order } from "@/types";
import { statusTranslations } from "@/types";
// Define the types for our order data
interface OrderItem { id: string; name: string; quantity: number; price: number; }

interface OrderTicketProps {
    order: Order;
    onUpdate: () => void;
    status: string;
}

const URGENCY_THRESHOLD_MINUTES = 60;

export const OrderTicket = ({ order, onUpdate, status }: OrderTicketProps) => {
    const items: OrderItem[] = order.items ? JSON.parse(order.items) : [];

    const handleStatusUpdate = async (status: 'Completed' | 'Cancelled') => {
        try {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/admin/orders/${order.id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ status }),
            });
            onUpdate();
        } catch (error) {
            console.error("Failed to update order:", error);
            alert("Could not update order status.");
        }
    };

    const timeAgo = formatDistanceToNow(new Date(order.createdAt), { addSuffix: true, locale: faIR });
    const minutesPending = (new Date().getTime() - new Date(order.createdAt).getTime()) / 60000;
    const isUrgent = order.status === 'Pending' && minutesPending > URGENCY_THRESHOLD_MINUTES;

    const statusStyles = {
        Pending: "border-yellow-400 bg-white/5",
        Completed: "border-green-500 bg-green-500/5",
        Cancelled: "border-red-500 bg-red-500/5 opacity-70",
    };

    return (
        <div className={cn(
            "border-l-4 p-4 rounded-lg shadow-lg flex flex-col h-full backdrop-blur-lg border transition-all",
            statusStyles[order.status],
            // Add a pulse animation for urgent orders
        )}>
            <h3 className="font-bold text-lg text-white">{order.userName || 'سفارش مهمان'}</h3>

            {status != 'Pending' ? (
                <div className={`flex items-center gap-1 ${status === 'Completed' ? 'text-green-400' : 'text-red-400'}`}>
                    {status === 'Completed' ? (
                        <CheckCircle size={14} />
                    ) : (
                        <XCircle size={14} />
                    )}
                    <span> {statusTranslations[order.status]}</span>
                </div>
            ) : isUrgent ? (
                <div className="flex items-center gap-1 text-red-400">
                    <AlertTriangle size={14} />
                    <span>فوری</span>
                </div>
            ) : (
                <div className="flex items-center gap-1 text-yellow-400 animate-pulse">
                    <span>در انتظار</span>
                    <AlertTriangle size={14} />
                </div>
            )}
            <p className="text-xs text-white/60 mt-1 mb-2">{timeAgo}</p>
            <div className="flex items-center gap-2 text-white/60  py-2 rounded-lg">
                <span className="text-sm font-medium">محل تحویل:</span>
                <span className="text-base sm:text-lg font-bold text-white">{order.deliveryFloorName || 'نامشخص'}</span>
            </div>
            <p className="text-xs text-white/60 mb-3 flex items-center gap-1">
                <span>شماره سفارش:</span>
                <span>{order.id}</span>
            </p>
            <div className="border-t border-dashed border-white/20 my-2"></div>

            <ul className="space-y-2 flex-grow text-white">
                {items.map(item => (
                    <li key={item.id} className="flex justify-between items-center">
                        <span className="text-base font-semibold">{item.name}</span>
                        <span className="text-lg font-bold bg-white/10 rounded-md px-2">
                            {item.quantity}
                        </span>
                    </li>
                ))}
            </ul>
            <div className="border-t border-dashed border-white/20 my-2"></div>

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


            {order.status === 'Pending' && (
                <div className="flex flex-col sm:flex-row gap-2 mt-4">
                    <Button onClick={() => handleStatusUpdate('Cancelled')} size="sm" variant="destructive" className="w-full/2 bg-red-900/80 hover:bg-red-900 text-white border-red-500/50">
                        <XCircle className="ml-2 h-4 w-4" />
                        لغو
                    </Button>
                    <Button onClick={() => handleStatusUpdate('Completed')} size="sm" className="w-full/2 bg-green-600 hover:bg-green-700 text-white">
                        <CheckCircle className="ml-2 h-4 w-4" />
                        تکمیل شد
                    </Button>
                </div>
            )}
        </div>
    );
};