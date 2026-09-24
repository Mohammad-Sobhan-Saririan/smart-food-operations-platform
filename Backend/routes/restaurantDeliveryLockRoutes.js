// routes/restaurantDeliveryLockRoutes.js
import express from "express";
import { rst_protect, rst_can } from "../middleware/rst_authMiddleware.js";
import { signFilters } from "../utils/lockCode.js";

const router = express.Router();

/**
 * POST /api/admin/restaurant/delivery/locklink
 * body: { weekStart, day, companyId?, mealTypeId?, statusId?, ttlMinutes? }
 * returns: { lockCode, url }
 */
router.post(
    "/delivery/locklink",
    rst_protect,
    rst_can(["restaurant:admin", "restaurant:manage_menu"]), // یا یک permission مخصوص تولید لینک
    async (req, res) => {
        try {
            const { weekStart, day, companyId, mealTypeId, statusId, ttlMinutes = 30 } = req.body || {};
            if (!weekStart || typeof day !== "number") {
                return res.status(400).json({ message: "weekStart و day الزامی است." });
            }
            const expiresAt = Date.now() + Number(ttlMinutes) * 60_000;
            const payload = { weekStart, day, companyId, mealTypeId, statusId, expiresAt };
            const lockCode = signFilters(payload);
            const url = `/rst_manager/restaurant/delivery?lockCode=${lockCode}`;

            res.json({ lockCode, url, expiresAt });
        } catch (e) {
            res.status(500).json({ message: "خطا در ساخت لینک قفل" });
        }
    }
);

export default router;
