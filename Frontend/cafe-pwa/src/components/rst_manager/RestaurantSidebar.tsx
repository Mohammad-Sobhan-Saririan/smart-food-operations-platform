"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    LayoutDashboard,
    UtensilsCrossed,
    ClipboardList,
    BarChart,
    Building2,
    Settings,
    FileText,
    Package,
    Menu,
    X,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/store/authStore";

interface SidebarProps {
    onCollapseChange?: (collapsed: boolean) => void;
}

let restaurantItems = [
    { href: "/rst_manager", label: "داشبورد", icon: LayoutDashboard },
    { href: "/rst_manager/restaurant/dishes", label: "مدیریت غذاها", icon: UtensilsCrossed },
    { href: "/rst_manager/restaurant/menu", label: "مدیریت منو هفتگی", icon: ClipboardList },
    { href: "/rst_manager/restaurant/companies", label: "شرکت‌ها", icon: Building2 },
    { href: "/rst_manager/restaurant/reservations", label: "رزروها", icon: FileText },
    { href: "/rst_manager/restaurant/delivery", label: "تحویل غذا", icon: Package },
    { href: "/rst_manager/restaurant/delivery-locks", label: "مدیریت تحویل دهندگان غذا", icon: Settings },
    { href: "/rst_manager/restaurant/reports", label: "گزارش‌ها", icon: BarChart },
];


const permissions = [
    { href: "/rst_manager/restaurant/dishes", label: "مدیریت دسترسی‌ها", permissions: [1, 2, 4] },
    { href: "/rst_manager/restaurant/menu", label: "مدیریت منو هفتگی", permissions: [1, 2] },
    { href: "/rst_manager/restaurant/companies", label: "شرکت‌ها", permissions: [1, 2, 4] },
    { href: "/rst_manager/restaurant/reservations", label: "رزروها", permissions: [1] },
    { href: "/rst_manager/restaurant/delivery", label: "تحویل غذا", permissions: [1, 2,] },
    { href: "/rst_manager/restaurant/delivery-locks", label: "مدیریت تحویل دهندگان غذا", permissions: [1, 2] },
    { href: "/rst_manager/restaurant/reports", label: "گزارش‌ها", permissions: [1, 2, 3, 4] },
];

export const RestaurantSidebar = ({ onCollapseChange }: SidebarProps) => {
    const pathname = usePathname();
    const [isExpanded, setIsExpanded] = useState(true);
    const [isDesktop, setIsDesktop] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const hoverTimeout = useRef<NodeJS.Timeout | null>(null);
    const collapseTimeout = useRef<NodeJS.Timeout | null>(null);
    const { user } = useAuthStore();

    // at least one of the permissions should be in user's rst_permissionIds
    useEffect(() => {
        if (!user) return;
        const userPermissions = user.rst_permissionIds || [];
        restaurantItems = restaurantItems.filter((item) => {
            const perm = permissions.find((p) => p.href === item.href);
            if (!perm) return true;
            return perm.permissions.some((p) => userPermissions.includes(p));
        });
    }, [user]);

    // 📏 تشخیص اندازه صفحه
    useEffect(() => {
        const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // 🎛 پیش‌فرض دسکتاپ = collapse
    useEffect(() => {

        if (isDesktop) setIsExpanded(false);
        else setIsExpanded(true);
    }, [isDesktop]);

    // 📢 اطلاع به layout برای تنظیم فاصله محتوای اصلی
    useEffect(() => {
        onCollapseChange?.(!isExpanded);
    }, [isExpanded, onCollapseChange]);

    // 🖱 Hover behavior فقط برای دسکتاپ
    const handleMouseEnter = () => {
        if (!isDesktop) return;
        if (collapseTimeout.current) clearTimeout(collapseTimeout.current);
        hoverTimeout.current = setTimeout(() => setIsExpanded(true), 100);
    };

    const handleMouseLeave = () => {
        if (!isDesktop) return;
        if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
        collapseTimeout.current = setTimeout(() => setIsExpanded(false), 150);
    };

    const renderItems = (items: typeof restaurantItems, onItemClick?: () => void) => (
        <div className="flex flex-col space-y-1">
            {items.map((item) => {
                const isActive =
                    item.href === "/rst_manager"
                        ? pathname === item.href
                        : pathname.match(new RegExp(`^${item.href}(/|$)`));
                return (
                    <Button
                        key={item.label}
                        asChild
                        variant={isActive ? "secondary" : "ghost"}
                        onClick={onItemClick}
                        className={`justify-start text-sm font-medium text-white p-3 rounded-xl transition-all ${isActive
                            ? "bg-[#D63A4F] text-white hover:bg-red-700"
                            : "hover:bg-white/10"
                            }`}
                    >
                        <Link href={item.href} className="flex items-center">
                            <item.icon className="h-5 w-5 opacity-90 ml-2" />
                            <AnimatePresence>
                                {isExpanded && (
                                    <motion.span
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -10 }}
                                        transition={{ duration: 0.15 }}
                                        style={
                                            {
                                                // max line =2 and over flow go to next line
                                                whiteSpace: "normal",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",

                                            }
                                        }
                                    >
                                        {item.label}
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </Link>
                    </Button>
                );
            })}
        </div>
    );

    return (
        <>
            {/* 🧭 نسخه موبایل */}
            <div className="lg:hidden flex flex-col w-full mb-4">
                <button
                    onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                    className="flex justify-between items-center bg-[#082A5B]/90 text-white px-4 py-3 rounded-xl border border-white/10 shadow-md"
                >
                    <span className="font-semibold">پنل رستوران</span>
                    {isMobileMenuOpen ? (
                        <X size={22} className="text-white" />
                    ) : (
                        <Menu size={22} className="text-white" />
                    )}
                </button>

                <AnimatePresence>
                    {isMobileMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="bg-[#082A5B]/80 backdrop-blur-md border border-white/10 rounded-xl mt-2 p-3 shadow-lg"
                        >
                            {renderItems(restaurantItems, () => setIsMobileMenuOpen(false))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* 💻 نسخه دسکتاپ */}
            <motion.div
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                animate={{ width: isExpanded ? 220 : 70 }}
                transition={{ duration: 0.1 }}
                className="hidden lg:block bg-white/5 backdrop-blur-lg border border-white/10 text-white shadow-lg rounded-2xl overflow-hidden transition-all duration-300 h-full"
            >
                {/* header */}
                <div className="flex items-center justify-between p-3 border-b border-white/10">
                    {isExpanded ? (
                        <motion.h2
                            key="title"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-lg font-semibold ml-2"
                            style={{
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                            }}
                        >
                            پنل رستوران
                        </motion.h2>
                    ) : (
                        <UtensilsCrossed className="h-6 w-6 opacity-80 mx-2" />
                    )}
                </div>

                {/* nav content */}
                <div
                    className="p-3 overflow-y-auto max-h-[80vh]"
                    style={{
                        whiteSpace: isExpanded ? "nowrap" : undefined,
                        overflow: isExpanded ? "hidden" : undefined,
                        textOverflow: isExpanded ? "ellipsis" : undefined,
                    }}
                >
                    {isExpanded && (
                        <h3 className="text-xs font-semibold text-white/60 mb-2 px-1">
                            🍽 بخش رستوران
                        </h3>
                    )}
                    {renderItems(restaurantItems)}
                </div>
            </motion.div>
        </>
    );
};
