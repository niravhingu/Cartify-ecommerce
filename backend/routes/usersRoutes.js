const express = require("express");

const { validateRegister } = require("../middleware/validationMiddleware");
const { loginLimiter, registerLimiter } = require("../middleware/rateLimiter");
const authMiddleware = require("../middleware/authMiddleware");

const {
    registerUser,
    loginUser,
    logoutUser,
    getProfile,
    getUserById,
    updateProfile,
    changePassword,
} = require("../controllers/userController");

const router = express.Router();

// ---------- public ----------
router.post("/register", registerLimiter, validateRegister, registerUser);
router.post("/login", loginLimiter, loginUser);
router.post("/logout", logoutUser);

// ---------- protected ----------
router.use(authMiddleware);

router.get("/profile", getProfile);
router.patch("/profile", updateProfile);
router.patch("/password", changePassword);

// dynamic route must stay last
router.get("/:id", getUserById);

module.exports = router;
