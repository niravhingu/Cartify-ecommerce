const { DELIVERY_CHARGE } = require("../utils/pricing");
const { canTransition, customerCanCancel } = require("../utils/orderStatus");

const num = (v) => Number(v || 0);

// Rows of one checkout (same order_group_id) -> one order object.
function groupOrders(rows) {
    const groups = new Map();

    for (const row of rows) {
        const key = row.order_group_id || `legacy-${row.id}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(row);
    }

    return [...groups.entries()].map(([orderGroupId, lines]) => {
        const first = lines[0];
        const itemsTotal = lines.reduce((sum, l) => sum + num(l.price) * num(l.quantity), 0);

        return {
            order_group_id: orderGroupId,
            created_at: first.created_at,
            status: first.status,
            payment_method: first.payment_method,
            payment_status: first.payment_status,
            total_amount: num(first.total_amount) || itemsTotal,
            item_count: lines.reduce((sum, l) => sum + num(l.quantity), 0),
            can_cancel: customerCanCancel(first.status),
            items: lines.map((l) => ({
                id: l.id,
                product_id: l.product_id,
                product_name: l.product_name,
                price: num(l.price),
                quantity: num(l.quantity),
                total: num(l.price) * num(l.quantity),
                image: l.image || null,
            })),
        };
    });
}

// Rows of one checkout -> the receipt object used by the receipt page.
function buildReceipt(rows) {
    const first = rows[0];
    const items = rows.map((r) => ({
        id: r.id,
        product_id: r.product_id,
        product_name: r.product_name,
        price: num(r.price),
        quantity: num(r.quantity),
        total: num(r.price) * num(r.quantity),
        image: r.image || null,
    }));

    const subtotal = first.subtotal != null ? num(first.subtotal) : items.reduce((s, i) => s + i.total, 0);
    const gst = num(first.gst);
    const otherCharges = num(first.other_charges);

    return {
        orderGroupId: first.order_group_id,
        customer: {
            name: first.customer_name,
            email: first.email,
            mobile: first.mobile,
            address: first.address,
            city: first.city,
            state: first.state,
            pincode: first.pincode,
        },
        payment: {
            method: first.payment_method,
            status: first.payment_status,
        },
        summary: {
            subtotal,
            gst,
            otherCharges,
            deliveryCharge: DELIVERY_CHARGE,
            totalAmount: num(first.total_amount) || subtotal + gst + otherCharges + DELIVERY_CHARGE,
        },
        items,
        status: first.status,
        canCancel: customerCanCancel(first.status),
        createdAt: first.created_at,
    };
}

/**
 * Moves every line of an order to a new status inside the caller's transaction.
 * - validates the transition
 * - restocks products when cancelling
 * - keeps orders.payment_status and the payments row in sync
 *
 * Returns { rows } on success or { error: { status, message } }.
 */
async function changeGroupStatus(client, orderGroupId, newStatus, { userId = null, byCustomer = false } = {}) {
    const params = [orderGroupId];
    let sql = "SELECT * FROM orders WHERE order_group_id = $1";

    if (userId) {
        sql += " AND user_id = $2";
        params.push(userId);
    }
    sql += " ORDER BY id FOR UPDATE";

    const found = await client.query(sql, params);

    if (found.rows.length === 0) {
        return { error: { status: 404, message: "Order Not Found" } };
    }

    const current = found.rows[0].status;

    if (byCustomer) {
        if (newStatus !== "Cancelled" || !customerCanCancel(current)) {
            return {
                error: {
                    status: 409,
                    message: "This order can no longer be cancelled because it has already shipped or finished.",
                },
            };
        }
    } else if (!canTransition(current, newStatus)) {
        return {
            error: { status: 409, message: `An order that is ${current} cannot be changed to ${newStatus}.` },
        };
    }

    if (newStatus === "Cancelled") {
        for (const line of found.rows) {
            if (line.product_id) {
                await client.query("UPDATE products SET stock = stock + $2, updated_at = NOW() WHERE id = $1", [
                    line.product_id,
                    line.quantity,
                ]);
            }
        }
    }

    const isCod = found.rows[0].payment_method === "COD";
    const wasPaid = ["Demo Paid", "Paid"].includes(found.rows[0].payment_status);

    let paymentStatus = found.rows[0].payment_status;
    if (newStatus === "Cancelled") paymentStatus = wasPaid ? "Refunded" : "Cancelled";
    else if (newStatus === "Delivered" && isCod) paymentStatus = "Paid";

    const updated = await client.query(
        `UPDATE orders SET status = $2, payment_status = $3
          WHERE order_group_id = $1
          RETURNING *`,
        [orderGroupId, newStatus, paymentStatus]
    );

    if (newStatus === "Cancelled") {
        await client.query(
            `UPDATE payments
                SET status = CASE WHEN status = 'paid' THEN 'refunded' ELSE 'failed' END,
                    failure_code = CASE WHEN status = 'paid' THEN failure_code ELSE 'ORDER_CANCELLED' END,
                    failure_reason = CASE WHEN status = 'paid' THEN failure_reason ELSE 'Order was cancelled' END,
                    updated_at = NOW()
              WHERE order_group_id = $1`,
            [orderGroupId]
        );
    } else if (newStatus === "Delivered" && isCod) {
        await client.query(
            `UPDATE payments SET status = 'paid', paid_at = NOW(), updated_at = NOW()
              WHERE order_group_id = $1`,
            [orderGroupId]
        );
    }

    return { rows: updated.rows };
}

module.exports = { groupOrders, buildReceipt, changeGroupStatus };
