
const crypto = require("crypto");
const pool = require("../config/db");
const { calculatePricing } = require("../utils/pricing");
const {
    isEmail,
    isMobile,
    isPincode,
    cleanText,
    normalizeEmail,
} = require("../utils/validators");
const {
    groupOrders,
    buildReceipt,
    changeGroupStatus,
} = require("../services/orderService");

// Canonical payment labels stored in the orders table.
const PAYMENT_METHODS = {
    upi: {
        order: "UPI",
        payment: "upi",
    },
    card: {
        order: "Card",
        payment: "card",
    },
    netbanking: {
        order: "Net Banking",
        payment: "netbanking",
    },
    cod: {
        order: "COD",
        payment: "cash_on_delivery",
    },
    cashondelivery: {
        order: "COD",
        payment: "cash_on_delivery",
    },
};

// Normalize frontend payment labels.
const normalizePaymentMethod = (value) => {
    if (typeof value !== "string") {
        return null;
    }

    const key = value
        .trim()
        .toLowerCase()
        .replace(/[\s_-]+/g, "");

    return PAYMENT_METHODS[key] || null;
};

class HttpError extends Error {
    constructor(status, message, extra = {}) {
        super(message);
        this.status = status;
        this.extra = extra;
    }
}

// ======================================================================
// PLACE ORDER - POST /orders
// Products, quantities and prices come from the server-side cart.
// ======================================================================

const placeOrder = async (req, res, next) => {
    const body = req.body || {};

    const customer = {
        name: cleanText(body.customer_name ?? body.name, 100),
        email: normalizeEmail(body.email ?? body.customer_email),
        mobile: String(
            body.mobile ?? body.customer_mobile ?? ""
        ).trim(),
        address: cleanText(
            body.address ?? body.customer_address,
            300
        ),
        city: cleanText(body.city, 100),
        state: cleanText(body.state, 100),
        pincode: String(body.pincode ?? "").trim(),
    };

    const payment = normalizePaymentMethod(body.payment_method);

    // Validate before accessing the database.
    const invalid =
        (customer.name.length < 2 &&
            "Customer name is required") ||
        (!isEmail(customer.email) &&
            "A valid email address is required") ||
        (!isMobile(customer.mobile) &&
            "A valid 10-digit mobile number is required") ||
        (customer.address.length < 5 &&
            "Delivery address is required") ||
        (!customer.city && "City is required") ||
        (!customer.state && "State is required") ||
        (!isPincode(customer.pincode) &&
            "A valid 6-digit pincode is required") ||
        (!body.payment_method &&
            "Payment method is required") ||
        (!payment && "Invalid payment method");

    if (invalid) {
        return res.status(400).json({ message: invalid });
    }

    // Different formats are normalized into consistent values.
    const paymentMethod = payment.order;
    const dbPaymentMethod = payment.payment;
    const isCod = dbPaymentMethod === "cash_on_delivery";

    const userId = req.user.userId;
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // Lock products while checking stock.
        const cart = await client.query(
            `SELECT
                ci.product_id,
                ci.quantity,
                p.product_name,
                p.price,
                p.stock,
                p.image
             FROM cart_items ci
             JOIN products p ON p.id = ci.product_id
             WHERE ci.user_id = $1
             ORDER BY p.id
             FOR UPDATE OF p`,
            [userId]
        );

        if (cart.rows.length === 0) {
            throw new HttpError(400, "Your cart is empty");
        }

        // Check available stock.
        const problems = [];

        for (const line of cart.rows) {
            const stock = Number(line.stock);
            const quantity = Number(line.quantity);

            if (stock <= 0) {
                problems.push(
                    `${line.product_name} is out of stock`
                );
            } else if (quantity > stock) {
                problems.push(
                    `Only ${stock} of ${line.product_name} left in stock`
                );
            }
        }

        if (problems.length > 0) {
            throw new HttpError(
                409,
                `${problems[0]}. Please update your cart.`,
                { problems }
            );
        }

        const pricing = calculatePricing(cart.rows);

        const orderGroupId =
            `ORD-${Date.now()}-${crypto
                .randomBytes(3)
                .toString("hex")
                .toUpperCase()}`;

        const paymentStatus = isCod
            ? "Pending"
            : "Demo Paid";

        const created = [];

        // Create an order line for each product.
        for (const line of cart.rows) {
            const quantity = Number(line.quantity);

            // Prevent stock from becoming negative.
            const stockUpdate = await client.query(
                `UPDATE products
                 SET stock = stock - $2,
                     updated_at = NOW()
                 WHERE id = $1
                   AND stock >= $2
                 RETURNING id`,
                [line.product_id, quantity]
            );

            if (stockUpdate.rows.length === 0) {
                throw new HttpError(
                    409,
                    `${line.product_name} just went out of stock. Please update your cart.`
                );
            }

            const inserted = await client.query(
                `INSERT INTO orders (
                    user_id,
                    product_id,
                    product_name,
                    price,
                    quantity,
                    image,
                    status,
                    order_group_id,
                    email,
                    address,
                    customer_name,
                    mobile,
                    city,
                    state,
                    pincode,
                    payment_method,
                    payment_status,
                    subtotal,
                    gst,
                    other_charges,
                    total_amount
                ) VALUES (
                    $1, $2, $3, $4, $5, $6,
                    'Pending', $7,
                    $8, $9, $10, $11, $12, $13, $14,
                    $15, $16,
                    $17, $18, $19, $20
                )
                RETURNING *`,
                [
                    userId,
                    line.product_id,
                    line.product_name,
                    Number(line.price),
                    quantity,
                    line.image,
                    orderGroupId,
                    customer.email,
                    customer.address,
                    customer.name,
                    customer.mobile,
                    customer.city,
                    customer.state,
                    customer.pincode,
                    paymentMethod,
                    paymentStatus,
                    pricing.subtotal,
                    pricing.gst,
                    pricing.otherCharges,
                    pricing.totalAmount,
                ]
            );

            created.push(inserted.rows[0]);
        }

        // Save the payment using the database's allowed values:
        // upi, card, netbanking, cash_on_delivery.
        await client.query(
            `INSERT INTO payments (
                order_id,
                order_group_id,
                user_id,
                amount,
                currency,
                payment_method,
                payment_provider,
                provider_order_id,
                provider_payment_id,
                status,
                paid_at
            ) VALUES (
                $1, $2, $3, $4, 'INR',
                $5, $6, $2, $7, $8, $9
            )`,
            [
                created[0].id,
                orderGroupId,
                userId,
                pricing.totalAmount,
                dbPaymentMethod,
                isCod ? "cod" : "demo",
                isCod
                    ? null
                    : `DEMO-${crypto
                        .randomBytes(5)
                        .toString("hex")
                        .toUpperCase()}`,
                isCod ? "pending" : "paid",
                isCod ? null : new Date(),
            ]
        );

        // Clear the cart in the same transaction.
        await client.query(
            "DELETE FROM cart_items WHERE user_id = $1",
            [userId]
        );

        await client.query("COMMIT");

        return res.status(201).json({
            message: "Order Placed Successfully",
            orderGroupId,
            totalAmount: pricing.totalAmount,
            paymentMethod,
            receipt: buildReceipt(created),
        });
    } catch (error) {
        await client.query("ROLLBACK").catch(() => {});

        if (error instanceof HttpError) {
            return res.status(error.status).json({
                message: error.message,
                ...error.extra,
            });
        }

        return next(error);
    } finally {
        client.release();
    }
};

// ======================================================================
// MY ORDERS - GET /orders
// Alias: GET /orders/my-orders
// ======================================================================

const getUserOrders = async (req, res, next) => {
    try {
        const result = await pool.query(
            `SELECT *
             FROM orders
             WHERE user_id = $1
             ORDER BY created_at DESC, id ASC`,
            [req.user.userId]
        );

        const orders = groupOrders(result.rows);

        return res.status(200).json({
            message: "Orders Fetched Successfully",
            totalOrders: orders.length,
            orders,
        });
    } catch (error) {
        next(error);
    }
};

// ======================================================================
// RECEIPT - GET /orders/:orderGroupId
// ======================================================================

const getOrderByGroupId = async (req, res, next) => {
    try {
        const { orderGroupId } = req.params;

        const result = await pool.query(
            `SELECT *
             FROM orders
             WHERE order_group_id = $1
               AND user_id = $2
             ORDER BY id ASC`,
            [orderGroupId, req.user.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Order Not Found",
            });
        }

        return res.status(200).json({
            message: "Order Fetched Successfully",
            ...buildReceipt(result.rows),
        });
    } catch (error) {
        next(error);
    }
};

// ======================================================================
// CANCEL - PATCH /orders/:orderGroupId/cancel
// ======================================================================

const cancelOrder = async (req, res, next) => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const outcome = await changeGroupStatus(
            client,
            req.params.orderGroupId,
            "Cancelled",
            {
                userId: req.user.userId,
                byCustomer: true,
            }
        );

        if (outcome.error) {
            await client.query("ROLLBACK");

            return res.status(outcome.error.status).json({
                message: outcome.error.message,
            });
        }

        await client.query("COMMIT");

        return res.status(200).json({
            message: "Order cancelled successfully",
            ...buildReceipt(outcome.rows),
        });
    } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        next(error);
    } finally {
        client.release();
    }
};

module.exports = {
    placeOrder,
    getUserOrders,
    getOrderByGroupId,
    cancelOrder,
};