import { dbPromise } from '../db/db.js';

export const getDashboardOrders = async (req, res) => {
    // 1. Get the optional search term from the URL query
    const { search = '' } = req.query;

    try {
        const { db } = await dbPromise;

        let sql = `
        SELECT 
          o.id, o.items, o.status, o.createdAt,o.description, u.name as userName, f.name as deliveryFloorName
        FROM orders o
        LEFT JOIN users u ON o.userId = u.id
        LEFT JOIN floors f ON o.deliveryFloorId = f.id
      `;
        const params = [];

        // 2. If there is a search term, add a WHERE clause to filter the results
        if (search) {
            sql += ' WHERE (u.name LIKE ? OR o.id LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        // 3. IMPORTANT: Change sorting to ASC to show OLDEST orders first
        sql += ' ORDER BY o.createdAt ASC';

        const orders = await db.all(sql, params);

        res.json({ orders });

    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

export const getPastOrders = async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    try {
        const { db } = await dbPromise;

        // Get total count of past orders
        const totalResult = await db.get("SELECT COUNT(*) as count FROM orders WHERE status != 'Pending'");
        const totalOrders = totalResult.count;
        const totalPages = Math.ceil(totalOrders / limit);

        // Get the paginated orders
        const orders = await db.all(`
            SELECT o.id, o.items, o.status, o.createdAt,o.description , u.name as userName, f.name as deliveryFloorName
            FROM orders o 
            LEFT JOIN users u ON o.userId = u.id
            LEFT JOIN floors f ON o.deliveryFloorId = f.id
            WHERE o.status != 'Pending'
            ORDER BY o.createdAt DESC
            LIMIT ? OFFSET ?
        `, [limit, offset]);

        res.json({ orders, pagination: { currentPage: parseInt(page), totalPages } });

    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};