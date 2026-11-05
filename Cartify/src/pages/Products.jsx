import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import { api, isAbort } from "../api";
import { useStore } from "../context/StoreContext";
import { formatINR } from "../utils/format";

const PAGE_SIZE = 12;

// value = what the backend understands (?sort=...)
const SORTS = {
  newest: "Newest",
  trending: "Trending",
  rating: "Top rated",
  price_asc: "Price: low to high",
  price_desc: "Price: high to low",
  name: "Name: A to Z",
};

function SkeletonCard() {
  return (
    <div className="animate-pulse overflow-hidden rounded-3xl bg-white p-3 ring-1 ring-neutral-200">
      <div className="aspect-square rounded-2xl bg-neutral-200" />
      <div className="mt-4 h-4 w-3/4 rounded bg-neutral-200" />
      <div className="mt-2 h-4 w-1/3 rounded bg-neutral-200" />
      <div className="mt-4 h-10 rounded-full bg-neutral-200" />
    </div>
  );
}

function Products() {
  const [params, setParams] = useSearchParams();
  const { categories } = useStore();

  // Everything that filters the list lives in the URL, so results can be
  // shared, survive a refresh, and the navbar search / category menu / home
  // page links all drive this page the same way.
  const urlQuery = params.get("q") || params.get("search") || "";
  const category = params.get("category") || "all";
  const subcategory = params.get("subcategory") || "";
  const sort = SORTS[params.get("sort")] ? params.get("sort") : "newest";
  const maxPriceParam = params.get("maxPrice");
  const inStock = params.get("inStock") === "true";

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [priceCeiling, setPriceCeiling] = useState(0);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState(urlQuery);
  const [slider, setSlider] = useState(null);
  const [dense, setDense] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const setParam = useCallback(
    (key, value, fallback) => {
      const next = new URLSearchParams(params);
      next.delete("search"); // old name of ?q=
      if (!value || value === fallback) next.delete(key);
      else next.set(key, value);
      if (key === "category") next.delete("subcategory");
      setParams(next, { replace: true });
    },
    [params, setParams]
  );

  /* ---------- build the API query from the URL ---------- */
  const buildQuery = useCallback(
    (pageNumber) => {
      const q = new URLSearchParams();
      if (urlQuery) q.set("q", urlQuery);
      if (category !== "all") q.set("category", category);
      if (subcategory) q.set("subcategory", subcategory);
      if (maxPriceParam) q.set("maxPrice", maxPriceParam);
      if (inStock) q.set("inStock", "true");
      q.set("sort", sort);
      q.set("page", String(pageNumber));
      q.set("limit", String(PAGE_SIZE));
      return q.toString();
    },
    [urlQuery, category, subcategory, maxPriceParam, inStock, sort]
  );

  /* ---------- fetch page 1 whenever a filter changes ---------- */
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");

    api(`/products?${buildQuery(1)}`, { signal: controller.signal })
      .then((data) => {
        setItems(data.products || []);
        setTotal(data.total || 0);
        setPage(1);
        setHasMore(Boolean(data.hasMore));
        if (data.priceRange?.max > 0) setPriceCeiling(Math.ceil(data.priceRange.max));
        setLoading(false);
      })
      .catch((err) => {
        if (isAbort(err)) return;
        console.error("Products Fetch Error:", err);
        setError(err.message || "We couldn't load the products. Check your connection and try again.");
        setLoading(false);
      });

    return () => controller.abort();
  }, [buildQuery, reloadKey]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const data = await api(`/products?${buildQuery(page + 1)}`);
      setItems((list) => {
        const seen = new Set(list.map((p) => p.id));
        return [...list, ...(data.products || []).filter((p) => !seen.has(p.id))];
      });
      setPage(page + 1);
      setHasMore(Boolean(data.hasMore));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingMore(false);
    }
  };

  /* ---------- search box in the page header ---------- */
  // follow the URL (navbar search, back button, chips)
  useEffect(() => setSearch(urlQuery), [urlQuery]);

  // typing here updates the URL after a short pause
  const searchTimer = useRef(null);
  const onSearchChange = (value) => {
    setSearch(value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setParam("q", value.trim(), ""), 350);
  };
  useEffect(() => () => clearTimeout(searchTimer.current), []);

  /* ---------- price slider (committed to the URL after a pause) ---------- */
  useEffect(() => setSlider(null), [maxPriceParam]);

  useEffect(() => {
    if (slider === null) return;
    const id = setTimeout(() => setParam("maxPrice", slider >= priceCeiling ? "" : String(slider), ""), 400);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slider]);

  const limit = slider ?? (maxPriceParam ? Number(maxPriceParam) : priceCeiling);
  const priceActive = Boolean(maxPriceParam);

  const activeCategory = categories.find((c) => c.slug === category);
  const activeSub = activeCategory?.subcategories?.find((s) => s.slug === subcategory);

  const activeCount =
    (category !== "all" ? 1 : 0) + (subcategory ? 1 : 0) + (urlQuery ? 1 : 0) + (priceActive ? 1 : 0) + (inStock ? 1 : 0);

  const clearAll = () => {
    clearTimeout(searchTimer.current);
    setSearch("");
    setSlider(null);
    setParams(sort !== "newest" ? { sort } : {}, { replace: true });
  };

  const headline = useMemo(() => {
    if (urlQuery) return `Results for “${urlQuery}”`;
    if (activeSub) return activeSub.name;
    if (activeCategory) return activeCategory.name;
    return "All products";
  }, [urlQuery, activeSub, activeCategory]);

  /* ---------- error state ---------- */
  if (error && items.length === 0) {
    return (
      <div className="grid min-h-[70vh] place-items-center px-6 text-center">
        <div>
          <p className="text-2xl font-black">Something went wrong</p>
          <p className="mx-auto mt-2 max-w-sm text-neutral-500">{error}</p>
          <button
            onClick={() => setReloadKey((k) => k + 1)}
            className="mt-6 rounded-full bg-neutral-950 px-7 py-3 font-semibold text-white transition hover:bg-blue-600"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  /* ---------- filter panel (shared by desktop + mobile drawer) ---------- */
  const Filters = (
    <div className="space-y-8">
      <div>
        <h3 className="mb-3 font-bold">Category</h3>
        <div className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
          {[{ slug: "all", name: "All products" }, ...categories].map((c) => (
            <div key={c.slug} className="contents lg:block">
              <button
                onClick={() => setParam("category", c.slug, "all")}
                aria-pressed={category === c.slug}
                className={`flex w-full items-center justify-between rounded-full px-4 py-2 text-left text-sm transition lg:rounded-xl ${
                  category === c.slug
                    ? "bg-neutral-950 font-semibold text-white"
                    : "bg-white ring-1 ring-neutral-200 hover:ring-neutral-950 lg:bg-transparent lg:ring-0 lg:hover:bg-neutral-100"
                }`}
              >
                <span>{c.name}</span>
                {c.product_count !== undefined && (
                  <span className={`ml-3 text-xs ${category === c.slug ? "text-neutral-300" : "text-neutral-400"}`}>
                    {c.product_count}
                  </span>
                )}
              </button>

              {/* subcategories of the selected category */}
              {category === c.slug && c.subcategories?.length > 0 && (
                <div className="mt-1 hidden flex-col gap-1 border-l-2 border-neutral-200 pl-3 lg:flex">
                  {c.subcategories.map((s) => (
                    <button
                      key={s.slug}
                      onClick={() => setParam("subcategory", subcategory === s.slug ? "" : s.slug, "")}
                      aria-pressed={subcategory === s.slug}
                      className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-left text-sm transition ${
                        subcategory === s.slug ? "bg-blue-50 font-semibold text-blue-700" : "text-neutral-600 hover:bg-neutral-100"
                      }`}
                    >
                      <span>{s.name}</span>
                      <span className="text-xs text-neutral-400">{s.product_count}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* subcategories on small screens */}
        {activeCategory?.subcategories?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2 lg:hidden">
            {activeCategory.subcategories.map((s) => (
              <button
                key={s.slug}
                onClick={() => setParam("subcategory", subcategory === s.slug ? "" : s.slug, "")}
                aria-pressed={subcategory === s.slug}
                className={`rounded-full px-3 py-1.5 text-sm ${
                  subcategory === s.slug ? "bg-blue-600 text-white" : "bg-white ring-1 ring-neutral-200"
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {priceCeiling > 0 && (
        <div>
          <div className="mb-3 flex items-baseline justify-between">
            <h3 className="font-bold">Max price</h3>
            <span className="text-sm font-semibold tabular-nums">{formatINR(limit)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={priceCeiling}
            step={Math.max(1, Math.round(priceCeiling / 100))}
            value={Math.min(limit, priceCeiling)}
            onChange={(e) => setSlider(Number(e.target.value))}
            aria-label="Maximum price"
            className="w-full accent-blue-600"
          />
          <div className="mt-1 flex justify-between text-xs text-neutral-400">
            <span>₹0</span>
            <span>{formatINR(priceCeiling)}</span>
          </div>
        </div>
      )}

      <label className="flex cursor-pointer items-center gap-3 text-sm font-medium">
        <input
          type="checkbox"
          checked={inStock}
          onChange={(e) => setParam("inStock", e.target.checked ? "true" : "", "")}
          className="h-4 w-4 accent-blue-600"
        />
        In stock only
      </label>

      {activeCount > 0 && (
        <button onClick={clearAll} className="text-sm font-semibold text-blue-600 hover:underline">
          Clear all filters
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fafaf7]">
      {/* header */}
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto w-full max-w-[1800px] px-4 py-12 sm:px-6 lg:px-8 2xl:px-12">
          <h1 className="break-words text-4xl font-black tracking-tight sm:text-6xl">{headline}</h1>
          <p className="mt-3 max-w-xl text-neutral-500">
            {loading
              ? "Loading the catalogue…"
              : `${total} product${total === 1 ? "" : "s"} found${activeCategory && !urlQuery ? ` in ${activeCategory.name}` : ""}.`}
          </p>

          <div className="mt-8 flex max-w-2xl items-center rounded-full bg-neutral-100 px-5 ring-1 ring-transparent transition focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-600">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-neutral-400" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by name, description or category"
              aria-label="Search products"
              maxLength={100}
              className="min-w-0 flex-1 bg-transparent px-3 py-4 outline-none placeholder:text-neutral-400"
            />
            {search && (
              <button onClick={() => onSearchChange("")} aria-label="Clear search" className="grid h-7 w-7 place-items-center rounded-full text-neutral-500 hover:bg-neutral-200">
                ×
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[1800px] gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[240px_1fr] lg:px-8 2xl:px-12">
        {/* desktop sidebar */}
        <aside className="hidden lg:block">
          <div className="sticky top-32">{Filters}</div>
        </aside>

        <main className="min-w-0">
          {/* toolbar */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-neutral-500" aria-live="polite">
              {loading ? (
                "Loading…"
              ) : (
                <>
                  Showing <b className="text-neutral-900">{items.length}</b> of <b className="text-neutral-900">{total}</b>
                </>
              )}
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setFiltersOpen(true)}
                className="rounded-full bg-white px-4 py-2 text-sm font-medium ring-1 ring-neutral-300 lg:hidden"
              >
                Filters{activeCount > 0 && ` (${activeCount})`}
              </button>

              <select
                value={sort}
                onChange={(e) => setParam("sort", e.target.value, "newest")}
                aria-label="Sort products"
                className="rounded-full bg-white px-4 py-2 text-sm font-medium ring-1 ring-neutral-300 outline-none focus:ring-2 focus:ring-blue-600"
              >
                {Object.entries(SORTS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>

              <div className="hidden rounded-full bg-white p-1 ring-1 ring-neutral-300 sm:flex" role="group" aria-label="Grid density">
                {[["Compact", true], ["Roomy", false]].map(([l, v]) => (
                  <button
                    key={l}
                    onClick={() => setDense(v)}
                    aria-pressed={dense === v}
                    className={`rounded-full px-3 py-1 text-sm transition ${dense === v ? "bg-neutral-950 text-white" : "text-neutral-600"}`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* active filter chips */}
          {activeCount > 0 && (
            <div className="mb-6 flex flex-wrap gap-2">
              {category !== "all" && (
                <Chip onClick={() => setParam("category", "all", "all")}>{activeCategory?.name || category}</Chip>
              )}
              {subcategory && <Chip onClick={() => setParam("subcategory", "", "")}>{activeSub?.name || subcategory}</Chip>}
              {urlQuery && <Chip onClick={() => onSearchChange("")}>“{urlQuery}”</Chip>}
              {priceActive && <Chip onClick={() => setParam("maxPrice", "", "")}>Under {formatINR(maxPriceParam)}</Chip>}
              {inStock && <Chip onClick={() => setParam("inStock", "", "")}>In stock</Chip>}
            </div>
          )}

          {/* grid */}
          {loading ? (
            <div className={`grid grid-cols-1 gap-6 sm:grid-cols-2 ${dense ? "xl:grid-cols-4" : "xl:grid-cols-3"}`}>
              {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-neutral-300 bg-white px-6 py-20 text-center">
              <p className="text-2xl font-black">No products found</p>
              <p className="mx-auto mt-2 max-w-sm text-neutral-500">
                {urlQuery
                  ? `Nothing matches “${urlQuery}”. Try a different word, a higher price or another category.`
                  : "Nothing matches your filters. Try a higher price or another category."}
              </p>
              <button onClick={clearAll} className="mt-6 rounded-full bg-neutral-950 px-7 py-3 font-semibold text-white transition hover:bg-blue-600">
                Clear all filters
              </button>
            </div>
          ) : (
            <>
              <div className={`grid grid-cols-1 gap-6 sm:grid-cols-2 [&_button]:whitespace-nowrap ${dense ? "xl:grid-cols-4" : "xl:grid-cols-3"}`}>
                {items.map((product) => (
                  <div key={product.id} className="transition duration-300 hover:-translate-y-1.5">
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>

              {/* load more */}
              <div className="mt-12 text-center">
                {hasMore ? (
                  <>
                    <div className="mx-auto mb-4 h-1 w-56 overflow-hidden rounded bg-neutral-200">
                      <div className="h-full bg-neutral-950 transition-all duration-500" style={{ width: `${(items.length / total) * 100}%` }} />
                    </div>
                    <button
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="rounded-full bg-neutral-950 px-8 py-4 font-semibold text-white transition hover:-translate-y-1 hover:bg-blue-600 disabled:opacity-60"
                    >
                      {loadingMore ? "Loading…" : `Load ${Math.min(PAGE_SIZE, total - items.length)} more`}
                    </button>
                    {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
                  </>
                ) : (
                  <p className="text-sm text-neutral-500">You've seen all {total} products.</p>
                )}
              </div>
            </>
          )}
        </main>
      </div>

      {/* mobile filter drawer */}
      <div className={`fixed inset-0 z-[60] lg:hidden ${filtersOpen ? "" : "pointer-events-none"}`} aria-hidden={!filtersOpen}>
        <div
          onClick={() => setFiltersOpen(false)}
          className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${filtersOpen ? "opacity-100" : "opacity-0"}`}
        />
        <div
          className={`absolute bottom-0 max-h-[85vh] w-full overflow-y-auto rounded-t-3xl bg-[#fafaf7] p-6 transition-transform duration-300 ${
            filtersOpen ? "translate-y-0" : "translate-y-full"
          }`}
        >
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-black">Filters</h2>
            <button onClick={() => setFiltersOpen(false)} className="rounded-full bg-neutral-950 px-5 py-2 text-sm font-semibold text-white">
              Show {total} results
            </button>
          </div>
          {Filters}
        </div>
      </div>
    </div>
  );
}

function Chip({ onClick, children }) {
  return (
    <button onClick={onClick} className="rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700 hover:bg-blue-100">
      {children} ×
    </button>
  );
}

export default Products;
