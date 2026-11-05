/* eslint-disable react-refresh/only-export-components -- this file exports a hook next to its components on purpose */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api";

const StoreContext = createContext(null);

const EMPTY_SUMMARY = {
  subtotal: 0,
  gst: 0,
  otherCharges: 0,
  deliveryCharge: 0,
  totalAmount: 0,
  itemCount: 0,
  totalQuantity: 0,
  hasUnavailable: false,
};

// Keys older versions of the app used. The cart now lives in the database
// (per user), so these are removed to stop a stale "1" showing in the navbar.
const LEGACY_KEYS = ["cartify_cart", "cartify_wishlist", "wishlist", "cartify_last_order"];

/**
 * Owns the shopper's server-side state: cart, wishlist and the category list.
 * Cart + wishlist exist ONLY while logged in; logging out wipes them from memory.
 */
export function StoreProvider({ isLoggedIn, children }) {
  const [cartItems, setCartItems] = useState([]);
  const [cartSummary, setCartSummary] = useState(EMPTY_SUMMARY);
  const [cartLoading, setCartLoading] = useState(false);
  const [wishlistIds, setWishlistIds] = useState([]);
  const [categories, setCategories] = useState([]);

  // lets the stable callbacks below see the latest login state
  const loggedInRef = useRef(isLoggedIn);
  useEffect(() => {
    loggedInRef.current = isLoggedIn;
  }, [isLoggedIn]);

  const applyCart = useCallback((data) => {
    setCartItems(Array.isArray(data?.items) ? data.items : []);
    setCartSummary({ ...EMPTY_SUMMARY, ...(data?.summary || {}) });
  }, []);

  const refreshCart = useCallback(async () => {
    if (!loggedInRef.current) return;
    try {
      applyCart(await api("/cart"));
    } catch (error) {
      console.error("Cart load failed:", error.message);
    }
  }, [applyCart]);

  const refreshWishlist = useCallback(async () => {
    if (!loggedInRef.current) return;
    try {
      const data = await api("/wishlist");
      setWishlistIds(data.ids || []);
    } catch (error) {
      console.error("Wishlist load failed:", error.message);
    }
  }, []);

  // one-time cleanup of the old localStorage cart
  useEffect(() => {
    LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));
  }, []);

  // public category list (navbar menu, home page, filters)
  useEffect(() => {
    let cancelled = false;
    api("/products/categories")
      .then((data) => !cancelled && setCategories(data.categories || []))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // login -> load; logout -> wipe
  useEffect(() => {
    if (isLoggedIn) {
      setCartLoading(true);
      Promise.all([refreshCart(), refreshWishlist()]).finally(() => setCartLoading(false));
    } else {
      setCartItems([]);
      setCartSummary(EMPTY_SUMMARY);
      setWishlistIds([]);
      LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));
    }
  }, [isLoggedIn, refreshCart, refreshWishlist]);

  // ---------------------------------------------------------------- cart
  const addToCart = useCallback(
    async (product, quantity = 1) => {
      if (!loggedInRef.current) return { success: false, reason: "login-required" };

      const productId = product?.id ?? product?.product_id;
      if (productId == null) return { success: false, reason: "invalid-product" };
      if (Number(product?.stock) <= 0) return { success: false, reason: "out-of-stock" };

      try {
        const data = await api("/cart", {
          method: "POST",
          body: { productId, quantity: Math.max(1, Number(quantity) || 1) },
        });
        applyCart(data);
        return { success: true, atLimit: Boolean(data.atLimit) };
      } catch (error) {
        return {
          success: false,
          reason: error.status === 409 ? "out-of-stock" : "error",
          message: error.message,
        };
      }
    },
    [applyCart]
  );

  const updateQuantity = useCallback(
    async (id, change) => {
      const current = cartItems.find((item) => String(item.id) === String(id));
      if (!current) return;

      const next = Number(current.quantity) + change;
      if (next > Number(current.stock)) return;

      // instant feedback, then let the server confirm
      setCartItems((list) =>
        list
          .map((item) => (String(item.id) === String(id) ? { ...item, quantity: next } : item))
          .filter((item) => item.quantity > 0)
      );

      try {
        applyCart(await api("/cart", { method: "PUT", body: { productId: id, quantity: Math.max(next, 0) } }));
      } catch {
        refreshCart();
      }
    },
    [applyCart, cartItems, refreshCart]
  );

  const removeFromCart = useCallback(
    async (id) => {
      setCartItems((list) => list.filter((item) => String(item.id) !== String(id)));
      try {
        applyCart(await api(`/cart/${id}`, { method: "DELETE" }));
      } catch {
        refreshCart();
      }
    },
    [applyCart, refreshCart]
  );

  // ------------------------------------------------------------ wishlist
  const toggleWishlist = useCallback(async (productId) => {
    if (!loggedInRef.current) return { success: false, reason: "login-required" };

    const id = Number(productId);
    let wasLiked = false;

    setWishlistIds((ids) => {
      wasLiked = ids.includes(id);
      return wasLiked ? ids.filter((x) => x !== id) : [...ids, id];
    });

    try {
      const data = wasLiked
        ? await api(`/wishlist/${id}`, { method: "DELETE" })
        : await api("/wishlist", { method: "POST", body: { productId: id } });
      setWishlistIds(data.ids || []);
      return { success: true, liked: !wasLiked };
    } catch (error) {
      refreshWishlist();
      return { success: false, reason: "error", message: error.message };
    }
  }, [refreshWishlist]);

  const value = useMemo(
    () => ({
      isLoggedIn,
      categories,
      cartItems,
      cartSummary,
      cartLoading,
      // number shown on the navbar badge: always 0 when logged out
      cartCount: isLoggedIn ? cartSummary.totalQuantity || 0 : 0,
      addToCart,
      updateQuantity,
      removeFromCart,
      refreshCart,
      wishlistIds,
      isInWishlist: (id) => wishlistIds.includes(Number(id)),
      toggleWishlist,
      refreshWishlist,
    }),
    [
      isLoggedIn, categories, cartItems, cartSummary, cartLoading, addToCart, updateQuantity,
      removeFromCart, refreshCart, wishlistIds, toggleWishlist, refreshWishlist,
    ]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}
