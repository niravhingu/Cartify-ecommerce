// Minimal security headers (what helmet sets by default, without the dependency).
const securityHeaders = (req, res, next) => {
    res.set({
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "Referrer-Policy": "no-referrer",
        "Cross-Origin-Resource-Policy": "same-site",
        "X-DNS-Prefetch-Control": "off",
    });
    next();
};

module.exports = securityHeaders;
