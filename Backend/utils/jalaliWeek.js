// src/utils/jalaliWeek.js
import jalaali from "jalaali-js";

/** ورودی: 'YYYY-MM-DD' جلالی – خروجی: تاریخ جلالی آخر هفته (۶ روز بعد) */
export function getJalaliWeekEnd(weekStartJalali) {
    const [jy, jm, jd] = weekStartJalali.split("-").map(Number);
    const g = jalaali.toGregorian(jy, jm, jd);
    const date = new Date(Date.UTC(g.gy, g.gm - 1, g.gd));
    date.setUTCDate(date.getUTCDate() + 6);
    const j = jalaali.toJalaali(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
    return `${j.jy}-${String(j.jm).padStart(2, "0")}-${String(j.jd).padStart(2, "0")}`;
}
