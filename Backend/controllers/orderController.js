import { dbPromise } from '../db/db.js';
import { nanoid } from 'nanoid';
import { notifyRoles } from '../services/notificationService.js';
import { env } from '../config/env.js';

const OPERATIONAL_ROLES = new Set(['admin', 'barista']);

export function canAccessOrder(user, order) {
  return Boolean(user && order && (order.userId === user.id || OPERATIONAL_ROLES.has(user.role)));
}

function serializeOrder(order) {
  return {
    id: order.id,
    userId: order.userId,
    items: order.items,
    totalAmount: order.totalAmount,
    status: order.status,
    createdAt: order.createdAt,
    description: order.description,
    deliveryFloorId: order.deliveryFloorId,
    clientRequestId: order.clientRequestId,
  };
}

export const getUserOrders = async (req, res) => {
  try {
    const { db } = await dbPromise;
    const orders = await db.all('SELECT * FROM orders WHERE userId = ? ORDER BY createdAt DESC', [req.user.id]);
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const createOrder = async (req, res) => {
  const { items, deliveryFloorId, description, clientRequestId } = req.body;
  if (!deliveryFloorId) return res.status(400).json({ message: 'Delivery location is required.' });
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ message: 'Order cannot be empty.' });
  if (!clientRequestId || typeof clientRequestId !== 'string' || clientRequestId.length > 128) {
    return res.status(400).json({ message: 'A valid clientRequestId is required.' });
  }

  const { db } = await dbPromise;
  try {
    const existing = await db.get('SELECT * FROM orders WHERE clientRequestId = ?', [clientRequestId]);
    if (existing) {
      if (!canAccessOrder(req.user, existing)) return res.status(409).json({ message: 'clientRequestId is already in use.' });
      return res.status(200).json({ message: 'Order already exists.', order: serializeOrder(existing), alreadyExisted: true });
    }

    const floor = await db.get('SELECT id FROM floors WHERE id = ?', [deliveryFloorId]);
    if (!floor) return res.status(400).json({ message: 'Invalid delivery location.' });

    const requested = new Map();
    for (const item of items) {
      const id = String(item?.id || '');
      const quantity = Number(item?.quantity);
      if (!id || !Number.isInteger(quantity) || quantity <= 0 || quantity > 50) {
        return res.status(400).json({ message: 'Each order item must have a valid product id and positive integer quantity.' });
      }
      requested.set(id, (requested.get(id) || 0) + quantity);
    }

    await db.exec('BEGIN IMMEDIATE TRANSACTION');
    const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!user) throw new Error('Authenticated user no longer exists.');

    const canonicalItems = [];
    let totalAmount = 0;
    for (const [productId, quantity] of requested.entries()) {
      const product = await db.get(
        'SELECT id, name, price, stock, maxOrderPerUser, imageUrl, isDisabled FROM products WHERE id = ?',
        [productId]
      );
      if (!product || product.isDisabled) {
        await db.exec('ROLLBACK');
        return res.status(400).json({ message: `Product ${productId} is unavailable.` });
      }
      if (quantity > product.maxOrderPerUser || quantity > product.stock) {
        await db.exec('ROLLBACK');
        return res.status(400).json({ message: `Requested quantity for ${product.name} is unavailable.` });
      }
      canonicalItems.push({ id: product.id, name: product.name, price: product.price, quantity, imageUrl: product.imageUrl || null });
      totalAmount += product.price * quantity;
    }

    const creditSystemConfig = await db.get("SELECT isEnabled FROM configs WHERE feature = 'creditSystem'");
    const isCreditSystemEnabled = Boolean(creditSystemConfig?.isEnabled);
    let newBalance = null;
    if (isCreditSystemEnabled) {
      if (user.creditBalance < totalAmount) {
        await db.exec('ROLLBACK');
        return res.status(400).json({ message: 'Insufficient credit balance.' });
      }
      newBalance = user.creditBalance - totalAmount;
      await db.run('UPDATE users SET creditBalance = ? WHERE id = ?', [newBalance, user.id]);
    }

    for (const item of canonicalItems) {
      const result = await db.run(
        'UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?',
        [item.quantity, item.id, item.quantity]
      );
      if (result.changes !== 1) throw new Error(`Stock changed concurrently for product ${item.id}.`);
    }

    const now = new Date();
    const datePrefix = now.toISOString().slice(0, 10).replaceAll('-', '');
    const newOrder = {
      id: `${datePrefix}-${nanoid(8)}`,
      userId: user.id,
      items: JSON.stringify(canonicalItems),
      totalAmount,
      status: 'Pending',
      createdAt: now.toISOString(),
      description: typeof description === 'string' && description.trim() ? description.trim().slice(0, 1000) : null,
      deliveryFloorId: Number(deliveryFloorId),
      clientRequestId,
    };

    try {
      await db.run(`
        INSERT INTO orders (id, userId, items, totalAmount, createdAt, status, description, deliveryFloorId, clientRequestId)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        newOrder.id, newOrder.userId, newOrder.items, newOrder.totalAmount, newOrder.createdAt,
        newOrder.status, newOrder.description, newOrder.deliveryFloorId, newOrder.clientRequestId,
      ]);
      await db.exec('COMMIT');
    } catch (error) {
      await db.exec('ROLLBACK');
      if (error?.code === 'SQLITE_CONSTRAINT' || String(error?.message).includes('UNIQUE')) {
        const conflicted = await db.get('SELECT * FROM orders WHERE clientRequestId = ?', [clientRequestId]);
        if (conflicted && canAccessOrder(req.user, conflicted)) {
          return res.status(200).json({ message: 'Order already exists.', order: serializeOrder(conflicted), alreadyExisted: true });
        }
      }
      throw error;
    }

    notifyRoles(['admin', 'barista'], {
      title: 'New cafe order',
      body: `Order #${newOrder.id}`,
      data: { orderId: newOrder.id, url: `${env.publicAppUrl}/barista` },
    }).catch(error => console.error('Notification error:', error.message));

    const payload = { message: 'Order created.', order: newOrder, alreadyExisted: false };
    if (newBalance !== null) payload.newCreditBalance = newBalance;
    return res.status(201).json(payload);
  } catch (error) {
    try { await db.exec('ROLLBACK'); } catch { /* no active transaction */ }
    console.error('Order transaction error:', error);
    return res.status(500).json({ message: 'Server error while creating order.' });
  }
};

export const getOrderByClientRequest = async (req, res) => {
  const { clientRequestId } = req.params;
  if (!clientRequestId) return res.status(400).json({ message: 'clientRequestId is required.' });
  try {
    const { db } = await dbPromise;
    const order = await db.get('SELECT * FROM orders WHERE clientRequestId = ?', [clientRequestId]);
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    if (!canAccessOrder(req.user, order)) return res.status(403).json({ message: 'Forbidden.' });
    return res.status(200).json({ order });
  } catch (error) {
    return res.status(500).json({ message: 'Server error.' });
  }
};

export const getOrderById = async (req, res) => {
  try {
    const { db } = await dbPromise;
    const order = await db.get(`
      SELECT o.*, u.name as userName FROM orders o
      LEFT JOIN users u ON o.userId = u.id WHERE o.id = ?
    `, [req.params.id]);
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    if (!canAccessOrder(req.user, order)) return res.status(403).json({ message: 'Forbidden.' });
    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
