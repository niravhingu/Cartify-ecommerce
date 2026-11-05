const express = require("express");

const {
    getAllOrders,
    getOrderById,
    updateOrderStatus,
    deleteOrder,
} = require("../../controllers/admin/orderController");

const router = express.Router();

// :orderGroupId is the checkout id (e.g. ORD-1760000000000-AB12CD)
router.get("/", getAllOrders);
router.get("/:orderGroupId", getOrderById);
router.patch("/:orderGroupId/status", updateOrderStatus);
router.delete("/:orderGroupId", deleteOrder);

module.exports = router;
