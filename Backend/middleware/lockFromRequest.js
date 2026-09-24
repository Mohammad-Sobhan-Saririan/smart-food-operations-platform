import { verifyLockCode } from '../utils/lockCode.js';

export async function extractLockFromRequest(req, _res, next) {
  try {
    const lockCode = req.query.lockCode || req.headers['x-lock-code'];
    if (!lockCode) req.deliveryLock = { enabled: false };
    else {
      const result = await verifyLockCode(String(lockCode));
      req.deliveryLock = result.valid
        ? { enabled: true, filters: result.payload }
        : { enabled: false, invalid: true, reason: result.reason };
    }
    next();
  } catch (error) {
    next(error);
  }
}
