-- =====================================================================
-- Cartify database schema (idempotent: safe to run many times)
--
--   psql -U postgres -d cartify -f db/schema.sql
--
-- * CREATE TABLE IF NOT EXISTS  -> fresh install gets every table.
-- * ALTER ... ADD COLUMN IF NOT EXISTS -> existing databases get only
--   the new columns; no existing data is touched.
-- =====================================================================

CREATE TABLE IF NOT EXISTS users (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    email       VARCHAR(255) NOT NULL UNIQUE,
    password    TEXT NOT NULL,
    role        VARCHAR(20) NOT NULL DEFAULT 'user',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS categories (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    slug        VARCHAR(120) NOT NULL UNIQUE,
    description TEXT,
    image       TEXT,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subcategories (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    slug        VARCHAR(120) NOT NULL UNIQUE,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
    id             SERIAL PRIMARY KEY,
    product_name   VARCHAR(200) NOT NULL,
    description    TEXT,
    price          NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    stock          INTEGER NOT NULL DEFAULT 0,
    image          TEXT,
    category_id    INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    subcategory_id INTEGER REFERENCES subcategories(id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Columns the app reads/writes; added only if an older database lacks them.
ALTER TABLE products ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE categories ADD COLUMN IF NOT EXISTS image TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS description TEXT;

-- Stock can never go negative (NOT VALID = do not re-check old rows).
DO $$
BEGIN
    ALTER TABLE products
        ADD CONSTRAINT products_stock_non_negative CHECK (stock >= 0) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- One row per purchased product line; rows of one checkout share order_group_id.
CREATE TABLE IF NOT EXISTS orders (
    id             SERIAL PRIMARY KEY,
    user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_name   VARCHAR(200) NOT NULL,
    price          NUMERIC(10,2) NOT NULL,
    quantity       INTEGER NOT NULL CHECK (quantity > 0),
    status         VARCHAR(20) NOT NULL DEFAULT 'Pending',
    order_group_id VARCHAR(60),
    email          VARCHAR(255),
    address        TEXT,
    customer_name  VARCHAR(100),
    mobile         VARCHAR(20),
    city           VARCHAR(100),
    state          VARCHAR(100),
    pincode        VARCHAR(10),
    payment_method VARCHAR(30),
    payment_status VARCHAR(30),
    subtotal       NUMERIC(12,2),
    gst            NUMERIC(12,2),
    other_charges  NUMERIC(12,2),
    total_amount   NUMERIC(12,2),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- NEW: link an order line to the real product (needed for stock + trending).
ALTER TABLE orders ADD COLUMN IF NOT EXISTS product_id INTEGER REFERENCES products(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS image TEXT;

CREATE TABLE IF NOT EXISTS payments (
    id                  SERIAL PRIMARY KEY,
    order_id            INTEGER,
    user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount              NUMERIC(12,2) NOT NULL,
    currency            VARCHAR(8) NOT NULL DEFAULT 'INR',
    payment_method      VARCHAR(30),
    payment_provider    VARCHAR(30) DEFAULT 'demo',
    provider_order_id   VARCHAR(100),
    provider_payment_id VARCHAR(100),
    status              VARCHAR(20) NOT NULL DEFAULT 'pending',
    failure_code        VARCHAR(60),
    failure_reason      TEXT,
    paid_at             TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS order_group_id VARCHAR(60);

-- ---------------------------------------------------------------------
-- NEW tables
-- ---------------------------------------------------------------------

-- Server-side cart: belongs to a user, survives logout/login and devices.
CREATE TABLE IF NOT EXISTS cart_items (
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity   INTEGER NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS wishlist_items (
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, product_id)
);

-- Real ratings (powers "Top rated" sorting and the product page).
CREATE TABLE IF NOT EXISTS product_reviews (
    id         SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating     SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment    TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (product_id, user_id)
);

-- ---------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_products_category   ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_subcat     ON products(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_products_created    ON products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_user         ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_group        ON orders(order_group_id);
CREATE INDEX IF NOT EXISTS idx_orders_product      ON orders(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product     ON product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_payments_group      ON payments(order_group_id);

-- Make yourself admin (run once, replace the email):
--   UPDATE users SET role = 'admin' WHERE email = 'you@example.com';

-- Newsletter sign-ups from the home page footer form.
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id         SERIAL PRIMARY KEY,
    email      VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
