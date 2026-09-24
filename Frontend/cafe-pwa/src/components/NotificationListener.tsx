"use client";

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';
import { useCartStore } from '@/store/cartStore';

const statusTranslations = (status: string): string => {
    const translations: { [key: string]: string } = {
        Pending: "در انتظار",
        Completed: "تکمیل شده",
        Cancelled: "لغو شده"
    };
    console.log("Translating status:", status);
    return translations[status] || 'status';
};

export const NotificationListener = () => {
    const { authStatus } = useAuthStore();
    const removeItem = useCartStore((state) => state.removeItem);
    const cartRef = useRef(useCartStore.getState().cart);

    useEffect(() => {
        useCartStore.subscribe(
            (state) => (cartRef.current = state.cart)
        );
    }, []);

    useEffect(() => {
        if (authStatus !== 'authenticated') {
            return;
        }

        let eventSource: EventSource | null = null;

        const connect = () => {
            eventSource = new EventSource(`${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/events`, {
                withCredentials: true,
            });

            eventSource.onopen = () => {
                console.log("SSE connection established.");
            };

            eventSource.onmessage = (event) => {
                const data = JSON.parse(event.data);

                if (data.type === 'ORDER_UPDATE') {
                    if (data.status === 'Cancelled') {
                        toast.error(`سفارش ${data.orderId} لغو شد.`, {
                            style: { backgroundColor: '#f8d7da', color: '#721c24' },
                        });
                    }
                    else if (data.status === 'Completed') {
                        toast.success(`سفارش ${data.orderId} با موفقیت تکمیل شد.`, {
                            style: { backgroundColor: '#d4edda', color: '#155724' },
                        });
                    } else {
                        toast.info(`سفارش ${data.orderId} در وضعیت: ${statusTranslations(data.status)
                            }`, {
                            style: { backgroundColor: 'fff3cd', color: '#856404' },
                        });
                    }
                }

                if (data.type === 'STOCK_DEPLETED') {
                    const itemInCart = cartRef.current.find(item => item.id === data.productId);
                    if (itemInCart) {
                        removeItem(data.productId);
                        toast.warning(`'${data.productName}' دیگر موجود نیست و از سبد شما حذف شد.`);
                    }
                }
            };

            eventSource.onerror = () => {
                console.error('SSE connection error. Attempting to reconnect...');
                eventSource?.close();
                setTimeout(connect, 5000); // Retry connection after 5 seconds
            };
        };

        connect();

        return () => {
            eventSource?.close();
            console.log("SSE connection closed.");
        };
    }, [authStatus, removeItem]);

    return null;
};