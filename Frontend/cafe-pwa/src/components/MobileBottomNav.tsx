"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCartStore } from '@/store/cartStore';
import { Home, ShoppingCart, User } from 'lucide-react';
import { motion, useAnimation } from 'framer-motion';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';

const navItems = [
    { href: "/", icon: Home, label: "منو" },
    { href: "/cart", icon: ShoppingCart, label: "سبد خرید" },
    { href: "/profile", icon: User, label: "پروفایل" },
];

export const MobileBottomNav = () => {
    const pathname = usePathname();
    const { cart } = useCartStore();
    const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
    const controls = useAnimation(); // Animation controls for the badge

    // This effect triggers the 'pop' animation when the cart total changes
    useEffect(() => {
        if (totalItems > 0) {
            controls.start({
                scale: [1, 1.4, 1],
                transition: { duration: 0.3, times: [0, 0.5, 1] }
            });
        }
    }, [totalItems, controls]);

    return (
        // The main container, fixed to the bottom and only visible on mobile (md:hidden)
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-20 bg-[#001233]/80 backdrop-blur-2xl border-t border-white/10 z-50">
            <div className="container mx-auto h-full grid grid-cols-3 items-center">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link key={item.label} href={item.href} className="flex flex-col items-center justify-center gap-1 text-white/70">
                            <div className="relative">
                                <item.icon className={cn("h-7 w-7 transition-colors", isActive && "text-white")} />
                                {/* Cart badge */}
                                {item.href === "/cart" && totalItems > 0 && (
                                    <motion.span
                                        animate={controls}
                                        className="absolute -top-2 -right-3 flex h-6 w-6 items-center justify-center rounded-full bg-[#D63A4F] text-xs font-bold text-white"
                                    >
                                        {totalItems}
                                    </motion.span>
                                )}
                            </div>
                            <span className={cn("text-xs transition-colors", isActive && "text-white")}>{item.label}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
};