// routes/restaurantReportsRoutes.js
import express from "express";
import { rst_protect, rst_can } from "../middleware/rst_authMiddleware.js";
import {
    getAvailableWeekStarts,
    getWeeklyReports,
    getDailyBreakdown,   // ⬅️ اضافه شد
} from "../controllers/restaurantReportController.js";

const router = express.Router();

router.get(
    "/weekly",
    rst_protect,
    rst_can(["restaurant:view_reports", "restaurant:manage_menu", "restaurant:admin"]),
    getWeeklyReports
);

router.get(
    "/week_starts",
    rst_protect,
    rst_can(["restaurant:view_reports", "restaurant:manage_menu", "restaurant:admin"]),
    getAvailableWeekStarts
);

// NEW: گزارش روزانه‌ی تفکیکی شرکت/کاربر
router.get(
    "/daily_breakdown",
    rst_protect,
    rst_can(['restaurant:manage_menu', "restaurant:view_reports", "restaurant:admin"]),
    getDailyBreakdown
);

export default router;
