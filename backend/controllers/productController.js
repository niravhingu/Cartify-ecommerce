const pool = require("../config/db");
const { escapeLike, toPositiveInt, cleanText } = require("../utils/validators");

// ---------------------------------------------------------------------
// Shared SELECT: one product row with category, rating and sales data.
// Only products whose category / subcategory are active are public.
// ---------------------------------------------------------------------
const PRODUCT_SELECT = `
    SELECT
        p.id,
        p.product_name,
        p.description,
        p.price,
        p.stock,
        p.image,
        p.created_at,
        p.category_id,
        c.name  AS category_name,
        c.slug  AS category_slug,
        p.subcategory_id,
        s.name  AS subcategory_name,
        s.slug  AS subcategory_slug,
        r.avg_rating                  AS rating,
        COALESCE(r.review_count, 0)   AS review_count,
        COALESCE(t.units, 0)          AS units_sold
    FROM products p
    LEFT JOIN categories c    ON c.id = p.category_id
    LEFT JOIN subcategories s ON s.id = p.subcategory_id
    LEFT JOIN (
        SELECT product_id,
               ROUND(AVG(rating)::numeric, 1) AS avg_rating,
               COUNT(*)                       AS review_count
        FROM product_reviews
        GROUP BY product_id
    ) r ON r.product_id = p.id
    LEFT JOIN (
        SELECT p2.id AS product_id, SUM(o.quantity) AS units
        FROM orders o
        JOIN products p2
          ON o.product_id = p2.id
          OR (o.product_id IS NULL AND o.product_name = p2.product_name)
        WHERE o.status <> 'Cancelled'
          AND o.created_at > NOW() - INTERVAL '30 days'
        GROUP BY p2.id
    ) t ON t.product_id = p.id
`;

const VISIBLE = `(c.id IS NULL OR c.is_active = true) AND (s.id IS NULL OR s.is_active = true)`;

const SORTS = {
    newest: "p.created_at DESC, p.id DESC",
    trending: "COALESCE(t.units, 0) DESC, p.created_at DESC, p.id DESC",
    rating: "r.avg_rating DESC NULLS LAST, r.review_count DESC NULLS LAST, p.created_at DESC",
    price_asc: "p.price ASC, p.id DESC",
    price_desc: "p.price DESC, p.id DESC",
    name: "LOWER(p.product_name) ASC, p.id ASC",
};

// Older frontend names -> current names
const SORT_ALIASES = { featured: "newest", low: "price_asc", high: "price_desc", az: "name" };

const mapProduct = (row) => ({
    id: row.id,
    product_name: row.product_name,
    description: row.description,
    price: Number(row.price),
    stock: Number(row.stock),
    image: row.image,
    created_at: row.created_at,
    category_id: row.category_id,
    category_name: row.category_name,
    category_slug: row.category_slug,
    subcategory_id: row.subcategory_id,
    subcategory_name: row.subcategory_name,
    subcategory_slug: row.subcategory_slug,
    rating: row.rating === null || row.rating === undefined ? null : Number(row.rating),
    review_count: Number(row.review_count || 0),
    units_sold: Number(row.units_sold || 0),
});

const firstParam = (value) => (Array.isArray(value) ? value[0] : value);

// =====================================================================
// GET /products
//   ?q= &category= &subcategory= &sort= &minPrice= &maxPrice= &inStock=
//   &page= &limit=
// =====================================================================
const getallproducts = async (req, res, next) => {
    try {
        const q = cleanText(firstParam(req.query.q ?? req.query.search), 100);
        const category = cleanText(firstParam(req.query.category), 120).toLowerCase();
        const subcategory = cleanText(firstParam(req.query.subcategory), 120).toLowerCase();
        const sortKey = SORT_ALIASES[req.query.sort] || req.query.sort;
        const orderBy = SORTS[sortKey] || SORTS.newest;

        const page = toPositiveInt(req.query.page) || 1;
        const limit = Math.min(toPositiveInt(req.query.limit) || 12, 60);
        const offset = (page - 1) * limit;

        const values = [];
        const baseConds = [VISIBLE];
        const add = (value) => {
            values.push(value);
            return `$${values.length}`;
        };

        // each search word must appear in name / description / category / subcategory
        if (q) {
            q.split(" ")
                .filter(Boolean)
                .slice(0, 5)
                .forEach((word) => {
                    const ph = add(`%${escapeLike(word)}%`);
                    baseConds.push(`(
                        p.product_name ILIKE ${ph} ESCAPE '\\'
                        OR p.description ILIKE ${ph} ESCAPE '\\'
                        OR c.name ILIKE ${ph} ESCAPE '\\'
                        OR s.name ILIKE ${ph} ESCAPE '\\'
                    )`);
                });
        }

        if (category && category !== "all") {
            baseConds.push(/^\d+$/.test(category) ? `c.id = ${add(Number(category))}` : `c.slug = ${add(category)}`);
        }

        if (subcategory) {
            baseConds.push(/^\d+$/.test(subcategory) ? `s.id = ${add(Number(subcategory))}` : `s.slug = ${add(subcategory)}`);
        }

        if (String(req.query.inStock) === "true") {
            baseConds.push("p.stock > 0");
        }

        // price filters are kept apart so we can report the price range of the
        // result set *without* the slider applied.
        const priceConds = [];
        const minPrice = Number(req.query.minPrice);
        const maxPrice = Number(req.query.maxPrice);
        if (req.query.minPrice !== undefined && req.query.minPrice !== "" && Number.isFinite(minPrice) && minPrice >= 0) {
            priceConds.push(`p.price >= ${add(minPrice)}`);
        }
        if (req.query.maxPrice !== undefined && req.query.maxPrice !== "" && Number.isFinite(maxPrice) && maxPrice >= 0) {
            priceConds.push(`p.price <= ${add(maxPrice)}`);
        }

        const where = `WHERE ${[...baseConds, ...priceConds].join(" AND ")}`;
        const baseWhere = `WHERE ${baseConds.join(" AND ")}`;

        const FROM_ONLY = `
            FROM products p
            LEFT JOIN categories c    ON c.id = p.category_id
            LEFT JOIN subcategories s ON s.id = p.subcategory_id
        `;

        // values for the data query = filter values + limit + offset
        const limitPh = `$${values.length + 1}`;
        const offsetPh = `$${values.length + 2}`;

        const [rows, count, range] = await Promise.all([
            pool.query(`${PRODUCT_SELECT} ${where} ORDER BY ${orderBy} LIMIT ${limitPh} OFFSET ${offsetPh}`, [
                ...values,
                limit,
                offset,
            ]),
            pool.query(`SELECT COUNT(*)::int AS total ${FROM_ONLY} ${where}`, values),
            pool.query(
                `SELECT COALESCE(MIN(p.price), 0) AS min, COALESCE(MAX(p.price), 0) AS max ${FROM_ONLY} ${baseWhere}`,
                // base values only: the price placeholders are excluded from baseWhere
                values.slice(0, values.length - priceConds.length)
            ),
        ]);

        const total = count.rows[0].total;
        const totalPages = Math.max(Math.ceil(total / limit), 1);

        return res.json({
            products: rows.rows.map(mapProduct),
            total,
            page,
            limit,
            totalPages,
            hasMore: page < totalPages,
            priceRange: {
                min: Number(range.rows[0].min),
                max: Number(range.rows[0].max),
            },
        });
    } catch (error) {
        next(error);
    }
};

// =====================================================================
// GET /products/:id
// =====================================================================
const getProductsById = async (req, res, next) => {
    try {
        const id = toPositiveInt(req.params.id);

        if (!id) {
            return res.status(400).json({ message: "Invalid product ID" });
        }

        const result = await pool.query(`${PRODUCT_SELECT} WHERE p.id = $1 AND ${VISIBLE}`, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Product Not Found" });
        }

        return res.json(mapProduct(result.rows[0]));
    } catch (error) {
        next(error);
    }
};

// =====================================================================
// GET /products/categories  (active categories + subcategories + counts)
// =====================================================================
const getPublicCategories = async (req, res, next) => {
    try {
        const [cats, subs] = await Promise.all([
            pool.query(`
                SELECT c.id, c.name, c.slug, c.description,
                       COALESCE(c.image, (
                           SELECT p.image FROM products p
                           WHERE p.category_id = c.id AND p.image IS NOT NULL AND p.image <> ''
                           ORDER BY p.created_at DESC LIMIT 1
                       )) AS image,
                       COUNT(DISTINCT p.id)::int AS product_count
                FROM categories c
                LEFT JOIN products p ON p.category_id = c.id
                WHERE c.is_active = true
                GROUP BY c.id
                ORDER BY c.name ASC
            `),
            pool.query(`
                SELECT s.id, s.name, s.slug, s.category_id,
                       COUNT(p.id)::int AS product_count
                FROM subcategories s
                LEFT JOIN products p ON p.subcategory_id = s.id
                WHERE s.is_active = true
                GROUP BY s.id
                ORDER BY s.name ASC
            `),
        ]);

        const categories = cats.rows.map((c) => ({
            ...c,
            subcategories: subs.rows.filter((s) => s.category_id === c.id),
        }));

        return res.json({ categories });
    } catch (error) {
        next(error);
    }
};

// =====================================================================
// GET /products/stats  (real numbers for the home page)
// =====================================================================
const getStoreStats = async (req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT
                (SELECT COUNT(*) FROM products)::int AS products,
                (SELECT COUNT(*) FROM categories WHERE is_active = true)::int AS categories,
                (SELECT COUNT(*) FROM users)::int AS customers,
                (SELECT COUNT(DISTINCT order_group_id) FROM orders WHERE status = 'Delivered')::int AS delivered_orders
        `);

        return res.json(result.rows[0]);
    } catch (error) {
        next(error);
    }
};

// =====================================================================
// REVIEWS
// =====================================================================
const displayName = (name = "") => {
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "Customer";
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
};

const mapReview = (row) => ({
    id: row.id,
    rating: Number(row.rating),
    comment: row.comment,
    created_at: row.created_at,
    user_name: displayName(row.user_name),
    verified: Boolean(row.verified),
    product_id: row.product_id,
    product_name: row.product_name,
});

// GET /products/:id/reviews
const getProductReviews = async (req, res, next) => {
    try {
        const id = toPositiveInt(req.params.id);
        if (!id) return res.status(400).json({ message: "Invalid product ID" });

        const [list, summary] = await Promise.all([
            pool.query(
                `SELECT r.id, r.rating, r.comment, r.created_at, r.product_id, u.name AS user_name,
                        EXISTS (
                            SELECT 1 FROM orders o
                            WHERE o.user_id = r.user_id AND o.product_id = r.product_id AND o.status <> 'Cancelled'
                        ) AS verified
                 FROM product_reviews r
                 JOIN users u ON u.id = r.user_id
                 WHERE r.product_id = $1
                 ORDER BY r.created_at DESC
                 LIMIT 50`,
                [id]
            ),
            pool.query(
                `SELECT rating, COUNT(*)::int AS count FROM product_reviews WHERE product_id = $1 GROUP BY rating`,
                [id]
            ),
        ]);

        const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        let total = 0;
        let sum = 0;
        summary.rows.forEach((row) => {
            distribution[row.rating] = row.count;
            total += row.count;
            sum += row.rating * row.count;
        });

        return res.json({
            reviews: list.rows.map(mapReview),
            summary: {
                average: total ? Math.round((sum / total) * 10) / 10 : null,
                count: total,
                distribution,
            },
        });
    } catch (error) {
        next(error);
    }
};

// POST /products/:id/reviews   { rating, comment }   (one review per user)
const saveProductReview = async (req, res, next) => {
    try {
        const productId = toPositiveInt(req.params.id);
        const rating = Number(req.body?.rating);
        const comment = cleanText(req.body?.comment, 1000);

        if (!productId) return res.status(400).json({ message: "Invalid product ID" });
        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
            return res.status(400).json({ message: "Rating must be a whole number from 1 to 5" });
        }

        const exists = await pool.query("SELECT id FROM products WHERE id = $1", [productId]);
        if (exists.rows.length === 0) return res.status(404).json({ message: "Product Not Found" });

        const result = await pool.query(
            `INSERT INTO product_reviews (product_id, user_id, rating, comment)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (product_id, user_id)
             DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, updated_at = NOW()
             RETURNING id, rating, comment, created_at`,
            [productId, req.user.userId, rating, comment || null]
        );

        return res.status(201).json({ message: "Thanks for your review!", review: result.rows[0] });
    } catch (error) {
        next(error);
    }
};

// DELETE /products/:id/reviews  (own review)
const deleteMyReview = async (req, res, next) => {
    try {
        const productId = toPositiveInt(req.params.id);
        if (!productId) return res.status(400).json({ message: "Invalid product ID" });

        await pool.query("DELETE FROM product_reviews WHERE product_id = $1 AND user_id = $2", [
            productId,
            req.user.userId,
        ]);

        return res.json({ message: "Review deleted" });
    } catch (error) {
        next(error);
    }
};

// GET /products/reviews/latest?limit=3   (home page testimonials)
const getLatestReviews = async (req, res, next) => {
    try {
        const limit = Math.min(toPositiveInt(req.query.limit) || 3, 12);

        const result = await pool.query(
            `SELECT r.id, r.rating, r.comment, r.created_at, r.product_id,
                    u.name AS user_name, p.product_name,
                    EXISTS (
                        SELECT 1 FROM orders o
                        WHERE o.user_id = r.user_id AND o.product_id = r.product_id AND o.status <> 'Cancelled'
                    ) AS verified
             FROM product_reviews r
             JOIN users u ON u.id = r.user_id
             JOIN products p ON p.id = r.product_id
             WHERE r.comment IS NOT NULL AND r.comment <> ''
             ORDER BY r.created_at DESC
             LIMIT $1`,
            [limit]
        );

        return res.json({ reviews: result.rows.map(mapReview) });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    PRODUCT_SELECT,
    VISIBLE,
    mapProduct,
    getallproducts,
    getProductsById,
    getPublicCategories,
    getStoreStats,
    getProductReviews,
    saveProductReview,
    deleteMyReview,
    getLatestReviews,
};
