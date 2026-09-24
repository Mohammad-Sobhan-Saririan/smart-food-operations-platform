"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/store/authStore";

export function AuthInitializer() {
    const { setUser, setAuthChecked } = useAuthStore();
    const hasInitialized = useRef(false);

    useEffect(() => {
        if (!hasInitialized.current) {
            const checkAuthStatus = async () => {
                try {
                    const res = await fetch(
                        `${process.env.NEXT_PUBLIC_API_URL ?? ""}/api/auth/profile`,
                        { credentials: "include" }
                    );
                    if (res.ok) {
                        const { user } = await res.json();
                        setUser(user);
                    } else {
                        setUser(null);
                    }
                } catch {
                    setUser(null);
                } finally {
                    hasInitialized.current = true;
                    setAuthChecked(true);
                }
            };
            checkAuthStatus();
        }
    }, [setUser, setAuthChecked]);

    return null;
}
