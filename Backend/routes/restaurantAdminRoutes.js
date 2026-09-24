import express from 'express';
import { rst_protect, rst_can } from '../middleware/rst_authMiddleware.js';
import {
    getAllDishes, createDish, updateDish, deleteDish,
    getWeeklyMenuSettings, setWeeklyMenu, // Add new functions
    getMenuIds, getCompanies, createCompany, deleteCompany, getWeeks,
    getReservationsFiltered,
    updateReservationStatus,
    bulkUpdateReservationStatus,
    getMetaData, updateCompany
} from '../controllers/restaurantAdminController.js';
import { createDeliveryLock, listDeliveryLocks, revokeDeliveryLock } from '../controllers/deliveryLockController.js';
import { extractLockFromRequest } from '../middleware/lockFromRequest.js';
const router = express.Router();

// All these routes are protected and require the 'restaurant:manage_menu' permission
router.get('/dishes', rst_protect, rst_can(['restaurant:manage_menu', 'restaurant:admin']), getAllDishes);
router.post('/dishes', rst_protect, rst_can(['restaurant:manage_menu', 'restaurant:admin']), createDish);
router.put('/dishes/:id', rst_protect, rst_can(['restaurant:manage_menu', 'restaurant:admin']), updateDish);
router.delete('/dishes/:id', rst_protect, rst_can(['restaurant:manage_menu', 'restaurant:admin']), deleteDish);
router.get('/menu', rst_protect, rst_can(['restaurant:manage_menu', 'restaurant:admin']), getWeeklyMenuSettings);
router.post('/menu', rst_protect, rst_can(['restaurant:manage_menu', 'restaurant:admin']), setWeeklyMenu);
router.get('/menu_Ids', rst_protect, rst_can(['restaurant:manage_menu', 'restaurant:admin']), getMenuIds);
router.get("/weeks", rst_protect, rst_can(["restaurant:admin", "restaurant:manage_menu"]), getWeeks);

// Companies and Entitlements
router.get('/companies', rst_protect, rst_can(['restaurant:manage_menu', 'restaurant:manage_entitlements', 'restaurant:admin']), getCompanies);
router.post('/companies', rst_protect, rst_can(['restaurant:manage_menu', 'restaurant:manage_entitlements', 'restaurant:admin']), createCompany);
router.delete('/companies/:id', rst_protect, rst_can(['restaurant:manage_menu', 'restaurant:manage_entitlements', 'restaurant:admin']), deleteCompany);
router.put(
    "/companies/:id",
    rst_protect,
    rst_can(['restaurant:manage_menu', "restaurant:manage_entitlements", "restaurant:admin"]),
    updateCompany
);

// Reservations (لیست با فیلترهای هفتگی + وضعیت)
router.get(
    "/reservations",
    rst_protect,
    extractLockFromRequest,
    rst_can(["restaurant:view_reports", "restaurant:admin"]),
    getReservationsFiltered,
);

// Update single status
router.put(
    "/reservations/:id/status",
    rst_protect,
    rst_can(["restaurant:view_reports", "restaurant:admin"]),
    updateReservationStatus
);

// Bulk status update
router.put(
    "/reservations/bulk_status",
    rst_protect,
    rst_can(["restaurant:view_reports", "restaurant:admin"]),
    bulkUpdateReservationStatus
);

router.get("/meta", rst_protect, extractLockFromRequest, rst_can(["restaurant:manage_menu", "restaurant:view_reports", "restaurant:admin"]), async (req, res) => {
    try {
        const metaData = await getMetaData();
        res.json({
            mealTypes: metaData.mealTypes,
            statuses: metaData.statuses,
            companies: metaData.companies,
            lock: req.deliveryLock, // { enabled: false, invalid: true };
        });
    } catch (error) {
        console.error("Error fetching meta data:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});


router.post(
    "/delivery/locks",
    rst_protect,
    rst_can(["restaurant:admin", "restaurant:manage_menu"]),
    createDeliveryLock
);
router.get(
    "/delivery/locks",
    rst_protect,
    rst_can(["restaurant:admin", "restaurant:manage_menu"]),
    listDeliveryLocks
);
router.put(
    "/delivery/locks/:id/revoke",
    rst_protect,
    rst_can(["restaurant:admin", "restaurant:manage_menu"]),
    revokeDeliveryLock
);
// We will add routes for managing menus and entitlements here later
// e.g., router.post('/menu', rst_protect, rst_can('restaurant:manage_menu'), createWeeklyMenu);

export default router;