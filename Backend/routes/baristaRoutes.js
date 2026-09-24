import express from 'express';
import { protect, can } from '../middleware/authMiddleware.js';
import { getDashboardOrders, getPastOrders } from '../controllers/baristaController.js';

const router = express.Router();

// This route is protected by both 'protect' and 'barista' middleware
// It ensures only logged-in baristas or admins can access it.
router.get('/orders', protect, can('barista', 'admin'), getDashboardOrders);

router.get('/history', protect, can('barista', 'admin'), getPastOrders);

export default router;