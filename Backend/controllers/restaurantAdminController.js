import { dbPromise } from '../db/db.js'; // Corrected path
import jalaali from "jalaali-js";
import { getJalaliWeekEnd } from "../utils/jalaliWeek.js";
import { verifyLockCode } from '../utils/lockCode.js';


const getWeekStartDate = (date) => {
    const d = new Date(date);
    let day = d.getDay(); // 0=Sunday, 6=Saturday
    const diff = day === 6 ? 0 : day + 1; // برای شنبه =0، یکشنبه=1، دوشنبه=2 ...
    d.setDate(d.getDate() - diff);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

// GET /api/admin/restaurant/dishes
export const getAllDishes = async (req, res) => {
    try {
        const { db } = await dbPromise;
        const dishes = await db.all('SELECT * FROM rst_dishes ORDER BY name');
        res.status(200).json(dishes);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// POST /api/admin/restaurant/dishes
export const createDish = async (req, res) => {
    const { name, description, imageUrl } = req.body;
    if (!name) return res.status(400).json({ message: "Dish name is required." });
    try {
        const { db } = await dbPromise;
        await db.run(
            'INSERT INTO rst_dishes (name, description, imageUrl) VALUES (?, ?, ?)',
            [name, description, imageUrl]
        );
        res.status(201).json({ message: 'Dish created successfully.' });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// PUT /api/admin/restaurant/dishes/:id
export const updateDish = async (req, res) => {
    const { id } = req.params;
    const { name, description, imageUrl } = req.body;
    if (!name) return res.status(400).json({ message: "Dish name is required." });
    try {
        const { db } = await dbPromise;
        await db.run(
            'UPDATE rst_dishes SET name = ?, description = ?, imageUrl = ? WHERE id = ?',
            [name, description, imageUrl, id]
        );
        res.status(200).json({ message: 'Dish updated successfully.' });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// DELETE /api/admin/restaurant/dishes/:id
export const deleteDish = async (req, res) => {
    const { id } = req.params;
    try {
        const { db } = await dbPromise;
        await db.run('DELETE FROM rst_dishes WHERE id = ?', [id]);
        res.status(200).json({ message: 'Dish deleted successfully.' });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// GET /api/admin/restaurant/menu?date=...&companyId=...
export const getWeeklyMenuSettings = async (req, res) => {
    let date = req.query.date || null;
    let companyId = req.query.companyId || null;
    let weekStartDate;
    let jy, jm, jd;

    if (date) {
        [jy, jm, jd] = date.split('-').map(Number);
    }

    if (jy && jm && jd && jy <= 1404) {
        weekStartDate = date;
    } else {
        const today = new Date();
        const weekStart = getWeekStartDate(today);
        const jalaaliDate = jalaali.toJalaali(weekStart);
        weekStartDate = `${jalaaliDate.jy}-${String(jalaaliDate.jm).padStart(2, "0")}-${String(jalaaliDate.jd).padStart(2, "0")}`;
    }



    try {
        const { db } = await dbPromise;

        // get all companies from db and make row for "All Companies"
        const companies = await db.all('SELECT id, name FROM rst_companies ORDER BY name');

        // Find or create the menu for this week
        for (const company of companies)
            await db.run('INSERT OR IGNORE INTO rst_menus (weekStartDate, companyId) VALUES (?, ?)', [weekStartDate, company.id]);

        const menu = await db.get('SELECT * FROM rst_menus WHERE weekStartDate = ? AND companyId = ?', [weekStartDate, companyId]);


        // Get all options for this menu, joining with the dishes table to get names
        const options = await db.all(`
            SELECT do.*, d.name as dishName, d.imageUrl as dishImageUrl
            FROM rst_daily_options do
            JOIN rst_dishes d ON do.dishId = d.id
            WHERE do.menuId = ?`,
            [menu.id]);

        res.status(200).json({ menu, options });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// POST /api/admin/restaurant/menu
export const setWeeklyMenu = async (req, res) => {
    const { menuIds, options } = req.body; // menuIds: number[] , options: array of menu data

    if (!Array.isArray(menuIds) || menuIds.length === 0) {
        return res.status(400).json({ message: "menuIds must be a non-empty array." });
    }

    const { db } = await dbPromise;
    try {
        await db.exec("BEGIN TRANSACTION");

        for (const menuId of menuIds) {
            // 1. پاک کردن گزینه‌های قبلی برای هر منو
            await db.run("DELETE FROM rst_daily_options WHERE menuId = ?", [menuId]);

            // 2. افزودن گزینه‌های جدید
            if (options && options.length > 0) {
                const stmt = await db.prepare(
                    "INSERT INTO rst_daily_options (menuId, dayOfWeek, mealTypeId, dishId, isActive) VALUES (?, ?, ?, ?, ?)"
                );
                for (const option of options) {
                    await stmt.run(
                        menuId,
                        option.dayOfWeek,
                        option.mealTypeId,
                        option.dishId,
                        option.isActive
                    );
                }
                await stmt.finalize();
            }
        }

        await db.exec("COMMIT");
        res.status(200).json({ message: "Weekly menus updated successfully.", updatedMenus: menuIds });
    } catch (error) {
        await db.exec("ROLLBACK");
        console.error("Error updating weekly menus:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};


export const getMenuIds = async (req, res) => {
    let date = req.query.date || null;
    let weekStartDate = date;
    try {
        const { db } = await dbPromise;
        const menus = await db.all('SELECT companyId, id FROM rst_menus WHERE weekStartDate = ?', [weekStartDate]);
        const menuIds = {};
        menus.forEach(menu => {
            menuIds[menu.companyId] = menu.id;
        });
        res.status(200).json(menuIds);
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get Weeks
export const getWeeks = async (req, res) => {
    try {
        const { db } = await dbPromise;
        const weeks = await db.all(`
      SELECT DISTINCT weekStartDate
      FROM rst_menus
        ORDER BY weekStartDate DESC
    `);
        res.json(weeks.map(w => w.weekStartDate));
    }
    catch (err) {
        res.status(500).json({ message: "خطا در دریافت هفته‌ها" });
    }
};

// ✅ GET Companies List
export const getCompanies = async (req, res) => {
    try {
        const { db } = await dbPromise;
        const companies = await db.all("SELECT id, name FROM rst_companies ORDER BY id DESC");
        res.json(companies);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "خطا در دریافت لیست شرکت‌ها" });
    }
};

// ✅ Add Company
export const createCompany = async (req, res) => {
    const { db } = await dbPromise;
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: "نام شرکت الزامی است" });
    try {
        await db.run("INSERT INTO rst_companies (name) VALUES (?)", [name]);
        res.json({ message: "شرکت با موفقیت ثبت شد" });
    } catch (err) {
        res.status(500).json({ message: "خطا در ثبت شرکت" });
    }
};

// PUT /api/admin/restaurant/companies/:id
export const updateCompany = async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "نام شرکت الزامی است" });
    try {
        const { db } = await dbPromise;
        await db.run("UPDATE rst_companies SET name = ? WHERE id = ?", [name.trim(), id]);
        res.json({ message: "نام شرکت به‌روزرسانی شد" });
    } catch (err) {
        res.status(500).json({ message: "خطا در ویرایش شرکت" });
    }
};


// ✅ Delete Company
export const deleteCompany = async (req, res) => {
    try {
        const { db } = await dbPromise;
        const { id } = req.params;
        await db.run("DELETE FROM rst_companies WHERE id = ?", [id]);
        res.json({ message: "شرکت حذف شد" });
    } catch (err) {
        res.status(500).json({ message: "خطا در حذف شرکت" });
    }
};

/**
 * GET /api/admin/restaurant/reservations
 * Query params:
 *  - weekStartJalali=YYYY-MM-DD  (لازم)
 *  - companyId?=number
 *  - mealTypeId?=number
 *  - statusId?=number
 *  - search?=string   (روی نام کاربر)
 *  - page?=number (default 1)
 *  - pageSize?=number (default 20, max 100)
 */
export const getReservationsFiltered = async (req, res) => {
    try {
        const { db } = await dbPromise;
        const {
            weekStartJalali,
            companyId,
            mealTypeId,
            statusId,
            search,
            page = 1,
            pageSize = 20,
            lockCode,
        } = req.query;

        let filters = {
            weekStartJalali,
            companyId,
            mealTypeId,
            statusId,
            search,
        };

        // 🔐 اگر lockCode ارسال شده، آن را بررسی و فیلترها را از آن استخراج کن
        if (lockCode) {
            const result = await verifyLockCode(lockCode);
            if (!result.valid) {
                return res.status(403).json({ message: "کد قفل نامعتبر یا منقضی است." });
            }
            filters = result.payload;
        }

        const weekStart = filters.weekStartJalali;
        if (!weekStart) {
            return res.status(400).json({ message: "weekStartJalali الزامی است" });
        }

        const safePageSize = Math.min(Math.max(parseInt(pageSize, 10) || 20, 1), 100);
        const offset = (Math.max(parseInt(page, 10) || 1, 1) - 1) * safePageSize;

        const weekEndJalali = getJalaliWeekEnd(weekStart);

        // ساخت WHERE پویا
        const where = [`r.date BETWEEN ? AND ?`];
        const params = [weekStart, weekEndJalali];

        if (filters.companyId) {
            where.push(`r.companyId = ?`);
            params.push(Number(filters.companyId));
        }
        if (filters.mealTypeId) {
            where.push(`r.mealTypeId = ?`);
            params.push(Number(filters.mealTypeId));
        }
        if (filters.statusId) {
            where.push(`r.statusId = ?`);
            params.push(Number(filters.statusId));
        }
        if (filters.search && String(filters.search).trim() !== "") {
            where.push(`LOWER(u.name) LIKE LOWER(?)`);
            params.push(`%${String(filters.search).trim()}%`);
        }

        // اگر در لاک day هم داشتیم، تاریخ دقیق آن روز را فیلتر کن
        if (lockCode && filters.day !== undefined && typeof filters.day === "number") {
            const [jy, jm, jd] = weekStart.split("-").map(Number);
            const g = jalaali.toGregorian(jy, jm, jd);
            const baseDate = new Date(Date.UTC(g.gy, g.gm - 1, g.gd));
            baseDate.setUTCDate(baseDate.getUTCDate() + filters.day);
            const j = jalaali.toJalaali(
                baseDate.getUTCFullYear(),
                baseDate.getUTCMonth() + 1,
                baseDate.getUTCDate()
            );
            const dayDate = `${j.jy}-${String(j.jm).padStart(2, "0")}-${String(j.jd).padStart(2, "0")}`;
            where.length = 0;
            params.length = 0;
            where.push(`r.date = ?`);
            params.push(dayDate);
        }

        const whereSQL = where.length ? `WHERE ${where.join(" AND ")}` : "";

        // شمارش کل برای صفحه‌بندی
        const countSQL = `
      SELECT COUNT(*) as total
      FROM rst_reservations r
      LEFT JOIN users u ON u.id = r.userId
      ${whereSQL}
    `;
        const { total } = await db.get(countSQL, params);

        // خود لیست
        const listSQL = `
      SELECT 
        r.id,
        r.date,
        r.mealTypeId,
        mt.DisplayName AS mealType,
        r.statusId,
        r.chosenDishIds,
        rs.nameFA AS status,
        r.companyId,
        c.name AS company,
        u.name AS userName
      FROM rst_reservations r
      LEFT JOIN users u ON u.id = r.userId
      LEFT JOIN rst_meal_types mt ON mt.id = r.mealTypeId
      LEFT JOIN rst_reservation_statuses rs ON rs.id = r.statusId
      LEFT JOIN rst_companies c ON c.id = r.companyId
      ${whereSQL}
      ORDER BY r.date DESC, r.mealTypeId ASC, r.id DESC
      LIMIT ? OFFSET ?
    `;

        const rows = await db.all(listSQL, [...params, safePageSize, offset]);

        // جزئیات غذاهای انتخابی
        for (const row of rows) {
            if (row.chosenDishIds) {
                try {
                    const chosen = JSON.parse(row.chosenDishIds);
                    const dishDetails = [];
                    for (const dish of chosen) {
                        const dishInfo = await db.get(
                            "SELECT id, name, imageUrl FROM rst_dishes WHERE id = ?",
                            [dish.id]
                        );
                        if (dishInfo) {
                            dishDetails.push({
                                ...dishInfo,
                                quantity: dish.quantity || 1,
                            });
                        }
                    }
                    row.chosenDishes = dishDetails;
                } catch {
                    row.chosenDishes = [];
                }
            } else {
                row.chosenDishes = [];
            }
        }

        res.json({
            data: rows,
            meta: {
                page: Number(page),
                pageSize: safePageSize,
                total,
                totalPages: Math.max(Math.ceil(total / safePageSize), 1),
                week: { start: weekStart, end: weekEndJalali },
            },
            lock: lockCode ? { verified: true, filters } : undefined,
        });
    } catch (err) {
        console.error("getReservationsFiltered error:", err);
        res.status(500).json({ message: "خطا در دریافت رزروها" });
    }
};

/**
 * PUT /api/admin/restaurant/reservations/:id/status
 * body: { statusId }
 * (شما این متد را قبلاً اصلاح کردید – همین نسخه با dbPromise)
 */
export const updateReservationStatus = async (req, res) => {
    const { id } = req.params;
    const { statusId } = req.body;
    try {
        const { db } = await dbPromise;
        await db.run("UPDATE rst_reservations SET statusId = ? WHERE id = ?", [statusId, id]);
        res.json({ message: "وضعیت رزرو به‌روزرسانی شد" });
    } catch (err) {
        console.error("updateReservationStatus error:", err);
        res.status(500).json({ message: "خطا در تغییر وضعیت رزرو" });
    }
};

/**
 * PUT /api/admin/restaurant/reservations/bulk_status
 * body: 
 *  - statusId: number  (لازم)
 *  - ids?: number[]    (اگر ارسال شود، روی همین‌ها اعمال می‌کنیم)
 *  - scope?: "filtered" | "all"  (default: "filtered")
 *  - filters?: { weekStartJalali, companyId?, mealTypeId?, statusId?, search? }  (وقتی scope=filtered)
 *
 * منطق:
 *  - اگر ids داده شد → فقط همان‌ها
 *  - اگر ids نبود و scope="filtered" → روی مجموعه‌ای که با فیلترها برمی‌گردد
 *  - برای ایمنی، در حالت filtered، weekStartJalali اجباری است
 */
export const bulkUpdateReservationStatus = async (req, res) => {
    try {
        const { db } = await dbPromise;
        const { statusId, ids, scope = "filtered", filters = {} } = req.body || {};
        if (!statusId) {
            return res.status(400).json({ message: "statusId الزامی است" });
        }

        let targetIds = [];

        if (Array.isArray(ids) && ids.length > 0) {
            targetIds = ids;
        } else if (scope === "filtered") {
            const {
                weekStartJalali,
                companyId,
                mealTypeId,
                statusId: statusFilter,
                search,
            } = filters;

            if (!weekStartJalali) {
                return res.status(400).json({ message: "برای عملیات گروهی، weekStartJalali الزامی است" });
            }
            const weekEndJalali = getJalaliWeekEnd(weekStartJalali);

            const where = [`r.date BETWEEN ? AND ?`];
            const params = [weekStartJalali, weekEndJalali];

            if (companyId) { where.push(`r.companyId = ?`); params.push(Number(companyId)); }
            if (mealTypeId) { where.push(`r.mealTypeId = ?`); params.push(Number(mealTypeId)); }
            if (statusFilter) { where.push(`r.statusId = ?`); params.push(Number(statusFilter)); }
            if (search && String(search).trim() !== "") {
                where.push(`LOWER(u.name) LIKE LOWER(?)`);
                params.push(`%${String(search).trim()}%`);
            }
            const whereSQL = where.length ? `WHERE ${where.join(" AND ")}` : "";

            const idsSQL = `
        SELECT r.id
        FROM rst_reservations r
        LEFT JOIN users u ON u.id = r.userId
        ${whereSQL}
      `;
            const rows = await db.all(idsSQL, params);
            targetIds = rows.map(r => r.id);
        } else {
            // scope === "all" (خیلی خطرناک: پیشنهاد می‌کنم فقط با weekStart محدود شود؛ یا کلاً غیرفعال)
            return res.status(400).json({ message: "حالت all برای ایمنی غیرفعال است. از filtered یا ids استفاده کنید." });
        }

        if (targetIds.length === 0) {
            return res.json({ updated: 0, message: "موردی برای به‌روزرسانی یافت نشد" });
        }

        // آپدیت گروهی
        const placeholders = targetIds.map(() => "?").join(",");
        const sql = `UPDATE rst_reservations SET statusId = ? WHERE id IN (${placeholders})`;
        await db.run(sql, [statusId, ...targetIds]);

        res.json({ updated: targetIds.length, message: "وضعیت رزروها با موفقیت تغییر کرد", ids: targetIds });
    } catch (err) {
        console.error("bulkUpdateReservationStatus error:", err);
        res.status(500).json({ message: "خطا در تغییر وضعیت گروهی رزروها" });
    }
};


export const getMetaData = async () => {
    try {
        const { db } = await dbPromise;
        const mealTypes = await db.all("SELECT id, DisplayName FROM rst_meal_types");
        const statuses = await db.all("SELECT id, nameFA FROM rst_reservation_statuses");
        const companies = await db.all("SELECT id, name FROM rst_companies ORDER BY name ASC");
        return { mealTypes, statuses, companies };
    }
    catch (e) {
        throw new Error("خطا در دریافت متادیتا: " + e.message);
    }
};