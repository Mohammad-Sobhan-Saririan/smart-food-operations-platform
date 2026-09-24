// controllers/notificationController.js
import { dbPromise } from '../db/db.js';

export const subscribe = async (req, res) => {
    const { token, platform } = req.body || {};
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    if (!token) return res.status(400).json({ message: 'FCM token is required' });

    const { db } = await dbPromise;
    await db.run(
        `INSERT INTO fcm_tokens (token, userId, platform)
     VALUES (?, ?, ?)
     ON CONFLICT(token) DO UPDATE SET
       userId=excluded.userId,
       platform=excluded.platform,
       updated_at=CURRENT_TIMESTAMP`,
        [token, userId, platform || null]
    );
    res.json({ ok: true });
};

export const unsubscribe = async (req, res) => {

    const { token } = req.body || {};
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: `Unauthorized` });
    if (!token) return res.status(400).json({ message: 'FCM token is required' });

    const { db } = await dbPromise;
    await db.run(`DELETE FROM fcm_tokens WHERE token = ? AND userId = ?`, [token, userId]);
    res.json({ ok: true });
};
