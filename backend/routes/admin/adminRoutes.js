const express = require("express");

const authMiddleware = require("../../middleware/authMiddleware");
const adminMiddleware = require("../../middleware/adminMiddleware");

const { getDashboardStats } = require("../../controllers/admin/dashboardController");

const categoryRoutes = require("./createCategory");
const productRoutes = require("./productRoutes");
const orderRoutes = require("./orderRoutes");
const userRoutes = require("./userRoutes");
const analyticsRoutes = require("./analyticsRoutes");
const paymentRoutes = require("./paymentRoutes");
const subcategoryRoutes = require("./subcategoryRoutes");

const router = express.Router();

// Everything under /admin needs a valid login AND the admin role
// (the role is re-checked in the database on every request).
router.use(authMiddleware);
router.use(adminMiddleware);

router.get("/dashboard", getDashboardStats);

router.use("/products", productRoutes);
router.use("/orders", orderRoutes);
router.use("/users", userRoutes);

// GET /admin/categories            -> all categories
// GET /admin/categories?active=true -> only active (product form)
// (The old, separate "active only" router was mounted first and hid this one.)
router.use("/categories", categoryRoutes);
router.use("/subcategories", subcategoryRoutes);

router.use("/analytics", analyticsRoutes);
router.use("/payments", paymentRoutes);

module.exports = router;
