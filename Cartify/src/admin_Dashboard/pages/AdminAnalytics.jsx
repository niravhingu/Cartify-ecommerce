import { useCallback, useEffect, useState } from "react";
import { api } from "../../api";
import { formatINR } from "../../utils/format";
import { AreaChart, BarList, Button, Card, ErrorBox, MetricCard, PageHeader, Spinner } from "../components/ui";

const growth = (pct) => `${pct >= 0 ? "▲" : "▼"} ${Math.abs(pct)}% vs last month`;

function AdminAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await api("/admin/analytics"));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) return <Spinner label="Crunching the numbers..." />;
  if (error && !data) return <ErrorBox message={error} onRetry={load} />;

  const { summary, revenue, orders, charts, topProducts, categoryAnalytics } = data;
  const maxStock = Math.max(...categoryAnalytics.map((c) => c.totalProducts), 0);

  return (
    <div>
      <PageHeader title="Analytics" subtitle="Sales and catalogue performance. Cancelled orders are excluded from revenue.">
        <Button variant="ghost" onClick={load} disabled={loading}>{loading ? "Refreshing..." : "↻ Refresh"}</Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total revenue" value={formatINR(summary.totalRevenue)} icon="₹" tone="green" hint={`Average order ${formatINR(summary.averageOrderValue)}`} />
        <MetricCard title="This month" value={formatINR(revenue.thisMonth)} icon="◩" tone="blue" hint={growth(revenue.growthPercentage)} />
        <MetricCard title="This week" value={formatINR(revenue.thisWeek)} icon="▤" tone="indigo" hint={`Today ${formatINR(revenue.today)}`} />
        <MetricCard title="Orders this month" value={orders.thisMonth} icon="🛒" tone="amber" hint={growth(orders.growthPercentage)} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <h2 className="mb-1 font-semibold text-white">Revenue</h2>
          <p className="mb-4 text-xs text-slate-500">Last 30 days</p>
          <AreaChart data={charts.revenueByDay} valueKey="revenue" format={formatINR} />
        </Card>

        <Card>
          <h2 className="mb-1 font-semibold text-white">Orders</h2>
          <p className="mb-4 text-xs text-slate-500">Last 30 days (all statuses)</p>
          <AreaChart data={charts.ordersByDay} valueKey="orders" format={(v) => `${v} order${v === 1 ? "" : "s"}`} />
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card>
          <h2 className="mb-4 font-semibold text-white">Order pipeline</h2>
          <BarList
            items={[
              { label: "Pending", value: orders.pending, color: "bg-amber-500" },
              { label: "Confirmed", value: orders.confirmed, color: "bg-blue-500" },
              { label: "Shipped", value: orders.shipped, color: "bg-indigo-500" },
              { label: "Delivered", value: orders.delivered, color: "bg-emerald-500" },
              { label: "Cancelled", value: orders.cancelled, color: "bg-red-500" },
            ]}
          />
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold text-white">Best sellers (by revenue)</h2>
          {topProducts.length === 0 ? (
            <p className="text-sm text-slate-500">No sales yet.</p>
          ) : (
            <ul className="space-y-4">
              {topProducts.map((p, i) => (
                <li key={p.productName} className="flex items-start gap-3 text-sm">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5 text-xs font-bold text-slate-300">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-white">{p.productName}</p>
                    <p className="text-xs text-slate-500">{p.totalQuantitySold} sold · {p.totalOrders} order{p.totalOrders === 1 ? "" : "s"}</p>
                  </div>
                  <span className="shrink-0 font-semibold text-white">{formatINR(p.totalRevenue)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold text-white">Products per category</h2>
          {maxStock === 0 ? (
            <p className="text-sm text-slate-500">No products yet.</p>
          ) : (
            <BarList items={categoryAnalytics.map((c) => ({ label: c.categoryName, value: c.totalProducts, color: "bg-indigo-500" }))} />
          )}
        </Card>
      </div>
    </div>
  );
}

export default AdminAnalytics;
