import { Loader2 } from 'lucide-react';

export const SplashScreen = () => {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-900">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
                <p className="text-slate-600 dark:text-slate-300">در حال بارگذاری اطلاعات...</p>
            </div>
        </div>
    );
};