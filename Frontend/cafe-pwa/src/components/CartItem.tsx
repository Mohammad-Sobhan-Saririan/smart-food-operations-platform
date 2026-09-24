"use client";

import Image from 'next/image';
import { useState } from 'react';
import { useCartStore, type CartItem as CartItemType } from '@/store/cartStore';
import { Button } from '@/components/ui/button';
import { Coffee, Plus, Minus, Trash2 } from 'lucide-react';
import { resolveMediaUrl } from '@/lib/mediaUrl';

interface CartItemProps {
    item: CartItemType;
}

export const CartItem = ({ item }: CartItemProps) => {
    const { increaseQuantity, decreaseQuantity, removeFromCart } = useCartStore();
    const [imageFailed, setImageFailed] = useState(false);
    const imageUrl = resolveMediaUrl(item.imageUrl);
    const showImage = imageUrl.length > 0 && !imageFailed;

    return (
        <div className="flex items-center gap-3 md:gap-4 p-3 bg-white/5 border border-white/10 rounded-xl">
            <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden flex-shrink-0 bg-white/5 border border-white/10">
                {showImage ? (
                    <Image
                        src={imageUrl}
                        unoptimized
                        alt={item.name}
                        fill
                        sizes="80px"
                        className="object-cover"
                        onError={() => setImageFailed(true)}
                    />
                ) : (
                    <div className="h-full w-full flex items-center justify-center text-white/55" aria-label="تصویر محصول موجود نیست">
                        <Coffee className="h-7 w-7" aria-hidden="true" />
                    </div>
                )}
            </div>

            <div className="flex-grow">
                <h3 className="font-semibold text-sm md:text-base text-white mb-2">{item.name}</h3>
                <p className="text-white/70 text-xs md:text-sm">{item.price.toLocaleString()} لبخند</p>
            </div>

            <div className="flex flex-row items-center gap-2">
                <Button
                    size="icon"
                    variant="ghost"
                    className="text-red-500 hover:text-white hover:bg-red-600 h-7 w-7 rounded-full transition-colors duration-200 flex items-center justify-center"
                    onClick={() => item.id && removeFromCart(item.id)}
                    aria-label={`حذف ${item.name}`}
                >
                    <Trash2 size={14} />
                </Button>
                <div className="flex items-center justify-center bg-white/10 border border-white/20 rounded-full">
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 md:h-7 md:w-7 rounded-full"
                        onClick={() => item.id && increaseQuantity(item.id)}
                        disabled={item.quantity >= item.stock}
                        aria-label={`افزایش تعداد ${item.name}`}
                    >
                        <Plus size={12} />
                    </Button>
                    <span className="text-xs md:text-sm font-bold w-5 md:w-6 text-center">{item.quantity}</span>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 md:h-7 md:w-7 rounded-full"
                        onClick={() => item.id && decreaseQuantity(item.id)}
                        aria-label={`کاهش تعداد ${item.name}`}
                    >
                        <Minus size={12} />
                    </Button>
                </div>
            </div>
        </div>
    );
};
