import jwt from 'jsonwebtoken';
import { dbPromise } from '../db/db.js';
import { requireSecret } from '../config/env.js';

export const protect = async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ message: 'Not authorized, no token' });
  try {
    const decoded = jwt.verify(token, requireSecret('JWT_SECRET'));
    const { db } = await dbPromise;
    req.user = await db.get(
      'SELECT id, name, email, role, employeeNumber, rst_roleId, entitlementGroupId, defaultCompanyId FROM users WHERE id = ?',
      [decoded.id]
    );
    if (!req.user) return res.status(401).json({ message: 'Not authorized, user not found' });
    next();
  } catch {
    res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

export const can = (...allowedRoles) => (req, res, next) => {
  if (req.user?.role && allowedRoles.includes(req.user.role)) return next();
  return res.status(403).json({ message: 'Forbidden: You do not have the required role for this action.' });
};
