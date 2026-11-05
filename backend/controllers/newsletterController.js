const pool = require("../config/db");
const { isEmail, normalizeEmail } = require("../utils/validators");

// POST /newsletter  { email }   (public, rate limited, idempotent)
const subscribe = async (req, res, next) => {
    try {
        const email = normalizeEmail(req.body?.email);

        if (!isEmail(email)) {
            return res.status(400).json({ message: "Please enter a valid email address" });
        }

        await pool.query(
            "INSERT INTO newsletter_subscribers (email) VALUES ($1) ON CONFLICT (email) DO NOTHING",
            [email]
        );

        // same answer whether or not the address was already on the list
        return res.status(201).json({ message: "Thanks for subscribing!" });
    } catch (error) {
        next(error);
    }
};

module.exports = { subscribe };
