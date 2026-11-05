import { useCallback, useEffect, useState } from "react";
import { api } from "../../api";
import { useToast } from "../../context/ToastContext";
import { formatDate, formatINR } from "../../utils/format";
import { NEXT_STATUSES, ORDER_STATUSES, STATUS_TONE } from "../constants";
import { Badge, Button, EmptyState, ErrorBox, Modal, PageHeader, Pagination, SearchInput, Spinner, useDebounced, Card } from "../components/ui";

function AdminOrders() {
  const toast = useToast();

  const [orders, setOrders] = useState([]);
  const [counts, setCounts] = useState({});
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);

  const debouncedSearch = useDebounced(search);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const q = new URLSearchParams({ page: String(page), limit: "10" });
      if (status) q.set("status", status);
      if (debouncedSearch.trim()) q.set("search", debouncedSearch.trim());

      const data = await api(`/admin/orders?${q}`);
      setOrders(data.orders);
      setCounts(data.statusCounts || {});
      setPagination(data.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, status, debouncedSearch]);

  useEffect(() => {
    load();
  }, [load]);

  // new filter -> back to page 1
  useEffect(() => setPage(1), [status, debouncedSearch]);

  const changeStatus = async (order, next) => {
    if (next === "Cancelled" && !window.confirm("Cancel this order? Items go back to stock and a paid order is marked refunded.")) return;

    setBusy(true);
    try {
      await api(`/admin/orders/${encodeURIComponent(order.order_group_id)}/status`, { method: "PATCH", body: { status: next } });
      toast.success(`Order marked as ${next}`);
      setSelected(null);
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const removeOrder = async (order) => {
    if (!window.confirm("Permanently delete this cancelled order?")) return;
    setBusy(true);
    try {
      await api(`/admin/orders/${encodeURIComponent(order.order_group_id)}`, { method: "DELETE" });
      toast.success("Order deleted");
      setSelected(null);
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const totalAll = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div>
      <PageHeader title="Orders" subtitle="Review, confirm, ship and cancel customer orders.">
        <SearchInput value={search} onChange={setSearch} placeholder="Order ID, customer, product" />
      </PageHeader>

      {/* status tabs */}
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1" role="tablist">
        {[["", "All", totalAll], ...ORDER_STATUSES.map((s) => [s, s, counts[s] || 0])].map(([value, label, n]) => (
          <button
            key={label}
            role="tab"
            aria-selected={status === value}
            onClick={() => setStatus(value)}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
              status === value ? "bg-white text-slate-950" : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
            }`}
          >
            {label}
            <span className={`rounded-md px-1.5 text-xs ${status === value ? "bg-slate-200" : "bg-white/10"}`}>{n}</span>
          </button>
        ))}
      </div>

      <Card className="!p-0">
        {loading && orders.length === 0 ? (
          <Spinner />
        ) : error ? (
          <div className="p-5"><ErrorBox message={error} onRetry={load} /></div>
        ) : orders.length === 0 ? (
          <EmptyState icon="🛒" title="No orders found" text={status || search ? "Try another status or search term." : "Orders will appear here once customers check out."} />
        ) : (
          <>
            {/* desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-4 font-medium">Order</th>
                    <th className="px-5 py-4 font-medium">Customer</th>
                    <th className="px-5 py-4 font-medium">Items</th>
                    <th className="px-5 py-4 font-medium">Total</th>
                    <th className="px-5 py-4 font-medium">Payment</th>
                    <th className="px-5 py-4 font-medium">Status</th>
                    <th className="px-5 py-4" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {orders.map((order) => (
                    <tr key={order.order_group_id} className="text-slate-300 transition hover:bg-white/[0.03]">
                      <td className="px-5 py-4">
                        <p className="max-w-[190px] truncate font-semibold text-white">#{order.order_group_id}</p>
                        <p className="text-xs text-slate-500">{formatDate(order.created_at, true)}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-white">{order.customer_name}</p>
                        <p className="max-w-[180px] truncate text-xs text-slate-500">{order.customer_email}</p>
                      </td>
                      <td className="px-5 py-4">{order.item_count}</td>
                      <td className="px-5 py-4 font-semibold text-white">{formatINR(order.total_amount)}</td>
                      <td className="px-5 py-4">
                        <p>{order.payment_method || "-"}</p>
                        <p className="text-xs text-slate-500">{order.payment_status || "-"}</p>
                      </td>
                      <td className="px-5 py-4"><Badge tone={STATUS_TONE[order.status]}>{order.status}</Badge></td>
                      <td className="px-5 py-4 text-right">
                        <Button variant="ghost" onClick={() => setSelected(order)}>Manage</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* mobile cards */}
            <ul className="divide-y divide-white/5 md:hidden">
              {orders.map((order) => (
                <li key={order.order_group_id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">#{order.order_group_id}</p>
                      <p className="text-xs text-slate-500">{formatDate(order.created_at, true)}</p>
                    </div>
                    <Badge tone={STATUS_TONE[order.status]}>{order.status}</Badge>
                  </div>
                  <p className="mt-3 text-sm text-slate-300">{order.customer_name} · {order.item_count} item{order.item_count === 1 ? "" : "s"}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-lg font-bold text-white">{formatINR(order.total_amount)}</p>
                    <Button variant="ghost" onClick={() => setSelected(order)}>Manage</Button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <Pagination page={pagination.page || page} totalPages={pagination.totalPages} onChange={setPage} />

      {/* details */}
      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? `Order #${selected.order_group_id}` : ""}
        wide
        footer={
          selected && (
            <>
              {selected.status === "Cancelled" && (
                <Button variant="danger" disabled={busy} onClick={() => removeOrder(selected)}>Delete order</Button>
              )}
              {NEXT_STATUSES[selected.status].map((next) => (
                <Button key={next} variant={next === "Cancelled" ? "danger" : "primary"} disabled={busy} onClick={() => changeStatus(selected, next)}>
                  {next === "Cancelled" ? "Cancel order" : `Mark as ${next}`}
                </Button>
              ))}
              <Button variant="ghost" onClick={() => setSelected(null)}>Close</Button>
            </>
          )
        }
      >
        {selected && (
          <div className="space-y-6 text-sm text-slate-300">
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone={STATUS_TONE[selected.status]}>{selected.status}</Badge>
              <span className="text-slate-500">{formatDate(selected.created_at, true)}</span>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Customer</p>
                <p className="font-semibold text-white">{selected.customer_name}</p>
                <p className="break-all">{selected.customer_email}</p>
                <p>{selected.mobile}</p>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Delivery address</p>
                <p>{selected.address}</p>
                <p>{selected.city}, {selected.state}</p>
                <p>PIN {selected.pincode}</p>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Items</p>
              <ul className="divide-y divide-white/10 rounded-2xl border border-white/10">
                {selected.items.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-white">{item.product_name}</p>
                      <p className="text-xs text-slate-500">{formatINR(item.price)} × {item.quantity}</p>
                    </div>
                    <p className="shrink-0 font-semibold text-white">{formatINR(item.price * item.quantity)}</p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/5 px-4 py-3">
              <div>
                <p className="text-xs text-slate-500">Payment</p>
                <p className="font-semibold text-white">{selected.payment_method} · {selected.payment_status}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">Order total (incl. GST & charges)</p>
                <p className="text-xl font-bold text-white">{formatINR(selected.total_amount)}</p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default AdminOrders;
