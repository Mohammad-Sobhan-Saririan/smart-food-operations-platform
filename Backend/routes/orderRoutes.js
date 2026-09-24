import express from 'express';
import { getUserOrders, createOrder, getOrderById, getOrderByClientRequest } from '../controllers/orderController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(protect);
router.get('/', getUserOrders);
router.post('/', createOrder);
router.get('/by-client-request/:clientRequestId', getOrderByClientRequest);
router.post('/by-client-request/:clientRequestId', getOrderByClientRequest); // backwards-compatible with the original client
router.get('/:id', getOrderById);
export default router;
