import express from 'express';
import {
    getWeeklyMenu,
    updatePresence,
    getMealTypes,
    getMyReservationHistory,
    saveMealChoice,
    saveWeeklyReservations,
    getWeeklyReservations,
    getCompanyList,
    getMyBosses
} from '../controllers/restaurantController.js';
import { rst_protect, rst_can } from '../middleware/rst_authMiddleware.js';
import { protect } from '../middleware/authMiddleware.js';
import { addDelegate, getMyDelegates, removeDelegate, searchUsers } from '../controllers/delegationController.js';

const router = express.Router();

// All restaurant routes require a user to be logged in (rst_protect)
// and have the basic 'restaurant:employee' permission.
router.use(rst_protect, rst_can(['restaurant:manage_menu', 'restaurant:admin', 'restaurant:employee']));

// Routes for users
router.get('/menu', rst_protect, getWeeklyMenu);
router.get('/rst_companies', rst_protect, getCompanyList);
router.post('/presence', rst_protect, updatePresence);
router.get('/meal-types', rst_protect, getMealTypes);
router.post('/choice', rst_protect, saveMealChoice);
router.get('/my-history', rst_protect, getMyReservationHistory);
router.post('/reserve', rst_protect, saveWeeklyReservations); // This matches your frontend's API call
router.get('/reservations', rst_protect, getWeeklyReservations); // This matches your frontend's API call
router.get('/my-bosses', rst_protect, getMyBosses); // This matches your frontend's API call
router.get('/delegates', getMyDelegates);
router.post('/delegates', addDelegate);
router.delete('/delegates/:id', removeDelegate);
router.get('/users/search', searchUsers);
// We will add router.post('/choice', ...) here later

// --- Admin Routes ---
// We will add routes for managers here, e.g.:
// router.get('/reports/daily', rst_can('restaurant:view_reports'), getDailyReport);
// router.post('/menu', rst_can('restaurant:manage_menu'), createWeeklyMenu);

export default router;