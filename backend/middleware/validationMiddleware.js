const { isEmail, passwordProblem, cleanText, normalizeEmail } = require("../utils/validators");

// Cleans + validates the register body. (The old version used a comma instead
// of `||`, so only the password was ever checked.)
const validateRegister = (req, res, next) => {
    const name = cleanText(req.body?.name, 100);
    const email = normalizeEmail(req.body?.email);
    const password = req.body?.password;

    if (!name || !email || !password) {
        return res.status(400).json({ message: "Please fill all fields" });
    }
    if (name.length < 2) {
        return res.status(400).json({ message: "Name must be at least 2 characters" });
    }
    if (!isEmail(email)) {
        return res.status(400).json({ message: "Please enter a valid email address" });
    }
    const problem = passwordProblem(password);
    if (problem) {
        return res.status(400).json({ message: problem });
    }

    req.body = { name, email, password };
    next();
};

module.exports = { validateRegister };
