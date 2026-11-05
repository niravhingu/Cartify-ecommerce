import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../api";
import { formatDate, formatINR } from "../../utils/format";
import { STATUS_TONE } from "../constants";
import { AreaChart, Badge, BarList, Button, Card, EmptyState, ErrorBox, MetricCard, PageHeader, Spinner } from "../components/ui";

const growthText = (pct) => `${pct >= 0 ? "▲" : "▼"} ${Math.abs(pct)}% vs last month`;

function AdminDashboard() {
  const navigate = useNavigate();
  const [dash, setDash] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [d, a] = await Promise.all([api("/admin/dashboard"), api("/admin/analytics")]);
      setDash(d);
      setAnalytics(a);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !dash) return <Spinner label="Loading dashboard..." />;
  if (error && !dash) return <ErrorBox message={error} onRetry={load} />;

  const { stats, recentOrders, lowStockProducts, lowStockLimit } = dash;
  const { revenue, orders, charts, topProducts } = analytics;

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="A live look at your store. Cancelled orders are not counted as revenue.">
        <Button variant="ghost" onClick={load} disabled={loading}>{loading ? "Refreshing..." : "↻ Refresh"}</Button>
        <Button onClick={() => navigate("/admin/products")}>+ Add product</Button>
      </PageHeader>

      {error && <div className="mb-4"><ErrorBox message={error} /></div>}

      {/* Key numbers */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total revenue" value={formatINR(stats.totalRevenue)} icon="₹" tone="green" hint={`${formatINR(revenue.thisMonth)} this month · ${growthText(revenue.growthPercentage)}`} />
        <MetricCard title="Total orders" value={stats.totalOrders} icon="🛒" tone="blue" hint={`${orders.thisMonth} this month · ${growthText(orders.growthPercentage)}`} onClick={() => navigate("/admin/orders")} />
        <MetricCard title="Customers" value={stats.totalUsers} icon="♙" tone="indigo" hint="Registered accounts" onClick={() => navigate("/admin/users")} />
        <MetricCard title="Products" value={stats.totalProducts} icon="▣" tone="amber" hint={`${stats.lowStockCount} low on stock (≤ ${lowStockLimit})`} onClick={() => navigate("/admin/products")} />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Today's revenue" value={formatINR(revenue.today)} icon="☀" tone="green" />
        <MetricCard title="Pending orders" value={stats.pendingOrders} icon="⏳" tone="amber" hint="Waiting to be confirmed" onClick={() => navigate("/admin/orders")} />
        <MetricCard title="Delivered" value={stats.deliveredOrders} icon="✓" tone="green" />
        <MetricCard title="Average order" value={formatINR(analytics.summary.averageOrderValue)} icon="Ø" tone="blue" />
      </div>

      {/* Charts */}
      <div className="mt-6 grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Card>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-white">Revenue, last 30 days</h2>
              <p className="text-xs text-slate-500">Daily sales (incl. GST), excluding cancelled orders</p>
            </div>
            <Link to="/admin/analytics" className="shrink-0 text-sm font-semibold text-blue-400 hover:underline">Full analytics →</Link>
          </div>
          <AreaChart data={charts.revenueByDay} valueKey="revenue" format={formatINR} />
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold text-white">Orders by status</h2>
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
      </div>

      {/* Lists */}
      <div className="mt-6 grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-white">Recent orders</h2>
            <Link to="/admin/orders" className="text-sm font-semibold text-blue-400 hover:underline">View all →</Link>
          </div>

          {recentOrders.length === 0 ? (
            <EmptyState icon="🛒" title="No orders yet" text="Orders will show up here as soon as customers check out." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="pb-3 font-medium">Order</th>
                    <th className="pb-3 font-medium">Customer</th>
                    <th className="pb-3 font-medium">Total</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {recentOrders.map((order) => (
                    <tr key={order.order_group_id} className="text-slate-300">
                      <td className="py-3 pr-3">
                        <p className="max-w-[170px] truncate font-semibold text-white">#{order.order_group_id}</p>
                        <p className="text-xs text-slate-500">{formatDate(order.created_at)} · {order.item_count} item{order.item_count === 1 ? "" : "s"}</p>
                      </td>
                      <td className="py-3 pr-3">{order.customer_name}</td>
                      <td className="py-3 pr-3 font-semibold text-white">{formatINR(order.total_amount)}</td>
                      <td className="py-3"><Badge tone={STATUS_TONE[order.status]}>{order.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <h2 className="mb-4 font-semibold text-white">Top products</h2>
            {topProducts.length === 0 ? (
              <p className="text-sm text-slate-500">No sales yet.</p>
            ) : (
              <BarList items={topProducts.map((p) => ({ label: p.productName, value: p.totalRevenue }))} format={formatINR} />
            )}
          </Card>

          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-white">Low stock</h2>
              <Link to="/admin/products" className="text-sm font-semibold text-blue-400 hover:underline">Manage →</Link>
            </div>
            {lowStockProducts.length === 0 ? (
              <p className="text-sm text-slate-500">All products are well stocked. 🎉</p>
            ) : (
              <ul className="space-y-3">
                {lowStockProducts.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate text-slate-300">{p.product_name}</span>
                    <Badge tone={p.stock === 0 ? "red" : "amber"}>{p.stock === 0 ? "Out of stock" : `${p.stock} left`}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
