    const express = require("express");

const {
    getAllPayments,getPaymentById,getPaymentAnalytics
} = require("../../controllers/admin/paymentController");

const router = express.Router();

router.get("/", getAllPayments);

router.get("/analytics", getPaymentAnalytics);

router.get("/:id", getPaymentById);

module.exports = router;