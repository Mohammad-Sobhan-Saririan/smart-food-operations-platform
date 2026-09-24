import { dbPromise } from '../db/db.js';
import jalaali from "jalaali-js";

// Helper to get the start date (Sunday) of a given week

export function getWeekStartDate(date) {
    // اگه ورودی شمسی باشه مثل "1403-08-12"
    const [jy, jm, jd] = date.split("-").map(Number);
    const g = jalaali.toGregorian(jy, jm, jd);
    const d = new Date(g.gy, g.gm - 1, g.gd);

    const day = d.getDay();
    const diff = day === 6 ? 0 : day + 1;
    d.setDate(d.getDate() - diff);

    // ذخیره به فرمت شمسی دقیق
    const weekStartJalali = jalaali.toJalaali(d);
    return `${weekStartJalali.jy}-${String(weekStartJalali.jm).padStart(2, "0")}-${String(weekStartJalali.jd).padStart(2, "0")}`;
}

// Get company list
export const getCompanyList = async (req, res) => {
    try {
        const { db } = await dbPromise;
        const companies = await db.all('SELECT id, name FROM rst_companies ORDER BY id');
        res.status(200).json(companies);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get meal types
export const getMealTypes = async (req, res) => {
    try {
        const { db } = await dbPromise;
        const mealTypes = await db.all('SELECT * FROM rst_meal_types ORDER BY ID');
        res.status(200).json(mealTypes);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// GET /api/restaurant/menu?date=...&companyId=...&targetUserId=...
export const getWeeklyMenu = async (req, res) => {
    const requesterId = req.user.id;
    const { date, companyId, targetUserId } = req.query;

    // اگر targetUserId وجود نداشت یا 'undefined' بود، از requesterId استفاده کن
    const ownerId = (targetUserId && targetUserId !== 'undefined' && targetUserId !== 'null') ? targetUserId : requesterId;

    const { db } = await dbPromise;

    try {
        // ۱. بررسی دسترسی جانشینی در صورت نیاز
        let currentPriority = 0;
        if (requesterId !== ownerId) {
            const delegation = await db.get(`
                SELECT priority FROM rst_delegations 
                WHERE ownerId = ? AND delegateId = ? 
                AND (startDate IS NULL OR startDate <= date('now'))
                AND (endDate IS NULL OR endDate >= date('now'))
            `, [ownerId, requesterId]);

            if (!delegation) {
                return res.status(403).json({ message: "شما به دیتای این کاربر دسترسی ندارید." });
            }
            currentPriority = delegation.priority;
        }

        const weekStartDate = getWeekStartDate(date || new Date().toISOString());

        // ۲. پیدا کردن منوی هفته برای شرکت مورد نظر
        const menu = await db.get('SELECT id FROM rst_menus WHERE weekStartDate = ? AND companyId = ?', [weekStartDate, companyId]);

        if (!menu) {
            return res.json({ menu: [], entitlements: [], reservations: [], currentPriority });
        }

        // ۳. دریافت گزینه‌های منو
        const menuOptions = await db.all(`
            SELECT do.dayOfWeek, do.isActive, do.mealTypeId, mt.DisplayName as mealTypeName, d.id as dishId, d.name as dishName
            FROM rst_daily_options do
            JOIN rst_dishes d ON do.dishId = d.id
            JOIN rst_meal_types mt ON do.mealTypeId = mt.id
            WHERE do.menuId = ?
        `, [menu.id]);

        // ۴. دریافت سهمیه صاحب سفارش
        const ownerInfo = await db.get("SELECT entitlementGroupId, name FROM users WHERE id = ?", [ownerId]);

        const entitlementRules = await db.all(`
            SELECT dayOfWeek, mealTypeId, dishCount 
            FROM rst_daily_entitlements 
            WHERE groupId = ?
        `, [ownerInfo.entitlementGroupId]);

        // ۵. دریافت رزروهای موجود با نامِ جانشین (Join با جدول users)
        const reservations = await db.all(`
            SELECT 
                r.date, r.mealTypeId, r.statusId, r.chosenDishIds, r.companyId, 
                r.savedWithPriority, r.proxyUserId,
                u.name as proxyUserName -- نام کسی که رزرو را ثبت کرده
            FROM rst_reservations r
            LEFT JOIN users u ON r.proxyUserId = u.id
            WHERE r.userId = ? AND date(r.date) >= ? AND date(r.date) < date(?, '+7 day')
        `, [ownerId, weekStartDate, weekStartDate]);

        res.json({
            menu: menuOptions,
            entitlements: entitlementRules,
            reservations,
            currentPriority,
            ownerName: ownerId === requesterId ? "خودم" : ownerInfo.name
        });

    } catch (error) {
        console.error("❌ Error fetching weekly menu:", error);
        res.status(500).json({ message: "خطای سرور در دریافت اطلاعات منو" });
    }
};

// POST /api/restaurant/presence (For Users)
export const updatePresence = async (req, res) => {
    const userId = req.user.id;
    const { date, mealTypeId, statusId } = req.body; // statusId: 1=Absent, 2=Present
    try {
        const { db } = await dbPromise;
        // This query inserts or updates the status
        await db.run(
            `INSERT INTO rst_reservations (userId, date, mealTypeId, statusId, chosenDishIds) 
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(userId, date, mealTypeId) DO UPDATE SET 
                statusId = excluded.statusId,
                chosenDishIds = CASE WHEN excluded.statusId = 1 THEN '[]' ELSE chosenDishIds END`, // Clear choices if marked absent
            [userId, date, mealTypeId, statusId, '[]']
        );
        res.status(200).json({ message: 'Presence updated.' });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

export const saveMealChoice = async (req, res) => {
    const userId = req.user.id;
    const { date, mealTypeId, dishIds } = req.body; // dishIds is now an array [1, 2]

    // --- TODO: Add Entitlement Check logic here ---

    try {
        const { db } = await dbPromise;
        await db.run(
            `UPDATE rst_reservations SET statusId = 3, chosenDishIds = ?
             WHERE userId = ? AND date = ? AND mealTypeId = ?`,
            [JSON.stringify(dishIds), userId, date, mealTypeId]
        );
        res.status(200).json({ message: 'Choice saved.' });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};
// GET /api/restaurant/my-history
export const getMyReservationHistory = async (req, res) => {
    const userId = req.user.id;
    try {
        const { db } = await dbPromise;
        const history = await db.all(`
            SELECT r.date, mt.DisplayName as mealName, s.nameFA as statusName, s.color as statusColor
            FROM rst_reservations r
            LEFT JOIN rst_meal_types mt ON r.mealTypeId = mt.id
            LEFT JOIN rst_reservation_statuses s ON r.statusId = s.id
            WHERE r.userId = ? AND r.statusId IS NOT NULL
            ORDER BY r.date DESC
            LIMIT 50
        `, [userId]);
        res.status(200).json(history);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// --- ADD THIS NEW FUNCTION ---
// This function is built to receive the exact data your new frontend is sending.

// api/restaurant/reserve
export const saveWeeklyReservations = async (req, res) => {
    const requesterId = req.user.id;
    const { weekStartDate, reservations, userRSTCompany, targetUserId } = req.body;

    if (!weekStartDate || !reservations || !userRSTCompany) {
        return res.status(400).json({ message: "اطلاعات ارسالی ناقص است." });
    }

    const ownerId = (targetUserId && targetUserId !== 'undefined' && targetUserId !== 'null') ? targetUserId : requesterId;

    const { db } = await dbPromise;

    const cutoffConfig = await db.get("SELECT value FROM configs WHERE feature = 'reservation_cutoff_hours'");
    const cutoffHours = cutoffConfig ? cutoffConfig.value : 48;

    const now = new Date();

    try {
        // --- ۱. تعیین سطح اولویت و بررسی دسترسی جانشینی ---
        let currentPriority = 0; // اولویت پیش‌فرض ۰ (خود صاحب غذا)

        if (requesterId !== ownerId) {
            const delegation = await db.get(`
                SELECT priority FROM rst_delegations 
                WHERE ownerId = ? AND delegateId = ? 
                AND (startDate IS NULL OR startDate <= date('now'))
                AND (endDate IS NULL OR endDate >= date('now'))
            `, [ownerId, requesterId]);

            if (!delegation) {
                return res.status(403).json({ message: "شما دسترسی لازم برای رزرو غذا به جای این کاربر را ندارید." });
            }
            currentPriority = delegation.priority;
        }

        await db.exec("BEGIN TRANSACTION");

        // --- ۲. چک کردن اولویت رکوردهای موجود ---
        const existingReservations = await db.all(`
            SELECT date, mealTypeId, savedWithPriority FROM rst_reservations
            WHERE userId = ? AND date(date) >= ? AND date(date) < date(?, '+7 day')
        `, [ownerId, weekStartDate, weekStartDate]);

        for (const entry of existingReservations) {
            if (entry.savedWithPriority !== null && currentPriority > entry.savedWithPriority) {
                throw new Error(`رزرو روز ${entry.date} توسط فردی با اولویت بالاتر ثبت شده و قابل تغییر نیست.`);
            }
        }

        // --- ۳. حذف رزروهای قبلی ---
        await db.run(
            `DELETE FROM rst_reservations
             WHERE userId = ? AND companyId = ? AND date(date) >= ? AND date(date) < date(?, '+7 day')`,
            [ownerId, userRSTCompany, weekStartDate, weekStartDate]
        );

        // --- ۴. بررسی سهمیه (Entitlement) صاحب غذا ---
        const ownerInfo = await db.get("SELECT entitlementGroupId FROM users WHERE id = ?", [ownerId]);
        if (!ownerInfo) throw new Error("اطلاعات صاحب سفارش یافت نشد.");

        const entitlementRules = await db.all(`
            SELECT dayOfWeek, mealTypeId, dishCount 
            FROM rst_daily_entitlements 
            WHERE groupId = ?
        `, [ownerInfo.entitlementGroupId]);

        const entitlementMap = {};
        for (const rule of entitlementRules) {
            const key = `${rule.dayOfWeek}-${rule.mealTypeId}`;
            entitlementMap[key] = rule.dishCount;
        }

        const dayNames = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'];
        for (const key in entitlementMap) {
            const [dayOfWeek, mealTypeId] = key.split('-').map(Number);
            const allowedDishCount = entitlementMap[key];

            const filteredReservations = reservations.filter(r => {
                const [jy, jm, jd] = r.date.split("-").map(Number);
                const gDate = jalaali.toGregorian(jy, jm, jd);
                const d = new Date(gDate.gy, gDate.gm - 1, gDate.gd);
                const reservationDayOfWeek = (d.getDay() + 1) % 7;
                return reservationDayOfWeek === dayOfWeek && r.mealTypeId === mealTypeId;
            });

            const totalDishesReserved = filteredReservations.reduce((sum, r) => sum + (r.quantity || 0), 0);
            if (totalDishesReserved > allowedDishCount) {
                throw new Error(`تعداد سفارش در ${dayNames[dayOfWeek]} بیش از سهمیه مجاز صاحب غذا است (مجاز: ${allowedDishCount}).`);
            }
        }

        // --- ۵. گروه‌بندی ---
        const reservationsByDay = {};
        for (const r of reservations) {
            const dateStr = r.date;
            const key = `${dateStr}-${r.mealTypeId}`;
            if (!reservationsByDay[key]) {
                reservationsByDay[key] = {
                    date: dateStr,
                    mealTypeId: r.mealTypeId,
                    dishes: [],
                };
            }
            if (r.quantity && r.quantity > 0) {
                reservationsByDay[key].dishes.push({
                    id: r.dishId,
                    quantity: r.quantity,
                });
            }
        }

        // --- ۶. درج نهایی ---
        const stmt = await db.prepare(
            `INSERT INTO rst_reservations (userId, date, mealTypeId, statusId, chosenDishIds, companyId, proxyUserId, savedWithPriority)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        );

        for (const key in reservationsByDay) {
            const { date, mealTypeId, dishes } = reservationsByDay[key];
            if (dishes.length === 0) continue;

            await stmt.run(
                ownerId,
                date,
                mealTypeId,
                1,
                JSON.stringify(dishes),
                userRSTCompany,
                // اگر خودِ صاحب اکانت است، NULL ذخیره کن. اگر جانشین است، آیدی جانشین.
                requesterId === ownerId ? null : requesterId,
                currentPriority
            );
        }

        await stmt.finalize();
        await db.exec("COMMIT");

        res.status(200).json({ message: "رزرو با موفقیت انجام شد." });
    } catch (error) {
        try { await db.exec("ROLLBACK"); } catch { /* no active transaction */ }
        console.error("Reservation error:", error.message);
        const isBusinessRule = /سهمیه|اولویت|دسترسی|یافت نشد/.test(error.message || "");
        res.status(isBusinessRule ? 400 : 500).json({ message: error.message || "خطای سرور در ثبت رزرو" });
    }
};


// api/restaurant/my-bosses
export const getMyBosses = async (req, res) => {
    const userId = req.user.id;
    const { db } = await dbPromise;
    try {
        const bosses = await db.all(`
            SELECT u.id, u.name 
            FROM rst_delegations d
            JOIN users u ON d.ownerId = u.id
            WHERE d.delegateId = ? 
            AND (d.startDate IS NULL OR d.startDate <= date('now'))
            AND (d.endDate IS NULL OR d.endDate >= date('now'))
        `, [userId]);
        res.json(bosses);
    } catch (error) {
        res.status(500).json({ message: "خطا در دریافت لیست مدیران" });
    }
};

// 
// تابع کمکی تبدیل تاریخ شمسی به میلادی (برای کوئری دیتابیس)
const jalaaliToGregorian = (jalaaliDateStr) => {
    const [jy, jm, jd] = jalaaliDateStr.split('-').map(Number);
    const g = jalaali.toGregorian(jy, jm, jd);
    return `${g.gy}-${String(g.gm).padStart(2, '0')}-${String(g.gd).padStart(2, '0')}`;
};

// GET /api/restaurant/reservations
export const getWeeklyReservations = async (req, res) => {
    const requesterId = req.user.id; // کسی که درخواست داده
    const { weekStartDate, targetUserId } = req.query;

    if (!weekStartDate) {
        return res.status(400).json({ message: "تاریخ شروع هفته الزامی است." });
    }

    // تعیین اینکه دیتای چه کسی باید لود شود
    // اگر targetUserId ارسال شده و معتبر است، از آن استفاده کن، وگرنه خودِ کاربر
    const ownerId = (targetUserId && targetUserId !== 'undefined' && targetUserId !== 'null')
        ? targetUserId
        : requesterId;

    const { db } = await dbPromise;

    try {
        // ۱. بررسی امنیتی: اگر درخواست برای شخص دیگری است، آیا جانشین مجاز است؟
        if (requesterId !== ownerId) {
            const delegation = await db.get(`
                SELECT id FROM rst_delegations 
                WHERE ownerId = ? AND delegateId = ? 
                AND (startDate IS NULL OR startDate <= date('now'))
                AND (endDate IS NULL OR endDate >= date('now'))
            `, [ownerId, requesterId]);

            if (!delegation) {
                return res.status(403).json({ message: "شما اجازه مشاهده رزروهای این کاربر را ندارید." });
            }
        }

        // ۲. تبدیل تاریخ شمسی ورودی به میلادی برای جستجو در دیتابیس

        // ۳. اجرای کوئری با JOIN برای گرفتن نام جانشین
        const reservations = await db.all(`
            SELECT 
                r.id, r.userId, r.date, r.mealTypeId, r.statusId, r.chosenDishIds, r.companyId,
                r.savedWithPriority, 
                r.proxyUserId,
                u.name as proxyUserName -- نام کسی که واقعاً دکمه ثبت را زده
            FROM rst_reservations r
            LEFT JOIN users u ON r.proxyUserId = u.id
            WHERE r.userId = ? 
            AND date(r.date) >= date(?) 
            AND date(r.date) < date(?, '+7 day')
        `, [ownerId, weekStartDate, weekStartDate]);

        // ۴. بازگرداندن تاریخ‌ها به فرمت میلادی (فرانت‌ند خودش هندل می‌کند یا اگر لازم بود به شمسی برگردانید)
        // نکته: طبق کد قبلی شما، فرانت‌ند با فرمت YYYY-MM-DD کار می‌کند، پس همین خروجی دیتابیس مناسب است.

        res.status(200).json(reservations);

    } catch (error) {
        console.error("Error fetching weekly reservations:", error);
        res.status(500).json({ message: "خطای سرور در دریافت لیست رزروها." });
    }
};