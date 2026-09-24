import express from 'express';
import { getAllFloors, createFloor, deleteFloor, updateFloor } from '../controllers/floorController.js';
import { protect, can } from '../middleware/authMiddleware.js';

const router = express.Router();
router.get('/', getAllFloors); // Public, so users can see floors during checkout
router.post('/', protect, can('barista', 'admin', "HR"), createFloor);
router.delete('/:id', protect, can('barista', 'admin', "HR"), deleteFloor);
router.put('/:id', protect, can('barista', 'admin', "HR"), updateFloor);

export default router;