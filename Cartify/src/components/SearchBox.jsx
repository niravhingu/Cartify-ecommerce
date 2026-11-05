import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api, isAbort } from "../api";
import { FALLBACK_IMAGE, formatINR, handleImageError } from "../utils/format";

/**
 * The ONE search box used by the navbar (desktop + mobile) and the home hero,
 * so they always behave the same:
 *   - typing shows live suggestions from the database
 *   - Enter / Search opens /products?q=<text> with the matching products
 *   - on /products the box always mirrors the current ?q= value
 */
function SearchBox({ variant = "navbar", placeholder, onDone, autoFocus = false }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [active, setActive] = useState(-1);

  const boxRef = useRef(null);
  // the text the URL put in the box; no suggestion request is needed for it
  const syncedValue = useRef("");

  // keep the input in sync with the URL (back/forward, clearing filters, ...)
  useEffect(() => {
    const q = location.pathname === "/products" ? new URLSearchParams(location.search).get("q") || "" : "";
    syncedValue.current = q;
    setValue(q);
    setOpen(false);
  }, [location.pathname, location.search]);

  // debounced live suggestions
  useEffect(() => {
    const term = value.trim();

    if (value === syncedValue.current || term.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const data = await api(`/products?q=${encodeURIComponent(term)}&limit=5`, { signal: controller.signal });
        setResults(data.products || []);
        setActive(-1);
      } catch (error) {
        if (!isAbort(error)) setResults([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value]);

  useEffect(() => {
    const close = (event) => {
      if (boxRef.current && !boxRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const finish = () => {
    setOpen(false);
    onDone?.();
  };

  const submit = (event) => {
    event?.preventDefault();
    const term = value.trim();
    navigate(term ? `/products?q=${encodeURIComponent(term)}` : "/products");
    finish();
  };

  const openProduct = (product) => {
    navigate(`/products/${product.id}`);
    finish();
  };

  const onKeyDown = (event) => {
    if (event.key === "Escape") return setOpen(false);
    if (!open || results.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (event.key === "Enter" && active >= 0) {
      event.preventDefault();
      openProduct(results[active]);
    }
  };

  const hero = variant === "hero";
  const showPanel = open && value.trim().length >= 2;

  return (
    <div ref={boxRef} className="relative w-full">
      <form
        onSubmit={submit}
        role="search"
        className={
          hero
            ? "flex items-center rounded-full bg-white p-1.5 shadow-lg ring-1 ring-neutral-200 focus-within:ring-2 focus-within:ring-blue-600"
            : "flex items-center rounded-xl border border-gray-200 bg-gray-50 transition focus-within:border-orange-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-orange-50"
        }
      >
        {!hero && (
          <svg className="ml-4 h-5 w-5 shrink-0 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m16 16 4 4" strokeLinecap="round" />
          </svg>
        )}

        <input
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setOpen(true);
          }}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={onKeyDown}
          autoFocus={autoFocus}
          maxLength={100}
          autoComplete="off"
          placeholder={placeholder || "Search products, categories..."}
          aria-label="Search products"
          className={
            hero
              ? "min-w-0 flex-1 bg-transparent px-5 py-3 outline-none placeholder:text-neutral-400"
              : "min-w-0 flex-1 bg-transparent px-3 py-3 text-sm outline-none"
          }
        />

        {value && (
          <button
            type="button"
            onClick={() => {
              setValue("");
              setResults([]);
            }}
            className="mr-1 px-2 text-gray-400 transition hover:text-gray-700"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}

        <button
          type="submit"
          className={
            hero
              ? "shrink-0 rounded-full bg-neutral-950 px-6 py-3 font-semibold text-white transition hover:bg-blue-600"
              : "mr-1 shrink-0 rounded-lg bg-gray-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-500"
          }
        >
          Search
        </button>
      </form>

      {showPanel && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-gray-100 bg-white text-left shadow-2xl">
          {loading && results.length === 0 ? (
            <p className="px-4 py-4 text-sm text-gray-500">Searching…</p>
          ) : results.length === 0 ? (
            <p className="px-4 py-4 text-sm text-gray-500">No products found for “{value.trim()}”.</p>
          ) : (
            <ul role="listbox">
              {results.map((product, index) => (
                <li key={product.id} role="option" aria-selected={index === active}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(index)}
                    onClick={() => openProduct(product)}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition ${
                      index === active ? "bg-orange-50" : "hover:bg-gray-50"
                    }`}
                  >
                    <img
                      src={product.image || FALLBACK_IMAGE}
                      onError={handleImageError}
                      alt=""
                      className="h-11 w-11 shrink-0 rounded-lg bg-gray-100 object-cover"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-gray-900">{product.product_name}</span>
                      <span className="block truncate text-xs text-gray-500">{product.category_name || "Product"}</span>
                    </span>
                    <span className="shrink-0 text-sm font-bold text-gray-900">{formatINR(product.price)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            onClick={submit}
            className="block w-full border-t border-gray-100 bg-gray-50 px-4 py-3 text-left text-sm font-semibold text-orange-600 transition hover:bg-orange-50"
          >
            See all results for “{value.trim()}” →
          </button>
        </div>
      )}
    </div>
  );
}

export default SearchBox;
