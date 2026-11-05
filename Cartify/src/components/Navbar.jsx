import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useStore } from "../context/StoreContext";
import SearchBox from "./SearchBox";

// Exactly ONE of these is active at a time (the old version highlighted Home
// together with About Us, and Products together with Categories).
const isActive = (key, { pathname, search, hash }) => {
  const params = new URLSearchParams(search);

  switch (key) {
    case "home":
      return pathname === "/" && hash !== "#about";
    case "about":
      return pathname === "/" && hash === "#about";
    case "products":
      return pathname.startsWith("/products") && !(pathname === "/products" && params.get("category"));
    case "categories":
      return pathname === "/products" && Boolean(params.get("category"));
    case "orders":
      return pathname.startsWith("/orders");
    default:
      return false;
  }
};

function Navbar({ currentUser, setIsLoggedIn, setCurrentUser }) {
  const { isLoggedIn, cartCount, wishlistIds, categories } = useStore();

  const [accountOpen, setAccountOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const accountRef = useRef(null);
  const moreRef = useRef(null);
  const categoriesRef = useRef(null);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setAccountOpen(false);
    setMoreOpen(false);
    setCategoriesOpen(false);
    setMobileOpen(false);
  }, [location.pathname, location.search, location.hash]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (accountRef.current && !accountRef.current.contains(event.target)) setAccountOpen(false);
      if (moreRef.current && !moreRef.current.contains(event.target)) setMoreOpen(false);
      if (categoriesRef.current && !categoriesRef.current.contains(event.target)) setCategoriesOpen(false);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const goProtected = (path) => {
    if (!isLoggedIn) {
      navigate("/login", { state: { from: path } });
      return;
    }
    navigate(path);
  };

  const goAbout = () => {
    if (location.pathname === "/") {
      // already on Home: just scroll (Home listens to the hash too)
      navigate("/#about");
      document.getElementById("about")?.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate("/#about");
    }
  };

  const handleLogout = async () => {
    try {
      await api("/users/logout", { method: "POST" });
    } catch (error) {
      console.error("Logout request failed:", error);
    } finally {
      // StoreProvider empties the cart + wishlist as soon as isLoggedIn is false
      setIsLoggedIn(false);
      setCurrentUser(null);
      setAccountOpen(false);
      navigate("/");
    }
  };

  const linkClass = (active) =>
    `whitespace-nowrap border-b-2 py-3 text-sm font-semibold transition ${
      active
        ? "border-orange-500 text-orange-500"
        : "border-transparent text-gray-700 hover:text-orange-500"
    }`;

  const nav = [
    { key: "home", label: "Home", onClick: () => navigate("/") },
    { key: "products", label: "Products", onClick: () => navigate("/products") },
    { key: "orders", label: "My Orders", onClick: () => goProtected("/orders") },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur-xl">
      <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-10">
        {/* Top row */}
        <div className="flex min-h-[76px] items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="flex shrink-0 items-center gap-2"
            aria-label="Cartify home"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-white shadow-lg shadow-orange-500/20">
              <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="2">
                <path d="M3 4h2l2.1 10.1a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L20 8H6" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="10" cy="20" r="1" />
                <circle cx="18" cy="20" r="1" />
              </svg>
            </span>

            <span className="text-2xl font-black tracking-tight text-gray-950">
              Cartify<span className="text-orange-500">.</span>
            </span>
          </button>

          {/* Search (desktop) */}
          <div className="mx-auto hidden max-w-xl flex-1 md:block">
            <SearchBox variant="navbar" placeholder="Search products, categories..." />
          </div>

          {/* Right side actions */}
          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-3">
            <button
              onClick={() => goProtected("/wishlist")}
              className="relative flex h-10 w-10 items-center justify-center rounded-xl text-gray-700 transition hover:bg-orange-50 hover:text-orange-500"
              title="Wishlist"
              aria-label="Wishlist"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.8">
                <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {isLoggedIn && wishlistIds.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-900 px-1 text-[10px] font-bold text-white">
                  {wishlistIds.length}
                </span>
              )}
            </button>

            <button
              onClick={() => goProtected("/cart")}
              className="relative flex h-10 w-10 items-center justify-center rounded-xl text-gray-700 transition hover:bg-orange-50 hover:text-orange-500"
              title="Cart"
              aria-label={cartCount > 0 ? `Shopping cart, ${cartCount} items` : "Shopping cart"}
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.8">
                <path d="M3 4h2l2.1 10.1a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L20 8H6" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="10" cy="20" r="1" />
                <circle cx="18" cy="20" r="1" />
              </svg>

              {/* only for logged-in shoppers who really have items */}
              {isLoggedIn && cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </button>

            {/* Account dropdown */}
            <div className="relative" ref={accountRef}>
              <button
                onClick={() => {
                  setAccountOpen((open) => !open);
                  setMoreOpen(false);
                }}
                className="flex h-10 items-center gap-2 rounded-xl px-2 text-gray-700 transition hover:bg-gray-100"
                aria-expanded={accountOpen}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-700">
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 21a8 8 0 0 1 16 0" strokeLinecap="round" />
                  </svg>
                </span>
                <span className="hidden text-left sm:block">
                  <span className="block text-xs text-gray-400">{isLoggedIn ? "Welcome back" : "Welcome"}</span>
                  <span className="block max-w-24 truncate text-sm font-bold">
                    {isLoggedIn ? currentUser?.name || "Account" : "Account"}
                  </span>
                </span>
              </button>

              {accountOpen && (
                <div className="absolute right-0 top-14 z-50 w-60 overflow-hidden rounded-2xl border border-gray-100 bg-white p-2 shadow-2xl">
                  <div className="border-b border-gray-100 px-3 py-3">
                    <p className="font-bold text-gray-900">
                      {isLoggedIn ? currentUser?.name || "My Account" : "Welcome to Cartify"}
                    </p>
                    <p className="mt-1 truncate text-xs text-gray-500">
                      {isLoggedIn ? currentUser?.email || "" : "Sign in to manage your orders"}
                    </p>
                  </div>

                  {isLoggedIn ? (
                    <>
                      <DropdownItem label="My Profile" onClick={() => navigate("/profile")} />
                      <DropdownItem label="My Orders" onClick={() => navigate("/orders")} />
                      <DropdownItem label="Wishlist" onClick={() => navigate("/wishlist")} />
                      <DropdownItem label="Settings" onClick={() => navigate("/settings")} />
                      {currentUser?.role === "admin" && (
                        <DropdownItem label="Admin Dashboard" onClick={() => navigate("/admin")} />
                      )}
                      <button
                        onClick={handleLogout}
                        className="mt-1 w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50"
                      >
                        Log out
                      </button>
                    </>
                  ) : (
                    <>
                      <DropdownItem label="Login" onClick={() => navigate("/login")} />
                      <button
                        onClick={() => navigate("/register")}
                        className="mt-1 w-full rounded-xl bg-orange-500 px-3 py-2.5 text-left text-sm font-bold text-white transition hover:bg-orange-600"
                      >
                        Create an account
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Three-dot menu */}
            <div className="relative" ref={moreRef}>
              <button
                onClick={() => {
                  setMoreOpen((open) => !open);
                  setAccountOpen(false);
                }}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-700 transition hover:bg-gray-100"
                aria-label="More options"
                aria-expanded={moreOpen}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                  <circle cx="12" cy="5" r="1.8" />
                  <circle cx="12" cy="12" r="1.8" />
                  <circle cx="12" cy="19" r="1.8" />
                </svg>
              </button>

              {moreOpen && (
                <div className="absolute right-0 top-14 z-50 w-56 rounded-2xl border border-gray-100 bg-white p-2 shadow-2xl">
                  <DropdownItem label="Wishlist" onClick={() => goProtected("/wishlist")} />
                  <DropdownItem label="Help & Support" onClick={() => navigate("/help")} />
                  <DropdownItem label="Contact Us" onClick={() => navigate("/help")} />
                  <DropdownItem label="FAQ" onClick={() => navigate("/help#faq")} />
                  <DropdownItem label="Track My Orders" onClick={() => goProtected("/orders")} />
                </div>
              )}
            </div>

            <button
              onClick={() => setMobileOpen((open) => !open)}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-700 hover:bg-gray-100 md:hidden"
              aria-label="Toggle navigation"
              aria-expanded={mobileOpen}
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="2">
                {mobileOpen ? <path d="m6 6 12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
          </div>
        </div>

        {/* Main navigation row (desktop) */}
        <nav className="hidden items-center gap-8 border-t border-gray-100 md:flex" aria-label="Main">
          {nav.slice(0, 2).map((link) => (
            <button
              key={link.key}
              onClick={link.onClick}
              aria-current={isActive(link.key, location) ? "page" : undefined}
              className={linkClass(isActive(link.key, location))}
            >
              {link.label}
            </button>
          ))}

          {/* Categories: real categories from the database */}
          <div className="relative" ref={categoriesRef}>
            <button
              onClick={() => setCategoriesOpen((open) => !open)}
              aria-expanded={categoriesOpen}
              aria-current={isActive("categories", location) ? "page" : undefined}
              className={`${linkClass(isActive("categories", location))} flex items-center gap-1`}
            >
              Categories
              <svg viewBox="0 0 24 24" className={`h-4 w-4 transition ${categoriesOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {categoriesOpen && (
              <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-2xl border border-gray-100 bg-white p-2 shadow-2xl">
                {categories.length === 0 ? (
                  <p className="px-3 py-3 text-sm text-gray-500">No categories yet.</p>
                ) : (
                  categories.map((category) => (
                    <Link
                      key={category.id}
                      to={`/products?category=${encodeURIComponent(category.slug)}`}
                      className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-orange-50 hover:text-orange-600"
                    >
                      <span className="truncate">{category.name}</span>
                      <span className="ml-3 shrink-0 text-xs text-gray-400">{category.product_count}</span>
                    </Link>
                  ))
                )}
                <Link
                  to="/products"
                  className="mt-1 block rounded-xl border-t border-gray-100 px-3 py-2.5 text-sm font-semibold text-orange-600 hover:bg-orange-50"
                >
                  View all products →
                </Link>
              </div>
            )}
          </div>

          {nav.slice(2).map((link) => (
            <button
              key={link.key}
              onClick={link.onClick}
              aria-current={isActive(link.key, location) ? "page" : undefined}
              className={linkClass(isActive(link.key, location))}
            >
              {link.label}
            </button>
          ))}

          <button
            onClick={goAbout}
            aria-current={isActive("about", location) ? "page" : undefined}
            className={linkClass(isActive("about", location))}
          >
            About Us
          </button>

          <div className="ml-auto flex items-center gap-2 text-xs font-medium text-gray-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Shopping made smarter
          </div>
        </nav>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="max-h-[75vh] space-y-1 overflow-y-auto border-t border-gray-100 py-3 md:hidden">
            <div className="mb-3">
              <SearchBox variant="navbar" placeholder="Search products..." onDone={() => setMobileOpen(false)} />
            </div>

            {[
              { key: "home", label: "Home", onClick: () => navigate("/") },
              { key: "products", label: "Products", onClick: () => navigate("/products") },
              { key: "orders", label: "My Orders", onClick: () => goProtected("/orders") },
              { key: "about", label: "About Us", onClick: goAbout },
            ].map((link) => (
              <MobileLink key={link.key} active={isActive(link.key, location)} onClick={link.onClick}>
                {link.label}
              </MobileLink>
            ))}

            <p className="px-3 pb-1 pt-3 text-xs font-bold uppercase tracking-wider text-gray-400">Categories</p>
            {categories.map((category) => (
              <MobileLink
                key={category.id}
                active={
                  location.pathname === "/products" &&
                  new URLSearchParams(location.search).get("category") === category.slug
                }
                onClick={() => navigate(`/products?category=${encodeURIComponent(category.slug)}`)}
              >
                {category.name}
              </MobileLink>
            ))}

            <MobileLink onClick={() => navigate("/help")}>Help & Support</MobileLink>
          </div>
        )}
      </div>
    </header>
  );
}

function MobileLink({ active = false, onClick, children }) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`block w-full rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${
        active ? "bg-orange-50 text-orange-600" : "text-gray-700 hover:bg-orange-50 hover:text-orange-600"
      }`}
    >
      {children}
    </button>
  );
}

function DropdownItem({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-gray-700 transition hover:bg-orange-50 hover:text-orange-600"
    >
      {label}
    </button>
  );
}

export default Navbar;
