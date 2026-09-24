"use client";
import Link from "next/link";
import { ShoppingBasket } from "lucide-react";
import { Button } from "@/components/ui/button";
export const EmptyCart = () => (
  <div className="container mx-auto p-4"><div className="flex flex-col items-center justify-center text-center h-[80vh] text-white">
    <ShoppingBasket className="w-24 h-24 text-teal-200 mb-8" />
    <h2 className="text-2xl sm:text-3xl font-bold">سبد خرید شما خالی است</h2>
    <p className="text-white/60 mt-2 max-w-sm text-sm sm:text-base">به منو بروید و آیتم‌های مورد علاقه خود را انتخاب کنید.</p>
    <Button asChild size="lg" className="mt-8 bg-teal-700 text-white hover:bg-teal-600 font-bold"><Link href="/cafe">بازگشت به منو</Link></Button>
  </div></div>
);
