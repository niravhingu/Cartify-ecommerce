const pool = require("../config/db");

// The role inside the JWT can be up to an hour old. For admin routes we
// re-read it from the database so a demoted admin loses access immediately.
const adminMiddleware = async (req, res, next) => {
    try {
        if (!req.user?.userId) {
            return res.status(401).json({ message: "Authentication Required" });
        }

        const result = await pool.query("SELECT role FROM users WHERE id = $1", [req.user.userId]);

        if (result.rows.length === 0 || result.rows[0].role !== "admin") {
            return res.status(403).json({ message: "Admin Access Required" });
        }

        req.user.role = "admin";
        next();
    } catch (error) {
        next(error);
    }
};

module.exports = adminMiddleware;
