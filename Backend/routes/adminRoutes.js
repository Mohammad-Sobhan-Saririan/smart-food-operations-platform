import express from 'express';
import { protect, can } from '../middleware/authMiddleware.js';
import { getAllUsers, updateUser, getAllOrders, updateOrderStatus, bulkUpdateCredits, createUser, changeCreditSystemStatus, getCreditSystemStatus } from '../controllers/adminController.js';
const router = express.Router();

// All routes in this file are protected and require admin access
router.get('/users', protect, can('admin'), getAllUsers);
router.put('/users/:id', protect, can('admin'), updateUser);

router.get('/orders', protect, can('admin'), getAllOrders);
router.put('/orders/:id/status', protect, can('barista', 'admin'), updateOrderStatus);

router.post('/credits/bulk-update', protect, can('admin', 'HR'), bulkUpdateCredits);
router.post('/credits/change-system-status', protect, can('admin'), changeCreditSystemStatus);
router.get('/credits/system-status', protect, can('admin', 'HR'), getCreditSystemStatus);

router.post('/users', protect, can('admin'), createUser);



export default router;