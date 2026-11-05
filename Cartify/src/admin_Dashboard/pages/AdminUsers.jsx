import { useCallback, useEffect, useState } from "react";
import { api } from "../../api";
import { useToast } from "../../context/ToastContext";
import { formatDate, formatINR } from "../../utils/format";
import { Badge, Button, Card, EmptyState, ErrorBox, PageHeader, Pagination, SearchInput, Spinner, useDebounced } from "../components/ui";

function AdminUsers({ currentUser }) {
  const toast = useToast();

  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const debouncedSearch = useDebounced(search);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const q = new URLSearchParams({ page: String(page), limit: "10" });
      if (debouncedSearch.trim()) q.set("search", debouncedSearch.trim());
      const data = await api(`/admin/users?${q}`);
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => setPage(1), [debouncedSearch]);

  const changeRole = async (user) => {
    const role = user.role === "admin" ? "user" : "admin";
    const question =
      role === "admin"
        ? `Make ${user.name} an administrator? They will get full access to this admin panel.`
        : `Remove admin access from ${user.name}?`;
    if (!window.confirm(question)) return;

    setBusyId(user.id);
    try {
      await api(`/admin/users/${user.id}/role`, { method: "PATCH", body: { role } });
      toast.success(`${user.name} is now ${role === "admin" ? "an admin" : "a customer"}`);
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <PageHeader title="Users" subtitle={`${pagination.total ?? 0} registered account${pagination.total === 1 ? "" : "s"}`}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search name or email" />
      </PageHeader>

      <Card className="!p-0">
        {loading && users.length === 0 ? (
          <Spinner />
        ) : error ? (
          <div className="p-5"><ErrorBox message={error} onRetry={load} /></div>
        ) : users.length === 0 ? (
          <EmptyState icon="♙" title="No users found" text={search ? "Try a different search." : undefined} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-medium">User</th>
                  <th className="px-5 py-4 font-medium">Role</th>
                  <th className="px-5 py-4 font-medium">Orders</th>
                  <th className="px-5 py-4 font-medium">Total spent</th>
                  <th className="px-5 py-4 font-medium">Joined</th>
                  <th className="px-5 py-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map((user) => {
                  const isMe = user.id === currentUser?.id;
                  return (
                    <tr key={user.id} className="text-slate-300 transition hover:bg-white/[0.03]">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 font-bold text-white">
                            {user.name?.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-white">{user.name}{isMe && <span className="ml-2 text-xs text-slate-500">(you)</span>}</p>
                            <p className="truncate text-xs text-slate-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4"><Badge tone={user.role === "admin" ? "indigo" : "slate"}>{user.role === "admin" ? "Admin" : "Customer"}</Badge></td>
                      <td className="px-5 py-4">{user.order_count}</td>
                      <td className="px-5 py-4 font-semibold text-white">{formatINR(user.total_spent)}</td>
                      <td className="px-5 py-4">{formatDate(user.created_at)}</td>
                      <td className="px-5 py-4 text-right">
                        {!isMe && (
                          <Button variant="ghost" disabled={busyId === user.id} onClick={() => changeRole(user)}>
                            {user.role === "admin" ? "Remove admin" : "Make admin"}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Pagination page={pagination.page || page} totalPages={pagination.totalPages} onChange={setPage} />
    </div>
  );
}

export default AdminUsers;
