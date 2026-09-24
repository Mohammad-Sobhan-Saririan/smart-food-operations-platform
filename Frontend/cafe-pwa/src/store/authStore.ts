// src/store/authStore.ts
import { create } from 'zustand';
import type { User } from "@/types"; // 1. Import the shared User type


interface AuthState {
    user: User | null;
    // Replace isAuthenticated with a more descriptive status
    authChecked: boolean;
    setAuthChecked: (checked: boolean) => void;
    authStatus: 'loading' | 'authenticated' | 'unauthenticated';
    setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    authChecked: false,
    setAuthChecked: (checked) => set({ authChecked: checked }),
    authStatus: 'loading', // Start in a 'loading' state
    setUser: (user) => {
        if (user) {
            set({ user, authStatus: 'authenticated' });
        } else {
            set({ user: null, authStatus: 'unauthenticated' });
        }
    },
}));