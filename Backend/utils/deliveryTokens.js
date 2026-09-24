import crypto from "crypto";
import { nanoid } from "nanoid";
import { dbPromise } from "../db.js";

const SECRET = process.env.DELIVERY_LOCK_SECRET || "supersecret";

/** 🔹 ساخت توکن جدید برای کاربر */
export async function createDeliveryToken(userId, filters, ttlMinutes = 60) {
    const { db } = await dbPromise;
    const token = nanoid(32);
    const expiresAt = new Date(Date.now() + ttlMinutes * 60000).toISOString();

    await db.run(
        `INSERT INTO rst_delivery_tokens (token, userId, filters, expiresAt) VALUES (?, ?, ?, ?)`,
        [token, userId, JSON.stringify(filters), expiresAt]
    );

    const hash = crypto.createHmac("sha256", SECRET).update(token).digest("hex");
    return { token, hash, expiresAt };
}

/** 🔹 تأیید اعتبار توکن (برای صفحه تحویل) */
export async function verifyDeliveryToken(token, currentUserId) {
    const { db } = await dbPromise;
    const row = await db.get(
        `SELECT * FROM rst_delivery_tokens WHERE token = ?`,
        [token]
    );

    if (!row) return { valid: false, reason: "not_found" };
    const isExpired = new Date(row.expiresAt).getTime() < Date.now();
    if (isExpired) {
        await db.run(`DELETE FROM rst_delivery_tokens WHERE id = ?`, [row.id]);
        return { valid: false, reason: "expired" };
    }
    if (row.userId !== currentUserId) {
        return { valid: false, reason: "user_mismatch" };
    }

    const filters = JSON.parse(row.filters);
    return { valid: true, filters };
}

/** 🔹 پاکسازی خودکار لینک‌های منقضی */
export async function cleanupExpiredTokens() {
    const { db } = await dbPromise;
    await db.run(`DELETE FROM rst_delivery_tokens WHERE expiresAt < datetime('now')`);
}
