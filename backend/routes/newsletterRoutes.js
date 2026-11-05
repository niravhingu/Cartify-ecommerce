const express = require("express");
const { createRateLimiter } = require("../middleware/rateLimiter");
const { subscribe } = require("../controllers/newsletterController");

const router = express.Router();

const limiter = createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: "Too many attempts. Please try again later.",
});

router.post("/", limiter, subscribe);

module.exports = router;
