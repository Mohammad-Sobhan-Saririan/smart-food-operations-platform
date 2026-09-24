import { dbPromise } from '../db/db.js';

// GET /api/products (Public - for customer menu)
export const getAllProducts = async (req, res) => {
    const { db } = await dbPromise;
    // Only shows active products to customers
    const products = await db.all('SELECT * FROM products WHERE isDisabled = 0');
    res.json(products);
};


// --- ADMIN / BARISTA FUNCTIONS ---

// GET /api/products/manage (Protected - gets ALL products for management)
export const getManageableProducts = async (req, res) => {
    const { search = '' } = req.query; // Get search term from query
    try {
        const { db } = await dbPromise;
        let sql = 'SELECT * FROM products';
        const params = [];

        // If there is a search term, filter by name
        if (search) {
            sql += ' WHERE name LIKE ?';
            params.push(`%${search}%`);
        }

        sql += ' ORDER BY category, name';

        const products = await db.all(sql, params);
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// POST /api/products (Protected - create a new product)
export const createProduct = async (req, res) => {
    const { name, price, category, description, stock, imageUrl, isDisabled } = req.body;

    // Basic validation
    if (!name || price === undefined || !category || stock === undefined) {
        return res.status(400).json({ message: 'Missing required product fields.' });
    }

    try {
        const { db } = await dbPromise;

        // Get the last product ID and increment it for the new product
        const lastProduct = await db.get('SELECT id FROM products ORDER BY id DESC LIMIT 1');
        const newId = lastProduct ? lastProduct.id + 1 : 1;

        const newProduct = {
            id: newId,
            name,
            price,
            category,
            description,
            stock,
            imageUrl: imageUrl || null,
            isDisabled: !!isDisabled
        };

        await db.run(
            `INSERT INTO products (id, name, price, category, description, stock, imageUrl, isDisabled) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                newProduct.id,
                newProduct.name,
                newProduct.price,
                newProduct.category,
                newProduct.description,
                newProduct.stock,
                newProduct.imageUrl,
                newProduct.isDisabled ? 1 : 0
            ]
        );
        res.status(201).json({ message: 'محصول با موفقیت ایجاد شد', product: newProduct });

    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
// PUT /api/products/:id (Protected - update an existing product)
export const updateProduct = async (req, res) => {
    const { id } = req.params;
    const { name, price, category, description, stock, isDisabled } = req.body;
    const { db } = await dbPromise;
    await db.run(
        `UPDATE products SET name = ?, price = ?, category = ?, description = ?, stock = ?, isDisabled = ? WHERE id = ?`,
        [name, price, category, description, stock, isDisabled ? 1 : 0, id]
    );
    res.status(200).json({ message: 'Product updated successfully.' });
};

// DELETE /api/products/:id (Protected - disable a product)
export const deleteProduct = async (req, res) => {
    const { id } = req.params;
    const { db } = await dbPromise;
    // We set isDisabled to 1 instead of deleting to preserve history
    await db.run('UPDATE products SET isDisabled = 1 WHERE id = ?', [id]);
    res.status(200).json({ message: 'Product disabled successfully.' });
};