"use client";

import { useState, useEffect } from 'react';
import { ProductCard } from '@/components/ProductCard';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import { ScrollAwareNav } from '@/components/ScrollAwareNav';
import { toast } from 'sonner';
import type { Product } from '@/types';
import { FavoritesSection } from '@/components/FavoritesSection';
import { CartSidebar } from '@/components/CartSidebar';
import { cn } from '@/lib/utils';
import { useCartStore } from '@/store/cartStore';

// const HOT_BAR_CATEGORY = 'بار گرم';
// const COLD_BAR_CATEGORY = 'بار سرد';

async function getProducts(): Promise<Product[]> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/products`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch data');
    return res.json();
  } catch (error) {
    console.error("Fetch Error:", error);
    return [];
  }
}

// 2. A more polished Skeleton component for the loading state
const ProductGridSkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-pulse">
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="w-full h-80 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
    ))}
  </div>
);

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('hot-bar'); // State to track active category
  const cart = useCartStore((state) => state.cart); // Get the cart state

  // Use our custom hook to watch the sections
  useIntersectionObserver(setActiveCategory, ['hot-bar', 'cold-bar']);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await getProducts();
        setProducts(data);
      } catch (error) {
        if (error instanceof Error) {
          toast.error(error.message);
        } else {
          toast.error("خطایی رخ داده است!");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const hotBar = products.filter(p => p.category === 'بار گرم');
  const coldBar = products.filter(p => p.category === 'بار سرد');

  return (
    <div className="min-h-screen">

      <CartSidebar />
      {/* div for main content */}
      <div className={cn(
        "transition-all duration-500 ease-in-out",
        // If cart has items on a large screen, push the content to the right
        cart.length > 0 ? "lg:pl-[24rem]" : "lg:pl-0"
      )}>
        <ScrollAwareNav activeCategory={activeCategory} />
        <main className="container mx-auto p-4 sm:p-6 transition-all duration-300"
          style={{ direction: 'rtl' }}>
          <FavoritesSection />

          {/* Hot Bar Section */}
          <section id="hot-bar" className="mb-18 scroll-mt-54">
            <h2 className="text-3xl font-bold mb-6 text-white text-center lg:text-center">
              - بار گرم -
            </h2>
            {loading ? <ProductGridSkeleton /> : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {hotBar.map(product => <ProductCard key={product.id} product={product} />)}
              </div>
            )}
          </section>

          {/* Cold Bar Section */}
          <section id="cold-bar" className="mb-18 scroll-mt-54">
            <h2 className="text-3xl font-bold mb-6 text-white text-center lg:text-center">
              - بار سرد -
            </h2>
            {loading ? <ProductGridSkeleton /> : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {coldBar.map(product => <ProductCard key={product.id} product={product} />)}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}