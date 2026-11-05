const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");
const {
    placeOrder,
    getUserOrders,
    getOrderByGroupId,
    cancelOrder,
} = require("../controllers/orderController");

const router = express.Router();

router.use(authMiddleware);

router.post("/", placeOrder);
router.get("/", getUserOrders);
router.get("/my-orders", getUserOrders);          // fixed path before the dynamic one
router.get("/:orderGroupId", getOrderByGroupId);
router.patch("/:orderGroupId/cancel", cancelOrder);

module.exports = router;
