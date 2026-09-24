import { dbPromise } from '../db/db.js';

// تابع کمکی برای نرمال‌سازی متن (حذف تفاوت‌های ی، ک، آ و کوچک‌سازی حروف)
const normalizeText = (text) => {
    if (!text) return "";
    return text.toString()
        .toLowerCase()
        .trim()
        .replace(/ي/g, 'ی')
        .replace(/ك/g, 'ک')
        .replace(/آ/g, 'ا')
        .replace(/[\u064B-\u065F]/g, ""); // حذف اعراب (فتحه، کسره و...)
};

export const searchUsers = async (req, res) => {
    try {
        const { q } = req.query;
        const currentUserId = req.user.id;

        if (!q || q.length < 2) return res.json([]);

        const { db } = await dbPromise;

        // ۱. واکشی کل کاربران (فقط ستون‌های مورد نیاز برای امنیت و سرعت)
        const allUsers = await db.all(`SELECT id, name, email, employeeNumber FROM users`);

        // ۲. نرمال‌سازی عبارت جستجو
        const searchTerm = normalizeText(decodeURIComponent(q));

        // ۳. فیلتر کردن در سطح کد (JS)
        const filteredResults = allUsers.filter(u => {
            // حذف خودِ کاربر از نتایج
            if (u.id === currentUserId) return false;

            const name = normalizeText(u.name);
            const email = normalizeText(u.email);
            const empNum = normalizeText(u.employeeNumber);

            // چک کردن اینکه آیا کلمه کلیدی در هر کدام از فیلدها هست یا خیر
            return (
                name.includes(searchTerm) ||
                email.includes(searchTerm) ||
                empNum.includes(searchTerm)
            );
        });

        // ۴. لاگ برای اطمینان (اختیاری)
        console.log(`🔍 Search for: "${searchTerm}" | Total Users: ${allUsers.length} | Found: ${filteredResults.length}`);

        // بازگرداندن ۱۰ نتیجه برتر
        res.json(filteredResults.slice(0, 10));

    } catch (error) {
        console.error("❌ Search Logic Error:", error);
        res.status(500).json({ message: "خطا در فرآیند جستجو" });
    }
};

// تابع حذف (همان منطق قبلی که اولویت‌ها را بازسازی می‌کرد)
export const removeDelegate = async (req, res) => {
    const ownerId = req.user.id;
    const { id } = req.params;
    const { db } = await dbPromise;
    try {
        await db.exec("BEGIN TRANSACTION");
        const target = await db.get(`SELECT priority FROM rst_delegations WHERE id = ? AND ownerId = ?`, [id, ownerId]);
        if (!target) {
            await db.exec("ROLLBACK");
            return res.status(404).json({ message: "رکورد یافت نشد." });
        }
        await db.run(`DELETE FROM rst_delegations WHERE id = ?`, [id]);
        await db.run(`UPDATE rst_delegations SET priority = priority - 1 WHERE ownerId = ? AND priority > ?`, [ownerId, target.priority]);
        await db.exec("COMMIT");
        res.json({ message: "جانشین حذف شد." });
    } catch (error) {
        await db.exec("ROLLBACK");
        res.status(500).json({ message: "خطا در حذف" });
    }
};

// ۳. اضافه کردن (با منطق قبلی Shift Priority که تایید کردید)
export const addDelegate = async (req, res) => {
    const ownerId = req.user.id;
    const { delegateId, priority, startDate, endDate } = req.body;
    const { db } = await dbPromise;

    try {
        await db.exec("BEGIN TRANSACTION");
        await db.run(`UPDATE rst_delegations SET priority = priority + 1 WHERE ownerId = ? AND priority >= ?`, [ownerId, priority]);
        await db.run(`
            INSERT INTO rst_delegations (ownerId, delegateId, priority, startDate, endDate)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(ownerId, delegateId) DO UPDATE SET priority = excluded.priority, endDate = excluded.endDate
        `, [ownerId, delegateId, priority, startDate, endDate]);
        await db.exec("COMMIT");
        res.json({ message: "جانشین با موفقیت اضافه شد." });
    } catch (error) {
        await db.exec("ROLLBACK");
        res.status(500).json({ message: "خطا در ثبت جانشین" });
    }
};

// ۴. دریافت لیست (My Delegates)
export const getMyDelegates = async (req, res) => {
    const userId = req.user.id;
    try {
        const { db } = await dbPromise;
        const delegates = await db.all(`
            SELECT d.id as delegationId, u.id as userId, u.name, u.employeeNumber, u.email, d.priority, d.startDate, d.endDate
            FROM rst_delegations d
            JOIN users u ON d.delegateId = u.id
            WHERE d.ownerId = ?
            ORDER BY d.priority ASC
        `, [userId]);
        res.json(delegates);
    } catch (error) {
        res.status(500).json({ message: "خطا در دریافت لیست" });
    }
};