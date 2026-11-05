const pool = require("../../config/db");

// One "order" = one checkout (all lines sharing an order_group_id).
// Cancelled orders never count towards revenue.
const GROUPED_ORDERS = `
    WITH grp AS (
        SELECT
            COALESCE(order_group_id, 'legacy-' || id) AS gid,
            MIN(created_at) AS created_at,
            MIN(status)     AS status,
            COALESCE(NULLIF(MAX(total_amount), 0), SUM(price * quantity)) AS total
        FROM orders
        GROUP BY 1
    )
`;

const growth = (current, previous) => {
    if (!previous) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 1000) / 10;
};

const getAnalytics = async (req, res, next) => {
    try {
        const [counts, money, byStatus, byDay, top, categories] = await Promise.all([
            pool.query(`
                SELECT
                    (SELECT COUNT(*) FROM users)::int    AS total_users,
                    (SELECT COUNT(*) FROM products)::int AS total_products
            `),

            pool.query(`
                ${GROUPED_ORDERS}
                SELECT
                    COUNT(*)::int AS total_orders,
                    COALESCE(SUM(total) FILTER (WHERE status <> 'Cancelled'), 0) AS total_revenue,
                    COALESCE(AVG(total) FILTER (WHERE status <> 'Cancelled'), 0) AS average_order_value,

                    COALESCE(SUM(total) FILTER (WHERE status <> 'Cancelled' AND created_at::date = CURRENT_DATE), 0) AS today_revenue,
                    COALESCE(SUM(total) FILTER (WHERE status <> 'Cancelled' AND created_at >= DATE_TRUNC('week', CURRENT_DATE)), 0) AS week_revenue,
                    COALESCE(SUM(total) FILTER (WHERE status <> 'Cancelled' AND created_at >= DATE_TRUNC('month', CURRENT_DATE)), 0) AS month_revenue,
                    COALESCE(SUM(total) FILTER (
                        WHERE status <> 'Cancelled'
                          AND created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
                          AND created_at <  DATE_TRUNC('month', CURRENT_DATE)
                    ), 0) AS last_month_revenue,

                    COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE))::int AS month_orders,
                    COUNT(*) FILTER (
                        WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
                          AND created_at <  DATE_TRUNC('month', CURRENT_DATE)
                    )::int AS last_month_orders
                FROM grp
            `),

            pool.query(`
                ${GROUPED_ORDERS}
                SELECT status, COUNT(*)::int AS count FROM grp GROUP BY status
            `),

            // last 30 days, with empty days filled in as zero
            pool.query(`
                ${GROUPED_ORDERS}
                SELECT
                    TO_CHAR(d, 'YYYY-MM-DD') AS date,
                    COALESCE(SUM(g.total) FILTER (WHERE g.status <> 'Cancelled'), 0) AS revenue,
                    COUNT(g.gid)::int AS orders
                FROM generate_series(CURRENT_DATE - 29, CURRENT_DATE, INTERVAL '1 day') AS d
                LEFT JOIN grp g ON g.created_at::date = d::date
                GROUP BY d
                ORDER BY d
            `),

            pool.query(`
                SELECT
                    product_name,
                    SUM(quantity)::int                   AS total_quantity_sold,
                    SUM(price * quantity)                AS total_revenue,
                    COUNT(DISTINCT COALESCE(order_group_id, 'legacy-' || id))::int AS total_orders
                FROM orders
                WHERE status <> 'Cancelled'
                GROUP BY product_name
                ORDER BY total_revenue DESC
                LIMIT 5
            `),

            pool.query(`
                SELECT c.id AS category_id, c.name AS category_name, c.slug AS category_slug,
                       COUNT(p.id)::int AS total_products,
                       COALESCE(SUM(p.stock), 0)::int AS total_stock
                FROM categories c
                LEFT JOIN products p ON p.category_id = c.id
                GROUP BY c.id, c.name, c.slug
                ORDER BY total_products DESC, c.name ASC
            `),
        ]);

        const m = money.rows[0];
        const statusCount = Object.fromEntries(byStatus.rows.map((r) => [r.status, r.count]));
        const confirmed = statusCount.Confirmed || 0;

        return res.status(200).json({
            message: "Analytics Fetched Successfully",

            summary: {
                totalUsers: counts.rows[0].total_users,
                totalProducts: counts.rows[0].total_products,
                totalOrders: m.total_orders,
                totalRevenue: Number(m.total_revenue),
                averageOrderValue: Number(m.average_order_value),
            },

            revenue: {
                today: Number(m.today_revenue),
                thisWeek: Number(m.week_revenue),
                thisMonth: Number(m.month_revenue),
                lastMonth: Number(m.last_month_revenue),
                growthPercentage: growth(Number(m.month_revenue), Number(m.last_month_revenue)),
            },

            orders: {
                total: m.total_orders,
                pending: statusCount.Pending || 0,
                confirmed,
                processing: confirmed, // old name kept for compatibility
                shipped: statusCount.Shipped || 0,
                delivered: statusCount.Delivered || 0,
                cancelled: statusCount.Cancelled || 0,
                thisMonth: m.month_orders,
                lastMonth: m.last_month_orders,
                growthPercentage: growth(m.month_orders, m.last_month_orders),
            },

            // (the old response had a typo: "ccharts")
            charts: {
                revenueByDay: byDay.rows.map((r) => ({ date: r.date, revenue: Number(r.revenue) })),
                ordersByDay: byDay.rows.map((r) => ({ date: r.date, orders: r.orders })),
            },

            topProducts: top.rows.map((r) => ({
                productName: r.product_name,
                totalQuantitySold: r.total_quantity_sold,
                totalRevenue: Number(r.total_revenue),
                totalOrders: r.total_orders,
            })),

            categoryAnalytics: categories.rows.map((r) => ({
                categoryId: r.category_id,
                categoryName: r.category_name,
                categorySlug: r.category_slug,
                totalProducts: r.total_products,
                totalStock: r.total_stock,
            })),
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { getAnalytics, GROUPED_ORDERS };
