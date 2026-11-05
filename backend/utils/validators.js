const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MOBILE_RE = /^[6-9]\d{9}$/;      // Indian mobile numbers
const PINCODE_RE = /^[1-9]\d{5}$/;

const isEmail = (v) => typeof v === "string" && v.length <= 254 && EMAIL_RE.test(v.trim());
const isMobile = (v) => MOBILE_RE.test(String(v ?? "").trim());
const isPincode = (v) => PINCODE_RE.test(String(v ?? "").trim());
const cleanText = (v, max = 255) => String(v ?? "").trim().replace(/\s+/g, " ").slice(0, max);
const normalizeEmail = (v) => String(v ?? "").trim().toLowerCase();

// Positive integer from user input, or null.
const toPositiveInt = (v) => {
    const n = Number(v);
    return Number.isInteger(n) && n > 0 ? n : null;
};

// Escape % and _ so user text is matched literally inside ILIKE.
const escapeLike = (v) => String(v ?? "").replace(/[\\%_]/g, (c) => `\\${c}`);

// Password policy: >= 8 chars, with at least one letter and one number.
const passwordProblem = (pw) => {
    if (typeof pw !== "string" || pw.length < 8) return "Password must be at least 8 characters";
    if (pw.length > 72) return "Password must be 72 characters or fewer";
    if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return "Password must contain at least one letter and one number";
    return null;
};

module.exports = {
    isEmail, isMobile, isPincode, cleanText, normalizeEmail,
    toPositiveInt, escapeLike, passwordProblem,
};
