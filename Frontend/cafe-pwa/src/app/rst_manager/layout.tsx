"use client";

import { useAuthStore } from "@/store/authStore";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { RestaurantSidebar } from "@/components/rst_manager/RestaurantSidebar";

export default function RstManagerLayout({ children }: { children: React.ReactNode }) {
    const { authStatus, user } = useAuthStore();
    const router = useRouter();
    const [collapsed, setCollapsed] = useState(false);
    const [checkingAccess, setCheckingAccess] = useState(true);

    useEffect(() => {
        if (authStatus === "unauthenticated") {
            router.replace("/login");
            return;
        }

        if (authStatus === "authenticated") {
            const allowedRoles = [1, 2, 3]; // مدیران رستوران، سرآشپز، منشی
            if (!allowedRoles.includes(user?.rst_roleId || -1)) {
                router.replace("/");
            } else {
                setCheckingAccess(false);
            }
        }
    }, [authStatus, user, router]);

    // ⏳ لودر دسترسی
    if (authStatus === "loading" || checkingAccess) {
        return (
            <div className="flex justify-center items-center h-screen bg-[#0b1220] text-white">
                <Loader2 className="h-8 w-8 animate-spin mr-2" />
                <span className="text-sm font-medium">در حال بررسی دسترسی...</span>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#061F46] via-[#082A5B] to-[#061F46] text-white flex flex-col">
            {/* 🔹 عنوان کلی پنل */}
            <div className="px-4 sm:px-6 pt-4 sm:pt-6">
                <h1 className="text-2xl sm:text-3xl font-bold mb-4">پنل مدیریت رستوران</h1>
            </div>

            {/* 🔹 سایدبار در موبایل بالای محتوا و در دسکتاپ در سمت چپ */}
            <div className="flex flex-col lg:flex-row flex-1 gap-6 px-4 sm:px-6 pb-6 transition-all duration-300">
                {/* 🧭 Sidebar */}
                <aside
                    className={`transition-all duration-300 ${collapsed ? "lg:w-[70px]" : "lg:w-[220px]"
                        }`}
                >
                    <RestaurantSidebar onCollapseChange={setCollapsed} />
                </aside>

                {/* 🧩 محتوای اصلی */}
                <main
                    className={`flex-1 transition-all duration-300 ${collapsed ? "ml-[-10px]" : ""
                        }`}
                >
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 sm:p-6 shadow-lg h-full overflow-y-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
