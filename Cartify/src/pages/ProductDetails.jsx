import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import { api, isAbort } from "../api";
import { useStore } from "../context/StoreContext";
import { useToast } from "../context/ToastContext";
import { FALLBACK_IMAGE, formatDate, formatINR, handleImageError } from "../utils/format";

function Stars({ value, size = "text-base" }) {
  return (
    <span className={`tracking-wider text-amber-500 ${size}`} aria-label={`${value} out of 5 stars`}>
      {"★".repeat(Math.round(value))}
      <span className="text-gray-300">{"★".repeat(5 - Math.round(value))}</span>
    </span>
  );
}

function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { isLoggedIn, cartItems, addToCart, isInWishlist, toggleWishlist } = useStore();

  const [product, setProduct] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ready | notfound | error
  const [errorText, setErrorText] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);

  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState(null);
  const [related, setRelated] = useState([]);

  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState("");
  const [savingReview, setSavingReview] = useState(false);

  const loadReviews = useCallback(async () => {
    try {
      const data = await api(`/products/${id}/reviews`);
      setReviews(data.reviews || []);
      setSummary(data.summary || null);
    } catch {
      /* reviews are optional: the page still works without them */
    }
  }, [id]);

  // ---------- product ----------
  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");
    setProduct(null);
    setQuantity(1);
    setRelated([]);

    api(`/products/${id}`, { signal: controller.signal })
      .then((data) => {
        setProduct(data);
        setStatus("ready");
        document.title = `${data.product_name} | Cartify`;
      })
      .catch((error) => {
        if (isAbort(error)) return;
        if (error.status === 404 || error.status === 400) setStatus("notfound");
        else {
          setErrorText(error.message);
          setStatus("error");
        }
      });

    loadReviews();

    return () => {
      controller.abort();
      document.title = "Cartify";
    };
  }, [id, loadReviews]);

  // ---------- related products ----------
  useEffect(() => {
    if (!product?.category_slug) return;
    let cancelled = false;

    api(`/products?category=${encodeURIComponent(product.category_slug)}&limit=5`)
      .then((data) => {
        if (!cancelled) setRelated((data.products || []).filter((p) => p.id !== product.id).slice(0, 4));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [product?.id, product?.category_slug]);

  const stock = Number(product?.stock || 0);
  const inCart = Number(cartItems.find((item) => String(item.id) === String(product?.id))?.quantity || 0);
  const canAddMore = Math.max(stock - inCart, 0);
  const liked = product ? isInWishlist(product.id) : false;

  // keep the selector inside what can still be added
  useEffect(() => {
    setQuantity((q) => Math.min(Math.max(q, 1), Math.max(canAddMore, 1)));
  }, [canAddMore]);

  const requireLogin = () => {
    toast.info("Please log in first");
    navigate("/login", { state: { from: `/products/${id}` } });
  };

  const handleAddToCart = async () => {
    if (!isLoggedIn) return requireLogin();
    if (busy || canAddMore <= 0) return false;

    setBusy(true);
    const result = await addToCart(product, quantity);
    setBusy(false);

    if (result.success) {
      toast.success(`${quantity} × ${product.product_name} added to cart`);
      setQuantity(1);
      return true;
    }
    toast.error(result.reason === "out-of-stock" ? "Sorry, this product is out of stock" : result.message || "Could not add to cart");
    return false;
  };

  const handleBuyNow = async () => {
    if (!isLoggedIn) return requireLogin();

    // already holding every unit? just go to checkout
    if (canAddMore > 0) {
      const ok = await handleAddToCart();
      if (!ok) return;
    }
    navigate("/checkout");
  };

  const handleWishlist = async () => {
    if (!isLoggedIn) return requireLogin();
    const result = await toggleWishlist(product.id);
    if (result.success) toast.success(result.liked ? "Added to wishlist" : "Removed from wishlist");
    else toast.error(result.message || "Could not update wishlist");
  };

  const submitReview = async (event) => {
    event.preventDefault();
    if (!isLoggedIn) return requireLogin();
    if (myRating < 1) return toast.error("Please choose a star rating");

    setSavingReview(true);
    try {
      const data = await api(`/products/${id}/reviews`, {
        method: "POST",
        body: { rating: myRating, comment: myComment },
      });
      toast.success(data.message || "Review saved");
      setMyComment("");
      setMyRating(0);
      await loadReviews();
      // refresh the average shown in the header
      api(`/products/${id}`).then(setProduct).catch(() => {});
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSavingReview(false);
    }
  };

  /* ---------------- states ---------------- */
  if (status === "loading") {
    return (
      <div className="mx-auto grid max-w-7xl animate-pulse gap-8 px-4 py-10 lg:grid-cols-2">
        <div className="h-96 rounded-3xl bg-gray-200" />
        <div className="space-y-4">
          <div className="h-6 w-1/3 rounded bg-gray-200" />
          <div className="h-10 w-3/4 rounded bg-gray-200" />
          <div className="h-24 rounded bg-gray-200" />
        </div>
      </div>
    );
  }

  if (status === "notfound" || status === "error") {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
        <p className="text-5xl">🔍</p>
        <h1 className="mt-4 text-2xl font-black">{status === "notfound" ? "Product not found" : "Something went wrong"}</h1>
        <p className="mt-2 max-w-sm text-gray-500">
          {status === "notfound" ? "This product may have been removed or the link is incorrect." : errorText}
        </p>
        <Link to="/products" className="mt-6 rounded-xl bg-black px-6 py-3 text-sm font-bold text-white transition hover:bg-gray-800">
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10 sm:px-6 lg:px-10">
      {/* Breadcrumb */}
      <nav className="mx-auto mb-6 flex max-w-7xl flex-wrap items-center gap-2 text-sm text-gray-500" aria-label="Breadcrumb">
        <button onClick={() => navigate(-1)} className="font-medium transition hover:text-black">← Back</button>
        <span>/</span>
        <Link to="/products" className="hover:text-black">Products</Link>
        {product.category_slug && (
          <>
            <span>/</span>
            <Link to={`/products?category=${encodeURIComponent(product.category_slug)}`} className="hover:text-black">
              {product.category_name}
            </Link>
          </>
        )}
      </nav>

      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        {/* LEFT: image */}
        <div className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="relative flex h-80 items-center justify-center overflow-hidden rounded-2xl bg-gray-100 sm:h-[34rem]">
            <span
              className={`absolute left-5 top-5 z-10 rounded-full px-4 py-2 text-xs font-semibold ${
                stock <= 0 ? "bg-red-600 text-white" : "bg-black text-white"
              }`}
            >
              {stock <= 0 ? "Out of stock" : product.category_name || "Cartify"}
            </span>

            <button
              onClick={handleWishlist}
              aria-pressed={liked}
              aria-label={liked ? "Remove from wishlist" : "Add to wishlist"}
              className="absolute right-5 top-5 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm transition hover:scale-110"
            >
              <svg viewBox="0 0 24 24" className={`h-6 w-6 ${liked ? "fill-red-500 text-red-500" : "fill-none text-gray-700"}`} stroke="currentColor" strokeWidth="1.8">
                <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <img
              src={product.image || FALLBACK_IMAGE}
              onError={handleImageError}
              alt={product.product_name}
              className="h-full w-full object-contain p-6 transition duration-500 hover:scale-105 sm:p-10"
            />
          </div>
        </div>

        {/* RIGHT: details */}
        <div className="min-w-0 rounded-3xl bg-white p-6 shadow-sm sm:p-7 lg:p-10">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
            {product.category_name || "Uncategorized"}
            {product.subcategory_name && <span className="text-gray-400"> · {product.subcategory_name}</span>}
          </p>

          <h1 className="break-words text-3xl font-bold leading-tight text-gray-900 sm:text-4xl">{product.product_name}</h1>

          {/* Real rating */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {product.review_count > 0 ? (
              <>
                <div className="flex items-center gap-1 rounded-lg bg-black px-3 py-1.5 text-sm font-semibold text-white">
                  ★ {Number(product.rating).toFixed(1)}
                </div>
                <a href="#reviews" className="text-sm text-gray-500 hover:text-black">
                  {product.review_count} review{product.review_count === 1 ? "" : "s"}
                </a>
              </>
            ) : (
              <a href="#reviews" className="text-sm text-gray-500 hover:text-black">No reviews yet — be the first</a>
            )}
          </div>

          <div className="mt-7">
            <p className="text-4xl font-bold text-gray-900">{formatINR(product.price)}</p>
            <p className="mt-2 text-sm text-gray-500">+ 6% GST and a flat handling charge, shown at checkout. Free delivery.</p>
          </div>

          <div className="my-7 border-t border-gray-200" />

          <div>
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-900">Product Description</h2>
            <p className="whitespace-pre-line break-words text-base leading-7 text-gray-600">
              {product.description || "No description available."}
            </p>
          </div>

          <div className="mt-7 rounded-2xl bg-gray-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">Availability</p>
                <p className={`mt-1 text-sm font-medium ${stock > 0 ? "text-green-600" : "text-red-600"}`}>
                  {stock > 0 ? "✓ In Stock" : "✕ Out of Stock"}
                </p>
              </div>
              <p className="text-right text-sm text-gray-500">
                {stock <= 0 ? "Currently unavailable" : stock <= 5 ? `Hurry, only ${stock} left` : `${stock} items available`}
              </p>
            </div>
          </div>

          {inCart > 0 && (
            <p className="mt-4 rounded-xl bg-orange-50 px-4 py-3 text-sm font-medium text-orange-700">
              You already have {inCart} in your cart.{" "}
              <Link to="/cart" className="font-bold underline">View cart</Link>
            </p>
          )}

          {/* Quantity to ADD */}
          {stock > 0 && canAddMore > 0 && (
            <div className="mt-7">
              <p className="mb-3 text-sm font-semibold text-gray-900">Quantity</p>
              <div className="flex w-fit items-center rounded-xl border border-gray-300">
                <button
                  onClick={() => setQuantity((q) => Math.max(q - 1, 1))}
                  disabled={quantity <= 1}
                  aria-label="Decrease quantity"
                  className="flex h-11 w-11 items-center justify-center text-xl transition hover:bg-gray-100 disabled:opacity-40"
                >
                  −
                </button>
                <span className="flex h-11 w-12 items-center justify-center border-x border-gray-300 font-semibold">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => Math.min(q + 1, canAddMore))}
                  disabled={quantity >= canAddMore}
                  aria-label="Increase quantity"
                  className="flex h-11 w-11 items-center justify-center text-xl transition hover:bg-gray-100 disabled:opacity-40"
                >
                  +
                </button>
              </div>
            </div>
          )}

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <button
              onClick={handleAddToCart}
              disabled={stock <= 0 || canAddMore <= 0 || busy}
              className="rounded-xl border-2 border-black px-5 py-4 font-semibold text-black transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400 disabled:hover:bg-transparent"
            >
              {stock <= 0 ? "Out of Stock" : canAddMore <= 0 ? "Max quantity in cart" : busy ? "Adding..." : "Add To Cart"}
            </button>

            <button
              onClick={handleBuyNow}
              disabled={stock <= 0 || busy}
              className="rounded-xl bg-black px-5 py-4 font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              Buy Now
            </button>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-gray-200 p-4">
              <p className="text-lg">🚚</p>
              <p className="mt-2 text-sm font-semibold">Free Delivery</p>
              <p className="mt-1 text-xs text-gray-500">On every order</p>
            </div>
            <div className="rounded-2xl border border-gray-200 p-4">
              <p className="text-lg">↩️</p>
              <p className="mt-2 text-sm font-semibold">Easy Returns</p>
              <p className="mt-1 text-xs text-gray-500">7-day return policy</p>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------- Reviews ---------------- */}
      <section id="reviews" className="mx-auto mt-10 max-w-7xl scroll-mt-32 rounded-3xl bg-white p-6 shadow-sm sm:p-10">
        <h2 className="text-2xl font-bold text-gray-900">Customer reviews</h2>

        <div className="mt-6 grid gap-10 lg:grid-cols-[320px_1fr]">
          <div>
            {summary?.count > 0 ? (
              <>
                <div className="flex items-end gap-3">
                  <p className="text-5xl font-black">{Number(summary.average).toFixed(1)}</p>
                  <div className="pb-1">
                    <Stars value={summary.average} />
                    <p className="text-sm text-gray-500">{summary.count} review{summary.count === 1 ? "" : "s"}</p>
                  </div>
                </div>

                <div className="mt-5 space-y-2">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = summary.distribution?.[star] || 0;
                    return (
                      <div key={star} className="flex items-center gap-3 text-sm">
                        <span className="w-6 text-gray-600">{star}★</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                          <div className="h-full rounded-full bg-amber-400" style={{ width: `${(count / summary.count) * 100}%` }} />
                        </div>
                        <span className="w-6 text-right text-gray-500">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="text-gray-500">No reviews yet. Share your experience to help other shoppers.</p>
            )}

            {/* write a review */}
            <form onSubmit={submitReview} className="mt-8 rounded-2xl bg-gray-50 p-5">
              <p className="font-semibold text-gray-900">Write a review</p>

              <div className="mt-3 flex gap-1" role="radiogroup" aria-label="Your rating">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={myRating === n}
                    aria-label={`${n} star${n === 1 ? "" : "s"}`}
                    onClick={() => setMyRating(n)}
                    className={`text-3xl transition hover:scale-110 ${n <= myRating ? "text-amber-500" : "text-gray-300"}`}
                  >
                    ★
                  </button>
                ))}
              </div>

              <textarea
                value={myComment}
                onChange={(e) => setMyComment(e.target.value)}
                maxLength={1000}
                rows={3}
                placeholder="What did you like or dislike? (optional)"
                className="mt-3 w-full resize-none rounded-xl border border-gray-300 bg-white p-3 text-sm outline-none focus:border-gray-900"
              />

              <button
                disabled={savingReview}
                className="mt-3 w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-60"
              >
                {savingReview ? "Saving..." : isLoggedIn ? "Submit review" : "Log in to review"}
              </button>
              <p className="mt-2 text-xs text-gray-500">Reviewing again updates your earlier review.</p>
            </form>
          </div>

          <div className="min-w-0 divide-y divide-gray-100">
            {reviews.length === 0 ? (
              <p className="py-4 text-gray-400">Reviews will appear here.</p>
            ) : (
              reviews.map((review) => (
                <article key={review.id} className="py-5 first:pt-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <Stars value={review.rating} size="text-sm" />
                    <span className="font-semibold text-gray-900">{review.user_name}</span>
                    {review.verified && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">Verified buyer</span>}
                    <span className="text-xs text-gray-400">{formatDate(review.created_at)}</span>
                  </div>
                  {review.comment && <p className="mt-2 break-words leading-7 text-gray-600">{review.comment}</p>}
                </article>
              ))
            )}
          </div>
        </div>
      </section>

      {/* ---------------- Related ---------------- */}
      {related.length > 0 && (
        <section className="mx-auto mt-10 max-w-7xl">
          <h2 className="mb-6 text-2xl font-bold text-gray-900">You may also like</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default ProductDetails;
