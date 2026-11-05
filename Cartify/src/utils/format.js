export const formatINR = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export const formatDate = (value, withTime = false) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return withTime
    ? date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
    : date.toLocaleDateString("en-IN", { dateStyle: "medium" });
};

export const FALLBACK_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'><rect width='100%' height='100%' fill='#f1f1ee'/><g fill='none' stroke='#b8b8b0' stroke-width='6' stroke-linecap='round'><rect x='120' y='130' width='160' height='140' rx='14'/><circle cx='165' cy='180' r='14'/><path d='m130 258 55-50 40 36 25-22 30 36'/></g></svg>`
  );

// Replace a broken <img> with the placeholder (use as onError).
export const handleImageError = (event) => {
  if (event.currentTarget.src !== FALLBACK_IMAGE) {
    event.currentTarget.onerror = null;
    event.currentTarget.src = FALLBACK_IMAGE;
  }
};

export const stockLabel = (stock) => {
  const n = Number(stock);
  if (n <= 0) return { text: "Out of stock", tone: "out" };
  if (n <= 5) return { text: `Only ${n} left`, tone: "low" };
  return { text: "In stock", tone: "ok" };
};
