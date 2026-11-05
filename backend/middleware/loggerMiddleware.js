// One tidy line per request: METHOD /path -> status (ms). Bodies are never logged
// because they can contain passwords.
const loggerMiddleware = (req, res, next) => {
    const started = Date.now();

    res.on("finish", () => {
        const time = new Date().toLocaleTimeString();
        console.log(`[${time}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - started}ms)`);
    });

    next();
};

module.exports = loggerMiddleware;
