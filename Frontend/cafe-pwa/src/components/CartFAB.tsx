"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCartStore } from "@/store/cartStore";
import { motion, AnimatePresence, useAnimationControls } from "framer-motion";
import { ShoppingCart } from "lucide-react";
import { useEffect, useState } from "react";

export const CartFAB = () => {
    const cart = useCartStore((state) => state.cart);
    const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
    const controls = useAnimationControls();
    const [triggerWave, setTriggerWave] = useState(false);
    const pathname = usePathname();

    // 🔹 فقط در صفحه اصلی نمایش داده شود
    const isVisible = totalItems > 0 && pathname === "/cafe";

    // 🎬 انیمیشن هنگام تغییر آیتم‌ها
    useEffect(() => {
        if (totalItems > 0) {
            controls.start({
                scale: [1, 1.15, 0.95, 1.05, 1],
                rotate: [0, -6, 6, -3, 0],
                transition: { duration: 0.5, ease: "easeOut" },
            });
            setTriggerWave(true);
            setTimeout(() => setTriggerWave(false), 600);
        }
    }, [totalItems, controls]);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ scale: 0, y: 100, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0, y: 100, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                    className="fixed bottom-5 right-5 z-50 block md:hidden" // 👈 فقط موبایل
                >
                    <Link href="/cart" passHref>
                        <motion.button
                            animate={controls}
                            whileHover={{ scale: 1.08 }}
                            whileTap={{ scale: 0.9 }}
                            className="relative flex items-center justify-center h-14 w-14 rounded-full 
                         text-white shadow-[0_0_20px_rgba(0,0,0,0.3)] focus:outline-none"
                            aria-label="View shopping cart"
                            style={{ overflow: "visible" }}
                        >
                            {/* گرادینت پویا */}
                            <motion.div
                                className="absolute inset-0 rounded-full bg-gradient-to-br from-[#D63A4F] via-[#B0104B] to-[#082A5B]"
                                animate={{
                                    backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"],
                                }}
                                transition={{
                                    repeat: Infinity,
                                    duration: 6,
                                    ease: "linear",
                                }}
                                style={{
                                    backgroundSize: "200% 200%",
                                    filter: "blur(1.5px)",
                                }}
                            />

                            {/* افکت تنفسی */}
                            <motion.div
                                className="absolute inset-0 rounded-full bg-[#D63A4F]/40 blur-md"
                                animate={{ opacity: [0.4, 0.7, 0.4] }}
                                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                            />

                            {/* آیکون */}
                            <motion.div
                                className="relative z-10 flex items-center justify-center"
                                animate={{ scale: [1, 1.03, 1] }}
                                transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                            >
                                <ShoppingCart className="h-7 w-7" />
                            </motion.div>

                            {/* Badge */}
                            <motion.span
                                key={totalItems}
                                initial={{ scale: 0, opacity: 0, y: -4 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                transition={{ type: "spring", stiffness: 260, damping: 15 }}
                                className="absolute -top-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full
                           bg-white text-xs font-bold text-[#D63A4F] border-2 border-[#082A5B] shadow-md"
                            >
                                {totalItems}
                            </motion.span>

                            {/* موج درخشان */}
                            {triggerWave && (
                                <motion.span
                                    initial={{ scale: 0, opacity: 0.6 }}
                                    animate={{ scale: 3, opacity: 0 }}
                                    transition={{ duration: 0.8, ease: "easeOut" }}
                                    className="absolute inset-0 rounded-full bg-gradient-to-r from-[#D63A4F]/40 to-[#082A5B]/40"
                                />
                            )}
                        </motion.button>
                    </Link>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
