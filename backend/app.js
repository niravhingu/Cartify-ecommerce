const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const pool = require("./config/db");
const securityHeaders = require("./middleware/securityMiddleware");
const loggerMiddleware = require("./middleware/loggerMiddleware");
const errorMiddleware = require("./middleware/errorMiddleware");

const userRoutes = require("./routes/usersRoutes");
const productsRoutes = require("./routes/productsRoutes");
const cartRoutes = require("./routes/cartRoutes");
const wishlistRoutes = require("./routes/wishlistRoutes");
const orderRoutes = require("./routes/orderRoutes");
const newsletterRoutes = require("./routes/newsletterRoutes");
const adminRoutes = require("./routes/admin/adminRoutes");

const app = express();

app.disable("x-powered-by");
if (process.env.TRUST_PROXY) app.set("trust proxy", Number(process.env.TRUST_PROXY) || 1);

// Allowed browser origins (comma separated in CLIENT_URL).
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173,http://127.0.0.1:5173")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

app.use(securityHeaders);
app.use(
    cors({
        origin(origin, callback) {
    // no Origin header = curl / server-to-server / same-origin
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    console.warn(`CORS blocked origin: ${origin} | allowed: ${allowedOrigins.join(", ")}`);
    return callback(new Error("Not allowed by CORS"));
},
        credentials: true,
    })
);
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());
app.use(loggerMiddleware);

app.get("/", (req, res) => {
    res.send("Hello Cartify Backend");
});

// Health check (used by uptime monitors / deployment platforms)
app.get("/health", async (req, res) => {
    try {
        await pool.query("SELECT 1");
        res.json({ status: "ok", database: "connected" });
    } catch (error) {
        res.status(503).json({ status: "error", database: "unreachable" });
    }
});

app.use("/products", productsRoutes);
app.use("/users", userRoutes);
app.use("/cart", cartRoutes);
app.use("/wishlist", wishlistRoutes);
app.use("/orders", orderRoutes);
app.use("/newsletter", newsletterRoutes);
app.use("/admin", adminRoutes);

app.use(errorMiddleware.notFound);
app.use(errorMiddleware);

module.exports = app;
