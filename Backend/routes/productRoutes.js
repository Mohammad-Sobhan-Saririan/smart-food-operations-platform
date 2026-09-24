import express from 'express';
import {
    getAllProducts,
    getManageableProducts,
    createProduct,
    updateProduct,
    deleteProduct
} from '../controllers/productController.js';
import { protect, can } from '../middleware/authMiddleware.js';

const router = express.Router();

// --- Public Route ---
router.get('/', getAllProducts);

// --- Protected Barista/Admin Routes ---
router.get('/manage', protect, can('barista', 'admin'), getManageableProducts);
router.post('/', protect, can('barista', 'admin'), createProduct);
router.put('/:id', protect, can('barista', 'admin'), updateProduct);
router.delete('/:id', protect, can('barista', 'admin'), deleteProduct);

export default router;