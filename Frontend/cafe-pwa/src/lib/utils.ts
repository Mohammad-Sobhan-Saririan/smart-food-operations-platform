import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import jalaali from "jalaali-js"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export const getPersianWeekOfMonth = (date: Date): string => {
  // تبدیل تاریخ میلادی به شمسی
  const { jy, jm, jd } = jalaali.toJalaali(date);

  // شروع ماه شمسی فعلی (مثلاً ۱ آبان)
  const firstOfMonth = jalaali.toGregorian(jy, jm, 1);
  const firstDate = new Date(firstOfMonth.gy, firstOfMonth.gm - 1, firstOfMonth.gd);

  // اختلاف روزها از اول ماه شمسی تا تاریخ فعلی
  const diffDays = Math.floor((date.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));

  // شماره هفته (شروع از 1)
  const weekNumber = Math.floor(diffDays / 7) + 1;

  // نام ماه شمسی
  const monthName = new Intl.DateTimeFormat("fa-IR", { month: "long" }).format(date);

  return `هفته‌ی ${getPersianOrdinal(weekNumber)} ${monthName}`;
};

export const getPersianOrdinal = (num: number): string => {
  const ordinals: Record<number, string> = {
    1: "اول",
    2: "دوم",
    3: "سوم",
    4: "چهارم",
    5: "پنجم",
    6: "ششم",
  };
  return ordinals[num] || num.toString();
};

