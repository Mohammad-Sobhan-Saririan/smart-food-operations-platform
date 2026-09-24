"use client";
import { Loader2 } from "lucide-react";
export const PlacingOrderOverlay = () => (
  <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#082A5B]/90 backdrop-blur-sm" style={{ direction: 'rtl' }}>
    <Loader2 className="w-20 h-20 text-teal-300 animate-spin mb-8" />
    <h2 className="text-2xl font-bold text-white">در حال ثبت سفارش شما...</h2>
    <p className="text-white/70">لطفا کمی صبر کنید.</p>
  </div>
);
