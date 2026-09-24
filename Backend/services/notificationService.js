import fs from 'fs/promises';
import path from 'path';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { dbPromise } from '../db/db.js';
import { env } from '../config/env.js';

async function initAdmin() {
  if (env.notificationsProvider !== 'firebase') return null;
  if (!getApps().length) {
    const configuredPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    if (!configuredPath) throw new Error('FIREBASE_SERVICE_ACCOUNT_PATH is required for Firebase notifications.');
    const serviceAccount = JSON.parse(await fs.readFile(path.resolve(configuredPath), 'utf8'));
    initializeApp({ credential: cert(serviceAccount) });
  }
  return getMessaging();
}

export async function notifyRoles(roles, { title, body, data = {} }) {
  const messaging = await initAdmin();
  if (!messaging) return { skipped: true, provider: 'none' };
  const { db } = await dbPromise;
  if (!Array.isArray(roles) || !roles.length) return { skipped: true };
  const users = await db.all(`SELECT id FROM users WHERE role IN (${roles.map(() => '?').join(',')})`, roles);
  if (!users.length) return { skipped: true };
  const userIds = users.map(u => u.id);
  const tokenRows = await db.all(`SELECT token FROM fcm_tokens WHERE userId IN (${userIds.map(() => '?').join(',')})`, userIds);
  const tokens = tokenRows.map(r => r.token);
  if (!tokens.length) return { skipped: true };
  const link = data.url || `${env.publicAppUrl}/barista`;
  const resp = await messaging.sendEachForMulticast({
    notification: { title, body },
    data: { ...Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])), link },
    webpush: { fcmOptions: { link } },
    tokens,
  });
  const bad = resp.responses.flatMap((r, i) => {
    const code = r.error?.code;
    return !r.success && ['messaging/registration-token-not-registered', 'messaging/invalid-argument'].includes(code) ? [tokens[i]] : [];
  });
  if (bad.length) await db.run(`DELETE FROM fcm_tokens WHERE token IN (${bad.map(() => '?').join(',')})`, bad);
  return { skipped: false, successCount: resp.successCount };
}

export async function notifyUser(userId, { title, body, data = {} }) {
  const messaging = await initAdmin();
  if (!messaging) return { skipped: true, provider: 'none' };
  if (!userId) return { skipped: true };
  const { db } = await dbPromise;
  const rows = await db.all('SELECT token FROM fcm_tokens WHERE userId = ?', [userId]);
  const tokens = rows.map(row => row.token);
  if (!tokens.length) return { skipped: true };
  const link = data.url || env.publicAppUrl;
  const resp = await messaging.sendEachForMulticast({
    notification: { title, body },
    data: { ...Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])), link },
    webpush: { fcmOptions: { link } },
    tokens,
  });
  return { skipped: false, successCount: resp.successCount };
}
