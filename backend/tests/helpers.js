// Test helpers: replace the real PostgreSQL pool with a scriptable fake,
// start the real Express app on a random port, and call it with fetch().
const path = require("path");
const jwt = require("jsonwebtoken");

process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123";
process.env.DB_PASSWORD = "x";
process.env.BCRYPT_ROUNDS = "4";
process.env.NODE_ENV = "test";

const calls = [];
let handler = async () => ({ rows: [] });

const runQuery = async (sql, params = []) => {
    const text = String(sql).replace(/\s+/g, " ").trim();
    calls.push({ sql: text, params });
    return handler(text, params);
};

const fakePool = {
    query: runQuery,
    connect: async () => ({ query: runQuery, release() {} }),
    on() {},
    end: async () => {},
};

const dbPath = require.resolve(path.join(__dirname, "..", "config", "db"));
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: fakePool };

const app = require("../app");

async function start() {
    const server = await new Promise((resolve) => {
        const s = app.listen(0, () => resolve(s));
    });
    return { server, base: `http://127.0.0.1:${server.address().port}` };
}

const tokenFor = (user = {}) =>
    jwt.sign({ userId: 7, email: "u@x.com", role: "user", ...user }, process.env.JWT_SECRET, { expiresIn: "1h" });

const cookie = (user) => ({ Cookie: `token=${tokenFor(user)}` });

module.exports = {
    start,
    cookie,
    calls,
    setHandler: (fn) => {
        handler = fn;
        calls.length = 0;
    },
};
