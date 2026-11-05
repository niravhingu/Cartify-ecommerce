import { useCallback, useEffect, useState } from "react";
import { api } from "../../api";
import { useToast } from "../../context/ToastContext";
import { Badge, Button, Card, EmptyState, ErrorBox, Field, Modal, PageHeader, Spinner, inputClass } from "../components/ui";

const slugify = (v) => String(v || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const EMPTY_CATEGORY = { name: "", slug: "", description: "", image: "", is_active: true };
const EMPTY_SUB = { name: "", slug: "", category_id: "", is_active: true };

function AdminCategories() {
  const toast = useToast();

  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // modal: { type: "category" | "sub", id?: number } + form values
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_CATEGORY);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [c, s] = await Promise.all([api("/admin/categories"), api("/admin/subcategories")]);
      setCategories(c.categories);
      setSubcategories(s.subcategories);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCategory = (category) => {
    setSlugTouched(Boolean(category));
    setForm(category ? { name: category.name, slug: category.slug, description: category.description || "", image: category.image || "", is_active: category.is_active } : EMPTY_CATEGORY);
    setModal({ type: "category", id: category?.id });
  };

  const openSub = (sub, categoryId = "") => {
    setSlugTouched(Boolean(sub));
    setForm(sub ? { name: sub.name, slug: sub.slug, category_id: String(sub.category_id), is_active: sub.is_active } : { ...EMPTY_SUB, category_id: String(categoryId) });
    setModal({ type: "sub", id: sub?.id });
  };

  const setName = (name) => setForm((f) => ({ ...f, name, slug: slugTouched ? f.slug : slugify(name) }));

  const save = async (e) => {
    e.preventDefault();
    const isSub = modal.type === "sub";
    const base = isSub ? "/admin/subcategories" : "/admin/categories";

    if (!form.name.trim()) return toast.error("Name is required");
    if (!slugify(form.slug)) return toast.error("Slug is required");
    if (isSub && !form.category_id) return toast.error("Choose a main category");

    const body = isSub
      ? { name: form.name.trim(), slug: slugify(form.slug), category_id: Number(form.category_id), is_active: form.is_active }
      : { name: form.name.trim(), slug: slugify(form.slug), description: form.description.trim() || null, image: form.image.trim() || null, is_active: form.is_active };

    setSaving(true);
    try {
      if (modal.id) await api(`${base}/${modal.id}`, { method: "PATCH", body });
      else await api(base, { method: "POST", body });
      toast.success(`${isSub ? "Subcategory" : "Category"} ${modal.id ? "updated" : "created"}`);
      setModal(null);
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (type, item) => {
    const label = type === "sub" ? "subcategory" : "category";
    if (!window.confirm(`Delete the ${label} “${item.name}”? This cannot be undone.`)) return;
    try {
      await api(`${type === "sub" ? "/admin/subcategories" : "/admin/categories"}/${item.id}`, { method: "DELETE" });
      toast.success(`${item.name} deleted`);
      await load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div>
      <PageHeader title="Categories" subtitle="Organise the shop. Only active categories are visible to customers.">
        <Button variant="ghost" onClick={() => openSub(null)} disabled={categories.length === 0}>+ Subcategory</Button>
        <Button onClick={() => openCategory(null)}>+ Category</Button>
      </PageHeader>

      {loading && categories.length === 0 ? (
        <Spinner />
      ) : error ? (
        <ErrorBox message={error} onRetry={load} />
      ) : categories.length === 0 ? (
        <Card><EmptyState icon="▤" title="No categories yet" text="Create your first category, then add products to it."><Button onClick={() => openCategory(null)}>+ Add category</Button></EmptyState></Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {categories.map((category) => {
            const subs = subcategories.filter((s) => s.category_id === category.id);
            return (
              <Card key={category.id}>
                <div className="flex items-start gap-4">
                  {category.image ? (
                    <img src={category.image} alt="" onError={(e) => (e.currentTarget.style.display = "none")} className="h-16 w-16 shrink-0 rounded-2xl object-cover" />
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/5 text-2xl">▤</div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-lg font-bold text-white">{category.name}</h2>
                      <Badge tone={category.is_active ? "green" : "slate"}>{category.is_active ? "Active" : "Hidden"}</Badge>
                    </div>
                    <p className="truncate text-xs text-slate-500">/{category.slug} · {category.product_count} product{category.product_count === 1 ? "" : "s"}</p>
                    {category.description && <p className="mt-1 line-clamp-2 text-sm text-slate-400">{category.description}</p>}
                  </div>
                </div>

                <div className="mt-4 border-t border-white/10 pt-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Subcategories ({subs.length})</p>
                    <button onClick={() => openSub(null, category.id)} className="text-xs font-semibold text-blue-400 hover:underline">+ Add</button>
                  </div>

                  {subs.length === 0 ? (
                    <p className="text-sm text-slate-500">None yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {subs.map((sub) => (
                        <li key={sub.id} className="flex items-center justify-between gap-2 rounded-xl bg-white/[0.03] px-3 py-2 text-sm">
                          <span className="min-w-0 truncate text-slate-300">
                            {sub.name} <span className="text-xs text-slate-500">· {sub.product_count}</span>
                            {!sub.is_active && <span className="ml-2 text-xs text-amber-400">hidden</span>}
                          </span>
                          <span className="flex shrink-0 gap-3 text-xs font-semibold">
                            <button onClick={() => openSub(sub)} className="text-blue-400 hover:underline">Edit</button>
                            <button onClick={() => remove("sub", sub)} className="text-red-400 hover:underline">Delete</button>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="mt-4 flex gap-2">
                  <Button variant="ghost" onClick={() => openCategory(category)}>Edit</Button>
                  <Button variant="danger" onClick={() => remove("category", category)}>Delete</Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={Boolean(modal)}
        onClose={() => setModal(null)}
        title={modal ? `${modal.id ? "Edit" : "New"} ${modal.type === "sub" ? "subcategory" : "category"}` : ""}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </>
        }
      >
        {modal && (
          <form onSubmit={save} className="space-y-4">
            <Field label="Name">
              <input value={form.name} onChange={(e) => setName(e.target.value)} maxLength={100} autoFocus className={inputClass} placeholder={modal.type === "sub" ? "e.g. Running shoes" : "e.g. Shoes"} />
            </Field>

            <Field label="Slug" hint="Used in the shop URL, e.g. /products?category=shoes">
              <input
                value={form.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setForm({ ...form, slug: e.target.value });
                }}
                className={inputClass}
              />
            </Field>

            {modal.type === "sub" ? (
              <Field label="Main category">
                <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className={inputClass}>
                  <option value="">Choose a category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </Field>
            ) : (
              <>
                <Field label="Description (optional)">
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className={`${inputClass} resize-none`} />
                </Field>
                <Field label="Image URL (optional)" hint="Shown on the home page category card. If empty, a product image is used.">
                  <input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} className={inputClass} placeholder="https://..." />
                </Field>
              </>
            )}

            {modal.id && (
              <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-300">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="h-4 w-4 accent-blue-500" />
                Active (visible to customers)
              </label>
            )}
          </form>
        )}
      </Modal>
    </div>
  );
}

export default AdminCategories;
