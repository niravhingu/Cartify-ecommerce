require("dotenv").config();

const pool = require("./config/db");

// ---- fail fast on missing configuration ------------------------------
const missing = ["JWT_SECRET", "DATABASE_URL"].filter((key) => !process.env[key]);
// const missing = ["JWT_SECRET", "DB_PASSWORD"].filter((key) => !process.env[key]);
if (missing.length > 0) {
    console.error(`❌ Missing required environment variable(s): ${missing.join(", ")}`);
    console.error("   Copy .env.example to .env and fill in the values.");
    process.exit(1);
}
if (process.env.JWT_SECRET.length < 32) {
    console.warn("⚠️  JWT_SECRET is shorter than 32 characters. Use a long random value in production.");
}

const app = require("./app");
const PORT = Number(process.env.PORT) || 5000;

const server = app.listen(PORT, async () => {
    console.log(`Server Running On Port ${PORT}`);

    try {
        await pool.query("SELECT NOW()");
        console.log("✅ PostgreSQL Connected Successfully");

        // Did you run db/schema.sql? (carts, wishlist, reviews and orders.product_id are new)
        const needed = await pool.query(
            `SELECT
                EXISTS (SELECT 1 FROM information_schema.tables  WHERE table_name = 'cart_items')       AS cart,
                EXISTS (SELECT 1 FROM information_schema.tables  WHERE table_name = 'wishlist_items')   AS wishlist,
                EXISTS (SELECT 1 FROM information_schema.tables  WHERE table_name = 'product_reviews')  AS reviews,
                EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders'  AND column_name = 'product_id') AS order_product,
                EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users'  AND column_name = 'created_at') AS user_created`
        );
        if (Object.values(needed.rows[0]).some((ok) => !ok)) {
            console.warn("⚠️  Database is missing newer tables/columns. Run:  psql -U postgres -d cartify -f db/schema.sql");
        }
    } catch (error) {
        console.log("❌ Database Connection Failed");
        console.error(error.message);
    }
});

// ---- graceful shutdown -------------------------------------------------
const shutdown = (signal) => {
    console.log(`\n${signal} received, shutting down...`);
    server.close(async () => {
        await pool.end().catch(() => {});
        process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
};
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("unhandledRejection", (reason) => {
    console.error("Unhandled promise rejection:", reason);
});
