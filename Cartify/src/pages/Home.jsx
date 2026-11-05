import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { api, isAbort } from "../api";
import { useStore } from "../context/StoreContext";
import CategoryCard from "../components/CategoryCard.jsx";
import ProductCard from "../components/ProductCard.jsx";
import ReviewCard from "../components/ReviewCard";
import SearchBox from "../components/SearchBox";
import ScrollReveal from "../components/ScrollReveal";

/* ---------------- hooks ---------------- */

// 0 → 1 progress of the whole page scroll
function usePageProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setP(max > 0 ? window.scrollY / max : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return p;
}

// Vertical scroll -> horizontal translate for a pinned track
function useHorizontalScroll(contentKey) {
  const section = useRef(null);
  const track = useRef(null);
  const [state, setState] = useState({ height: "300vh", x: 0, progress: 0 });

  useEffect(() => {
    let raf = 0;
    const measure = () => {
      if (!section.current || !track.current) return;
      const distance = Math.max(track.current.scrollWidth - window.innerWidth, 0);
      section.current.style.height = `${distance + window.innerHeight}px`;
      update();
    };
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (!section.current || !track.current) return;
        const rect = section.current.getBoundingClientRect();
        const distance = Math.max(track.current.scrollWidth - window.innerWidth, 1);
        const progress = Math.min(Math.max(-rect.top / distance, 0), 1);
        setState((s) => ({ ...s, x: -progress * distance, progress }));
      });
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("load", measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", update);
      window.removeEventListener("load", measure);
    };
  }, [contentKey]);

  return { section, track, ...state };
}

function useInView(ref) {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => e.isIntersecting && (setSeen(true), io.disconnect()),
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return seen;
}

function Counter({ to, suffix = "", decimals = 0 }) {
  const ref = useRef(null);
  const seen = useInView(ref);
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!seen) return;
    const start = performance.now();
    let raf;
    const tick = (t) => {
      const k = Math.min((t - start) / 1400, 1);
      setV(to * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [seen, to]);
  return (
    <span ref={ref}>
      {v.toFixed(decimals)}
      {suffix}
    </span>
  );
}

// Countdown to the end of today (resets daily)
function useCountdown() {
  const calc = () => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const s = Math.max(Math.floor((end - new Date()) / 1000), 0);
    return { h: Math.floor(s / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
  };
  const [t, setT] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setT(calc()), 1000);
    return () => clearInterval(id);
  }, []);
  return t;
}

const pad = (n) => String(n).padStart(2, "0");

/* ---------------- data ---------------- */

const WORDS = ["essentials", "gadgets", "style", "gifts"];

const PERKS = [
  ["Delivered fast", "Most orders reach you in 2–4 days, tracked from checkout to doorstep."],
  ["Pay securely", "UPI, cards and cash on delivery, all behind encrypted checkout."],
  ["Return in 7 days", "Not right? Send it back without explaining yourself."],
  ["Talk to a person", "Support answers every day, including weekends."],
];

const FAQ = [
  ["How long does delivery take?", "Metro cities usually receive orders in 2–4 days. Other locations take 4–7 days. You'll get tracking as soon as your order ships."],
  ["What is the return policy?", "You can return most items within 7 days of delivery, as long as they're unused and in original packaging."],
  ["Is delivery free?", "Yes. Delivery is free on every order across India. A small flat handling charge and 6% GST are shown clearly at checkout."],
  ["Which payment methods do you accept?", "UPI, debit and credit cards, net banking and cash on delivery on eligible orders."],
];

// pill label -> backend ?sort= value (the database does the sorting)
const SORTS = {
  Trending: "trending",
  "Top rated": "rating",
  "Price: low to high": "price_asc",
  "Price: high to low": "price_desc",
};

/* ---------------- page ---------------- */

function Home() {
  const progress = usePageProgress();
  const time = useCountdown();
  const { categories } = useStore();
  const { hash } = useLocation();

  const [wordIdx, setWordIdx] = useState(0);
  const [sort, setSort] = useState("Trending");

  // ---- everything below comes from the database
  const [shelf, setShelf] = useState([]);                // newest products ("weekly edit")
  const [gridProducts, setGridProducts] = useState([]);  // "Find your next favourite"
  const [gridLoading, setGridLoading] = useState(true);
  const [gridError, setGridError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [stats, setStats] = useState(null);
  const [reviews, setReviews] = useState([]);

  const hs = useHorizontalScroll(shelf.length);
  const [email, setEmail] = useState("");
  const [subState, setSubState] = useState("idle"); // idle | error | done
  const [openFaq, setOpenFaq] = useState(0);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setWordIdx((i) => (i + 1) % WORDS.length), 2200);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 700);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // weekly edit (newest first), real store numbers, latest customer reviews
  useEffect(() => {
    let cancelled = false;
    api("/products?sort=newest&limit=8")
      .then((d) => !cancelled && setShelf(d.products || []))
      .catch(() => {});
    api("/products/stats")
      .then((d) => !cancelled && setStats(d))
      .catch(() => {});
    api("/products/reviews/latest?limit=3")
      .then((d) => !cancelled && setReviews(d.reviews || []))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // "Find your next favourite": sorted by the database
  useEffect(() => {
    const controller = new AbortController();
    setGridLoading(true);
    setGridError("");

    api(`/products?sort=${SORTS[sort]}&limit=8`, { signal: controller.signal })
      .then((d) => {
        setGridProducts(d.products || []);
        setGridLoading(false);
      })
      .catch((err) => {
        if (isAbort(err)) return;
        setGridError(err.message);
        setGridLoading(false);
      });

    return () => controller.abort();
  }, [sort, reloadKey]);

  // /#about from the navbar
  useEffect(() => {
    if (!hash) return;
    const id = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth" }), 150);
    return () => clearTimeout(id);
  }, [hash, shelf.length]);

  const [subMessage, setSubMessage] = useState("");

  const subscribe = async (e) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setSubMessage("Enter a valid email, like name@example.com.");
      return setSubState("error");
    }

    setSubState("loading");
    try {
      await api("/newsletter", { method: "POST", body: { email: email.trim() } });
      setSubState("done");
      setEmail("");
    } catch (error) {
      setSubMessage(error.message);
      setSubState("error");
    }
  };

  return (
    <div className="overflow-x-clip bg-[#fafaf7] text-neutral-900">
      {/* page progress */}
      <div className="fixed left-0 top-0 z-[60] h-[3px] w-full bg-transparent">
        <div
          className="h-full bg-blue-600"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* announcement marquee */}
      <div className="overflow-hidden bg-neutral-950 text-white">
        <div className="flex min-w-max animate-[marquee_28s_linear_infinite] hover:[animation-play-state:paused]">
          {[1, 2].map((n) => (
            <div key={n} className="flex items-center gap-10 px-6 py-2.5 text-sm">
              <span>New collection 2026</span>
              <span className="text-blue-400">/</span>
              <span>Free delivery on every order</span>
              <span className="text-blue-400">/</span>
              <span>Fresh arrivals every week</span>
              <span className="text-blue-400">/</span>
              <span>Cash on delivery available</span>
              <span className="text-blue-400">/</span>
            </div>
          ))}
        </div>
      </div>

      {/* ================= HERO ================= */}
      <section className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 pb-24 pt-16 lg:grid-cols-[1.1fr_0.9fr] lg:px-10 lg:pt-24">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-sm shadow-sm ring-1 ring-neutral-200">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            {stats ? `${stats.products} products · ${stats.categories} categories` : "Fresh products every week"}
          </p>

          <h1 className="mt-7 text-5xl font-black leading-[1.02] tracking-tight sm:text-6xl lg:text-[5.5rem]">
            Everyday
            <span className="relative block h-[1.05em] overflow-hidden text-blue-600">
              {WORDS.map((w, i) => (
                <span
                  key={w}
                  className="absolute inset-0 transition-all duration-700"
                  style={{
                    transform: `translateY(${(i - wordIdx) * 110}%)`,
                    opacity: i === wordIdx ? 1 : 0,
                  }}
                >
                  {w}.
                </span>
              ))}
            </span>
            Delivered.
          </h1>

          <p className="mt-6 max-w-lg text-lg leading-8 text-neutral-600">
            Curated products, honest prices and quick delivery. Find what you
            need in seconds.
          </p>

          {/* hero search: same component + behaviour as the navbar search */}
          <div className="mt-8 max-w-xl">
            <SearchBox variant="hero" placeholder="Search headphones, watches, bags…" />
          </div>

          <div className="mt-5 flex flex-wrap gap-2 text-sm">
            {categories.slice(0, 5).map((c) => (
              <Link
                key={c.id}
                to={`/products?category=${encodeURIComponent(c.slug)}`}
                className="rounded-full border border-neutral-300 px-4 py-1.5 transition hover:border-neutral-950 hover:bg-neutral-950 hover:text-white"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </div>

        {/* hero visual with scroll parallax */}
        <div className="relative">
          <div
            className="overflow-hidden rounded-[2.5rem] bg-neutral-200 shadow-2xl"
            style={{ transform: `translateY(${progress * -120}px) rotate(${progress * -4}deg)` }}
          >
            <img
              src={shelf[0]?.image || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1000&q=80"}
              alt={shelf[0]?.product_name || "Featured product"}
              className="h-[520px] w-full object-cover"
            />
          </div>
          {shelf[0] && (
            <Link
              to={`/products/${shelf[0].id}`}
              className="absolute -left-2 bottom-12 max-w-[70%] rounded-2xl bg-white p-4 shadow-xl ring-1 ring-neutral-200 sm:-left-6"
              style={{ transform: `translateY(${progress * 160}px)` }}
            >
              <p className="text-sm text-neutral-500">Just in</p>
              <p className="truncate font-bold">{shelf[0].product_name}</p>
            </Link>
          )}
          <div
            className="absolute -right-4 top-10 hidden rounded-2xl bg-blue-600 px-5 py-4 text-white shadow-xl sm:block"
            style={{ transform: `translateY(${progress * -200}px)` }}
          >
            <p className="text-2xl font-black">Free delivery</p>
            <p className="text-sm text-blue-100">on every order</p>
          </div>
        </div>
      </section>

      {/* ================= HORIZONTAL SCROLL SHOWCASE ================= */}
      {shelf.length > 0 && (
      <section ref={hs.section} className="relative bg-neutral-950 text-white">
        <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden">
          <div className="mx-auto mb-8 flex w-full max-w-7xl items-end justify-between px-6 lg:px-10">
            <div>
              <h2 className="text-3xl font-black sm:text-5xl">The weekly edit</h2>
              <p className="mt-2 text-neutral-400">
                Keep scrolling down. The shelf moves sideways.
              </p>
            </div>
            <Link to="/products" className="hidden text-sm font-semibold underline-offset-4 hover:underline sm:block">
              See all products
            </Link>
          </div>

          <div
            ref={hs.track}
            className="flex w-max items-stretch gap-6 px-6 will-change-transform lg:px-[max(2.5rem,calc((100vw-80rem)/2+2.5rem))]"
            style={{ transform: `translate3d(${hs.x}px,0,0)` }}
          >
            {/* intro panel */}
            <div className="flex w-[80vw] max-w-md shrink-0 flex-col justify-between rounded-3xl bg-blue-600 p-8">
              <p className="text-4xl font-black leading-tight">
                The newest arrivals, straight from our catalogue.
              </p>
              <p className="text-blue-100">Scroll to browse →</p>
            </div>

            {shelf.map((item) => (
              <div
                key={item.id}
                className="w-[75vw] max-w-[320px] shrink-0 rounded-3xl bg-white p-2 text-neutral-900 transition hover:-translate-y-2"
              >
                <ProductCard product={item} />
              </div>
            ))}

            {/* end panel */}
            <Link
              to="/products"
              className="flex w-[70vw] max-w-sm shrink-0 items-center justify-center rounded-3xl border border-white/20 p-8 text-center text-3xl font-black transition hover:bg-white hover:text-black"
            >
              Browse the full catalogue
            </Link>
          </div>

          {/* horizontal progress */}
          <div className="mx-auto mt-8 h-1 w-full max-w-7xl px-6 lg:px-10">
            <div className="h-full rounded bg-white/15">
              <div
                className="h-full rounded bg-white"
                style={{ width: `${hs.progress * 100}%` }}
              />
            </div>
          </div>
        </div>
      </section>
      )}

      {/* ================= STATS ================= */}
      {stats && (
        <section className="mx-auto max-w-7xl px-6 py-24 lg:px-10">
          <div className="grid grid-cols-2 gap-y-10 md:grid-cols-4">
            {[
              [stats.customers, "", 0, "Registered shoppers"],
              [stats.products, "", 0, "Products in the catalogue"],
              [stats.categories, "", 0, "Categories"],
              [stats.delivered_orders, "", 0, "Orders delivered"],
            ].map(([n, sfx, d, label]) => (
              <div key={label} className="border-l-2 border-neutral-900 pl-5">
                <p className="text-5xl font-black tracking-tight">
                  <Counter to={Number(n) || 0} suffix={sfx} decimals={d} />
                </p>
                <p className="mt-1 text-neutral-500">{label}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ================= CATEGORIES ================= */}
      {categories.length > 0 && (
        <section className="bg-white px-6 py-24">
          <ScrollReveal>
            <div className="mx-auto max-w-7xl">
              <div className="mb-10 flex items-end justify-between">
                <h2 className="text-4xl font-black sm:text-5xl">Shop by category</h2>
                <Link to="/products" className="hidden font-semibold hover:underline sm:block">
                  View all
                </Link>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {categories.map((item) => (
                  <Link
                    key={item.id}
                    to={`/products?category=${encodeURIComponent(item.slug)}`}
                    aria-label={`Shop ${item.name}`}
                    className="block transition duration-500 hover:-translate-y-2"
                  >
                    <CategoryCard category={item} />
                  </Link>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </section>
      )}

      {/* ================= FLASH DEAL ================= */}
      <section className="mx-auto max-w-7xl px-6 py-24 lg:px-10">
        <div className="grid items-center gap-8 overflow-hidden rounded-[2rem] bg-blue-600 p-6 text-white sm:gap-10 sm:p-14 lg:grid-cols-2">
          <div className="min-w-0">
            <h2 className="break-words text-4xl font-black sm:text-6xl">Today's deals end soon.</h2>
            <p className="mt-4 max-w-md text-blue-100">
              A fresh day brings fresh picks. Add what you like to your cart
              before the day runs out.
            </p>
            <Link
              to="/products?sort=newest"
              className="mt-8 inline-block rounded-full bg-white px-7 py-4 font-semibold text-blue-700 transition hover:-translate-y-1 hover:shadow-xl"
            >
              Shop new arrivals
            </Link>
          </div>
          <div className="grid min-w-0 grid-cols-3 gap-2 sm:gap-3 lg:w-[24rem] lg:justify-self-end" role="timer" aria-live="off">
            {[
              [time.h, "hours"],
              [time.m, "minutes"],
              [time.s, "seconds"],
            ].map(([v, l]) => (
              <div key={l} className="min-w-0 rounded-2xl bg-white/10 px-1 py-4 text-center ring-1 ring-white/25 sm:py-6">
                <p className="text-3xl font-black tabular-nums sm:text-5xl">{pad(v)}</p>
                <p className="mt-1 truncate text-xs text-blue-100 sm:text-sm">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= FILTERABLE PRODUCT GRID ================= */}
      <section id="shop" className="mx-auto max-w-7xl scroll-mt-6 px-6 pb-24 lg:px-10">
        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-4xl font-black sm:text-5xl">Find your next favourite</h2>
            <p className="mt-2 text-neutral-500">
              {gridLoading ? "Loading…" : `Showing ${gridProducts.length} product${gridProducts.length === 1 ? "" : "s"} · ${sort.toLowerCase()}`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {Object.keys(SORTS).map((s) => (
              <button
                key={s}
                onClick={() => setSort(s)}
                aria-pressed={sort === s}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  sort === s
                    ? "bg-neutral-950 text-white"
                    : "bg-white ring-1 ring-neutral-300 hover:ring-neutral-950"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {gridLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-96 animate-pulse rounded-2xl bg-neutral-200" />
            ))}
          </div>
        ) : gridError ? (
          <div className="rounded-3xl border border-dashed border-neutral-300 py-20 text-center">
            <p className="text-xl font-bold">We couldn't load products</p>
            <p className="mt-1 text-neutral-500">{gridError}</p>
            <button
              onClick={() => setReloadKey((k) => k + 1)}
              className="mt-6 rounded-full bg-neutral-950 px-6 py-3 font-semibold text-white"
            >
              Try again
            </button>
          </div>
        ) : gridProducts.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {gridProducts.map((item) => (
              <div key={item.id} className="transition duration-500 hover:-translate-y-2">
                <ProductCard product={item} />
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-neutral-300 py-20 text-center">
            <p className="text-xl font-bold">No products yet</p>
            <p className="mt-1 text-neutral-500">New products will appear here as soon as they are added.</p>
          </div>
        )}

        <div className="mt-12 text-center">
          <Link
            to="/products"
            className="inline-flex rounded-full bg-neutral-950 px-8 py-4 font-semibold text-white transition hover:-translate-y-1 hover:bg-blue-600"
          >
            Explore all products
          </Link>
        </div>
      </section>

      {/* ================= PERKS ================= */}
      <section id="about" className="scroll-mt-32 bg-white px-6 py-24">
        <div className="mx-auto mb-14 max-w-3xl">
          <h2 className="text-4xl font-black sm:text-5xl">About Cartify</h2>
          <p className="mt-4 text-lg leading-8 text-neutral-600">
            Cartify is an online store built around curated products, honest prices and quick delivery.
            We keep the catalogue focused, show the full price before you pay, and make returns simple.
          </p>
        </div>
        <div className="mx-auto grid max-w-7xl gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {PERKS.map(([title, text]) => (
            <div key={title}>
              <div className="mb-5 h-1 w-12 bg-blue-600" />
              <h3 className="text-xl font-bold">{title}</h3>
              <p className="mt-2 leading-7 text-neutral-500">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ================= REVIEWS ================= */}
      {reviews.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 py-24 lg:px-10">
          <ScrollReveal>
            <h2 className="mb-10 text-4xl font-black sm:text-5xl">What customers say</h2>
            <div className="grid gap-6 md:grid-cols-3">
              {reviews.map((item) => (
                <Link
                  key={item.id}
                  to={`/products/${item.product_id}`}
                  className="block transition duration-500 hover:-translate-y-2"
                >
                  <ReviewCard
                    review1={{
                      name: item.user_name,
                      rating: "★".repeat(item.rating) + "☆".repeat(5 - item.rating),
                      comment: item.comment,
                      product: item.product_name,
                      verified: item.verified,
                    }}
                  />
                </Link>
              ))}
            </div>
          </ScrollReveal>
        </section>
      )}

      {/* ================= FAQ ================= */}
      <section className="mx-auto max-w-4xl px-6 pb-24">
        <h2 className="mb-8 text-4xl font-black sm:text-5xl">Questions, answered</h2>
        <div className="divide-y divide-neutral-200 border-y border-neutral-200">
          {FAQ.map(([q, a], i) => {
            const open = openFaq === i;
            return (
              <div key={q}>
                <button
                  onClick={() => setOpenFaq(open ? -1 : i)}
                  aria-expanded={open}
                  className="flex w-full items-center justify-between gap-6 py-6 text-left text-lg font-semibold"
                >
                  {q}
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ring-1 ring-neutral-300 transition-transform duration-300 ${
                      open ? "rotate-45 bg-neutral-950 text-white" : ""
                    }`}
                  >
                    +
                  </span>
                </button>
                <div
                  className="grid transition-all duration-300"
                  style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
                >
                  <p className="overflow-hidden pr-12 leading-7 text-neutral-600">
                    <span className="block pb-6">{a}</span>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ================= NEWSLETTER ================= */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-7xl rounded-[2rem] bg-neutral-950 px-6 py-20 text-center text-white">
          <h2 className="text-4xl font-black sm:text-5xl">Be first to know about new arrivals.</h2>
          <p className="mx-auto mt-4 max-w-xl text-neutral-400">
            Join the list for new products and offers. We'll never share your email.
          </p>

          {subState === "done" ? (
            <p className="mx-auto mt-8 max-w-lg rounded-full bg-emerald-500/15 px-6 py-4 font-semibold text-emerald-300">
              You're subscribed. Thanks for joining!
            </p>
          ) : (
            <form onSubmit={subscribe} className="mx-auto mt-8 flex max-w-lg flex-col gap-3 sm:flex-row" noValidate>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setSubState("idle");
                }}
                placeholder="you@example.com"
                aria-label="Email address"
                aria-invalid={subState === "error"}
                className={`flex-1 rounded-full border bg-neutral-900 px-6 py-4 outline-none placeholder:text-neutral-500 focus:border-blue-500 ${
                  subState === "error" ? "border-red-500" : "border-neutral-700"
                }`}
              />
              <button
                disabled={subState === "loading"}
                className="rounded-full bg-white px-7 py-4 font-semibold text-black transition hover:bg-blue-500 hover:text-white disabled:opacity-60"
              >
                {subState === "loading" ? "Subscribing…" : "Subscribe"}
              </button>
            </form>
          )}
          {subState === "error" && (
            <p className="mt-3 text-sm text-red-400">{subMessage}</p>
          )}
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="border-t border-neutral-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-16 md:grid-cols-3 lg:px-10">
          <div>
            <h2 className="text-3xl font-black">
              Cartify<span className="text-blue-600">.</span>
            </h2>
            <p className="mt-4 max-w-sm leading-7 text-neutral-500">
              Modern shopping. Premium products. Better experiences.
            </p>
          </div>
          <div>
            <h3 className="font-bold">Quick links</h3>
            <div className="mt-4 flex flex-col gap-3 text-sm text-neutral-500">
              <Link to="/" className="hover:text-black">Home</Link>
              <Link to="/products" className="hover:text-black">Products</Link>
              <Link to="/cart" className="hover:text-black">Cart</Link>
              <Link to="/login" className="hover:text-black">Login</Link>
            </div>
          </div>
          <div>
            <h3 className="font-bold">Customer support</h3>
            <p className="mt-4 text-sm leading-7 text-neutral-500">
              Need help with an order?
              <br />
              Our support team is here for you.
            </p>
          </div>
        </div>
        <div className="border-t border-neutral-200 py-6 text-center text-sm text-neutral-500">
          © 2026 Cartify. All rights reserved.
        </div>
      </footer>

      {/* back to top */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Back to top"
        className={`fixed bottom-6 right-6 z-50 grid h-12 w-12 place-items-center rounded-full bg-neutral-950 text-white shadow-xl transition-all duration-300 hover:bg-blue-600 ${
          showTop ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
        }`}
      >
        ↑
      </button>

      <style>{`
        @keyframes marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }
        @media (prefers-reduced-motion: reduce) {
          .animate-pulse, [class*="animate-["] { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

export default Home;