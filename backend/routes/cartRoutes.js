const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");
const {
    getCart,
    addToCart,
    updateCartQuantity,
    deleteCartItem,
    clearCart,
} = require("../controllers/cartController");

const router = express.Router();

// Every cart route belongs to the logged-in user (taken from the JWT cookie,
// never from the URL/body — the old /cart/:userId allowed reading anyone's cart).
router.use(authMiddleware);

router.get("/", getCart);
router.post("/", addToCart);
router.put("/", updateCartQuantity);
router.delete("/", clearCart);
router.delete("/:productId", deleteCartItem);

module.exports = router;
