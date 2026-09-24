import crypto from 'crypto';
import { dbPromise } from '../db/db.js';
import { requireSecret } from '../config/env.js';

function secret() { return requireSecret('DELIVERY_LOCK_SECRET'); }

export function signFilters(filters) {
  const json = JSON.stringify(filters);
  const sig = crypto.createHmac('sha256', secret()).update(json).digest('hex');
  return Buffer.from(`${json}|${sig}`).toString('base64url');
}

export async function verifyLockCode(code) {
  try {
    const decoded = Buffer.from(code, 'base64url').toString('utf8');
    const separator = decoded.lastIndexOf('|');
    if (separator < 0) return { valid: false };
    const payload = decoded.slice(0, separator);
    const sig = decoded.slice(separator + 1);
    const expected = crypto.createHmac('sha256', secret()).update(payload).digest('hex');
    if (!sig || sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return { valid: false };
    const json = JSON.parse(payload);
    const { db } = await dbPromise;
    const row = await db.get('SELECT * FROM rst_delivery_locks WHERE token = ? AND deletedAt IS NULL AND isRevoked = 0', [code]);
    if (!row) return { valid: false };
    if (new Date(row.expiresAt) < new Date()) return { valid: false, reason: 'expired' };
    return { valid: true, payload: json, record: row };
  } catch {
    return { valid: false };
  }
}
