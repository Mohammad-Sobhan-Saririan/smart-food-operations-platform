import jwt from 'jsonwebtoken';
import { dbPromise } from '../db/db.js';
import { requireSecret } from '../config/env.js';

export const rst_protect = async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ message: 'Not authorized, no token' });
  try {
    const decoded = jwt.verify(token, requireSecret('JWT_SECRET'));
    const { db } = await dbPromise;
    const user = await db.get(`
      SELECT u.id, u.name, u.email, u.rst_roleId, u.entitlementGroupId, u.employeeNumber, u.role, u.defaultCompanyId
      FROM users u WHERE u.id = ?
    `, [decoded.id]);
    if (!user) return res.status(401).json({ message: 'User not found' });
    const permissions = user.rst_roleId ? await db.all(`
      SELECT p.name FROM rst_permissions p
      JOIN rst_role_permissions rp ON p.id = rp.permissionId
      WHERE rp.roleId = ?
    `, [user.rst_roleId]) : [];
    req.user = { ...user, permissions: permissions.map(p => p.name) };
    next();
  } catch {
    res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

export const rst_can = (permissions) => (req, res, next) => {
  const userPermissions = req.user?.permissions || [];
  const required = Array.isArray(permissions) ? permissions : [permissions];
  if (required.some(permission => userPermissions.includes(permission))) return next();
  return res.status(403).json({ message: 'Forbidden: You do not have the required permission.' });
};
