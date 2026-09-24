import { dbPromise } from "../db/db.js";
import { signFilters, verifyLockCode } from "../utils/lockCode.js";

// ✅ ساخت لاک جدید
export const createDeliveryLock = async (req, res) => {
    try {
        const { userId, filters, ttlMinutes = 30 } = req.body;
        if (!userId || !filters?.weekStartJalali || filters.day === undefined)
            return res.status(400).json({ message: "userId و فیلترها الزامی هستند" });

        const { db } = await dbPromise;
        const token = signFilters({ ...filters, expiresAt: Date.now() + ttlMinutes * 60000 });
        const expiresAt = new Date(Date.now() + ttlMinutes * 60000).toISOString();

        await db.run(
            `INSERT INTO rst_delivery_locks (token, userId, filters, expiresAt)
        VALUES (?, ?, ?, ?)`,
            [token, userId, JSON.stringify(filters), expiresAt]
        );

        res.json({
            message: "لاک جدید ایجاد شد",
            token,
            expiresAt,
            link: `/rst_manager/restaurant/delivery?lockCode=${token}`,
        });
    } catch (e) {
        res.status(500).json({ message: "خطا در ایجاد لاک جدید" });
    }
};



// ✅ لیست لاک‌ها برای نمایش در پنل مدیر
export const listDeliveryLocks = async (req, res) => {
    try {
        const { db } = await dbPromise;
        const rows = await db.all(`
      SELECT dl.*, u.name AS userName
      FROM rst_delivery_locks dl
      LEFT JOIN users u ON u.id = dl.userId
      WHERE dl.deletedAt IS NULL
      ORDER BY dl.createdAt DESC
    `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: "خطا در دریافت لیست لاک‌ها" });
    }
};

// ✅ لغو (حذف نرم)
export const revokeDeliveryLock = async (req, res) => {
    try {
        const { id } = req.params;
        const { db } = await dbPromise;
        await db.run(
            `UPDATE rst_delivery_locks SET isRevoked = 1, deletedAt = CURRENT_TIMESTAMP WHERE id = ?`,
            [id]
        );
        res.json({ message: "لاک لغو شد" });
    } catch (e) {
        res.status(500).json({ message: "خطا در لغو لاک" });
    }
};
