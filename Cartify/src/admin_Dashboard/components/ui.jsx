/* eslint-disable react-refresh/only-export-components -- this file exports a hook next to its components on purpose */
import { useEffect, useState } from "react";

/* ------------------------------------------------------------------ */
/* Small building blocks shared by every admin page                    */
/* ------------------------------------------------------------------ */

export function useDebounced(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function Card({ className = "", children }) {
  return (
    <div className={`min-w-0 rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl ${className}`}>
      {children}
    </div>
  );
}

const TONES = {
  green: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
  amber: "bg-amber-500/10 text-amber-400 ring-amber-500/20",
  red: "bg-red-500/10 text-red-400 ring-red-500/20",
  blue: "bg-blue-500/10 text-blue-400 ring-blue-500/20",
  indigo: "bg-indigo-500/10 text-indigo-300 ring-indigo-500/20",
  slate: "bg-slate-500/10 text-slate-300 ring-slate-500/20",
};

export function Badge({ tone = "slate", children }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${TONES[tone] || TONES.slate}`}>
      {children}
    </span>
  );
}

export function Spinner({ label = "Loading..." }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-slate-400" role="status">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/10 border-t-blue-500" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function ErrorBox({ message, onRetry }) {
  return (
    <div role="alert" className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-300">
      <p className="font-semibold">Something went wrong</p>
      <p className="mt-1 text-red-300/80">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-3 rounded-lg bg-red-500/20 px-3 py-1.5 font-semibold text-red-200 transition hover:bg-red-500/30">
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon = "📭", title, text, children }) {
  return (
    <div className="py-16 text-center">
      <div className="text-4xl">{icon}</div>
      <p className="mt-3 font-semibold text-white">{title}</p>
      {text && <p className="mx-auto mt-1 max-w-sm text-sm text-slate-400">{text}</p>}
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}

export function Button({ variant = "primary", className = "", ...props }) {
  const styles = {
    primary: "bg-blue-600 text-white hover:bg-blue-500",
    ghost: "border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10",
    danger: "bg-red-500/15 text-red-300 hover:bg-red-500/25",
  };
  return (
    <button
      {...props}
      className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${styles[variant]} ${className}`}
    />
  );
}

export const inputClass =
  "w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500";

export function SearchInput({ value, onChange, placeholder = "Search..." }) {
  return (
    <div className="relative w-full sm:w-72">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">⌕</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={`${inputClass} pl-9`}
      />
    </div>
  );
}

export function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  return (
    <div className="mt-5 flex items-center justify-between gap-3 text-sm text-slate-400">
      <span>
        Page {page} of {totalPages}
      </span>
      <div className="flex gap-2">
        <Button variant="ghost" disabled={page <= 1} onClick={() => onChange(page - 1)}>← Prev</Button>
        <Button variant="ghost" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>Next →</Button>
      </div>
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer, wide = false }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-slate-900 shadow-2xl sm:rounded-3xl ${wide ? "sm:max-w-3xl" : "sm:max-w-lg"}`}>
        <div className="flex items-center justify-between gap-4 border-b border-white/10 px-6 py-4">
          <h2 className="truncate text-lg font-bold text-white">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-lg px-2 py-1 text-slate-400 transition hover:bg-white/10 hover:text-white">✕</button>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-white/10 px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-300">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export function MetricCard({ title, value, hint, icon, tone = "blue", onClick }) {
  const tones = {
    blue: "bg-blue-500/10 text-blue-400",
    green: "bg-emerald-500/10 text-emerald-400",
    amber: "bg-amber-500/10 text-amber-400",
    red: "bg-red-500/10 text-red-400",
    indigo: "bg-indigo-500/10 text-indigo-300",
  };
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={`group relative min-w-0 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-left backdrop-blur-xl transition ${onClick ? "hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.07]" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-400">{title}</p>
          <p className="mt-3 truncate text-2xl font-bold tracking-tight text-white sm:text-3xl">{value}</p>
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xl ${tones[tone]}`}>{icon}</div>
      </div>
      {hint && <p className="mt-4 text-xs text-slate-500">{hint}</p>}
    </Tag>
  );
}

/* ------------------------------------------------------------------ */
/* Charts (plain SVG: no extra dependency)                             */
/* ------------------------------------------------------------------ */

export function AreaChart({ data, valueKey, labelKey = "date", format = (v) => v, height = 220 }) {
  const [hover, setHover] = useState(null);

  if (!data?.length) return <EmptyState icon="📈" title="No data yet" />;

  const W = 700;
  const H = height;
  const pad = { l: 8, r: 8, t: 16, b: 26 };
  const max = Math.max(...data.map((d) => d[valueKey]), 1);
  const x = (i) => pad.l + (i * (W - pad.l - pad.r)) / Math.max(data.length - 1, 1);
  const y = (v) => H - pad.b - (v / max) * (H - pad.t - pad.b);

  const line = data.map((d, i) => `${x(i)},${y(d[valueKey])}`).join(" ");
  const area = `${pad.l},${H - pad.b} ${line} ${W - pad.r},${H - pad.b}`;
  const active = hover !== null ? data[hover] : null;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Chart" onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="areaFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((t) => (
          <line key={t} x1={pad.l} x2={W - pad.r} y1={y(max * t)} y2={y(max * t)} stroke="rgba(255,255,255,0.06)" />
        ))}
        <polygon points={area} fill="url(#areaFill)" />
        <polyline points={line} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

        {data.map((d, i) => (
          <rect
            key={d[labelKey]}
            x={x(i) - (W / data.length) / 2}
            y={0}
            width={W / data.length}
            height={H}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onTouchStart={() => setHover(i)}
          />
        ))}
        {hover !== null && (
          <>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} stroke="rgba(255,255,255,0.25)" strokeDasharray="4 4" />
            <circle cx={x(hover)} cy={y(active[valueKey])} r="5" fill="#3b82f6" stroke="#0f172a" strokeWidth="2" />
          </>
        )}
        <text x={pad.l} y={H - 6} fontSize="11" fill="#64748b">{data[0][labelKey]}</text>
        <text x={W - pad.r} y={H - 6} fontSize="11" fill="#64748b" textAnchor="end">{data[data.length - 1][labelKey]}</text>
      </svg>

      <p className="mt-1 h-5 text-xs text-slate-400" aria-live="polite">
        {active ? (
          <>
            <span className="font-semibold text-white">{active[labelKey]}</span> · {format(active[valueKey])}
          </>
        ) : (
          "Hover over the chart for daily values"
        )}
      </p>
    </div>
  );
}

export function BarList({ items, format = (v) => v }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.label}>
          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
            <span className="truncate text-slate-300">{item.label}</span>
            <span className="shrink-0 font-semibold text-white">{format(item.value)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/5">
            <div className={`h-full rounded-full ${item.color || "bg-blue-500"}`} style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
