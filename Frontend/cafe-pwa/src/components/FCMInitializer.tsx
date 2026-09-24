'use client';

import { useEffect } from 'react';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { firebaseEnabled, getFirebaseApp } from '@/lib/firebase';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';

export default function FCMInitializer() {
  const { user } = useAuthStore?.() ?? {};

  useEffect(() => {
    if (!user || !firebaseEnabled) return;
    (async () => {
      if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !(await isSupported())) return;
      const app = getFirebaseApp();
      if (!app) return;

      const cfg = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
      };
      const qs = new URLSearchParams(cfg).toString();
      const swReg = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${qs}`, { scope: '/' });
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;

      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
      if (!vapidKey) return;
      const messaging = getMessaging(app);
      const currentToken = await getToken(messaging, { vapidKey, serviceWorkerRegistration: swReg });
      if (currentToken && currentToken !== localStorage.getItem('fcmToken')) {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/notifications/subscribe`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
          body: JSON.stringify({ token: currentToken, platform: 'web' }),
        });
        localStorage.setItem('fcmToken', currentToken);
      }
      onMessage(messaging, payload => {
        toast.success(payload.notification?.title || 'New notification', { description: payload.notification?.body || '' });
      });
    })().catch(error => console.warn('Firebase notifications unavailable:', error));
  }, [user]);

  return null;
}
