// Tiny in-memory rate limiter (no dependency). Good for a single server
// process; use Redis + express-rate-limit if you run several instances.

const createRateLimiter = ({ windowMs, max, keyFn, message, skipSuccessful = false }) => {
    const hits = new Map();

    const timer = setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of hits) {
            if (entry.resetAt <= now) hits.delete(key);
        }
    }, Math.min(windowMs, 60_000));
    timer.unref?.();

    const middleware = (req, res, next) => {
        const key = keyFn ? keyFn(req) : req.ip;
        const now = Date.now();
        let entry = hits.get(key);

        if (!entry || entry.resetAt <= now) {
            entry = { count: 0, resetAt: now + windowMs };
            hits.set(key, entry);
        }

        if (entry.count >= max) {
            const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
            res.set("Retry-After", String(retryAfter));
            return res.status(429).json({
                message: message || "Too many requests. Please try again later.",
            });
        }

        entry.count += 1;

        if (skipSuccessful) {
            res.on("finish", () => {
                if (res.statusCode < 400 && entry.count > 0) entry.count -= 1;
            });
        }

        next();
    };

    middleware.reset = () => hits.clear();
    return middleware;
};

const loginLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 10,
    skipSuccessful: true,
    keyFn: (req) => `${req.ip}:${String(req.body?.email || "").toLowerCase()}`,
    message: "Too many login attempts. Please try again in a few minutes.",
});

const registerLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: "Too many sign-ups from this device. Please try again later.",
});

module.exports = { createRateLimiter, loginLimiter, registerLimiter };
