import express from 'express';
// Add the new controller functions
import { runReportQuery, saveReport, getChartConfigForData, refineChart, deleteReport, getSavedReports } from '../controllers/reportingController.js';
import { protect, can } from '../middleware/authMiddleware.js';


const router = express.Router();

// Existing route
router.post('/run', protect, can('admin', 'HR'), runReportQuery);
router.post('/generate-chart', protect, can('admin', 'HR'), getChartConfigForData); // New
router.post('/refine-chart', protect, can('admin', 'HR'), refineChart); // New


router.post('/save', protect, can('admin'), saveReport);
router.get('/saved', protect, can('admin', 'HR'), getSavedReports);
router.delete('/:id', protect, can('admin'), deleteReport);


export default router;