const notFound = (req, res) => {
    res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
};

const isProduction = process.env.NODE_ENV === "production";

// In development the message says WHICH database rule failed, so a problem
// like a CHECK constraint is visible in the browser and in the terminal.
// In production only the generic text is returned.
const withHint = (text, err) => {
    if (isProduction) return text;
    const where = err.constraint || (err.table && err.column ? `${err.table}.${err.column}` : err.column);
    return where ? `${text} [${where}]` : text;
};

const logDbError = (err) => {
    console.error(
        `DB error ${err.code}: ${err.message}` +
            (err.table ? ` | table=${err.table}` : "") +
            (err.column ? ` | column=${err.column}` : "") +
            (err.constraint ? ` | constraint=${err.constraint}` : "") +
            (err.detail ? ` | detail=${err.detail}` : "")
    );
};

const errorMiddleware = (err, req, res, next) => {
    if (res.headersSent) return next(err);

    // Malformed JSON body
    if (err.type === "entity.parse.failed") {
        return res.status(400).json({ message: "Invalid JSON in request body" });
    }
    if (err.type === "entity.too.large") {
        return res.status(413).json({ message: "Request body is too large" });
    }

    // PostgreSQL error codes
    switch (err.code) {
        case "23505": // unique violation
            logDbError(err);
            return res.status(409).json({ message: withHint("That value already exists", err) });
        case "23503": // foreign key
            logDbError(err);
            return res.status(400).json({ message: withHint("Related record does not exist or is still in use", err) });
        case "23502": // not null
            logDbError(err);
            return res.status(400).json({ message: withHint("A required value is missing", err) });
        case "23514": // check constraint
        case "22P02": // invalid text representation
        case "22001": // value too long
        case "22003": // numeric out of range
            logDbError(err);
            return res.status(400).json({
                message: withHint(err.code === "22001" ? "A value is too long" : "Invalid data supplied", err),
            });
        case "42703": // undefined column
        case "42P01": // undefined table
            logDbError(err);
            return res.status(500).json({
                message: isProduction
                    ? "Internal Server Error"
                    : "Database is out of date (missing table or column). Run backend/db/schema.sql on this database.",
            });
        default:
    }

    console.error(err);

    return res.status(500).json({
        success: false,
        message: "Internal Server Error",
    });
};

module.exports = errorMiddleware;
module.exports.notFound = notFound;