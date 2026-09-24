"use client";

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import type { Product } from '@/types';
import { ProductCard } from './ProductCard'; // We'll reuse our existing ProductCard
import { Star } from 'lucide-react';

export const FavoritesSection = () => {
    const { user, authStatus } = useAuthStore();
    const [favorites, setFavorites] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Only fetch favorites if the user is authenticated
        if (authStatus === 'authenticated') {
            const fetchFavorites = async () => {
                try {
                    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/users/profile/favorites`, { credentials: 'include' });
                    if (res.ok) {
                        setFavorites(await res.json());
                    }
                } catch (error) {
                    console.error("Failed to fetch favorites:", error);
                } finally {
                    setLoading(false);
                }
            };
            fetchFavorites();
        } else {
            setLoading(false);
        }
    }, [authStatus]);

    // If the user is not logged in, or has no favorites, or we are still loading, render nothing.
    if (!user || loading || favorites.length === 0) {
        return null;
    }

    return (
        <section className="mb-12 animate-fadeIn">
            <h2 className="text-3xl font-bold mb-6 text-white text-center lg:text-right flex items-center gap-2">
                <Star className="text-yellow-400" />
                همیشگی‌های شما
            </h2>
            {/* We display the favorites in a grid, just like the main menu */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {favorites.map(product => (
                    product && <ProductCard key={product.id} product={product} />
                ))}
            </div>
            <hr className="border-t-2 border-dashed border-white/10 my-12" />
        </section>
    );
};