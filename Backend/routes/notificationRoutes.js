import express from 'express';
import { subscribe, unsubscribe } from '../controllers/notificationController.js';
import { protect, can } from '../middleware/authMiddleware.js';

const router = express.Router();
router.post('/subscribe', protect, subscribe);
router.post('/unsubscribe', protect, unsubscribe);

export default router;
