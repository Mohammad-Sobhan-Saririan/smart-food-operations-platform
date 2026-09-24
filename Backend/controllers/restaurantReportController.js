// controllers/restaurantReportsController.js
import { dbPromise } from "../db/db.js";
import jalaali from "jalaali-js";

/** yyyy-mm-dd (Jalali) + N روز */
function jalaliAddDays(jDateStr, days) {
    const [jy, jm, jd] = jDateStr.split("-").map(Number);
    const g = jalaali.toGregorian(jy, jm, jd);
    const dt = new Date(Date.UTC(g.gy, g.gm - 1, g.gd));
    dt.setUTCDate(dt.getUTCDate() + days);
    const j = jalaali.toJalaali(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
    return `${j.jy}-${String(j.jm).padStart(2, "0")}-${String(j.jd).padStart(2, "0")}`;
}

function getJalaliWeekEnd(weekStartJalali) {
    return jalaliAddDays(weekStartJalali, 6);
}

export const getDailyBreakdown = async (req, res) => {
    try {
        const { db } = await dbPromise;
        const {
            weekStartJalali, // الزامی
            dayIndex = 0,    // 0..6
            companyId,       // اختیاری: فیلتر شرکت برای خروجی افراد
            mealTypeId,      // اختیاری
            statusId,        // اختیاری
            search           // اختیاری: نام کاربر
        } = req.query;

        if (!weekStartJalali) {
            return res.status(400).json({ message: "weekStartJalali الزامی است" });
        }
        const day = Math.max(0, Math.min(6, parseInt(dayIndex, 10) || 0));
        const targetDate = jalaliAddDays(weekStartJalali, day);

        // WHERE پویا
        const where = [`r.date = ?`];
        const params = [targetDate];

        if (companyId) { where.push(`r.companyId = ?`); params.push(Number(companyId)); }
        if (mealTypeId) { where.push(`r.mealTypeId = ?`); params.push(Number(mealTypeId)); }
        if (statusId) { where.push(`r.statusId = ?`); params.push(Number(statusId)); }
        if (search && String(search).trim() !== "") {
            where.push(`LOWER(u.name) LIKE LOWER(?)`);
            params.push(`%${String(search).trim()}%`);
        }

        const whereSQL = `WHERE ${where.join(" AND ")}`;

        const baseRows = await db.all(
            `
      SELECT
        r.id, r.userId, u.name AS userName,
        r.date,
        r.mealTypeId, mt.DisplayName AS mealTypeName,
        r.statusId,
        r.companyId, c.name AS companyName,
        r.chosenDishIds
      FROM rst_reservations r
      LEFT JOIN users u ON u.id = r.userId
      LEFT JOIN rst_companies c ON c.id = r.companyId
      LEFT JOIN rst_meal_types mt ON mt.id = r.mealTypeId
      ${whereSQL}
      ORDER BY r.companyId ASC, u.name ASC, r.id ASC
      `,
            params
        );

        // dish name lookup
        const allDishIds = new Set();
        for (const r of baseRows) {
            if (!r.chosenDishIds) continue;
            try {
                const arr = JSON.parse(r.chosenDishIds) || [];
                for (const it of arr) allDishIds.add(it.id);
            } catch { }
        }
        let dishNameMap = new Map();
        if (allDishIds.size > 0) {
            const ids = Array.from(allDishIds);
            const placeholders = ids.map(() => "?").join(",");
            const dishRows = await db.all(
                `SELECT id, name FROM rst_dishes WHERE id IN (${placeholders})`,
                ids
            );
            dishNameMap = new Map(dishRows.map(d => [d.id, d.name]));
        }

        // 1) شرکت ← لیست غذا و تعداد
        const companyAgg = new Map(); // companyId -> {companyId, companyName, total, dishes: Map(dishId -> count)}
        for (const r of baseRows) {
            const cid = r.companyId ?? -1;
            if (!companyAgg.has(cid)) {
                companyAgg.set(cid, {
                    companyId: cid,
                    companyName: r.companyName ?? "—",
                    total: 0,
                    dishes: new Map(),
                });
            }
            const bucket = companyAgg.get(cid);
            bucket.total += 1;

            if (r.chosenDishIds) {
                try {
                    const chosen = JSON.parse(r.chosenDishIds) || [];
                    for (const it of chosen) {
                        const q = Number(it.quantity) || 1;
                        bucket.dishes.set(it.id, (bucket.dishes.get(it.id) || 0) + q);
                    }
                } catch { }
            }
        }

        const companyCards = Array.from(companyAgg.values()).map(c => ({
            companyId: c.companyId,
            companyName: c.companyName,
            totalReservations: c.total,
            dishes: Array.from(c.dishes.entries())
                .map(([dishId, count]) => ({
                    dishId,
                    dishName: dishNameMap.get(dishId) || `#${dishId}`,
                    count
                }))
                .sort((a, b) => b.count - a.count)
        })).sort((a, b) => a.companyName.localeCompare(b.companyName, "fa"));

        // 2) کاربر ← لیست آیتم‌ها
        const userAgg = new Map(); // userId -> {userId,userName,companyId,companyName,items:[{dishId,dishName,quantity,mealTypeName}]}
        for (const r of baseRows) {
            const uid = r.userId;
            if (!userAgg.has(uid)) {
                userAgg.set(uid, {
                    userId: uid,
                    userName: r.userName,
                    companyId: r.companyId,
                    companyName: r.companyName,
                    items: []
                });
            }
            if (r.chosenDishIds) {
                try {
                    const chosen = JSON.parse(r.chosenDishIds) || [];
                    for (const it of chosen) {
                        userAgg.get(uid).items.push({
                            dishId: it.id,
                            dishName: dishNameMap.get(it.id) || `#${it.id}`,
                            quantity: Number(it.quantity) || 1,
                            mealTypeName: r.mealTypeName || ""
                        });
                    }
                } catch { }
            }
        }

        const users = Array.from(userAgg.values())
            .map(u => ({
                ...u,
                items: u.items.sort((a, b) =>
                    a.mealTypeName.localeCompare(b.mealTypeName, "fa") ||
                    a.dishName.localeCompare(b.dishName, "fa")
                )
            }))
            .sort((a, b) =>
                (a.companyName || "—").localeCompare(b.companyName || "—", "fa") ||
                a.userName.localeCompare(b.userName, "fa")
            );

        res.json({
            day: targetDate,                // تاریخ جلالی روز گزارش
            companyCards,                   // کارت‌های شرکت + شمارش غذا
            users,                          // جزئیات کاربران و آیتم‌ها
        });
    } catch (err) {
        console.error("getDailyBreakdown error:", err);
        res.status(500).json({ message: "خطا در تولید گزارش روزانه" });
    }
};


// جمع‌کننده‌ی امن برای map‌ها
function inc(map, key, by = 1) {
    map.set(key, (map.get(key) || 0) + by);
}

export const getAvailableWeekStarts = async (req, res) => {
    try {
        const { db } = await dbPromise;

        // اولویت با rst_menus (استاندارد هفته‌ها)
        const rows = await db.all(
            `SELECT DISTINCT weekStartDate AS weekStart
       FROM rst_menus
       WHERE weekStartDate IS NOT NULL
       ORDER BY weekStartDate DESC`
        );

        // اگر منو وجود نداشت، از رزروها استنتاج کن (fallback)
        let weekStarts = rows.map(r => r.weekStart);
        if (weekStarts.length === 0) {
            const r2 = await db.all(
                `SELECT DISTINCT date AS jalaliDate
         FROM rst_reservations
         WHERE date IS NOT NULL
         ORDER BY date DESC`
            );
            // همه‌ی تاریخ‌ها را به شنبه‌ی همان هفته نرمال کن
            const set = new Set();
            for (const x of r2) {
                // پیدا کردن شنبه‌ی همان هفته (براساس الگویی که در فرانت داری)
                // ساده: از خود تاریخ استفاده کن و تا شنبه عقب برو
                // راه سریع: چون خودت هفته‌ها را با منطق فرانت می‌سازی، می‌تونیم مستقیم خود تاریخ را اضافه کنیم
                // اما بهتر: normalize به شنبه
                // برای سادگی فعلاً همان تاریخ را ذخیره می‌کنیم؛ اگر لازم شد، نرمالایز کن
                set.add(x.jalaliDate);
            }
            weekStarts = Array.from(set).sort().reverse();
        }

        res.json({ weekStarts });
    } catch (err) {
        console.error("getAvailableWeekStarts error:", err);
        res.status(500).json({ message: "خطا در دریافت لیست هفته‌ها" });
    }
};

export const getWeeklyReports = async (req, res) => {
    try {
        const { db } = await dbPromise;

        const {
            weekStartJalali,
            companyId,
            mealTypeId,
            statusId,
            search, // روی نام کاربر
        } = req.query;

        if (!weekStartJalali) {
            return res.status(400).json({ message: "weekStartJalali الزامی است" });
        }

        const weekEndJalali = getJalaliWeekEnd(weekStartJalali);

        // --- خواندن متادیتا موردنیاز (برای برگرداندن نام وعده‌ها در گزارش غذاها)
        const mealTypes = await db.all(`SELECT id, DisplayName FROM rst_meal_types`);
        const mealTypeMap = new Map(mealTypes.map(m => [m.id, m.DisplayName]));

        // --- ساخت WHERE پویا
        const where = [`r.date BETWEEN ? AND ?`];
        const params = [weekStartJalali, weekEndJalali];

        if (companyId) { where.push(`r.companyId = ?`); params.push(Number(companyId)); }
        if (mealTypeId) { where.push(`r.mealTypeId = ?`); params.push(Number(mealTypeId)); }
        if (statusId) { where.push(`r.statusId = ?`); params.push(Number(statusId)); }
        if (search && String(search).trim() !== "") {
            where.push(`LOWER(u.name) LIKE LOWER(?)`);
            params.push(`%${String(search).trim()}%`);
        }
        const whereSQL = `WHERE ${where.join(" AND ")}`;

        // --- رزروهای هفته (با حداقل فیلدهای لازم برای تجمیع)
        const baseRows = await db.all(
            `
      SELECT
        r.id, r.userId, u.name AS userName,
        r.date,
        r.mealTypeId,
        r.statusId,
        r.companyId, c.name AS companyName,
        r.chosenDishIds
      FROM rst_reservations r
      LEFT JOIN users u ON u.id = r.userId
      LEFT JOIN rst_companies c ON c.id = r.companyId
      ${whereSQL}
      ORDER BY r.date ASC, r.mealTypeId ASC, r.id ASC
      `,
            params
        );

        // --- DAILY SUMMARY
        const dailyMap = new Map(); // key=date -> { ... }
        for (const r of baseRows) {
            if (!dailyMap.has(r.date)) {
                dailyMap.set(r.date, {
                    date: r.date,
                    totalReservations: 0,
                    delivered: 0,
                    canceled: 0,
                    noShow: 0,
                    confirmed: 0,
                    uniqueUsers: new Set(),
                    activeCompanies: new Set(),
                });
            }
            const d = dailyMap.get(r.date);
            d.totalReservations += 1;
            if (r.statusId === 5) d.delivered += 1;
            else if (r.statusId === 3) d.canceled += 1;
            else if (r.statusId === 4) d.noShow += 1;
            else if (r.statusId === 2) d.confirmed += 1;
            d.uniqueUsers.add(r.userId);
            if (r.companyId != null) d.activeCompanies.add(r.companyId);
        }

        const daily = Array.from(dailyMap.values()).map(d => ({
            date: d.date,
            totalReservations: d.totalReservations,
            delivered: d.delivered,
            canceled: d.canceled,
            noShow: d.noShow,
            confirmed: d.confirmed,
            uniqueUsers: d.uniqueUsers.size,
            activeCompanies: d.activeCompanies.size,
        })).sort((a, b) => a.date.localeCompare(b.date, "fa"));

        // --- BY COMPANY (per-day)
        const companyMap = new Map(); // key=`${date}|${companyId}`
        // برای top dishes نیاز داریم chosenDishIds را پارس کنیم
        for (const r of baseRows) {
            const key = `${r.date}|${r.companyId ?? -1}`;
            if (!companyMap.has(key)) {
                companyMap.set(key, {
                    date: r.date,
                    companyId: r.companyId ?? -1,
                    companyName: r.companyName ?? "—",
                    totalReservations: 0,
                    delivered: 0,
                    canceled: 0,
                    noShow: 0,
                    dishes: new Map(), // dishId -> count
                });
            }
            const obj = companyMap.get(key);
            obj.totalReservations += 1;
            if (r.statusId === 5) obj.delivered += 1;
            else if (r.statusId === 3) obj.canceled += 1;
            else if (r.statusId === 4) obj.noShow += 1;

            if (r.chosenDishIds) {
                try {
                    const chosen = JSON.parse(r.chosenDishIds); // [{id, quantity}, ...]
                    for (const it of chosen) {
                        inc(obj.dishes, it.id, Number(it.quantity) || 1);
                    }
                } catch { /* ignore */ }
            }
        }

        // جمع dishIds برای یک lookup
        const allDishIds = new Set();
        for (const v of companyMap.values()) {
            for (const dishId of v.dishes.keys()) allDishIds.add(dishId);
        }

        // --- BY DISH (per-day & mealType)
        const dishAgg = new Map(); // key=`${date}|${mealTypeId}|${dishId}`
        for (const r of baseRows) {
            if (!r.chosenDishIds) continue;
            let chosen = [];
            try { chosen = JSON.parse(r.chosenDishIds) || []; } catch { chosen = []; }
            for (const it of chosen) {
                const qty = Number(it.quantity) || 1;
                const key = `${r.date}|${r.mealTypeId}|${it.id}`;
                if (!dishAgg.has(key)) {
                    dishAgg.set(key, {
                        date: r.date,
                        mealTypeId: r.mealTypeId,
                        dishId: it.id,
                        totalCount: 0,
                        delivered: 0,
                        canceled: 0,
                        noShow: 0,
                    });
                }
                const obj = dishAgg.get(key);
                obj.totalCount += qty;
                if (r.statusId === 5) obj.delivered += qty;
                else if (r.statusId === 3) obj.canceled += qty;
                else if (r.statusId === 4) obj.noShow += qty;

                allDishIds.add(it.id);
            }
        }

        // --- خواندن نام غذاها برای همه‌ی dishId های استفاده‌شده
        let dishNameMap = new Map();
        if (allDishIds.size > 0) {
            const ids = Array.from(allDishIds).filter(Boolean);
            const placeholders = ids.map(() => "?").join(",");
            const dishRows = await db.all(
                `SELECT id, name FROM rst_dishes WHERE id IN (${placeholders})`,
                ids
            );
            dishNameMap = new Map(dishRows.map(d => [d.id, d.name]));
        }

        // خروجی شرکت‌ها + topDishes
        const byCompany = Array.from(companyMap.values())
            .map((c) => {
                // top dishes (۳ عدد بالاترین)
                const top = Array.from(c.dishes.entries())
                    .map(([dishId, count]) => ({ dishId, count }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 3)
                    .map(x => ({ dishName: dishNameMap.get(x.dishId) || `#${x.dishId}`, count: x.count }));
                return {
                    date: c.date,
                    companyId: c.companyId,
                    companyName: c.companyName,
                    totalReservations: c.totalReservations,
                    delivered: c.delivered,
                    canceled: c.canceled,
                    noShow: c.noShow,
                    topDishes: top,
                };
            })
            .sort((a, b) => a.date.localeCompare(b.date, "fa") || a.companyName.localeCompare(b.companyName, "fa"));

        // خروجی غذاها
        const byDish = Array.from(dishAgg.values())
            .map(d => ({
                date: d.date,
                mealTypeId: d.mealTypeId,
                mealTypeName: mealTypeMap.get(d.mealTypeId) || `#${d.mealTypeId}`,
                dishId: d.dishId,
                dishName: dishNameMap.get(d.dishId) || `#${d.dishId}`,
                totalCount: d.totalCount,
                delivered: d.delivered,
                canceled: d.canceled,
                noShow: d.noShow,
            }))
            .sort((a, b) =>
                a.date.localeCompare(b.date, "fa") ||
                String(a.mealTypeId).localeCompare(String(b.mealTypeId), "fa") ||
                a.dishName.localeCompare(b.dishName, "fa")
            );

        res.json({ daily, byCompany, byDish });
    } catch (err) {
        console.error("getWeeklyReports error:", err);
        res.status(500).json({ message: "خطا در تولید گزارش هفتگی" });
    }
};
