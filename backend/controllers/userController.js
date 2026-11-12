const pool = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { cleanText, normalizeEmail, isEmail, passwordProblem } = require("../utils/validators");

const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 12;
const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

// Compared against when the email does not exist, so response time does not
// reveal which emails are registered.
const DUMMY_HASH = bcrypt.hashSync("cartify-dummy-password", 10);

const cookieOptions = () => {
    const isProd = process.env.NODE_ENV === "production";

    return {
        httpOnly: true,
        // Production mein frontend aur backend alag domain par hote hain, isliye
        // browser cookie tabhi bhejta hai jab SameSite=None ho (iske liye Secure chahiye).
        secure: isProd,
        sameSite: isProd ? "none" : "lax",
        path: "/",
    };
};
const publicUser = (row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    created_at: row.created_at,
});

// POST /users/register  (body already cleaned by validateRegister)
const registerUser = async (req, res) => {
    const { name, email, password } = req.body;

    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
        return res.status(409).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    try {
        const result = await pool.query(
            `INSERT INTO users (name, email, password)
             VALUES ($1, $2, $3)
             RETURNING id, name, email, role, created_at`,
            [name, email, hashedPassword]
        );

        return res.status(201).json({
            message: "User registered successfully",
            user: publicUser(result.rows[0]),
        });
    } catch (error) {
        // two sign-ups with the same email racing each other
        if (error.code === "23505") {
            return res.status(409).json({ message: "Email already registered" });
        }
        throw error;
    }
};

// POST /users/login
const loginUser = async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    const password = req.body?.password;

    if (!email || !password || typeof password !== "string") {
        return res.status(400).json({ message: "Please fill all fields" });
    }

    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    const user = result.rows[0];

    const passwordOk = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);

    if (!user || !passwordOk) {
        return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
    );

    res.cookie("token", token, { ...cookieOptions(), maxAge: TOKEN_TTL_MS });

    return res.status(200).json({
        message: "Login successful",
        user: publicUser(user),
    });
};

// POST /users/logout  (public: logging out with an expired cookie must still work)
const logoutUser = (req, res) => {
    res.clearCookie("token", cookieOptions());
    return res.status(200).json({ message: "Logout successful" });
};

// GET /users/profile
const getProfile = async (req, res) => {
    const result = await pool.query(
        "SELECT id, name, email, role, created_at FROM users WHERE id = $1",
        [req.user.userId]
    );

    if (result.rows.length === 0) {
        // account was deleted while the cookie was still valid
        res.clearCookie("token", cookieOptions());
        return res.status(401).json({ message: "Account no longer exists" });
    }

    return res.status(200).json({ user: publicUser(result.rows[0]) });
};

// GET /users/:id  (a user may only read their own record)
const getUserById = async (req, res) => {
    const userId = Number(req.params.id);

    if (!Number.isInteger(userId) || userId !== req.user.userId) {
        return res.status(403).json({ message: "You are not allowed to access this user" });
    }

    return getProfile(req, res);
};

// PATCH /users/profile   { name }
const updateProfile = async (req, res) => {
    const name = cleanText(req.body?.name, 100);

    if (name.length < 2) {
        return res.status(400).json({ message: "Name must be at least 2 characters" });
    }

    const result = await pool.query(
        `UPDATE users SET name = $1 WHERE id = $2
         RETURNING id, name, email, role, created_at`,
        [name, req.user.userId]
    );

    if (result.rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
        message: "Profile updated successfully",
        user: publicUser(result.rows[0]),
    });
};

// PATCH /users/password   { currentPassword, newPassword }
const changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body || {};

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Please fill all fields" });
    }

    const problem = passwordProblem(newPassword);
    if (problem) {
        return res.status(400).json({ message: problem });
    }

    if (currentPassword === newPassword) {
        return res.status(400).json({ message: "New password must be different from the current one" });
    }

    const result = await pool.query("SELECT password FROM users WHERE id = $1", [req.user.userId]);
    if (result.rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
    }

    const ok = await bcrypt.compare(String(currentPassword), result.rows[0].password);
    if (!ok) {
        return res.status(401).json({ message: "Current password is incorrect" });
    }

    const hashed = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await pool.query("UPDATE users SET password = $1 WHERE id = $2", [hashed, req.user.userId]);

    return res.status(200).json({ message: "Password changed successfully" });
};

module.exports = {
    registerUser,
    loginUser,
    logoutUser,
    getProfile,
    getUserById,
    updateProfile,
    changePassword,
    // exported for tests
    _isEmail: isEmail,
};
