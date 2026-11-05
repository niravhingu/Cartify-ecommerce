const pool = require("../config/db");
const { calculatePricing } = require("../utils/pricing");
const { toPositiveInt } = require("../utils/validators");

const MAX_LINE_QUANTITY = 99;

// ---------------------------------------------------------------------
// Builds the cart response (items + server-calculated summary).
// `db` can be the pool or a transaction client.
// ---------------------------------------------------------------------
async function buildCart(db, userId) {
    // keep stored quantities valid if stock dropped since they were added
    await db.query(
        `UPDATE cart_items ci
            SET quantity = p.stock, updated_at = NOW()
           FROM products p
          WHERE p.id = ci.product_id
            AND ci.user_id = $1
            AND p.stock > 0
            AND ci.quantity > p.stock`,
        [userId]
    );

    const result = await db.query(
        `SELECT ci.product_id, ci.quantity,
                p.product_name, p.price, p.stock, p.image, p.description,
                c.name AS category_name, c.slug AS category_slug
           FROM cart_items ci
           JOIN products p ON p.id = ci.product_id
           LEFT JOIN categories c ON c.id = p.category_id
          WHERE ci.user_id = $1
          ORDER BY ci.created_at ASC`,
        [userId]
    );

    const items = result.rows.map((row) => {
        const price = Number(row.price);
        const stock = Number(row.stock);
        const quantity = Number(row.quantity);
        const available = stock > 0;

        return {
            id: row.product_id,            // frontend uses `id` everywhere
            product_id: row.product_id,
            product_name: row.product_name,
            description: row.description,
            image: row.image,
            category_name: row.category_name,
            category_slug: row.category_slug,
            price,
            stock,
            quantity,
            available,
            line_total: available ? Math.round(price * quantity * 100) / 100 : 0,
        };
    });

    const payable = items.filter((item) => item.available);

    return {
        items,
        summary: {
            ...calculatePricing(payable),
            itemCount: items.length,
            totalQuantity: payable.reduce((sum, item) => sum + item.quantity, 0),
            hasUnavailable: items.length !== payable.length,
        },
    };
}

// GET /cart
const getCart = async (req, res, next) => {
    try {
        return res.status(200).json(await buildCart(pool, req.user.userId));
    } catch (error) {
        next(error);
    }
};

// POST /cart   { productId, quantity }   -> adds to existing quantity
const addToCart = async (req, res, next) => {
    try {
        const productId = toPositiveInt(req.body?.productId);
        const quantity = toPositiveInt(req.body?.quantity ?? 1);

        if (!productId || !quantity || quantity > MAX_LINE_QUANTITY) {
            return res.status(400).json({ message: "Invalid product or quantity" });
        }

        // only products that are visible in the shop (active category) can be bought
        const product = await pool.query(
            `SELECT p.id, p.stock
               FROM products p
               LEFT JOIN categories c ON c.id = p.category_id
              WHERE p.id = $1 AND (c.id IS NULL OR c.is_active = true)`,
            [productId]
        );

        if (product.rows.length === 0) {
            return res.status(404).json({ message: "Product Not Found" });
        }

        const stock = Number(product.rows[0].stock);
        if (stock <= 0) {
            return res.status(409).json({ message: "This product is out of stock" });
        }

        const limit = Math.min(stock, MAX_LINE_QUANTITY);

        const upsert = await pool.query(
            `INSERT INTO cart_items (user_id, product_id, quantity)
             VALUES ($1, $2, LEAST($3::int, $4::int))
             ON CONFLICT (user_id, product_id)
             DO UPDATE SET quantity = LEAST(cart_items.quantity + EXCLUDED.quantity, $4::int),
                           updated_at = NOW()
             RETURNING quantity`,
            [req.user.userId, productId, quantity, limit]
        );

        return res.status(200).json({
            message: "Product added to cart",
            ...(await buildCart(pool, req.user.userId)),
            // true when the user already holds every unit we have
            atLimit: upsert.rows[0].quantity >= limit,
        });
    } catch (error) {
        next(error);
    }
};

// PUT /cart   { productId, quantity }   -> sets an exact quantity (0 removes)
const updateCartQuantity = async (req, res, next) => {
    try {
        const productId = toPositiveInt(req.body?.productId);
        const quantity = Number(req.body?.quantity);

        if (!productId || !Number.isInteger(quantity) || quantity < 0 || quantity > MAX_LINE_QUANTITY) {
            return res.status(400).json({ message: "Invalid product or quantity" });
        }

        if (quantity === 0) {
            await pool.query("DELETE FROM cart_items WHERE user_id = $1 AND product_id = $2", [
                req.user.userId,
                productId,
            ]);
            return res.status(200).json({
                message: "Product removed from cart",
                ...(await buildCart(pool, req.user.userId)),
            });
        }

        const product = await pool.query("SELECT stock FROM products WHERE id = $1", [productId]);
        if (product.rows.length === 0) {
            return res.status(404).json({ message: "Product Not Found" });
        }

        const stock = Number(product.rows[0].stock);
        if (stock <= 0) {
            return res.status(409).json({ message: "This product is out of stock" });
        }

        const updated = await pool.query(
            `UPDATE cart_items
                SET quantity = LEAST($3::int, $4::int), updated_at = NOW()
              WHERE user_id = $1 AND product_id = $2
              RETURNING quantity`,
            [req.user.userId, productId, quantity, Math.min(stock, MAX_LINE_QUANTITY)]
        );

        if (updated.rows.length === 0) {
            return res.status(404).json({ message: "Cart item not found" });
        }

        return res.status(200).json({
            message: "Quantity updated",
            ...(await buildCart(pool, req.user.userId)),
            atLimit: updated.rows[0].quantity < quantity,
        });
    } catch (error) {
        next(error);
    }
};

// DELETE /cart/:productId
const deleteCartItem = async (req, res, next) => {
    try {
        const productId = toPositiveInt(req.params.productId);
        if (!productId) return res.status(400).json({ message: "Invalid product" });

        await pool.query("DELETE FROM cart_items WHERE user_id = $1 AND product_id = $2", [
            req.user.userId,
            productId,
        ]);

        return res.status(200).json({
            message: "Product removed from cart",
            ...(await buildCart(pool, req.user.userId)),
        });
    } catch (error) {
        next(error);
    }
};

// DELETE /cart
const clearCart = async (req, res, next) => {
    try {
        await pool.query("DELETE FROM cart_items WHERE user_id = $1", [req.user.userId]);
        return res.status(200).json({ message: "Cart cleared", ...(await buildCart(pool, req.user.userId)) });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    buildCart,
    getCart,
    addToCart,
    updateCartQuantity,
    deleteCartItem,
    clearCart,
};
