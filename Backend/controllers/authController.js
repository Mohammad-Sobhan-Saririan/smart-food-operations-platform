import { dbPromise } from '../db/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticateUser, getUser, toLdapPrincipal } from '../services/ADServices.js';
import { env, requireSecret } from '../config/env.js';

const publicAdAttributes = (adInfo = {}) => ({
  displayName: adInfo.displayName || adInfo.cn || '',
  department: adInfo.department || '',
  title: adInfo.title || '',
});

export const createUserInternal = async ({
  name, email, password, employeeNumber, role = 'user', position = '', creditLimit = 1000,
  isAdUser = 0, adAttributes = {}, entitlementGroupId = null, rst_roleId = null,
}) => {
  const { db, nanoid } = await dbPromise;
  const existingUser = await db.get('SELECT * FROM users WHERE email = ? OR employeeNumber = ?', [email, employeeNumber]);
  if (existingUser) throw new Error('User already exists.');

  const hashedPassword = isAdUser ? '' : (password ? await bcrypt.hash(password, 12) : '');
  const user = {
    id: nanoid(), name, email, password: hashedPassword, employeeNumber, role, position,
    creditLimit, creditBalance: creditLimit, isAdUser: isAdUser ? 1 : 0,
    adAttributes: publicAdAttributes(adAttributes), entitlementGroupId, rst_roleId,
  };

  await db.run(`
    INSERT INTO users
      (id, name, email, password, employeeNumber, role, position, creditLimit, creditBalance, isAdUser, adAttributes, entitlementGroupId, rst_roleId)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    user.id, user.name, user.email, user.password, user.employeeNumber, user.role, user.position,
    user.creditLimit, user.creditBalance, user.isAdUser, JSON.stringify(user.adAttributes),
    user.entitlementGroupId, user.rst_roleId,
  ]);
  return user;
};

export const register = async (req, res) => {
  if (env.authMode !== 'local') return res.status(404).json({ message: 'Local registration is disabled.' });
  const { name, email, password, employeeNumber } = req.body;
  if (!name || !email || !password || !employeeNumber) {
    return res.status(400).json({ message: 'name, email, employeeNumber and password are required.' });
  }
  try {
    const user = await createUserInternal({ name, email, password, employeeNumber });
    res.status(201).json({ message: 'User registered successfully.', userId: user.id });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

async function loadPermissions(db, user) {
  if (!user.rst_roleId) return [];
  const rows = await db.all(`
    SELECT p.id FROM rst_permissions p
    JOIN rst_role_permissions rp ON p.id = rp.permissionId
    WHERE rp.roleId = ?
  `, [user.rst_roleId]);
  return rows.map(row => row.id);
}

async function localLogin(db, identifier, password) {
  const user = await db.get(
    'SELECT * FROM users WHERE employeeNumber = ? OR LOWER(email) = LOWER(?)',
    [identifier, identifier]
  );
  if (!user || user.isAdUser) return null;
  if (!(await bcrypt.compare(password, user.password))) return null;
  return user;
}

async function ldapLogin(db, username, password) {
  const principal = toLdapPrincipal(username);
  const authenticated = await authenticateUser(principal, password);
  if (!authenticated) return null;
  const adInfo = await getUser(username);
  if (!adInfo) return null;

  const employeeNumber = String(adInfo.employeeNumber || adInfo.sAMAccountName || username).toLowerCase();
  let user = await db.get('SELECT * FROM users WHERE LOWER(employeeNumber) = ?', [employeeNumber]);
  if (user) {
    await db.run(`
      UPDATE users SET name = ?, email = ?, isAdUser = 1, password = '', adAttributes = ? WHERE id = ?
    `, [
      adInfo.cn || user.name,
      adInfo.mail || user.email,
      JSON.stringify(publicAdAttributes(adInfo)),
      user.id,
    ]);
    user = await db.get('SELECT * FROM users WHERE id = ?', [user.id]);
  } else {
    user = await createUserInternal({
      name: adInfo.cn || username,
      email: adInfo.mail || `${employeeNumber}@example.invalid`,
      password: null,
      employeeNumber,
      role: 'user',
      isAdUser: 1,
      adAttributes: adInfo,
      entitlementGroupId: 1,
      rst_roleId: 4,
    });
  }
  return user;
}

export const login = async (req, res) => {
  const { employeeNumber, username, password, rememberMe } = req.body;
  const identifier = String(employeeNumber || username || '').trim();
  if (!identifier || !password) return res.status(400).json({ message: 'Username and password are required.' });

  try {
    const { db } = await dbPromise;
    const user = env.authMode === 'ldap'
      ? await ldapLogin(db, identifier, password)
      : await localLogin(db, identifier, password);

    if (!user) return res.status(401).json({ message: 'Invalid credentials.' });

    const maxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const token = jwt.sign({ id: user.id, role: user.role }, requireSecret('JWT_SECRET'), {
      expiresIn: rememberMe ? '30d' : '1d',
    });
    res.cookie('token', token, {
      httpOnly: true,
      secure: env.nodeEnv === 'production',
      sameSite: 'lax',
      maxAge,
    });

    const rst_permissionIds = await loadPermissions(db, user);
    res.status(200).json({
      message: 'Login successful.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        country: user.country || '',
        city: user.city || '',
        age: user.age || null,
        position: user.position || '',
        creditBalance: user.creditBalance,
        employeeNumber: user.employeeNumber,
        role: user.role,
        defaultFloorId: user.defaultFloorId,
        isAdUser: Boolean(user.isAdUser),
        entitlementGroupId: user.entitlementGroupId || null,
        rst_roleId: user.rst_roleId || null,
        rst_permissionIds,
      },
    });
  } catch (error) {
    console.error('Login error:', error.message);
    const status = env.authMode === 'ldap' ? 502 : 500;
    res.status(status).json({ message: env.authMode === 'ldap' ? 'LDAP authentication service is unavailable.' : 'Server error.' });
  }
};

export const getProfile = async (req, res) => {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ message: 'Authentication required.' });
  try {
    const decoded = jwt.verify(token, requireSecret('JWT_SECRET'));
    const { db } = await dbPromise;
    const user = await db.get(`
      SELECT u.id, u.name, u.email, u.role, u.phone, u.country, u.city, u.age, u.position,
             u.creditBalance, u.defaultFloorId, u.employeeNumber, u.entitlementGroupId, u.rst_roleId,
             f.name as defaultFloorName
      FROM users u LEFT JOIN floors f ON u.defaultFloorId = f.id WHERE u.id = ?
    `, [decoded.id]);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    user.rst_permissionIds = await loadPermissions(db, user);
    res.status(200).json({ user });
  } catch {
    res.status(401).json({ message: 'Invalid token.' });
  }
};

export const logout = (_req, res) => {
  res.cookie('token', '', { httpOnly: true, expires: new Date(0), sameSite: 'lax' });
  res.status(200).json({ message: 'Logged out.' });
};
