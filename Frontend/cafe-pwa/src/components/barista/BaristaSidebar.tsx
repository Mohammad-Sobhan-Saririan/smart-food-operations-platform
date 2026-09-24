"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
    Clock,
    Archive,
    ClipboardList,
    MapPin,
    Coffee,
    ChevronDown,
} from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ☕️ آیتم‌های مربوط به سفارشات
const orderItems = [
    { href: "/barista", label: "سفارش‌های در انتظار", icon: Clock },
    { href: "/barista/history", label: "تاریخچه سفارشات", icon: Archive },
];

// 🍽 آیتم‌های مدیریت
const managementItems = [
    { href: "/barista/menu", label: "مدیریت منو", icon: ClipboardList },
    { href: "/barista/floors", label: "مدیریت طبقات", icon: MapPin },
];

export const BaristaSidebar = () => {
    const pathname = usePathname();
    const [isExpanded, setIsExpanded] = useState(false);
    const [isDesktop, setIsDesktop] = useState(false);

    // 🔍 تشخیص موبایل یا دسکتاپ برای کنترل منو
    useEffect(() => {
        const handleResize = () => {
            setIsDesktop(window.innerWidth >= 768);
        };
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const toggleExpand = () => setIsExpanded((prev) => !prev);
    const showNav = isDesktop || isExpanded;

    const renderNavItems = (items: typeof orderItems) => (
        <div className="flex flex-col space-y-1">
            {items.map((item) => {
                const isActive =
                    item.href === "/barista"
                        ? pathname === item.href
                        : pathname.startsWith(item.href);

                return (
                    <Button
                        style={{
                            overflow: "hidden", textOverflow: "ellipsis",
                            whiteSpace: "nowrap", maxWidth: "100%",
                        }}
                        key={item.label}
                        asChild
                        variant={isActive ? "secondary" : "ghost"}
                        className={`justify-start text-base font-medium text-white hover:text-white p-5 rounded-xl transition-all
              ${isActive
                                ? "bg-[#D63A4F] text-white hover:bg-red-700"
                                : "hover:bg-white/10"
                            }`}
                    >
                        <Link href={item.href}>
                            <item.icon className="ml-2 h-5 w-5 opacity-90" />
                            {item.label}
                        </Link>
                    </Button>
                );
            })}
        </div>
    );

    return (
        <Card className="bg-white/5 backdrop-blur-lg border border-white/10 p-2 md:p-4 text-white shadow-lg rounded-2xl h-fit">
            {/* 🔹 دکمه منو برای موبایل */}
            <div className="block md:hidden">
                <Button
                    onClick={toggleExpand}
                    variant="ghost"
                    className="flex justify-between items-center w-full text-white text-lg font-semibold px-4 py-3 hover:bg-white/10"
                >
                    <span className="flex items-center gap-2">
                        <Coffee className="h-5 w-5" />
                        منو باریستا
                    </span>
                    <ChevronDown
                        className={`transition-transform duration-300 ${isExpanded ? "rotate-180" : ""
                            }`}
                    />
                </Button>
            </div>

            {/* 🔹 محتوای ناوبری */}
            <AnimatePresence initial={false}>
                {showNav && (
                    <motion.nav
                        key="sidebar-nav"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className={`overflow-hidden md:overflow-visible md:block ${isExpanded ? "block" : "hidden md:block"
                            }`}
                    >
                        {/* بخش سفارشات */}
                        <div className="mb-6">
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-white/60 px-3 mb-2">
                                ☕️ سفارشات
                            </h3>
                            {renderNavItems(orderItems)}
                        </div>

                        <div className="border-t border-white/10 my-4"></div>

                        {/* بخش مدیریت */}
                        <div>
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-white/60 px-3 mb-2">
                                🍽 مدیریت
                            </h3>
                            {renderNavItems(managementItems)}
                        </div>
                    </motion.nav>
                )}
            </AnimatePresence>
        </Card>
    );
};
