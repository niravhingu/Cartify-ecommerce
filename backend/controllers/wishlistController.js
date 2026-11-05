const pool = require("../config/db");
const { toPositiveInt } = require("../utils/validators");
const { PRODUCT_SELECT, VISIBLE, mapProduct } = require("./productController");

const loadWishlist = async (userId) => {
    const result = await pool.query(
        `${PRODUCT_SELECT}
         JOIN wishlist_items w ON w.product_id = p.id
         WHERE w.user_id = $1 AND ${VISIBLE}
         ORDER BY w.created_at DESC`,
        [userId]
    );

    const items = result.rows.map(mapProduct);
    return { items, ids: items.map((item) => item.id) };
};

// GET /wishlist
const getWishlist = async (req, res, next) => {
    try {
        return res.json(await loadWishlist(req.user.userId));
    } catch (error) {
        next(error);
    }
};

// POST /wishlist  { productId }
const addToWishlist = async (req, res, next) => {
    try {
        const productId = toPositiveInt(req.body?.productId);
        if (!productId) return res.status(400).json({ message: "Invalid product" });

        const product = await pool.query("SELECT id FROM products WHERE id = $1", [productId]);
        if (product.rows.length === 0) return res.status(404).json({ message: "Product Not Found" });

        await pool.query(
            `INSERT INTO wishlist_items (user_id, product_id) VALUES ($1, $2)
             ON CONFLICT (user_id, product_id) DO NOTHING`,
            [req.user.userId, productId]
        );

        return res.status(201).json({ message: "Added to wishlist", ...(await loadWishlist(req.user.userId)) });
    } catch (error) {
        next(error);
    }
};

// DELETE /wishlist/:productId
const removeFromWishlist = async (req, res, next) => {
    try {
        const productId = toPositiveInt(req.params.productId);
        if (!productId) return res.status(400).json({ message: "Invalid product" });

        await pool.query("DELETE FROM wishlist_items WHERE user_id = $1 AND product_id = $2", [
            req.user.userId,
            productId,
        ]);

        return res.json({ message: "Removed from wishlist", ...(await loadWishlist(req.user.userId)) });
    } catch (error) {
        next(error);
    }
};

module.exports = { getWishlist, addToWishlist, removeFromWishlist };
