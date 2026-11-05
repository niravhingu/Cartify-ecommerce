const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");
const { getWishlist, addToWishlist, removeFromWishlist } = require("../controllers/wishlistController");

const router = express.Router();

router.use(authMiddleware);

router.get("/", getWishlist);
router.post("/", addToWishlist);
router.delete("/:productId", removeFromWishlist);

module.exports = router;
