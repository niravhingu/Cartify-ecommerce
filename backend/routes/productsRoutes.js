const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");

const {
    getallproducts,
    getProductsById,
    getPublicCategories,
    getStoreStats,
    getProductReviews,
    saveProductReview,
    deleteMyReview,
    getLatestReviews,
} = require("../controllers/productController");

const router = express.Router();

// NOTE: fixed paths must be declared before "/:id"
router.get("/", getallproducts);
router.get("/categories", getPublicCategories);
router.get("/stats", getStoreStats);
router.get("/reviews/latest", getLatestReviews);

router.get("/:id", getProductsById);
router.get("/:id/reviews", getProductReviews);
router.post("/:id/reviews", authMiddleware, saveProductReview);
router.delete("/:id/reviews", authMiddleware, deleteMyReview);

module.exports = router;
