import { dbPromise } from '../db/db.js';
import bcrypt from 'bcryptjs'; // Make sure bcryptjs is imported

export const updateUserProfile = async (req, res) => {
    const userId = req.user.id;

    // 1. Destructure all the fields we want the user to be able to change
    const { name, phone, country, city, age, position, defaultFloorId } = req.body;

    try {
        const { db } = await dbPromise;

        // 2. Update the SQL query to include all the new fields
        await db.run(
            `UPDATE users SET name = ?, phone = ?, country = ?, city = ?, age = ?, position = ?, defaultFloorId = ?
         WHERE id = ?`,
            [name, phone, country, city, age, position, defaultFloorId, userId]
        );

        // 3. Fetch the complete, updated profile to send back
        const updatedUser = await db.get(
            'SELECT id, name, email, role, phone, country, city, age, position, creditBalance,defaultFloorId FROM users WHERE id = ?',
            [userId]
        );

        res.status(200).json({ message: 'Profile updated successfully', user: updatedUser });

    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
export const changeUserPassword = async (req, res) => {
    const userId = req.user.id;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
        return res.status(400).json({ message: 'Please provide both old and new passwords.' });
    }

    try {
        const { db } = await dbPromise;

        // 1. Fetch the user's current hashed password from the DB
        const user = await db.get('SELECT password FROM users WHERE id = ?', [userId]);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // 2. Compare the provided old password with the stored hash
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Incorrect current password.' });
        }

        // 3. If it matches, hash the new password
        const salt = await bcrypt.genSalt(10);
        const hashedNewPassword = await bcrypt.hash(newPassword, salt);

        // 4. Update the database with the new hashed password
        await db.run('UPDATE users SET password = ? WHERE id = ?', [hashedNewPassword, userId]);

        res.status(200).json({ message: 'Password changed successfully.' });

    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
export const getUserFavorites = async (req, res) => {
    const userId = req.user.id;
    const TOP_N = 3; // Show the top 3 items

    // --- Define our "Gain Parameters" or weights ---
    const POINTS_PER_ORDER = 4; // The bonus for appearing in an order
    const POINTS_PER_UNIT = 1;   // The bonus for each unit of quantity

    try {
        const { db } = await dbPromise;

        const orders = await db.all('SELECT items FROM orders WHERE userId = ?', [userId]);
        if (orders.length === 0) {
            return res.json([]);
        }

        // --- NEW SCORING LOGIC ---
        const productScores = new Map();

        for (const order of orders) {
            const items = JSON.parse(order.items);
            // Get a list of unique product IDs for this order to apply the frequency bonus only once per order
            const uniqueProductIdsInOrder = [...new Set(items.map(item => item.id))];

            // Add the frequency bonus for each unique product in this order
            for (const productId of uniqueProductIdsInOrder) {
                const currentScore = productScores.get(productId) || 0;
                productScores.set(productId, currentScore + POINTS_PER_ORDER);
            }

            // Add the quantity bonus for every item
            for (const item of items) {
                const currentScore = productScores.get(item.id) || 0;
                productScores.set(item.id, currentScore + (item.quantity * POINTS_PER_UNIT));
            }
        }

        // The rest of the logic remains the same: sort by the new scores and fetch the products
        const sortedProducts = [...productScores.entries()].sort((a, b) => b[1] - a[1]);
        const topProductIds = sortedProducts.slice(0, TOP_N).map(p => p[0]);

        if (topProductIds.length === 0) {
            return res.json([]);
        }

        const placeholders = topProductIds.map(() => '?').join(',');
        const topProducts = await db.all(`SELECT * FROM products WHERE id IN (${placeholders})`, topProductIds);
        const orderedTopProducts = topProductIds.map(id => topProducts.find(p => p.id === id));

        res.status(200).json(orderedTopProducts);

    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};