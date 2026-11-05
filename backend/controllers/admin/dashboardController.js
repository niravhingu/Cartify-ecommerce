const pool = require("../../config/db");
const { GROUPED_ORDERS } = require("./analyticsController");

const LOW_STOCK_LIMIT = 5;

const getDashboardStats = async (req, res, next) => {
    try {
        const [counts, orderStats, recent, lowStock] = await Promise.all([
            pool.query(`
                SELECT
                    (SELECT COUNT(*) FROM users)::int    AS total_users,
                    (SELECT COUNT(*) FROM products)::int AS total_products,
                    (SELECT COUNT(*) FROM products WHERE stock <= $1)::int AS low_stock_count
            `, [LOW_STOCK_LIMIT]),

            pool.query(`
                ${GROUPED_ORDERS}
                SELECT
                    COUNT(*)::int AS total_orders,
                    COALESCE(SUM(total) FILTER (WHERE status <> 'Cancelled'), 0) AS total_revenue,
                    COUNT(*) FILTER (WHERE status = 'Pending')::int   AS pending_orders,
                    COUNT(*) FILTER (WHERE status = 'Delivered')::int AS delivered_orders
                FROM grp
            `),

            pool.query(`
                SELECT
                    COALESCE(o.order_group_id, 'legacy-' || o.id) AS order_group_id,
                    MAX(o.user_id)                                AS user_id,
                    MAX(COALESCE(o.customer_name, u.name))        AS customer_name,
                    MIN(o.status)                                 AS status,
                    MIN(o.created_at)                             AS created_at,
                    SUM(o.quantity)::int                          AS item_count,
                    MIN(o.product_name)                           AS first_product,
                    COUNT(*)::int                                 AS line_count,
                    COALESCE(NULLIF(MAX(o.total_amount), 0), SUM(o.price * o.quantity)) AS total_amount
                FROM orders o
                JOIN users u ON u.id = o.user_id
                GROUP BY 1
                ORDER BY MIN(o.created_at) DESC
                LIMIT 6
            `),

            pool.query(
                `SELECT id, product_name, stock, image FROM products
                  WHERE stock <= $1 ORDER BY stock ASC, id ASC LIMIT 5`,
                [LOW_STOCK_LIMIT]
            ),
        ]);

        const o = orderStats.rows[0];

        return res.status(200).json({
            message: "Dashboard Data Fetched Successfully",

            stats: {
                totalUsers: counts.rows[0].total_users,
                totalProducts: counts.rows[0].total_products,
                lowStockCount: counts.rows[0].low_stock_count,
                totalOrders: o.total_orders,
                totalRevenue: Number(o.total_revenue),
                pendingOrders: o.pending_orders,
                deliveredOrders: o.delivered_orders,
            },

            recentOrders: recent.rows.map((r) => ({ ...r, total_amount: Number(r.total_amount) })),
            lowStockProducts: lowStock.rows,
            lowStockLimit: LOW_STOCK_LIMIT,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { getDashboardStats };
