const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const h = require("./helpers");
const { calculatePricing } = require("../utils/pricing");
const { canTransition } = require("../utils/orderStatus");

let server, base;
before(async () => ({ server, base } = await h.start()));
after(() => server.close());

const post = (url, body, headers = {}) =>
    fetch(base + url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(body),
    });

// ---------------------------------------------------------------- pricing
test("pricing: 6% GST + Rs 99 charges, paise-exact", () => {
    const p = calculatePricing([{ price: "100.10", quantity: 3 }]);
    assert.equal(p.subtotal, 300.3);
    assert.equal(p.gst, 18.02);
    assert.equal(p.otherCharges, 99);
    assert.equal(p.totalAmount, 417.32);
    assert.equal(calculatePricing([]).totalAmount, 0);
});

test("order status: only legal transitions", () => {
    assert.ok(canTransition("Pending", "Confirmed"));
    assert.ok(!canTransition("Delivered", "Pending"));
    assert.ok(!canTransition("Cancelled", "Confirmed"));
});

// ---------------------------------------------------------------- auth
test("register: missing name is rejected (old comma bug let it through)", async () => {
    h.setHandler(async () => ({ rows: [] }));
    const res = await post("/users/register", { email: "a@b.com", password: "abcdefg1" });
    assert.equal(res.status, 400);
});

test("register: weak password rejected, valid one never returns the hash", async () => {
    h.setHandler(async (sql) => {
        if (sql.startsWith("SELECT id FROM users")) return { rows: [] };
        if (sql.startsWith("INSERT INTO users"))
            return { rows: [{ id: 1, name: "Nirav", email: "n@x.com", role: "user", created_at: "now" }] };
        return { rows: [] };
    });
    assert.equal((await post("/users/register", { name: "Nirav", email: "n@x.com", password: "short" })).status, 400);
    assert.equal((await post("/users/register", { name: "Nirav", email: "n@x.com", password: "onlyletters" })).status, 400);

    const ok = await post("/users/register", { name: "Nirav", email: "N@X.com", password: "goodpass1" });
    assert.equal(ok.status, 201);
    const body = await ok.json();
    assert.equal(body.user.password, undefined);
});

test("login: sets httpOnly cookie, profile returns role (admin survives refresh)", async () => {
    const bcrypt = require("bcrypt");
    const hash = await bcrypt.hash("goodpass1", 4);
    h.setHandler(async (sql) => {
        if (sql.startsWith("SELECT * FROM users"))
            return { rows: [{ id: 3, name: "Admin", email: "a@x.com", role: "admin", password: hash }] };
        if (sql.startsWith("SELECT id, name, email, role"))
            return { rows: [{ id: 3, name: "Admin", email: "a@x.com", role: "admin" }] };
        return { rows: [] };
    });

    const bad = await post("/users/login", { email: "a@x.com", password: "wrongpass1" });
    assert.equal(bad.status, 401);

    const res = await post("/users/login", { email: "A@x.com", password: "goodpass1" });
    assert.equal(res.status, 200);
    const setCookie = res.headers.get("set-cookie");
    assert.match(setCookie, /token=/);
    assert.match(setCookie, /HttpOnly/i);
    assert.equal((await res.json()).user.password, undefined);

    const profile = await fetch(base + "/users/profile", { headers: h.cookie({ userId: 3, role: "admin" }) });
    assert.equal((await profile.json()).user.role, "admin");
});

test("old insecure routes are gone / protected", async () => {
    assert.equal((await fetch(base + "/cart/1")).status, 401);          // was open to everyone
    assert.equal((await fetch(base + "/users/data", { headers: h.cookie() })).status, 403); // no longer lists users
});

test("admin: JWT says admin but database says user -> 403", async () => {
    h.setHandler(async (sql) => (sql.startsWith("SELECT role FROM users") ? { rows: [{ role: "user" }] } : { rows: [] }));
    const res = await fetch(base + "/admin/dashboard", { headers: h.cookie({ role: "admin" }) });
    assert.equal(res.status, 403);
    assert.equal((await fetch(base + "/admin/dashboard")).status, 401);
});

// ---------------------------------------------------------------- products
test("products: search is parameterised and escaped, sort whitelisted", async () => {
    h.setHandler(async (sql) => {
        if (sql.includes("COUNT(*)::int AS total")) return { rows: [{ total: 0 }] };
        if (sql.includes("MIN(p.price)")) return { rows: [{ min: 0, max: 0 }] };
        return { rows: [] };
    });
    const res = await fetch(base + "/products?q=red%25&sort=price_desc;DROP&category=shoes&limit=999");
    assert.equal(res.status, 200);
    const main = h.calls.find((c) => c.sql.includes("ORDER BY"));
    assert.ok(main.sql.includes("ILIKE $1"));
    assert.equal(main.params[0], "%red\\%%");           // % escaped, never concatenated into SQL
    assert.ok(!main.sql.includes("DROP"));
    assert.ok(main.sql.includes("ORDER BY p.created_at DESC")); // invalid sort -> safe default
    assert.equal(main.params.at(-2), 60);                       // limit capped
    assert.equal((await fetch(base + "/products/abc")).status, 400);
});

// ---------------------------------------------------------------- orders
const customer = {
    customer_name: "Nirav H", email: "n@x.com", mobile: "9876543210",
    address: "12 Main Road", city: "Ahmedabad", state: "Gujarat", pincode: "380001",
    payment_method: "UPI",
};

test("order: client prices are ignored, total is computed from the database", async () => {
    h.setHandler(async (sql) => {
        if (sql.includes("FROM cart_items ci")) {
            return { rows: [{ product_id: 5, quantity: 2, product_name: "Shoe", price: "100.00", stock: 10, image: null }] };
        }
        if (sql.startsWith("UPDATE products")) return { rows: [{ id: 5 }] };
        if (sql.startsWith("INSERT INTO orders")) return { rows: [{ id: 1, order_group_id: "G", product_name: "Shoe", price: "100.00", quantity: 2, subtotal: 200, gst: 12, other_charges: 99, total_amount: 311, status: "Pending", ...customer }] };
        return { rows: [] };
    });

    const res = await post(
        "/orders",
        { ...customer, items: [{ product_name: "Shoe", price: 1, quantity: 1 }], total_amount: 1 },
        h.cookie()
    );
    assert.equal(res.status, 201);
    const insert = h.calls.find((c) => c.sql.startsWith("INSERT INTO orders"));
    assert.equal(insert.params[3], 100);   // price from DB, not 1
    assert.equal(insert.params[4], 2);     // quantity from cart, not 1
    assert.equal(insert.params[19], 311);  // 200 + 12 GST + 99
    assert.ok(h.calls.some((c) => c.sql === "COMMIT"));
    assert.ok(h.calls.some((c) => c.sql.startsWith("DELETE FROM cart_items")));
    assert.ok(h.calls.some((c) => c.sql.startsWith("INSERT INTO payments")));
});

test("order: not enough stock -> 409, nothing committed", async () => {
    h.setHandler(async (sql) => {
        if (sql.includes("FROM cart_items ci")) {
            return { rows: [{ product_id: 5, quantity: 3, product_name: "Shoe", price: "100", stock: 2, image: null }] };
        }
        return { rows: [] };
    });
    const res = await post("/orders", customer, h.cookie());
    assert.equal(res.status, 409);
    assert.match((await res.json()).message, /Only 2 of Shoe/);
    assert.ok(h.calls.some((c) => c.sql === "ROLLBACK"));
    assert.ok(!h.calls.some((c) => c.sql === "COMMIT"));
    assert.ok(!h.calls.some((c) => c.sql.startsWith("INSERT INTO orders")));
});

test("order: empty cart, bad mobile and bad payment method are rejected", async () => {
    h.setHandler(async () => ({ rows: [] }));
    assert.equal((await post("/orders", customer, h.cookie())).status, 400);
    assert.equal((await post("/orders", { ...customer, mobile: "12345" }, h.cookie())).status, 400);
    assert.equal((await post("/orders", { ...customer, payment_method: "Bitcoin" }, h.cookie())).status, 400);
    assert.equal((await post("/orders", customer)).status, 401);
});

test("my orders: empty history is 200 with an empty list (was 404), my-orders alias works", async () => {
    h.setHandler(async () => ({ rows: [] }));
    for (const url of ["/orders", "/orders/my-orders"]) {
        const res = await fetch(base + url, { headers: h.cookie() });
        assert.equal(res.status, 200);
        assert.deepEqual((await res.json()).orders, []);
    }
});

// ---------------------------------------------------------------- cart
test("cart: out-of-stock product cannot be added; invalid quantity rejected", async () => {
    h.setHandler(async (sql) => (sql.includes("FROM products p") ? { rows: [{ id: 1, stock: 0 }] } : { rows: [] }));
    assert.equal((await post("/cart", { productId: 1, quantity: 1 }, h.cookie())).status, 409);
    assert.equal((await post("/cart", { productId: 1, quantity: -3 }, h.cookie())).status, 400);
});

test("security headers present, unknown route is JSON 404, bad JSON is 400", async () => {
    const res = await fetch(base + "/nope");
    assert.equal(res.status, 404);
    assert.equal(res.headers.get("x-content-type-options"), "nosniff");
    assert.equal(res.headers.get("x-powered-by"), null);
    const bad = await fetch(base + "/users/login", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: "{oops",
    });
    assert.equal(bad.status, 400);
});

test("newsletter: bad email rejected, good email stored once", async () => {
    h.setHandler(async () => ({ rows: [] }));
    assert.equal((await post("/newsletter", { email: "nope" })).status, 400);
    assert.equal((await post("/newsletter", { email: "A@B.com" })).status, 201);
    const insert = h.calls.find((c) => c.sql.startsWith("INSERT INTO newsletter_subscribers"));
    assert.deepEqual(insert.params, ["a@b.com"]);
});

test("admin order status: illegal transition is refused with 409", async () => {
    h.setHandler(async (sql) => {
        if (sql.startsWith("SELECT role FROM users")) return { rows: [{ role: "admin" }] };
        if (sql.startsWith("SELECT * FROM orders")) return { rows: [{ id: 1, status: "Delivered", product_id: 1, quantity: 1, payment_method: "UPI", payment_status: "Demo Paid" }] };
        return { rows: [] };
    });
    const res = await fetch(base + "/admin/orders/ORD-1/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...h.cookie({ role: "admin" }) },
        body: JSON.stringify({ status: "Pending" }),
    });
    assert.equal(res.status, 409);
    assert.ok(!h.calls.some((c) => c.sql === "COMMIT"));
});

test("admin cancel restocks the products and refunds the payment", async () => {
    h.setHandler(async (sql) => {
        if (sql.startsWith("SELECT role FROM users")) return { rows: [{ role: "admin" }] };
        if (sql.startsWith("SELECT * FROM orders")) return { rows: [{ id: 1, status: "Pending", product_id: 9, quantity: 3, payment_method: "UPI", payment_status: "Demo Paid" }] };
        if (sql.startsWith("UPDATE orders")) return { rows: [{ id: 1 }] };
        return { rows: [] };
    });
    const res = await fetch(base + "/admin/orders/ORD-1/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...h.cookie({ role: "admin" }) },
        body: JSON.stringify({ status: "Cancelled" }),
    });
    assert.equal(res.status, 200);
    const restock = h.calls.find((c) => c.sql.startsWith("UPDATE products SET stock = stock + $2"));
    assert.deepEqual(restock.params, [9, 3]);
    assert.ok(h.calls.some((c) => c.sql.startsWith("UPDATE payments")));
    assert.ok(h.calls.some((c) => c.sql === "COMMIT"));
});
