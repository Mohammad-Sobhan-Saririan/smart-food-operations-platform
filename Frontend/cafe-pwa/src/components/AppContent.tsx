"use client";

import { useAuthStore } from "@/store/authStore";
import { SplashScreen } from "./SplashScreen";
import ModernHeader from "./Header";
import { useFloorDetector } from "@/hooks/useFloorDetector";

export const AppContent = ({ children }: { children: React.ReactNode }) => {
    const { authStatus } = useAuthStore();
    useFloorDetector();

    if (authStatus === "loading") {
        return <SplashScreen />;
    }

    return (
        <div className="flex flex-col min-h-screen">
            <ModernHeader />
            <main className="flex-1 flex flex-col">{children}</main>
        </div>
    );
};
