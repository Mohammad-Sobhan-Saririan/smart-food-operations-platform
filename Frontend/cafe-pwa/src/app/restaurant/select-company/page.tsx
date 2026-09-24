"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Utensils, Building2, BriefcaseBusiness, Landmark, User, Users, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import LoadingScreen from "@/components/LoadingScreen";

export interface Company { id: number; name: string; }
export interface Boss { id: string; name: string; }

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
const IS_RESTAURANT_ACTIVE = true;

export default function SelectCompanyPage() {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [bosses, setBosses] = useState<Boss[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [showLoader, setShowLoader] = useState(true);
    const [done, setDone] = useState(false);
    const [message, setMessage] = useState("در حال بررسی ورود...");

    const router = useRouter();
    const pathname = usePathname();
    const { user, authChecked } = useAuthStore();

    useEffect(() => {
        if (authChecked) {
            setDone(true);
            if (user) setSelectedUserId(user.id); // به صورت پیش‌فرض خود کاربر انتخاب شده است
        }
    }, [authChecked, user]);

    useEffect(() => {
        if (!authChecked) setMessage("در حال بررسی ورود...");
        else if (!user) setMessage("برای ورود به بخش رستوران لطفاً ابتدا وارد حساب کاربری شوید...");
        else setMessage("در حال بارگذاری اطلاعات...");
    }, [authChecked, user]);

    useEffect(() => {
        if (!authChecked || !user || !IS_RESTAURANT_ACTIVE) return;

        const fetchData = async () => {
            try {
                // دریافت همزمان لیست شرکت‌ها و افرادی که کاربر جانشین آن‌هاست
                const [compRes, bossesRes] = await Promise.all([
                    fetch(`${API_URL}/api/restaurant/rst_companies`, { credentials: "include" }),
                    fetch(`${API_URL}/api/restaurant/my-bosses`, { credentials: "include" })
                ]);

                if (!compRes.ok) throw new Error("خطا در دریافت شرکت‌ها");

                const compData = await compRes.json();
                setCompanies(compData);

                if (bossesRes.ok) {
                    const bossesData = await bossesRes.json();
                    setBosses(bossesData);
                }
            } catch (err: any) {
                toast.error(err.message || "خطا در بارگذاری اطلاعات");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [authChecked, user]);

    if (showLoader) {
        return (
            <LoadingScreen
                minDuration={1500}
                done={done}
                message={message}
                onFinish={() => {
                    if (!user) {
                        router.replace(`/login?redirect=${pathname}`);
                        return;
                    }
                    setShowLoader(false);
                }}
            />
        );
    }

    const handleSelectCompany = (company: Company) => {
        if (!selectedUserId) return;

        sessionStorage.setItem("rst_selectedCompanyId", company.id.toString());
        sessionStorage.setItem("rst_selectedCompanyName", company.name);
        sessionStorage.setItem("rst_targetUserId", selectedUserId); // ذخیره آیدی صاحب سفارش

        router.replace("/restaurant");
    };

    return (
        <div className="flex flex-1 flex-col items-center justify-center p-4  bg-[#0b1220] text-white" style={{ direction: "rtl" }}>

            <AnimatePresence>
                {/* بخش انتخاب هویت - فقط اگر جانشین کسی باشد نمایش داده می‌شود */}
                {bosses.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full max-w-md mb-10 p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl"
                    >
                        <label className="flex items-center gap-2 text-sm text-white/60 mb-3 pr-1">
                            <Users className="w-4 h-4" />
                            رزرو غذا برای چه کسی انجام شود؟
                        </label>
                        <div className="relative">
                            <select
                                value={selectedUserId || ""}
                                onChange={(e) => setSelectedUserId(e.target.value)}
                                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 appearance-none focus:outline-none focus:ring-2 ring-indigo-500/50 transition-all cursor-pointer text-sm"
                            >
                                <option value={user?.id} className="bg-[#0b1220]">خودم ({user?.name})</option>
                                {bosses.map(boss => (
                                    <option key={boss.id} value={boss.id} className="bg-[#0b1220]">
                                        {boss.name} (جانشین)
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.h1
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-8 text-center"
            >
                {bosses.length > 0 && selectedUserId !== user?.id
                    ? `انتخاب شرکت برای ${bosses.find(b => b.id === selectedUserId)?.name}`
                    : "انتخاب شرکت شما"
                }
            </motion.h1>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 w-full max-w-4xl">
                {companies.map((company, index) => (
                    <motion.div
                        key={company.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.08 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full"
                    >
                        <div
                            onClick={() => handleSelectCompany(company)}
                            className="flex flex-col items-center justify-center gap-3 p-5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md cursor-pointer transition-all duration-300 hover:bg-white/10 hover:shadow-lg group"
                        >
                            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-white/10 border border-white/20 group-hover:border-indigo-500/50 transition-colors">
                                {index % 3 === 0 ? (
                                    <Building2 className="h-6 w-6 text-white/80" />
                                ) : index % 3 === 1 ? (
                                    <BriefcaseBusiness className="h-6 w-6 text-white/80" />
                                ) : (
                                    <Landmark className="h-6 w-6 text-white/80" />
                                )}
                            </div>

                            <span className="text-sm sm:text-base text-center text-white/90 font-light tracking-wide">
                                {company.name}
                            </span>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}