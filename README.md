# Cartify

Full-stack e-commerce store: **React 19 + Vite + Tailwind 4** frontend (`Cartify/`) and
**Node + Express 5 + PostgreSQL** backend (`backend/`). Plain JavaScript (JSX) everywhere.

## 1. Set up the database

```bash
createdb -U postgres cartify                       # skip if it already exists
psql -U postgres -d cartify -f backend/db/schema.sql
```

`schema.sql` is **idempotent**: it creates what is missing (carts, wishlist, reviews,
newsletter, `orders.product_id`, …) and never touches existing data. Run it again after
every update. The server prints a warning at start-up if you forgot.

Make yourself an admin (after registering on the site):

```sql
UPDATE users SET role = 'admin' WHERE email = 'you@example.com';
```

## 2. Backend

```bash
cd backend
cp .env.example .env        # then fill in DB_PASSWORD and a long random JWT_SECRET
npm install
npm run dev                 # http://localhost:5000     (npm start for production)
npm test                    # 17 API tests, no database needed
```

## 3. Frontend

```bash
cd Cartify
cp .env.example .env        # VITE_API_URL=http://localhost:5000
npm install
npm run dev                 # http://localhost:5173
npm run lint
```

## How the main flows work

| Flow | Behaviour |
|---|---|
| **Cart** | Stored in the database per logged-in user. Logged out = no cart, no badge. |
| **Prices / totals** | Always calculated on the server (`backend/utils/pricing.js`): 6% GST + flat ₹99 handling, delivery free. The browser never sends prices. |
| **Placing an order** | One transaction: lock products → check stock → create order lines → decrement stock → record payment → empty cart. Any failure rolls everything back. |
| **Search / filters / sort** | `GET /products?q=&category=&subcategory=&sort=&minPrice=&maxPrice=&inStock=&page=&limit=` (sorts: `newest`, `trending`, `rating`, `price_asc`, `price_desc`, `name`). Navbar search, home search and the products page all drive the same URL. |
| **Order status** | Pending → Confirmed → Shipped → Delivered. Pending/Confirmed can be cancelled (stock is restored, paid orders are marked refunded). |
| **Admin** | `/admin` dashboard, products, orders, users, categories, analytics, payments. Admin rights are re-checked in the database on every request. |

## Configuration reference

Backend `.env`: `PORT`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`,
`CLIENT_URL` (allowed frontend origin(s), comma separated), `NODE_ENV`, `TRUST_PROXY`.

Frontend `.env`: `VITE_API_URL`, `VITE_SUPPORT_EMAIL`, `VITE_SUPPORT_PHONE`.

## Known limitations (read before going live)

* **Payments are a demo.** UPI/Card/Net Banking mark an order "Demo Paid" and no money moves.
  Card/UPI details typed into the form are never sent to the server. Integrate a gateway
  (e.g. Razorpay) before taking real payments.
* No e-mails are sent (order confirmation, password reset, newsletter) and there is no
  "forgot password" flow yet.
* Product images are URLs (no file upload yet).
* "Today's deals" is a countdown banner only; there is no discount/coupon engine.
* Sessions last 1 hour (no refresh token). An expired session logs the user out with a message.
* Rate limiting is in-memory (single server). Use Redis-backed limiting if you scale out.


///////////////////////////////////////////////////////// welcome