import { useNavigate } from "react-router-dom";
import { useStore } from "../context/StoreContext";
import { handleImageError } from "../utils/format";

function Cart() {
  const navigate = useNavigate();

  // The cart lives on the server; totals are calculated there too, so what
  // you see here is exactly what checkout will charge.
  const { cartItems, cartSummary, cartLoading, removeFromCart, updateQuantity } = useStore();

  const money = (value) =>
    Number(value || 0).toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    });

  const totalItems = cartSummary.totalQuantity;
  const subtotal = cartSummary.subtotal;
  const gst = cartSummary.gst;
  const otherCharges = cartSummary.otherCharges;
  const total = cartSummary.totalAmount;
  const blocked = cartSummary.hasUnavailable;

  if (cartLoading && cartItems.length === 0) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-200 border-t-orange-500" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50/30 px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-orange-500">
            Cartify.
          </p>

          <h1 className="mt-2 text-4xl font-black tracking-tight text-gray-900">
            Your Shopping Cart
          </h1>

          <p className="mt-2 text-gray-500">
            Your picks, ready for checkout.
          </p>
        </div>

        {cartItems.length === 0 ? (
          <section className="rounded-3xl border border-gray-100 bg-white px-6 py-20 text-center shadow-sm">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-orange-50 text-4xl">
              🛒
            </div>

            <h2 className="mt-5 text-2xl font-black text-gray-900">
              Your cart is empty
            </h2>

            <p className="mt-2 text-gray-500">
              Find something you love and add it to your cart.
            </p>

            <button
              onClick={() => navigate("/products")}
              className="mt-6 rounded-xl bg-gray-950 px-6 py-3 font-bold text-white transition hover:bg-orange-500 hover:text-gray-950"
            >
              Explore Products →
            </button>
          </section>
        ) : (
          <div className="grid items-start gap-8 lg:grid-cols-[1fr_360px]">
            <section className="space-y-5">
              <div className="flex items-center justify-between rounded-2xl bg-gray-950 px-5 py-4 text-white">
                <span className="font-bold">Your Shopping Bag</span>
                <span className="rounded-full bg-orange-400 px-3 py-1 text-sm font-black text-gray-950">
                  {totalItems} items
                </span>
              </div>

              {cartItems.map((item) => {
                const id = item.id ?? item.product_id;
                const quantity = Number(item.quantity) || 1;
                const stock = Number(item.stock ?? Infinity);
                const lineTotal = Number(item.price || 0) * quantity;

                return (
                  <article
                    key={id}
                    className="group flex flex-col gap-5 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl sm:flex-row"
                  >
                    <div className="flex h-44 w-full shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gray-50 sm:h-36 sm:w-36">
                      {item.image ? (
                        <img
                          src={item.image}
                          onError={handleImageError}
                          alt={item.product_name || item.name || "Product"}
                          className="h-full w-full object-contain p-4 transition duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <span className="text-4xl">📦</span>
                      )}
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col">
                      <p className="text-xs font-bold uppercase tracking-widest text-orange-500">
                        {item.category_name || "Cartify Collection"}
                      </p>

                      <h2 className="mt-2 text-lg font-black text-gray-900">
                        {item.product_name || item.name || "Product"}
                      </h2>

                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-500">
                        {item.description || "Quality products, selected for you."}
                      </p>

                      {item.available ? (
                        <p className={`mt-auto pt-4 text-sm font-semibold ${stock <= 5 ? "text-amber-600" : "text-green-700"}`}>
                          {stock <= 5 ? `Only ${stock} left in stock` : "✓ Available for order"}
                        </p>
                      ) : (
                        <p className="mt-auto pt-4 text-sm font-semibold text-red-600">
                          ✕ Out of stock. Remove it to continue.
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                      <div className="text-right">
                        <p className={`text-xl font-black ${item.available ? "text-gray-950" : "text-gray-300 line-through"}`}>
                          ₹{money(lineTotal)}
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                          ₹{money(item.price)} each
                        </p>
                      </div>

                      <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-1">
                        <button
                          type="button"
                          aria-label="Decrease quantity"
                          onClick={() => updateQuantity(id, -1)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-lg font-bold hover:bg-gray-200"
                        >
                          −
                        </button>

                        <span className="w-8 text-center text-sm font-bold">
                          {quantity}
                        </span>

                        <button
                          type="button"
                          aria-label="Increase quantity"
                          disabled={quantity >= stock}
                          onClick={() => updateQuantity(id, 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-950 text-lg font-bold text-white hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromCart(id)}
                        className="text-sm font-bold text-red-500 transition hover:text-red-700"
                      >
                        Remove item
                      </button>
                    </div>
                  </article>
                );
              })}

              <button
                type="button"
                onClick={() => navigate("/products")}
                className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-gray-700 transition hover:border-orange-400 hover:text-orange-600"
              >
                ← Continue Shopping
              </button>
            </section>

            <aside className="h-fit rounded-3xl border border-gray-100 bg-white p-6 shadow-lg lg:sticky lg:top-28">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-500">
                Cartify.
              </p>

              <h2 className="mt-2 text-2xl font-black text-gray-950">
                Order Summary
              </h2>

              <div className="mt-6 space-y-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Items ({totalItems})</span>
                  <span className="font-bold">₹{money(subtotal)}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">GST (6%)</span>
                  <span className="font-bold">₹{money(gst)}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">Other Charges</span>
                  <span className="font-bold">₹{money(otherCharges)}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">Delivery</span>
                  <span className="font-bold text-green-600">FREE</span>
                </div>
              </div>

              <div className="my-6 border-t border-dashed border-gray-200" />

              <div className="flex items-center justify-between gap-3">
                <span className="font-bold text-gray-700">Total</span>
                <span className="text-2xl font-black text-gray-950">
                  ₹{money(total)}
                </span>
              </div>

              {blocked && (
                <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  Some items are out of stock. Remove them to continue.
                </p>
              )}

              <button
                onClick={() => navigate("/checkout")}
                disabled={blocked || cartSummary.itemCount === 0}
                className="mt-6 w-full rounded-xl bg-gray-950 px-4 py-4 font-bold text-white transition hover:bg-orange-500 hover:text-gray-950 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-gray-950 disabled:hover:text-white"
              >
                Proceed to Checkout →
              </button>

              <p className="mt-4 text-center text-xs text-gray-400">
                🔒 Secure checkout experience
              </p>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}

export default Cart;