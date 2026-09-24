import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthInitializer } from '@/components/AuthInitializer';
import { AppContent } from '@/components/AppContent';
import { Toaster } from '@/components/ui/sonner';
import { NotificationListener } from '@/components/NotificationListener';
import { CartFAB } from '@/components/CartFAB';
import FCMInitializer from '@/components/FCMInitializer';
import './globals.css';

export const metadata: Metadata = {
  title: 'Smart Food Operations',
  description: 'Internal cafe and employee dining operations platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning data-scroll-behavior="smooth">
      <body>
        <FCMInitializer />
        <Toaster />
        <AuthInitializer />
        <NotificationListener />
        <Suspense>
          <AppContent>
            {children}
            <CartFAB />
          </AppContent>
        </Suspense>
      </body>
    </html>
  );
}
