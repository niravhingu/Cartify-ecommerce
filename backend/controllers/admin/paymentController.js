const pool = require("../../config/db");

const getAllPayments = async (req, res, next) => {
    try {
        // 1. Get filters and pagination from URL
        const {
            status,
            payment_method,
            payment_provider,
            search,
            page = 1,
            limit = 10
        } = req.query;


        // 2. Validate page
        const pageNumber = Math.max(
            parseInt(page) || 1,
            1
        );


        // 3. Validate limit
        const limitNumber = Math.min(
            Math.max(parseInt(limit) || 10, 1),
            100
        );


        // 4. Calculate offset
        const offset =
            (pageNumber - 1) * limitNumber;


        // 5. Store filter conditions
        const conditions = [];


        // 6. Store filter values
        const filterValues = [];


        // 7. Filter by status
        if (status) {
            filterValues.push(status);

            conditions.push(
                `p.status = $${filterValues.length}`
            );
        }


        // 8. Filter by payment method
        if (payment_method) {
            filterValues.push(payment_method);

            conditions.push(
                `p.payment_method = $${filterValues.length}`
            );
        }


        // 9. Filter by payment provider
        if (payment_provider) {
            filterValues.push(payment_provider);

            conditions.push(
                `p.payment_provider = $${filterValues.length}`
            );
        }

        // serach condition for admin
        if (search) {
            filterValues.push(`%${search}%`);

            conditions.push(`
        (
            u.name ILIKE $${filterValues.length}
            OR
            u.email ILIKE $${filterValues.length}
            OR
            CAST(p.order_id AS TEXT)
                ILIKE $${filterValues.length}
            OR
            p.order_group_id
                ILIKE $${filterValues.length}
            OR
            p.provider_payment_id
                ILIKE $${filterValues.length}
        )
    `);
        }

        // 10. Common WHERE clause
        let whereClause = "";

        if (conditions.length > 0) {
            whereClause = `
                WHERE ${conditions.join(" AND ")}
            `;
        }


        // 11. Count total filtered payments
        const countQuery = `
            SELECT COUNT(*) AS total
            FROM payments p

            JOIN users u
                ON p.user_id = u.id

            ${whereClause}
        `;

        const countResult = await pool.query(
            countQuery,
            filterValues
        );

        const totalPayments = Number(
            countResult.rows[0].total
        );


        // 12. Calculate total pages
        const totalPages = Math.ceil(
            totalPayments / limitNumber
        );


        // 13. Main query
        let query = `
            SELECT
                p.id,
                p.order_id,
                p.order_group_id,

                u.id AS user_id,
                u.name AS customer_name,
                u.email AS customer_email,

                p.amount,
                p.currency,
                p.payment_method,
                p.payment_provider,

                p.provider_order_id,
                p.provider_payment_id,

                p.status,
                p.failure_code,
                p.failure_reason,

                p.paid_at,
                p.created_at,
                p.updated_at

            FROM payments p

            JOIN users u
                ON p.user_id = u.id

            ${whereClause}

            ORDER BY p.created_at DESC
        `;


        // 14. Copy filter values
        const queryValues = [...filterValues];


        // 15. Add LIMIT
        queryValues.push(limitNumber);

        query += `
            LIMIT $${queryValues.length}
        `;


        // 16. Add OFFSET
        queryValues.push(offset);

        query += `
            OFFSET $${queryValues.length}
        `;


        // 17. Execute main query
        const result = await pool.query(
            query,
            queryValues
        );


        // 18. Send response
        return res.status(200).json({
            message: "Payments Fetched Successfully",

            pagination: {
                totalPayments,

                currentPage: pageNumber,

                totalPages,

                limit: limitNumber,

                hasNextPage:
                    pageNumber < totalPages,

                hasPreviousPage:
                    pageNumber > 1
            },

            payments: result.rows.map(
                (payment) => ({
                    id: payment.id,

                    orderId: payment.order_id,

                    orderGroupId: payment.order_group_id,

                    user: {
                        id: payment.user_id,
                        name: payment.customer_name,
                        email: payment.customer_email
                    },

                    amount: Number(payment.amount),

                    currency: payment.currency,

                    paymentMethod:
                        payment.payment_method,

                    paymentProvider:
                        payment.payment_provider,

                    providerOrderId:
                        payment.provider_order_id,

                    providerPaymentId:
                        payment.provider_payment_id,

                    status: payment.status,

                    failureCode:
                        payment.failure_code,

                    failureReason:
                        payment.failure_reason,

                    paidAt: payment.paid_at,

                    createdAt: payment.created_at,

                    updatedAt: payment.updated_at
                })
            )
        });

    } catch (error) {
        next(error);
    }
};

const getPaymentById = async (req, res, next) => {
    try {

        const { id } = req.params;

        const result = await pool.query(`
            SELECT
                p.id,
                p.order_id,
                p.order_group_id,

                u.id AS user_id,
                u.name AS customer_name,
                u.email AS customer_email,

                p.amount,
                p.currency,
                p.payment_method,
                p.payment_provider,

                p.provider_order_id,
                p.provider_payment_id,

                p.status,
                p.failure_code,
                p.failure_reason,

                p.paid_at,
                p.created_at,
                p.updated_at

            FROM payments p

            JOIN users u
                ON p.user_id = u.id

            WHERE p.id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Payment not found"
            });
        }

        const payment = result.rows[0];

        return res.status(200).json({
            message: "Payment Fetched Successfully",

            payment: {
                id: payment.id,

                orderId: payment.order_id,

                    orderGroupId: payment.order_group_id,

                user: {
                    id: payment.user_id,
                    name: payment.customer_name,
                    email: payment.customer_email
                },

                amount: Number(payment.amount),

                currency: payment.currency,

                paymentMethod: payment.payment_method,

                paymentProvider: payment.payment_provider,

                providerOrderId:
                    payment.provider_order_id,

                providerPaymentId:
                    payment.provider_payment_id,

                status: payment.status,

                failureCode:
                    payment.failure_code,

                failureReason:
                    payment.failure_reason,

                paidAt: payment.paid_at,

                createdAt: payment.created_at,

                updatedAt: payment.updated_at
            }
        });

    } catch (error) {
        next(error);
    }
};

const getPaymentAnalytics = async (req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT
                COUNT(*) AS total_payments,

                COALESCE(
                    SUM(amount),
                    0
                ) AS total_amount,

                COUNT(*) FILTER (
                    WHERE status = 'paid'
                ) AS paid_payments,

                COUNT(*) FILTER (
                    WHERE status = 'pending'
                ) AS pending_payments,

                COUNT(*) FILTER (
                    WHERE status = 'failed'
                ) AS failed_payments,

                COUNT(*) FILTER (
                    WHERE status = 'refunded'
                ) AS refunded_payments

            FROM payments
        `);

        const paymentMethodResult = await pool.query(`
    SELECT
        payment_method,

        COUNT(*) AS total_payments,

        COALESCE(
            SUM(amount),
            0
        ) AS total_amount,

        COUNT(*) FILTER (
            WHERE status = 'paid'
        ) AS paid_payments,

        COUNT(*) FILTER (
            WHERE status = 'failed'
        ) AS failed_payments

    FROM payments

    GROUP BY payment_method

    ORDER BY total_amount DESC
`);

        const analytics = result.rows[0];

        return res.status(200).json({
            message: "Payment Analytics Fetched Successfully",

            analytics: {
                totalPayments: Number(
                    analytics.total_payments
                ),

                totalAmount: Number(
                    analytics.total_amount
                ),

                paidPayments: Number(
                    analytics.paid_payments
                ),

                pendingPayments: Number(
                    analytics.pending_payments
                ),

                failedPayments: Number(
                    analytics.failed_payments
                ),

                refundedPayments: Number(
                    analytics.refunded_payments
                )
            },
            paymentMethodSummary: paymentMethodResult.rows.map(
                (payment) => ({
                    paymentMethod: payment.payment_method,

                    totalPayments: Number(
                        payment.total_payments
                    ),

                    totalAmount: Number(
                        payment.total_amount
                    ),

                    paidPayments: Number(
                        payment.paid_payments
                    ),

                    failedPayments: Number(
                        payment.failed_payments
                    )
                })
            )
        });

    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllPayments, getPaymentById, getPaymentAnalytics
};