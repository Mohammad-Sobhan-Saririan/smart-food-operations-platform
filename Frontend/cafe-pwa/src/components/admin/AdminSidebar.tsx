"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    Users,
    Package,
    LayoutDashboard,
    FileText,
    UtensilsCrossed,
    ClipboardList,
    Building2,
    Menu,
    X,
    BarChart,
    Settings,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/store/authStore";

interface SidebarProps {
    onCollapseChange?: (collapsed: boolean) => void;
}

const adminItems = [
    { href: "/admin", label: "داشبورد", icon: LayoutDashboard },
    { href: "/admin/users", label: "کاربران", icon: Users },
    { href: "/admin/orders", label: "سفارش‌ها", icon: Package },
    { href: "/admin/credits", label: "مدیریت اعتبار", icon: Users },
    { href: "/admin/reporting", label: "گزارشات هوشمند", icon: FileText },
];
const restaurantItems = [
    { href: "/admin/restaurant/dishes", label: "مدیریت غذاها", icon: UtensilsCrossed },
    { href: "/admin/restaurant/menu", label: "مدیریت منو هفتگی", icon: ClipboardList },
    { href: "/admin/restaurant/companies", label: "شرکت‌ها و سهمیه‌ها", icon: Building2 },
    { href: "/admin/restaurant/reservations", label: "رزروها", icon: FileText },
    { href: "/admin/restaurant/delivery", label: "تحویل غذا", icon: Package },
    { href: "/admin/restaurant/delivery-locks", label: "مدیریت تحویل دهندگان غذا", icon: Settings },
    { href: "/admin/restaurant/reports", label: "گزارش‌ها", icon: BarChart },
];
const floorItems = [
    { href: "/admin/floors", label: "مدیریت طبقات", icon: Building2 },
];

export const AdminSidebar = ({ onCollapseChange }: SidebarProps) => {
    const pathname = usePathname();
    const [isExpanded, setIsExpanded] = useState(true);
    const [isDesktop, setIsDesktop] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const hoverTimeout = useRef<NodeJS.Timeout | null>(null);
    const collapseTimeout = useRef<NodeJS.Timeout | null>(null);
    // user
    const { user } = useAuthStore();

    // if user is HR, some items will be hidden, e.g., users,orders from admin and all of restaurant sections
    const isHR = user?.role === "HR";

    const visibleAdminItems = isHR
        ? adminItems.filter(
            (item) => item.href !== "/admin/users" && item.href !== "/admin/orders"
        )
        : adminItems;
    const visibleRestaurantItems = isHR ? [] : restaurantItems;


    useEffect(() => {
        const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        if (isDesktop) setIsExpanded(false);
        else setIsExpanded(true);
    }, [isDesktop]);

    useEffect(() => {
        onCollapseChange?.(!isExpanded);
    }, [isExpanded, onCollapseChange]);

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
                    item.href === "/admin"
                        ? pathname === item.href

                        // exact match the path
                        : pathname === item.href || pathname.startsWith(item.href + "/");
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
                            <item.icon className="h-5 w-5 opacity-90 " />
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
            {/* 📱 نسخه موبایل (دکمه بالا) */}
            <div className="lg:hidden flex flex-col w-full mb-4">
                <button
                    onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                    className="flex justify-between items-center bg-[#082A5B]/90 text-white px-4 py-3 rounded-xl border border-white/10 shadow-md"
                >
                    <span className="font-semibold">پنل مدیریت</span>
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
                            <h3 className="text-xs font-semibold text-white/60 mb-2 px-1">
                                مدیریت سیستم
                            </h3>
                            {renderItems(visibleAdminItems, () => setIsMobileMenuOpen(false))}
                            <div className="border-t border-white/10 my-3" />
                            {
                                user?.role !== "HR" && (
                                    <h3 className="text-xs font-semibold text-white/60 mb-2 px-1">
                                        🍽 بخش رستوران
                                    </h3>
                                )

                            }
                            {renderItems(visibleRestaurantItems, () => setIsMobileMenuOpen(false))}
                            <div className="border-t border-white/10 my-3" />
                            <h3 className="text-xs font-semibold text-white/60 mb-2 px-1">
                                🏢 مدیریت فضا
                            </h3>
                            {renderItems(floorItems, () => setIsMobileMenuOpen(false))}
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
                            پنل مدیریت
                        </motion.h2>
                    ) : (
                        <LayoutDashboard className="h-6 w-6 opacity-80 mx-2" />
                    )}
                </div>

                {/* nav content */}
                <div
                    className="flex-1 overflow-y-auto p-3 custom-scrollbar"

                    style={{
                        whiteSpace: isExpanded ? "nowrap" : undefined,
                        overflow: isExpanded ? "hidden" : undefined,
                        textOverflow: isExpanded ? "ellipsis" : undefined,
                    }}
                >
                    {isExpanded && (
                        <h3 className="text-xs font-semibold text-white/60 mb-2 px-1">
                            مدیریت سیستم
                        </h3>
                    )}
                    {renderItems(visibleAdminItems)}


                    {(isExpanded && (user?.role !== "HR")) && (
                        <>

                            <div className="border-t border-white/10 my-3"></div>
                            <h3 className="text-xs font-semibold text-white/60 mb-2 px-1">
                                🍽 بخش رستوران
                            </h3>
                        </>
                    )}
                    {renderItems(visibleRestaurantItems)}

                    <div className="border-t border-white/10 my-3"></div>

                    {isExpanded && (
                        <h3 className="text-xs font-semibold text-white/60 mb-2 px-1">
                            🏢 مدیریت فضا
                        </h3>
                    )}
                    {renderItems(floorItems)}
                </div>
            </motion.div>
        </>
    );
};