"use client";

import { useState, useEffect, useRef, useMemo, JSX } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Shield,
    Coffee,
    LogOut,
    LogIn,
    Menu,
    X,
    UserCircle,
    Home,
    Utensils,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { getMessaging, getToken, deleteToken, isSupported } from "firebase/messaging";
import { firebaseEnabled, getFirebaseApp } from "@/lib/firebase";

type Role = "admin" | "barista" | "HR" | string | undefined;

export default function ModernHeader() {
    const { user, setUser, authStatus } = useAuthStore();
    const router = useRouter();
    const pathname = usePathname();

    const [menuOpen, setMenuOpen] = useState(false);      // موبایل دراور
    const [dropdownOpen, setDropdownOpen] = useState(false); // پروفایل (دسکتاپ)
    const dropdownRef = useRef<HTMLDivElement>(null);

    // مسیر فعلی برای تصمیم‌گیری
    const inRestaurant = pathname?.startsWith("/restaurant/select-company") || pathname?.startsWith("/rst_");
    const inCafe = pathname?.startsWith("/cafe");
    const inAdmin = pathname?.startsWith("/admin");
    const inBarista = pathname?.startsWith("/barista");
    const inRstManager = pathname?.startsWith("/rst_manager");
    const isHome = pathname === "/" || pathname === "/home";

    const isAuthed = authStatus === "authenticated" && !!user;
    const role: Role = user?.role as Role | undefined;
    const hasRstRole = [1, 2, 3].includes(Number(user?.rst_roleId));

    // بسته شدن dropdown با کلیک بیرون
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        };
        if (dropdownOpen) document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [dropdownOpen]);

    // بستن منو/دراپ‌داون هنگام تغییر مسیر
    useEffect(() => {
        setMenuOpen(false);
        setDropdownOpen(false);
    }, [pathname]);

    // منطق نمایش آیتم‌های دسکتاپ
    const desktopNavItems = useMemo(() => {
        const items: Array<{ label: string; icon: JSX.Element; href: string; active?: boolean }> = [];

        // بین کافه / رستوران:
        if (inRestaurant) {
            items.push({ label: "کافه", icon: <Coffee size={16} />, href: "/cafe", active: inCafe });
        } else if (inCafe) {
            items.push({ label: "رستوران", icon: <Utensils size={16} />, href: "/restaurant/select-company", active: inRestaurant });
        } else {
            items.push({ label: "کافه", icon: <Coffee size={16} />, href: "/cafe", active: inCafe });
            items.push({ label: "رستوران", icon: <Utensils size={16} />, href: "/restaurant/select-company", active: inRestaurant });
        }

        // نقش‌ها
        if (role === "admin") {
            items.push({ label: "مدیریت", icon: <Shield size={14} />, href: "/admin", active: inAdmin });
            items.push({ label: "باریستا", icon: <Coffee size={14} />, href: "/barista", active: inBarista });
        } else if (role === "barista") {
            items.push({ label: "باریستا", icon: <Coffee size={14} />, href: "/barista", active: inBarista });
        } else if (role === "HR") {
            items.push({ label: "مدیریت", icon: <Shield size={14} />, href: "/admin", active: inAdmin });
        }

        if (hasRstRole) {
            items.push({ label: "مدیریت رستوران", icon: <Coffee size={14} />, href: "/rst_manager", active: inRstManager });
        }

        // خانه همیشه
        items.push({ label: "خانه", icon: <Home size={16} />, href: "/", active: isHome });
        return items;
    }, [inRestaurant, inCafe, inAdmin, inBarista, inRstManager, isHome, role, hasRstRole]);

    const handleGo = (href: string) => {
        if (pathname === href) return;
        router.push(href);
    };

    const handleLogout = async () => {
        try {
            if (firebaseEnabled && await isSupported()) {
                const app = getFirebaseApp();
                if (!app) throw new Error("Firebase configuration is incomplete.");
                const messaging = getMessaging(app);
                const swReg = await navigator.serviceWorker.getRegistration();
                const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY!;
                let token = localStorage.getItem("fcmToken") || null;

                if (!token && swReg) {
                    try {
                        token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: swReg });
                    } catch { /* ignore */ }
                }

                const deviceId = localStorage.getItem("deviceId") || undefined;
                if (token || deviceId) {
                    await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ""}/api/notifications/unsubscribe`, {
                        method: "POST",
                        credentials: "include",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ token, deviceId }),
                    }).catch(() => { /* ignore */ });
                    localStorage.removeItem("fcmToken");
                }

                try { await deleteToken(messaging); } catch { /* ignore */ }
                if (swReg) await swReg.unregister();
            }

            await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ""}/api/auth/logout`, {
                method: "POST",
                credentials: "include",
            });
        } catch (err) {
            console.error("Logout failed:", err);
        } finally {
            setUser(null);
            router.push("/login");
        }
    };


    // کلاس‌های ظاهری
    const linkCls = (active?: boolean) =>
        `flex items-center gap-1 cursor-pointer transition ${active ? "text-cyan-300" : "text-white/90 hover:text-cyan-300"}`;

    return (
        <nav
            className={`
        sticky top-0 z-50 h-24
        bg-[#082A5B]/95 backdrop-blur-md border-b border-white/10
        text-white shadow-lg
      `}
            style={{ direction: "ltr" }}
        >
            <div className="container mx-auto flex items-center justify-between px-4 sm:px-8 py-4">
                {/* Logo */}
                <div
                    className="flex items-center gap-2 cursor-pointer select-none"
                    onClick={() => handleGo("/")}
                    aria-label="Go home"
                >
                    <div className="flex items-center gap-2 text-white">
                        <Coffee size={28} className="text-teal-300" />
                        <span className="font-semibold text-sm md:text-base whitespace-nowrap">Smart Food Operations</span>
                    </div>
                </div>

                {/* Desktop menu */}
                <ul className="hidden md:flex gap-8 text-sm font-medium items-center">
                    {desktopNavItems.map((it) => (
                        <li
                            key={it.href}
                            onClick={() => handleGo(it.href)}
                            className={linkCls(it.active)}
                            aria-current={it.active ? "page" : undefined}
                        >
                            {it.icon} {it.label}
                        </li>
                    ))}
                </ul>

                {/* Right side */}
                <div className="flex items-center gap-4 relative" ref={dropdownRef}>
                    {/* آیکون خانه در موبایل: همیشه */}
                    <button
                        onClick={() => handleGo("/")}
                        className="md:hidden p-2 rounded-lg hover:bg-white/20 transition"
                        aria-label="Home"
                    >
                        <Home size={24} className="text-cyan-300" />
                    </button>

                    {/* Auth section (desktop) */}
                    {isAuthed ? (
                        <div className="relative hidden md:block">
                            <button
                                onClick={() => setDropdownOpen((v) => !v)}
                                className="flex items-center gap-3 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-full transition-all"
                                aria-haspopup="menu"
                                aria-expanded={dropdownOpen}
                            >
                                <motion.div
                                    whileHover={{ scale: 1.02 }}
                                    className="w-10 h-10 rounded-full border border-white/30 bg-white/20 overflow-hidden flex items-center justify-center"
                                >
                                    <UserCircle className="w-8 h-8 text-white/80" aria-label="User avatar" />
                                </motion.div>
                                <div className="hidden xl:flex flex-col text-right leading-tight">
                                    <span className="text-sm font-semibold truncate max-w-[140px]">
                                        {user?.name}
                                    </span>
                                    <span className="text-xs text-white/70">
                                        {user?.employeeNumber}
                                    </span>
                                </div>
                            </button>

                            <AnimatePresence>
                                {dropdownOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.18 }}
                                        className="absolute right-0 mt-3 w-56 bg-[#0b1220]/95 backdrop-blur-lg border border-white/10 rounded-2xl overflow-hidden text-white shadow-xl"
                                        role="menu"
                                    >
                                        <button
                                            onClick={() => {
                                                handleGo("/profile");
                                                setDropdownOpen(false);
                                            }}
                                            className="w-full text-right px-5 py-3 text-sm hover:bg-white/10 transition"
                                            role="menuitem"
                                        >
                                            پروفایل من
                                        </button>
                                        <button
                                            onClick={() => {
                                                setDropdownOpen(false);
                                                handleLogout();
                                            }}
                                            className="w-full text-right px-5 py-3 text-sm text-red-400 hover:bg-red-500/10 transition"
                                            role="menuitem"
                                        >
                                            خروج از حساب
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ) : (
                        <Button
                            onClick={() => handleGo("/login")}
                            variant="default"
                            className="hidden md:flex bg-white/90 text-[#082A5B] hover:bg-white font-bold items-center gap-2 px-3 py-1.5 text-xs sm:text-sm"
                        >
                            <LogIn size={14} />
                            ورود
                        </Button>
                    )}

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setMenuOpen((v) => !v)}
                        className="block md:hidden p-2 rounded-lg hover:bg-white/20 transition"
                        aria-label="Toggle menu"
                        aria-expanded={menuOpen}
                    >
                        {menuOpen ? <X size={24} className="text-cyan-300" /> : <Menu size={24} className="text-cyan-300" />}
                    </button>
                </div>
            </div>

            {/* Mobile Drawer */}
            <AnimatePresence>
                {menuOpen && (
                    <motion.div
                        initial={{ y: -40, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -40, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="md:hidden flex flex-col gap-4 p-5 border-t border-white/20 bg-[#0b1220]/95 text-white"
                        role="menu"
                    >
                        {/* ==== Mobile Profile Block (NEW) ==== */}
                        {isAuthed ? (
                            <div className="flex items-center gap-3 mb-1">
                                <div className="w-16 h-16 rounded-full border border-white/30 bg-white/20 overflow-hidden flex items-center justify-center shrink-0">
                                    <UserCircle className="w-8 h-8 text-white/80" aria-label="User avatar" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-semibold truncate">{user?.name}</div>
                                    <div className="text-xs text-white/70 truncate">{user?.employeeNumber}</div>
                                    <div className="mt-2">
                                        <button
                                            onClick={() => {
                                                handleGo("/profile");
                                                setMenuOpen(false);
                                            }}
                                            className="text-xs px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 transition"
                                        >
                                            پروفایل من
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <Button
                                onClick={() => {
                                    handleGo("/login");
                                    setMenuOpen(false);
                                }}
                                className="w-full bg-white/90 text-[#082A5B] hover:bg-white font-bold flex items-center justify-center gap-2 py-2"
                            >
                                <LogIn size={16} />
                                ورود
                            </Button>
                        )}

                        {/* Divider */}
                        <div className="border-t border-white/20" />

                        {/* Home */}
                        <button
                            onClick={() => handleGo("/")}
                            className={linkCls(isHome)}
                            role="menuitem"
                        >
                            <Home size={18} /> خانه
                        </button>

                        {/* Cafe / Restaurant toggle like desktop */}
                        {inRestaurant ? (
                            <button
                                onClick={() => handleGo("/cafe")}
                                className={linkCls(inCafe)}
                                role="menuitem"
                            >
                                <Coffee size={18} /> کافه
                            </button>
                        ) : inCafe ? (
                            <button
                                onClick={() => handleGo("/restaurant/select-company")}
                                className={linkCls(inRestaurant)}
                                role="menuitem"
                            >
                                <Utensils size={18} /> رستوران
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={() => handleGo("/cafe")}
                                    className={linkCls(inCafe)}
                                    role="menuitem"
                                >
                                    <Coffee size={18} /> کافه
                                </button>
                                <button
                                    onClick={() => handleGo("/restaurant/select-company")}
                                    className={linkCls(inRestaurant)}
                                    role="menuitem"
                                >
                                    <Utensils size={18} /> رستوران
                                </button>
                            </>
                        )}

                        {/* نقش‌ها */}
                        <div className="border-t border-white/20 pt-3 mt-2 flex flex-col gap-2">
                            {isAuthed ? (
                                <>
                                    {(role === "admin" || role === "HR") && (
                                        <button
                                            onClick={() => {
                                                handleGo("/admin");
                                                setMenuOpen(false);
                                            }}
                                            className={linkCls(inAdmin)}
                                            role="menuitem"
                                        >
                                            <Shield size={18} /> مدیریت
                                        </button>
                                    )}
                                    {(role === "barista" || role === "admin") && (
                                        <button
                                            onClick={() => {
                                                handleGo("/barista");
                                                setMenuOpen(false);
                                            }}
                                            className={linkCls(inBarista)}
                                            role="menuitem"
                                        >
                                            <Coffee size={18} /> باریستا
                                        </button>
                                    )}
                                    {hasRstRole && (
                                        <button
                                            onClick={() => {
                                                handleGo("/rst_manager");
                                                setMenuOpen(false);
                                            }}
                                            className={linkCls(inRstManager)}
                                            role="menuitem"
                                        >
                                            <Coffee size={18} /> مدیریت رستوران
                                        </button>
                                    )}

                                    <button
                                        onClick={() => {
                                            handleLogout();
                                            setMenuOpen(false);
                                        }}
                                        className="flex items-center gap-2 text-red-400 hover:text-red-300 transition"
                                        role="menuitem"
                                    >
                                        <LogOut size={18} /> خروج
                                    </button>
                                </>
                            ) : null}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
}
