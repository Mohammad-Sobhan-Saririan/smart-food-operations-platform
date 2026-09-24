"use client";
// This file is very similar to the Admin layout.
// It protects all child pages and provides a shared sidebar.
import { useAuthStore } from "@/store/authStore";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { BaristaSidebar } from "@/components/barista/BaristaSidebar";

export default function BaristaLayout({ children }: { children: React.ReactNode }) {
    const { authStatus, user } = useAuthStore();
    const router = useRouter();

    useEffect(() => {
        if (authStatus === 'unauthenticated' || (authStatus === 'authenticated' && user?.role !== 'admin' && user?.role !== 'barista')) {
            router.push('/'); // Redirect non-authorized users
        }
    }, [authStatus, user, router]);

    if (authStatus === 'loading' || !user) {
        return <div className="flex justify-center items-center h-[80vh]"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="  p-4 sm:p-6 text-white">
            <div className="flex flex-col md:flex-row gap-8 items-start">
                <aside className="w-full md:w-1/4 lg:w-1/5 md:sticky top-24"><BaristaSidebar /></aside>
                <main className="w-full">{children}</main>
            </div>
        </div>

    );
}