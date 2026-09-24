import express from 'express';
import { eventsHandler } from '../controllers/eventsController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// A protected route for logged-in users to listen for events
router.get('/', protect, eventsHandler);

export default router;