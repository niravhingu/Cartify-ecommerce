import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../context/StoreContext";
import { useToast } from "../context/ToastContext";
import { FALLBACK_IMAGE, formatINR, handleImageError } from "../utils/format";

// Works anywhere (home, products, wishlist...). It reads the cart and wishlist
// from the store itself, so the parent never has to pass add/remove callbacks.
function ProductCard({ product }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { isLoggedIn, cartItems, addToCart, updateQuantity, isInWishlist, toggleWishlist } = useStore();

  const [busy, setBusy] = useState(false);

  const stock = Number(product.stock);
  const outOfStock = stock <= 0;
  const cartItem = cartItems.find((item) => String(item.id) === String(product.id));
  const quantity = cartItem?.quantity || 0;
  const liked = isInWishlist(product.id);

  const requireLogin = () => {
    toast.info("Please log in first");
    navigate("/login", { state: { from: `/products/${product.id}` } });
  };

  const handleAdd = async (event) => {
    event.stopPropagation();
    if (!isLoggedIn) return requireLogin();
    if (busy) return;

    setBusy(true);
    const result = await addToCart(product);
    setBusy(false);

    if (result.success) toast.success(`${product.product_name} added to cart`);
    else if (result.reason === "out-of-stock") toast.error("Sorry, this product is out of stock");
    else toast.error(result.message || "Could not add to cart");
  };

  const handleWishlist = async (event) => {
    event.stopPropagation();
    if (!isLoggedIn) return requireLogin();

    const result = await toggleWishlist(product.id);
    if (result.success) toast.success(result.liked ? "Added to wishlist" : "Removed from wishlist");
    else toast.error(result.message || "Could not update wishlist");
  };

  return (
    <div
      onClick={() => navigate(`/products/${product.id}`)}
      className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
    >
      {/* Product Image */}
      <div className="relative h-56 overflow-hidden bg-gray-100">
        <img
          src={product.image || FALLBACK_IMAGE}
          onError={handleImageError}
          alt={product.product_name}
          loading="lazy"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />

        <span
          className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-semibold ${
            outOfStock ? "bg-red-100 text-red-700" : stock <= 5 ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"
          }`}
        >
          {outOfStock ? "Out of Stock" : stock <= 5 ? `Only ${stock} left` : "In Stock"}
        </span>

        <button
          onClick={handleWishlist}
          aria-pressed={liked}
          aria-label={liked ? "Remove from wishlist" : "Add to wishlist"}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow transition hover:scale-110"
        >
          <svg viewBox="0 0 24 24" className={`h-5 w-5 ${liked ? "fill-red-500 text-red-500" : "fill-none text-gray-600"}`} stroke="currentColor" strokeWidth="1.8">
            <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Product Details */}
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium text-gray-500">{product.category_name || "Uncategorized"}</p>

          {product.rating ? (
            <p className="flex shrink-0 items-center gap-1 text-xs font-bold text-gray-700">
              <span className="text-amber-500">★</span>
              {Number(product.rating).toFixed(1)}
              <span className="font-normal text-gray-400">({product.review_count})</span>
            </p>
          ) : null}
        </div>

        <h2 className="mb-2 line-clamp-2 text-lg font-bold text-gray-900">{product.product_name}</h2>

        <p className="mb-4 line-clamp-2 text-sm leading-6 text-gray-500">
          {product.description || "No description available"}
        </p>

        <div className="mt-auto flex items-center justify-between gap-3">
          <p className="text-xl font-bold text-gray-900">{formatINR(product.price)}</p>

          {quantity === 0 ? (
            <button
              onClick={handleAdd}
              disabled={outOfStock || busy}
              className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {outOfStock ? "Out of Stock" : busy ? "Adding..." : "Add To Cart"}
            </button>
          ) : (
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-1"
            >
              <button
                onClick={() => updateQuantity(product.id, -1)}
                aria-label="Decrease quantity"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-lg font-bold text-gray-700 shadow-sm hover:bg-gray-200"
              >
                −
              </button>

              <span className="w-8 text-center text-sm font-bold text-gray-900">{quantity}</span>

              <button
                onClick={() => updateQuantity(product.id, 1)}
                disabled={quantity >= stock}
                aria-label="Increase quantity"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-lg font-bold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProductCard;
