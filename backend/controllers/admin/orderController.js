const pool = require("../../config/db");
const { ORDER_STATUSES } = require("../../utils/orderStatus");
const { escapeLike, toPositiveInt } = require("../../utils/validators");
const { changeGroupStatus } = require("../../services/orderService");

const GROUP_KEY = "COALESCE(o.order_group_id, 'legacy-' || o.id)";

// Grouped (one row per checkout) order query shared by list + detail.
const groupedSelect = (whereSql = "", havingSql = "") => `
    SELECT
        ${GROUP_KEY}                                   AS order_group_id,
        MIN(o.created_at)                              AS created_at,
        MIN(o.status)                                  AS status,
        MAX(o.user_id)                                 AS user_id,
        MAX(COALESCE(o.customer_name, u.name))         AS customer_name,
        MAX(COALESCE(o.email, u.email))                AS customer_email,
        MAX(o.mobile)                                  AS mobile,
        MAX(o.address)                                 AS address,
        MAX(o.city)                                    AS city,
        MAX(o.state)                                   AS state,
        MAX(o.pincode)                                 AS pincode,
        MAX(o.payment_method)                          AS payment_method,
        MAX(o.payment_status)                          AS payment_status,
        COALESCE(NULLIF(MAX(o.total_amount), 0), SUM(o.price * o.quantity)) AS total_amount,
        SUM(o.quantity)::int                           AS item_count,
        json_agg(json_build_object(
            'id', o.id, 'product_id', o.product_id, 'product_name', o.product_name,
            'price', o.price, 'quantity', o.quantity, 'image', o.image
        ) ORDER BY o.id)                               AS items
    FROM orders o
    JOIN users u ON u.id = o.user_id
    ${whereSql}
    GROUP BY ${GROUP_KEY}
    ${havingSql}
`;

const shape = (row) => ({
    ...row,
    total_amount: Number(row.total_amount),
    items: (row.items || []).map((i) => ({ ...i, price: Number(i.price), quantity: Number(i.quantity) })),
});

// GET /admin/orders?status=&search=&page=&limit=
const getAllOrders = async (req, res, next) => {
    try {
        const page = toPositiveInt(req.query.page) || 1;
        const limit = Math.min(toPositiveInt(req.query.limit) || 10, 100);
        const status = ORDER_STATUSES.includes(req.query.status) ? req.query.status : null;
        const search = String(req.query.search || "").trim().slice(0, 100);

        const values = [];
        let where = "";
        let having = "";

        if (status) {
            values.push(status);
            where = `WHERE o.status = $${values.length}`;
        }

        if (search) {
            values.push(`%${escapeLike(search)}%`);
            const ph = `$${values.length}`;
            having = `HAVING (
                ${GROUP_KEY} ILIKE ${ph}
                OR MAX(COALESCE(o.customer_name, u.name)) ILIKE ${ph}
                OR MAX(COALESCE(o.email, u.email)) ILIKE ${ph}
                OR bool_or(o.product_name ILIKE ${ph})
            )`;
        }

        const inner = groupedSelect(where, having);

        const [list, total, tabs] = await Promise.all([
            pool.query(`${inner} ORDER BY MIN(o.created_at) DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`, [
                ...values,
                limit,
                (page - 1) * limit,
            ]),
            pool.query(`SELECT COUNT(*)::int AS total FROM (${inner}) t`, values),
            pool.query(`
                SELECT status, COUNT(DISTINCT ${GROUP_KEY})::int AS count
                FROM orders o GROUP BY status
            `),
        ]);

        const statusCounts = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0]));
        tabs.rows.forEach((r) => {
            statusCounts[r.status] = r.count;
        });

        const totalOrders = total.rows[0].total;

        return res.status(200).json({
            message: "Orders Fetched Successfully",
            orders: list.rows.map(shape),
            statusCounts,
            pagination: {
                total: totalOrders,
                page,
                limit,
                totalPages: Math.max(Math.ceil(totalOrders / limit), 1),
            },
        });
    } catch (error) {
        next(error);
    }
};

// GET /admin/orders/:orderGroupId
const getOrderById = async (req, res, next) => {
    try {
        const result = await pool.query(
            groupedSelect(`WHERE ${GROUP_KEY} = $1`),
            [req.params.orderGroupId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Order Not Found" });
        }

        return res.status(200).json({ message: "Order Fetched Successfully", order: shape(result.rows[0]) });
    } catch (error) {
        next(error);
    }
};

// PATCH /admin/orders/:orderGroupId/status   { status }
const updateOrderStatus = async (req, res, next) => {
    const { status } = req.body || {};

    if (!status || !ORDER_STATUSES.includes(status)) {
        return res.status(400).json({ message: "Invalid order status" });
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const outcome = await changeGroupStatus(client, req.params.orderGroupId, status);

        if (outcome.error) {
            await client.query("ROLLBACK");
            return res.status(outcome.error.status).json({ message: outcome.error.message });
        }

        await client.query("COMMIT");

        return res.status(200).json({
            message: `Order marked as ${status}`,
            status,
            order_group_id: req.params.orderGroupId,
        });
    } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        next(error);
    } finally {
        client.release();
    }
};

// DELETE /admin/orders/:orderGroupId   (only cancelled orders: history of real sales is kept)
const deleteOrder = async (req, res, next) => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const found = await client.query(
            `SELECT o.status FROM orders o WHERE ${GROUP_KEY} = $1 FOR UPDATE`,
            [req.params.orderGroupId]
        );

        if (found.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ message: "Order Not Found" });
        }

        if (found.rows[0].status !== "Cancelled") {
            await client.query("ROLLBACK");
            return res.status(409).json({ message: "Only cancelled orders can be deleted. Cancel the order first." });
        }

        await client.query("DELETE FROM payments WHERE order_group_id = $1", [req.params.orderGroupId]);
        await client.query(`DELETE FROM orders o WHERE ${GROUP_KEY} = $1`, [req.params.orderGroupId]);

        await client.query("COMMIT");
        return res.status(200).json({ message: "Order Deleted Successfully" });
    } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        next(error);
    } finally {
        client.release();
    }
};

module.exports = { getAllOrders, getOrderById, updateOrderStatus, deleteOrder };
