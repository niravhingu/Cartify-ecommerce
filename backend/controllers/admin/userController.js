const pool = require("../../config/db");
const { escapeLike, toPositiveInt } = require("../../utils/validators");

const ROLES = ["admin", "user"];

// GET /admin/users?search=&page=&limit=
const getAllUsers = async (req, res, next) => {
    try {
        const page = toPositiveInt(req.query.page) || 1;
        const limit = Math.min(toPositiveInt(req.query.limit) || 10, 100);
        const search = String(req.query.search || "").trim().slice(0, 100);

        const values = [];
        let where = "";
        if (search) {
            values.push(`%${escapeLike(search)}%`);
            where = `WHERE u.name ILIKE $1 OR u.email ILIKE $1`;
        }

        const [list, count] = await Promise.all([
            pool.query(
                `SELECT u.id, u.name, u.email, u.role, u.created_at,
                        COUNT(DISTINCT o.order_group_id)::int AS order_count,
                        COALESCE(SUM(o.price * o.quantity) FILTER (WHERE o.status <> 'Cancelled'), 0) AS total_spent
                   FROM users u
                   LEFT JOIN orders o ON o.user_id = u.id
                   ${where}
                  GROUP BY u.id
                  ORDER BY u.id ASC
                  LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
                [...values, limit, (page - 1) * limit]
            ),
            pool.query(`SELECT COUNT(*)::int AS total FROM users u ${where}`, values),
        ]);

        const total = count.rows[0].total;

        return res.status(200).json({
            message: "Users Fetched Successfully",
            totalUsers: total,
            users: list.rows.map((u) => ({ ...u, total_spent: Number(u.total_spent) })),
            pagination: { total, page, limit, totalPages: Math.max(Math.ceil(total / limit), 1) },
        });
    } catch (error) {
        next(error);
    }
};

// GET /admin/users/:id
const getUserById = async (req, res, next) => {
    try {
        const userId = toPositiveInt(req.params.id);
        if (!userId) return res.status(400).json({ message: "Invalid user ID" });

        const result = await pool.query(
            "SELECT id, name, email, role, created_at FROM users WHERE id = $1",
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "User Not Found" });
        }

        return res.status(200).json({ message: "User Fetched Successfully", user: result.rows[0] });
    } catch (error) {
        next(error);
    }
};

// PATCH /admin/users/:id/role   { role: "admin" | "user" }
const updateUserRole = async (req, res, next) => {
    try {
        const userId = toPositiveInt(req.params.id);
        const { role } = req.body || {};

        if (!userId) return res.status(400).json({ message: "Invalid user ID" });
        if (!ROLES.includes(role)) return res.status(400).json({ message: "Role must be 'admin' or 'user'" });

        // an admin cannot lock themselves out by accident
        if (userId === req.user.userId) {
            return res.status(400).json({ message: "You cannot change your own role" });
        }

        const result = await pool.query(
            "UPDATE users SET role = $1 WHERE id = $2 RETURNING id, name, email, role, created_at",
            [role, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "User Not Found" });
        }

        return res.status(200).json({ message: "Role updated successfully", user: result.rows[0] });
    } catch (error) {
        next(error);
    }
};

module.exports = { getAllUsers, getUserById, updateUserRole };
