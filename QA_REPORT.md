# Cartify – QA & Engineering Report

Scope: full review of `Cartify/` (frontend) and `backend/`, followed by fixes and completion
of the missing pieces. Existing design, folder structure and coding style were kept; files
were changed only where something was wrong or missing.

## How it was verified

| Check | Result |
|---|---|
| Backend API tests (`npm test` in `backend/`, DB mocked) | **17 / 17 pass** |
| Syntax check of all 39 frontend `.js/.jsx` files | 0 problems |
| ESLint (`npm run lint`) | 0 errors (29 advisory warnings) |
| Server-side render of every page, logged out + logged in | 24 / 24 render |
| Render of 30 "data loaded" scenarios (home, products, details, cart, checkout, payment, receipt, orders, all admin pages, navbar active/cart-badge rules) | all pass |
| **Not possible in the review environment** | A real PostgreSQL server and a browser were not available, so SQL was reviewed by hand and tested against a mock, and `vite build` / clicking through the UI was not run. Please run the checklist at the end once. |

## Defects found and fixed

### Critical (security / money / data)
1. **Anyone could read or change anyone's cart** – `/cart/:userId` had no login check. Cart routes now use the logged-in user from the JWT cookie only.
2. **Prices came from the browser** – a modified request could buy anything for ₹1. The server now ignores client prices and recalculates from the database.
3. **No stock control** – orders never reduced stock (overselling). Orders now run in one transaction with row locks; stock can never go negative.
4. **Password hashes exposed** – `GET /users/data` returned `SELECT * FROM users` to any logged-in user, and register echoed the hash. Both removed.
5. **Register validation bug** – `!name || !email , !password` (comma) checked only the password. Fixed, plus e-mail format and password-strength rules.
6. **Admins lost admin access on page refresh** – `/users/profile` did not return `role`. Fixed; admin routes also re-check the role in the DB.

### High (broken features)
7. **"Cart shows 1 when not logged in"** – cart lived in one shared `localStorage` key, was never cleared on logout, and the badge was always rendered. Cart is now per-user in the DB; badge only for logged-in users with items; old keys are purged.
8. **Search / category / sort did not work** – the page filtered on fields that do not exist (`title`, `category`) while the API returns `product_name`, `category_name`; the navbar sent `?search=` but the page read `q`; Home used static demo data. Everything is now database-driven and URL-based.
9. **Home product cards crashed on "Add to cart"** (missing prop). Cards now read the store themselves.
10. **My Orders was broken** – it called `/orders/my-orders`, which matched `/:orderGroupId` and returned 404; empty history was a 404 too.
11. **Navbar highlighted two items** (Home + About Us, Products + Categories). Exactly one is active now.
12. **Help & Support page was a copy of the Wishlist page.** Replaced with a real FAQ/contact page.
13. **Login** – wrong password showed "Can't reach the server"; it ignored the page you came from; logged user data to the console.
14. **Admin panel** – 5 of 6 sidebar links led nowhere, the dashboard showed hard-coded fake numbers, logout/settings did nothing, admin name was hard-coded. Built Orders, Users, Categories, Analytics, Payments; dashboard uses live data.
15. **Admin categories** – a duplicate route hid inactive categories; analytics response had a `ccharts` typo, counted cancelled orders as revenue and counted order *lines* as orders.
16. **Payments table was never written**, so the admin Payments page was always empty.
17. **Payment page had no Cash on Delivery** although the site promises it; account-number masking regex was wrong (`\\D`).
18. **Order status was per product line**, so one order could be half "Shipped". Status now moves per order with valid transitions; cancelling restores stock.

### Medium / polish
19. **Misleading marketing text removed or made true**: "4.9 by 50,000+ shoppers", "-50%", "free shipping above ₹999" (delivery is always free), "10% off first order / discount code", "prices reset at midnight", "inclusive of all taxes" (GST is added), fake "4.8 – 128 reviews". Ratings/reviews are now real (new reviews feature); stats use real counts.
20. Newsletter form pretended to subscribe; it now stores the address.
21. **"Today's deal" timer overflowed on phones** (three fixed 96px boxes). Now a 3-column grid that always fits.
22. Order IDs could collide (`ORD-${Date.now()}`); now include a random suffix.
23. Receipt and card/UPI summaries were kept in `localStorage`; receipts are now loaded from the server.
24. Hardening: rate-limited login/register/newsletter, security headers, CORS from env, request size limit, JSON/DB error handling, timing-safe login, graceful shutdown, `/health`, removed `/admin/test`, API URL via `VITE_API_URL`, `.env` in `.gitignore`, session-expiry handling.
25. Product form: image must be an http(s) URL; price ceiling; product page: working Buy Now, no more doubling quantity, 404 state, working wishlist heart, related products.
26. `alert()` popups replaced by toasts; `npm test` script fixed.

## Added
Server-side cart, wishlist, product reviews/ratings, order cancel, profile/password change, global search with live suggestions, real category pages, admin Orders/Users/Categories/Analytics/Payments, `db/schema.sql`, tests, env templates.

## Files removed
`backend/data/*` (in-memory cart nobody used), `controllers/admin/categoryController.js` + `routes/admin/categoriesRoutes.js` (shadowed duplicate), `Cartify/src/data/*` (static demo data), `FeatureCard.jsx`, `StatCard.jsx` (unused).

## Action items for you
* **Rotate secrets.** The uploaded zip contained `backend/.env` (8-character DB password, 32-character JWT secret). Choose a stronger DB password and a new random `JWT_SECRET`, and make sure `.env` was never committed.
* Run `backend/db/schema.sql` before starting the new backend.
* Decide on a payment gateway, e-mail provider and (optionally) a discount engine.

## Manual test checklist (about 15 minutes)
1. Logged out: cart icon shows **no number**; clicking Cart/Wishlist/My Orders goes to Login, and after login returns to that page.
2. Register (weak password is rejected) → login (wrong password shows "Invalid email or password").
3. Navbar: on Home only **Home** is underlined; click About Us → scrolls to About and only **About Us** is underlined; Categories → pick one → only **Categories** is underlined.
4. Search "shoe" in the navbar and in the home hero → same results page; suggestions appear while typing.
5. Home: Weekly Edit shows your newest products first; add a product in admin and refresh to confirm it appears first.
6. Shop by category cards open the filtered list; sort pills (Trending / Top rated / price) reorder the grid.
7. Resize to 360px wide: "Today's deals" timer fits, no horizontal scroll.
8. Add to cart on Home and on Products; quantity changes; log out and log in as someone else → their own (empty) cart.
9. Product with stock 2: you cannot add a third; out-of-stock product is disabled.
10. Checkout → pay by COD and by UPI; receipt animates; cart is empty afterwards; product stock decreased.
11. My Orders: order appears; Cancel works while Pending and stock returns.
12. Write a review → rating appears on the card, product page and "Top rated" sort.
13. Admin (`/admin`): dashboard numbers match; Orders → Confirm → Ship → Deliver; Categories add/edit; Payments list shows the order; Users: promote/demote (not yourself).
14. Refresh while on an admin page: you stay in admin.
15. Wait one hour (or delete the cookie) and click anything: you get "session expired" and the login page.
