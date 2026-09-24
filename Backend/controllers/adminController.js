import { dbPromise } from '../db/db.js'; // Import dbPromise
import { sendEventToUser } from '../services/sseService.js';
import bcrypt from 'bcryptjs';
import { notifyUser } from '../services/notificationService.js';


export const getAllUsers = async (req, res) => {
    const { search = '' } = req.query; // Get search term from query params
    try {
        const { db } = await dbPromise;

        let sql = 'SELECT id, name, email, role, position, creditBalance, creditLimit ,employeeNumber ,defaultFloorId ,isAdUser,entitlementGroupId,rst_roleId FROM users';
        const params = [];

        if (search) {
            sql += ' WHERE name LIKE ? OR employeeNumber LIKE ?';
            params.push(`%${search}%`, `%${search}%`);
        }

        const users = await db.all(sql, params);
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'خطای سرور', error: error.message });
    }
};

export const updateUser = async (req, res) => {
    const { id } = req.params;
    let { name, email, role, position, creditLimit, creditBalance, employeeNumber, entitlementGroupId, rst_roleId, isAdUser } = req.body;

    try {
        const { db } = await dbPromise;

        // Check if the employeeNumber already exists for another user
        const existingUser = await db.get(
            'SELECT id FROM users WHERE employeeNumber = ? AND id != ?',
            [employeeNumber, id]
        );

        if (existingUser) {
            return res.status(400).json({ message: 'این شماره کارمندی قبلا ثبت شده است.' });
        }

        if (creditLimit < creditBalance) {
            creditBalance = creditLimit; // Ensure creditBalance does not exceed creditLimit
        }

        // Proceed with the update if no conflict is found
        await db.run(
            `UPDATE users SET 
                name = ?, email = ?, role = ?, position = ?, creditLimit = ?, creditBalance = ?, employeeNumber = ?
             WHERE id = ?`,
            [name, email, role, position, creditLimit, creditBalance, employeeNumber, id]
        );

        res.status(200).json({ message: 'کاربر با موفقیت به‌روزرسانی شد.' });
    } catch (error) {
        res.status(500).json({ message: 'خطای سرور:', error: error.message });
    }
};

export const getAllOrders = async (req, res) => {
    const {
        search = '', status = '', page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc'
    } = req.query;

    // --- NEW: Whitelist and mapping for sorting ---
    const columnMap = {
        id: 'o.id',
        userName: 'u.name',
        createdAt: 'o.createdAt',
        totalAmount: 'o.totalAmount',
        status: 'o.status'
    };
    const allowedSortBy = Object.keys(columnMap);

    // Check if the requested sortBy key is in our map, otherwise default to createdAt
    const safeSortBy = allowedSortBy.includes(sortBy) ? columnMap[sortBy] : 'o.createdAt';
    const safeSortOrder = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    // ---

    try {
        const { db } = await dbPromise;
        const offset = (page - 1) * limit;

        // The params and whereClauses logic remains the same
        const params = [];
        const whereClauses = [];
        let countSql = 'SELECT COUNT(o.id) as count FROM orders o LEFT JOIN users u ON o.userId = u.id';

        if (search) {
            whereClauses.push(`(u.name LIKE ? OR o.id LIKE ?)`);
            params.push(`%${search}%`, `%${search}%`);
        }
        if (status && status !== 'All') {
            whereClauses.push(`o.status = ?`);
            params.push(status);
        }
        if (whereClauses.length > 0) {
            countSql += ' WHERE ' + whereClauses.join(' AND ');
        }

        const totalResult = await db.get(countSql, params);
        const totalOrders = totalResult.count;
        const totalPages = Math.ceil(totalOrders / limit);

        // The data fetching query also remains the same...
        let dataSql = `
        SELECT o.id, u.name as userName, o.createdAt, o.totalAmount, o.status
        FROM orders o
        LEFT JOIN users u ON o.userId = u.id
      `;
        if (whereClauses.length > 0) {
            dataSql += ' WHERE ' + whereClauses.join(' AND ');
        }
        // ...but now this ORDER BY clause uses the real, mapped column name
        dataSql += ` ORDER BY ${safeSortBy} ${safeSortOrder} LIMIT ? OFFSET ?`;
        // We create a new params array for this query because the original one was used for counting
        const dataParams = [...params, limit, offset];

        const orders = await db.all(dataSql, dataParams);

        res.json({
            orders,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalOrders
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'خطای سرور:', error: error.message });
    }
};

export const updateOrderStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['Pending', 'Completed', 'Cancelled'].includes(status)) {
        return res.status(400).json({ message: 'وضعیت نامعتبر است. لطفا یکی از وضعیت‌های معتبر را انتخاب کنید.' });
    }

    const { db } = await dbPromise;

    try {
        await db.exec('BEGIN TRANSACTION');

        const order = await db.get('SELECT userId, items, status as currentStatus FROM orders WHERE id = ?', [id]);

        if (!order) {
            await db.exec('ROLLBACK');
            return res.status(404).json({ message: 'سفارش یافت نشد.' });
        }

        // اگر از Pending به Cancelled تغییر کرد → بازگرداندن موجودی
        if (order.currentStatus === 'Pending' && status === 'Cancelled') {
            const items = JSON.parse(order.items);
            for (const item of items) {
                await db.run('UPDATE products SET stock = stock + ? WHERE id = ?', [item.quantity, item.id]);
            }
            console.log(`Restocked items for cancelled order ${id}`);
        }

        // به‌روزرسانی وضعیت سفارش
        await db.run('UPDATE orders SET status = ? WHERE id = ?', [status, id]);

        await db.exec('COMMIT');

        // 🔔 Push Notification برای مشتری وقتی سفارش آماده شد
        if (status === 'Completed' && order.userId) {
            try {
                await notifyUser(order.userId, {
                    title: 'سفارش شما آماده است ☕️',
                    body: `سفارش شماره ${id} آماده تحویل است.`,
                    data: { url: `/orders/${id}` }
                });
                console.log(`Sent push notification to user ${order.userId} for completed order ${id}`);
            } catch (e) {
                console.error('Error sending FCM notification:', e);
            }
        }

        // نوتیف real-time (SSE) که از قبل داشتی
        if (order.userId) {
            sendEventToUser(order.userId, { type: 'ORDER_UPDATE', orderId: id, status });
        }

        res.status(200).json({ message: 'وضعیت سفارش با موفقیت به‌روزرسانی شد.', orderId: id, newStatus: status });

    } catch (error) {
        await db.exec('ROLLBACK');
        res.status(500).json({ message: 'خطای سرور هنگام به‌روزرسانی وضعیت سفارش:', error: error.message });
    }
};


export const bulkUpdateCredits = async (req, res) => {
    const { amount, operation, filter } = req.body;

    // Validate input
    if (!amount || !operation || !['set', 'add'].includes(operation)) {
        return res.status(400).json({ message: 'لطفا مقدار و عملیات معتبر را وارد کنید.' });
    }

    const numericAmount = parseInt(amount, 10);
    if (isNaN(numericAmount)) {
        return res.status(400).json({ message: 'میزان اعتبار باید یک مقدار معتبر باشد.' });
    }

    try {
        const { db } = await dbPromise;
        let sql;
        const params = [numericAmount];

        // Build the base of the SQL query based on the operation
        if (operation === 'set') {
            sql = 'UPDATE users SET creditBalance = ?';
        } else { // operation === 'add'
            sql = 'UPDATE users SET creditBalance = creditBalance + ?';
        }

        // Add a WHERE clause if a filter is provided
        if (filter && filter.position) {
            sql += ' WHERE position = ?';
            params.push(filter.position);
        }

        // Execute the dynamic query
        const result = await db.run(sql, params);

        res.status(200).json({ message: `با موفقیت ${result.changes} کاربر به‌روزرسانی شد.` });

    } catch (error) {
        res.status(500).json({ message: 'خطای سرور:', error: error.message });
    }
};
export const createUser = async (req, res) => {
    // Admin can set all these fields
    const { name, email, password, employeeNumber, role, position, creditLimit, entitlementGroupId, rst_roleId, isAdUser } = req.body;

    if (!name || !email || !password || !employeeNumber || !role) {
        return res.status(401).json({ message: 'لطفا همه فیلدهای مورد نیاز را پر کنید.' });
    }

    try {
        const { db, nanoid } = await dbPromise;

        const existingUser = await db.get('SELECT * FROM users WHERE email = ? OR employeeNumber = ?', [email, employeeNumber]);
        if (existingUser) {
            return res.status(400).json({ message: 'کاربری با این ایمیل یا شماره کارمندی وجود دارد.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = {
            id: nanoid(),
            name, email, password: hashedPassword, employeeNumber, role, position,
            creditLimit: creditLimit || 1000,
            creditBalance: creditLimit || 1000,
        };

        await db.run(
            'INSERT INTO users (id, name, email, password, employeeNumber, role, position, creditLimit, creditBalance) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [newUser.id, newUser.name, newUser.email, newUser.password, newUser.employeeNumber, newUser.role, newUser.position, newUser.creditLimit, newUser.creditBalance]
        );

        res.status(201).json({ message: 'کاربر با موفقیت ایجاد شد.', userId: newUser.id });

    } catch (error) {
        res.status(500).json({ message: 'خطای سرور:', error: error.message });
    }
};

export const getCreditSystemStatus = async (req, res) => {
    try {
        const { db } = await dbPromise;
        const config = await db.get("SELECT isEnabled FROM configs WHERE feature = 'creditSystem'");
        if (!config) {
            return res.status(404).json({ message: 'سیستم اعتبار یافت نشد.' });
        }
        res.status(200).json({ isEnabled: config.isEnabled });
    } catch (error) {
        res.status(500).json({ message: 'خطای سرور:', error: error.message });
    }
};

export const changeCreditSystemStatus = async (req, res) => {
    const { isEnabled } = req.body;

    if (typeof isEnabled !== 'boolean') {
        return res.status(400).json({ message: 'لطفا وضعیت اعتبار را به صورت صحیح وارد کنید.' });
    }

    try {
        const { db } = await dbPromise;

        await db.run(
            `UPDATE configs SET isEnabled = ? WHERE feature = 'creditSystem'`,
            [isEnabled ? 1 : 0]
        );

        res.status(200).json({ message: `سیستم اعتبار ${isEnabled ? 'فعال' : 'غیرفعال'} شد.` });

    } catch (error) {
        res.status(500).json({ message: 'خطای سرور:', error: error.message });
    }
}