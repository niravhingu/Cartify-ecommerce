import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, isAbort } from "../api";
import { useStore } from "../context/StoreContext";
import { useToast } from "../context/ToastContext";
import { FALLBACK_IMAGE, formatINR, handleImageError } from "../utils/format";

function Wishlist() {
  const navigate = useNavigate();
  const toast = useToast();
  const { wishlistIds, toggleWishlist, addToCart, cartItems } = useStore();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // full product data comes from the server; the store only keeps the ids
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);

    api("/wishlist", { signal: controller.signal })
      .then((data) => setItems(data.items || []))
      .catch((err) => !isAbort(err) && setError(err.message))
      .finally(() => !controller.signal.aborted && setLoading(false));

    return () => controller.abort();
  }, []);

  // removing from here (or from a heart elsewhere) updates the list
  const shown = items.filter((item) => wishlistIds.includes(item.id));

  const removeItem = async (id) => {
    const result = await toggleWishlist(id);
    if (result.success) toast.success("Removed from wishlist");
    else toast.error(result.message || "Could not update wishlist");
  };

  const moveToCart = async (item) => {
    const result = await addToCart(item, 1);
    if (result.success) toast.success(`${item.product_name} added to cart`);
    else toast.error(result.reason === "out-of-stock" ? "Sorry, this product is out of stock" : result.message || "Could not add to cart");
  };

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <p className="text-sm font-bold uppercase tracking-widest text-orange-500">Saved for later</p>
        <h1 className="mt-2 text-4xl font-black text-gray-950">My Wishlist ♡</h1>
        <p className="mt-2 text-gray-500">Keep your favourite products in one place.</p>

        {loading ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-80 animate-pulse rounded-2xl bg-white shadow-sm" />
            ))}
          </div>
        ) : error ? (
          <p className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</p>
        ) : shown.length === 0 ? (
          <div className="mt-8 rounded-3xl bg-white px-6 py-16 text-center shadow-sm">
            <div className="text-5xl">♡</div>
            <h2 className="mt-4 text-xl font-bold text-gray-900">Your wishlist is empty</h2>
            <p className="mt-2 text-sm text-gray-500">Tap the heart on any product to save it here.</p>
            <button
              onClick={() => navigate("/products")}
              className="mt-6 rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white hover:bg-orange-600"
            >
              Explore Products
            </button>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((item) => {
              const inCart = cartItems.some((c) => String(c.id) === String(item.id));
              const out = Number(item.stock) <= 0;

              return (
                <article key={item.id} className="flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                  <button
                    onClick={() => navigate(`/products/${item.id}`)}
                    className="flex h-48 items-center justify-center overflow-hidden rounded-xl bg-gray-50"
                    aria-label={`View ${item.product_name}`}
                  >
                    <img
                      src={item.image || FALLBACK_IMAGE}
                      onError={handleImageError}
                      alt={item.product_name}
                      className="h-full w-full object-contain p-4"
                    />
                  </button>

                  <h2 className="mt-4 line-clamp-2 font-bold text-gray-900">{item.product_name}</h2>
                  <p className="mt-1 font-bold text-orange-600">{formatINR(item.price)}</p>
                  {out && <p className="mt-1 text-xs font-semibold text-red-600">Out of stock</p>}

                  <div className="mt-auto flex gap-2 pt-4">
                    {inCart ? (
                      <button
                        onClick={() => navigate("/cart")}
                        className="flex-1 rounded-xl bg-gray-950 px-3 py-2.5 text-sm font-bold text-white hover:bg-orange-500"
                      >
                        In cart · View
                      </button>
                    ) : (
                      <button
                        onClick={() => moveToCart(item)}
                        disabled={out}
                        className="flex-1 rounded-xl bg-gray-950 px-3 py-2.5 text-sm font-bold text-white hover:bg-orange-500 disabled:cursor-not-allowed disabled:bg-gray-300"
                      >
                        Add to cart
                      </button>
                    )}

                    <button
                      onClick={() => removeItem(item.id)}
                      className="rounded-xl border border-red-200 px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

export default Wishlist;
