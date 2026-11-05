import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, isAbort } from "../api";
import { useToast } from "../context/ToastContext";
import { FALLBACK_IMAGE, formatDate, formatINR, handleImageError } from "../utils/format";

const STATUS_STYLES = {
  Pending: "bg-amber-50 text-amber-700",
  Confirmed: "bg-blue-50 text-blue-700",
  Shipped: "bg-indigo-50 text-indigo-700",
  Delivered: "bg-emerald-50 text-emerald-700",
  Cancelled: "bg-red-50 text-red-700",
};

const FILTERS = ["All", "Pending", "Confirmed", "Shipped", "Delivered", "Cancelled"];

function MyOrders() {
  const navigate = useNavigate();
  const toast = useToast();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("All");
  const [cancellingId, setCancellingId] = useState(null);

  const load = useCallback(async (signal) => {
    setLoading(true);
    setError("");
    try {
      const data = await api("/orders", { signal });
      setOrders(data.orders || []);
    } catch (err) {
      if (!isAbort(err)) setError(err.message || "Unable to load your orders.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const visible = useMemo(
    () => (filter === "All" ? orders : orders.filter((o) => o.status === filter)),
    [orders, filter]
  );

  const cancelOrder = async (order) => {
    if (!window.confirm("Cancel this order? Items go back to stock and any payment will be refunded.")) return;

    setCancellingId(order.order_group_id);
    try {
      await api(`/orders/${encodeURIComponent(order.order_group_id)}/cancel`, { method: "PATCH" });
      toast.success("Order cancelled");
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange-500">Cartify account</p>

        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-950 sm:text-4xl">My Orders</h1>
            <p className="mt-2 text-sm text-gray-500">Your purchases and order status, all in one place.</p>
          </div>

          <button
            onClick={() => navigate("/products")}
            className="rounded-xl bg-gray-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-orange-500"
          >
            Shop Products →
          </button>
        </div>

        {orders.length > 0 && (
          <div className="mt-6 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Filter orders">
            {FILTERS.map((name) => (
              <button
                key={name}
                role="tab"
                aria-selected={filter === name}
                onClick={() => setFilter(name)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  filter === name ? "bg-gray-950 text-white" : "bg-white text-gray-600 ring-1 ring-gray-200 hover:ring-gray-400"
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        )}

        {loading && (
          <div className="mt-8 space-y-4">
            {[0, 1].map((i) => (
              <div key={i} className="h-48 animate-pulse rounded-2xl bg-white shadow-sm" />
            ))}
          </div>
        )}

        {error && (
          <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            {error}
            <button onClick={() => load()} className="ml-3 font-bold underline">Try again</button>
          </div>
        )}

        {!loading && !error && orders.length === 0 && (
          <div className="mt-8 rounded-3xl border border-gray-100 bg-white px-6 py-16 text-center shadow-sm">
            <div className="text-5xl">📦</div>
            <h2 className="mt-4 text-xl font-bold text-gray-900">No orders yet</h2>
            <p className="mt-2 text-sm text-gray-500">Your confirmed orders will appear here.</p>
            <button
              onClick={() => navigate("/products")}
              className="mt-6 rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white hover:bg-orange-600"
            >
              Explore Products
            </button>
          </div>
        )}

        {!loading && !error && orders.length > 0 && visible.length === 0 && (
          <p className="mt-8 rounded-2xl bg-white p-8 text-center text-gray-500 shadow-sm">
            No {filter.toLowerCase()} orders.
          </p>
        )}

        <div className="mt-8 space-y-4">
          {visible.map((order) => (
            <article
              key={order.order_group_id}
              className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md sm:p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Order reference</p>
                  <h2 className="mt-1 break-all font-bold text-gray-900">#{order.order_group_id}</h2>
                  <p className="mt-2 text-xs text-gray-500">{formatDate(order.created_at, true)}</p>
                </div>

                <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${STATUS_STYLES[order.status] || "bg-gray-100 text-gray-700"}`}>
                  {order.status}
                </span>
              </div>

              {/* items */}
              <ul className="mt-5 space-y-3 border-t border-gray-100 pt-5">
                {order.items.map((item) => (
                  <li key={item.id} className="flex items-center gap-3">
                    <img
                      src={item.image || FALLBACK_IMAGE}
                      onError={handleImageError}
                      alt=""
                      className="h-14 w-14 shrink-0 rounded-xl bg-gray-100 object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      {item.product_id ? (
                        <Link to={`/products/${item.product_id}`} className="block truncate font-semibold text-gray-900 hover:text-orange-600">
                          {item.product_name}
                        </Link>
                      ) : (
                        <p className="truncate font-semibold text-gray-900">{item.product_name}</p>
                      )}
                      <p className="text-xs text-gray-500">
                        {formatINR(item.price)} × {item.quantity}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-bold text-gray-900">{formatINR(item.total)}</p>
                  </li>
                ))}
              </ul>

              <div className="mt-5 grid gap-4 border-t border-gray-100 pt-5 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-gray-400">Order total</p>
                  <p className="mt-1 text-lg font-black text-gray-900">{formatINR(order.total_amount)}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-400">Payment method</p>
                  <p className="mt-1 font-semibold text-gray-800">{order.payment_method || "Not specified"}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-400">Payment status</p>
                  <p className="mt-1 font-semibold text-gray-800">{order.payment_status || "Pending"}</p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  onClick={() => navigate(`/order-success/${encodeURIComponent(order.order_group_id)}`)}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-orange-300 hover:text-orange-600"
                >
                  View Receipt →
                </button>

                {order.can_cancel && (
                  <button
                    onClick={() => cancelOrder(order)}
                    disabled={cancellingId === order.order_group_id}
                    className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                  >
                    {cancellingId === order.order_group_id ? "Cancelling..." : "Cancel order"}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}

export default MyOrders;
