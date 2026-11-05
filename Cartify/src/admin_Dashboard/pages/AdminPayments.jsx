import { useCallback, useEffect, useState } from "react";
import { api } from "../../api";
import { formatDate, formatINR } from "../../utils/format";
import { STATUS_TONE } from "../constants";
import { Badge, BarList, Card, EmptyState, ErrorBox, MetricCard, PageHeader, Pagination, SearchInput, Spinner, inputClass, useDebounced } from "../components/ui";

const STATUSES = ["paid", "pending", "failed", "refunded"];
const METHODS = ["UPI", "Card", "Net Banking", "COD"];

function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1 });
  const [analytics, setAnalytics] = useState(null);
  const [methods, setMethods] = useState([]);

  const [status, setStatus] = useState("");
  const [method, setMethod] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const debouncedSearch = useDebounced(search);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const q = new URLSearchParams({ page: String(page), limit: "10" });
      if (status) q.set("status", status);
      if (method) q.set("payment_method", method);
      if (debouncedSearch.trim()) q.set("search", debouncedSearch.trim());

      const [list, summary] = await Promise.all([api(`/admin/payments?${q}`), api("/admin/payments/analytics")]);
      setPayments(list.payments);
      setPagination(list.pagination);
      setAnalytics(summary.analytics);
      setMethods(summary.paymentMethodSummary || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, status, method, debouncedSearch]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => setPage(1), [status, method, debouncedSearch]);

  return (
    <div>
      <PageHeader title="Payments" subtitle="Every payment recorded against an order. Payments run in demo mode until a real gateway is connected.">
        <SearchInput value={search} onChange={setSearch} placeholder="Order ID, customer, reference" />
      </PageHeader>

      {analytics && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Collected" value={formatINR(analytics.totalAmount)} icon="₹" tone="green" hint={`${analytics.paidPayments} paid payment${analytics.paidPayments === 1 ? "" : "s"}`} />
          <MetricCard title="Pending (COD)" value={analytics.pendingPayments} icon="⏳" tone="amber" hint="Collected on delivery" />
          <MetricCard title="Failed" value={analytics.failedPayments} icon="✕" tone="red" hint="Includes cancelled unpaid orders" />
          <MetricCard title="Refunded" value={analytics.refundedPayments} icon="↩" tone="indigo" />
        </div>
      )}

      {methods.length > 0 && (
        <Card className="mb-6">
          <h2 className="mb-4 font-semibold text-white">Amount by payment method</h2>
          <BarList items={methods.map((m) => ({ label: m.paymentMethod || "Unknown", value: m.totalAmount }))} format={formatINR} />
        </Card>
      )}

      <div className="mb-5 flex flex-wrap gap-3">
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status" className={`${inputClass} w-auto min-w-40`}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s} className="capitalize">{s}</option>
          ))}
        </select>
        <select value={method} onChange={(e) => setMethod(e.target.value)} aria-label="Filter by method" className={`${inputClass} w-auto min-w-40`}>
          <option value="">All methods</option>
          {METHODS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      <Card className="!p-0">
        {loading && payments.length === 0 ? (
          <Spinner />
        ) : error ? (
          <div className="p-5"><ErrorBox message={error} onRetry={load} /></div>
        ) : payments.length === 0 ? (
          <EmptyState icon="💳" title="No payments found" text={status || method || search ? "Try different filters." : "Payments are recorded when customers place orders."} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-medium">Order</th>
                  <th className="px-5 py-4 font-medium">Customer</th>
                  <th className="px-5 py-4 font-medium">Amount</th>
                  <th className="px-5 py-4 font-medium">Method</th>
                  <th className="px-5 py-4 font-medium">Reference</th>
                  <th className="px-5 py-4 font-medium">Status</th>
                  <th className="px-5 py-4 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {payments.map((p) => (
                  <tr key={p.id} className="text-slate-300 transition hover:bg-white/[0.03]">
                    <td className="max-w-[180px] truncate px-5 py-4 font-semibold text-white">#{p.orderGroupId || p.orderId}</td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-white">{p.user?.name}</p>
                      <p className="max-w-[170px] truncate text-xs text-slate-500">{p.user?.email}</p>
                    </td>
                    <td className="px-5 py-4 font-semibold text-white">{formatINR(p.amount)}</td>
                    <td className="px-5 py-4">
                      {p.paymentMethod}
                      <p className="text-xs text-slate-500">{p.paymentProvider}</p>
                    </td>
                    <td className="max-w-[150px] truncate px-5 py-4 text-xs text-slate-400">{p.providerPaymentId || "—"}</td>
                    <td className="px-5 py-4">
                      <Badge tone={STATUS_TONE[p.status]}>{p.status}</Badge>
                      {p.failureReason && <p className="mt-1 max-w-[150px] truncate text-xs text-slate-500">{p.failureReason}</p>}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">{formatDate(p.paidAt || p.createdAt, true)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Pagination page={pagination.currentPage || page} totalPages={pagination.totalPages} onChange={setPage} />
    </div>
  );
}

export default AdminPayments;
