// Shared UI primitives & helpers — Ledger
const { useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect } = React;

// ---------- Helpers ----------
const fmtMoney = (n, opts = {}) => {
  const sign = n < 0 ? "-" : opts.showPlus && n > 0 ? "+" : "";
  const abs = Math.abs(n);
  const s = abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${sign}$${s}`;
};
const fmtMoneyShort = (n) => {
  const abs = Math.abs(n);
  if (abs >= 1000) return `${n < 0 ? "-" : ""}$${(abs / 1000).toFixed(1)}k`;
  return fmtMoney(n);
};
const fmtDate = (iso, opts = {}) => {
  const d = new Date(iso + "T00:00:00");
  if (opts.short) return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};
const fmtDateRel = (iso) => {
  const d = new Date(iso + "T00:00:00");
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((today - d) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return `${diff}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};
const monthKey = (iso) => iso.slice(0, 7);
const monthLabel = (key) => {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
};

// Live category store — populated on app load from DB, falls back to LEDGER_DATA
window.CATEGORIES_STORE = window.LEDGER_DATA.CATEGORIES;
const catById = (id) => {
  const cats = window.CATEGORIES_STORE;
  return cats.find((c) => c.id === id)
    || { id, name: id ? id.charAt(0).toUpperCase() + id.slice(1).replace(/_/g, ' ') : 'Unknown', color: 'stone', icon: 'question' };
};
const accById = (id) => window.LEDGER_DATA.ACCOUNTS.find((a) => a.id === id) || { name: id || 'Unknown', mask: '', type: 'unknown', bank: id || '' };

// ---------- Icons ----------
const Icon = ({ name, size = 16, stroke = 1.6, className = "" }) => {
  const s = size;
  const props = {
    width: s, height: s, viewBox: "0 0 24 24",
    fill: "none", stroke: "currentColor",
    strokeWidth: stroke, strokeLinecap: "round", strokeLinejoin: "round",
    className: "ic " + className,
  };
  switch (name) {
    case "dashboard": return <svg {...props}><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>;
    case "list":      return <svg {...props}><line x1="8" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="20" y2="12"/><line x1="8" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></svg>;
    case "import":    return <svg {...props}><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>;
    case "budget":    return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M12 3v9l6 4"/></svg>;
    case "insight":   return <svg {...props}><path d="M9 21h6"/><path d="M10 17h4"/><path d="M12 3a6 6 0 0 0-4 10.5c1 1 1.5 2 1.5 3.5h5c0-1.5.5-2.5 1.5-3.5A6 6 0 0 0 12 3Z"/></svg>;
    case "search":    return <svg {...props}><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/></svg>;
    case "sun":       return <svg {...props}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>;
    case "moon":      return <svg {...props}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>;
    case "x":         return <svg {...props}><line x1="6" y1="6" x2="18" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/></svg>;
    case "check":     return <svg {...props}><polyline points="20 6 9 17 4 12"/></svg>;
    case "chevron":   return <svg {...props}><polyline points="9 6 15 12 9 18"/></svg>;
    case "chevron-d": return <svg {...props}><polyline points="6 9 12 15 18 9"/></svg>;
    case "plus":      return <svg {...props}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
    case "up":        return <svg {...props}><polyline points="6 15 12 9 18 15"/></svg>;
    case "down":      return <svg {...props}><polyline points="6 9 12 15 18 9"/></svg>;
    case "trending-up":   return <svg {...props}><polyline points="3 17 9 11 13 15 21 7"/><polyline points="14 7 21 7 21 14"/></svg>;
    case "trending-down": return <svg {...props}><polyline points="3 7 9 13 13 9 21 17"/><polyline points="14 17 21 17 21 10"/></svg>;
    case "file":      return <svg {...props}><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="14 3 14 9 20 9"/></svg>;
    case "filter":    return <svg {...props}><polygon points="3 4 21 4 14 13 14 19 10 21 10 13 3 4"/></svg>;
    case "split":     return <svg {...props}><path d="M6 3v6a4 4 0 0 0 4 4h4a4 4 0 0 1 4 4v4"/><path d="M6 3 3 6m3-3 3 3"/><path d="m18 18 3 3-3 3" transform="translate(0 -3)"/></svg>;
    case "tag":       return <svg {...props}><path d="M20.59 13.41 13.41 20.59a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z"/><circle cx="7" cy="7" r="1.5"/></svg>;
    case "edit":      return <svg {...props}><path d="M17 3 21 7 8 20H4v-4Z"/></svg>;
    case "trash":     return <svg {...props}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6M14 11v6"/></svg>;
    case "card":      return <svg {...props}><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>;
    case "wallet":    return <svg {...props}><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>;
    case "settings":  return <svg {...props}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>;
    case "info":      return <svg {...props}><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="8.01"/><polyline points="11 12 12 12 12 16 13 16"/></svg>;
    case "sparkles":  return <svg {...props}><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/></svg>;
    case "basket":    return <svg {...props}><path d="M5 7h14l-1.5 11a2 2 0 0 1-2 1.7H8.5a2 2 0 0 1-2-1.7Z"/><path d="m9 7 3-4 3 4"/></svg>;
    case "fork":      return <svg {...props}><path d="M7 3v8a2 2 0 0 0 4 0V3M9 11v10"/><path d="M17 3c-1 0-2 1-2 3v5h4V6c0-2-1-3-2-3Zm0 8v10"/></svg>;
    case "car":       return <svg {...props}><path d="M5 13l1.5-5a2 2 0 0 1 2-1.5h7a2 2 0 0 1 2 1.5L19 13"/><rect x="3" y="13" width="18" height="6" rx="1.5"/><circle cx="7" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/></svg>;
    case "home":      return <svg {...props}><path d="m3 11 9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1Z"/></svg>;
    case "bolt":      return <svg {...props}><polygon points="13 2 4 14 11 14 9 22 20 10 13 10 13 2"/></svg>;
    case "repeat":    return <svg {...props}><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>;
    case "bag":       return <svg {...props}><path d="M5 7h14l-1.5 13a1 1 0 0 1-1 .9h-9a1 1 0 0 1-1-.9Z"/><path d="M9 7V5a3 3 0 0 1 6 0v2"/></svg>;
    case "heart":     return <svg {...props}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z"/></svg>;
    case "play":      return <svg {...props}><polygon points="6 4 20 12 6 20 6 4"/></svg>;
    case "plane":     return <svg {...props}><path d="m21 12-9-4-2 4-7 1 2 2-1 2 3-1 3 3 1-7Z"/></svg>;
    case "arrowDown": return <svg {...props}><line x1="12" y1="5" x2="12" y2="19"/><polyline points="6 13 12 19 18 13"/></svg>;
    case "swap":      return <svg {...props}><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>;
    case "question":  return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.7"/><line x1="12" y1="17" x2="12" y2="17.01"/></svg>;
    default: return null;
  }
};
window.Icon = Icon;

// ---------- Category Pill ----------
function CategoryPill({ categoryId, onClick, asButton, showDot = false }) {
  const c = catById(categoryId);
  const Tag = (asButton || onClick) ? "button" : "span";
  return (
    <Tag className={`cpill ${c.color}`} onClick={onClick}>
      {showDot && <span className="swatch" />}
      {c.name}
    </Tag>
  );
}
window.CategoryPill = CategoryPill;

// ---------- Merchant icon (initials) ----------
function MerchantIcon({ merchant, categoryId }) {
  const initials = merchant
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .split(/\s+/).filter(Boolean).slice(0, 2)
    .map((w) => w[0]).join("").toUpperCase() || "?";
  const c = catById(categoryId);
  return (
    <div className="merchant-icon" style={{ background: `var(--c-${c.color})`, color: `var(--c-${c.color}-ink)` }}>
      {initials}
    </div>
  );
}
window.MerchantIcon = MerchantIcon;

// ---------- Money component ----------
function Money({ value, big, huge, showPlus, dim }) {
  const cls = ["amount", big ? "big" : "", huge ? "huge" : "", value < 0 ? "neg" : value > 0 && showPlus ? "pos" : ""].filter(Boolean).join(" ");
  return <span className={cls} style={dim ? { color: "var(--muted)" } : null}>{fmtMoney(value, { showPlus })}</span>;
}
window.Money = Money;

// ---------- Delta badge ----------
function Delta({ value, suffix = "", invert }) {
  const up = invert ? value < 0 : value > 0;
  const cls = "delta " + (value === 0 ? "" : up ? "up" : "down");
  const sign = value > 0 ? "+" : "";
  return (
    <span className={cls}>
      <Icon name={value >= 0 ? "up" : "down"} size={11} />
      {sign}{value.toFixed(1)}{suffix}
    </span>
  );
}
window.Delta = Delta;

// ---------- Sparkline ----------
function Sparkline({ data, color = "var(--primary)", fill = true, height = 40 }) {
  if (!data || data.length === 0) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const w = 100, h = 30;
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return [x, y];
  });
  const d = "M " + pts.map((p) => p.join(",")).join(" L ");
  const area = d + ` L ${w},${h} L 0,${h} Z`;
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ height }}>
      {fill && <path d={area} fill={color} opacity="0.12" />}
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
window.Sparkline = Sparkline;

// ---------- Bar chart (categorical) ----------
function BarChart({ data, height = 200, valueFormatter = (v) => fmtMoneyShort(-v) }) {
  // data: [{label, value, color}]
  const max = Math.max(...data.map((d) => Math.abs(d.value)), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height, paddingTop: 8 }}>
      {data.map((d, i) => {
        const h = (Math.abs(d.value) / max) * (height - 36);
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{ fontSize: 10.5, fontFamily: "var(--mono)", color: "var(--muted)" }}>
              {valueFormatter(d.value)}
            </div>
            <div style={{
              width: "100%", height: h,
              background: `var(--c-${d.color || "sage"})`,
              borderRadius: "6px 6px 2px 2px",
              minHeight: 4,
            }} title={d.label} />
            <div style={{ fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>
              {d.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}
window.BarChart = BarChart;

// ---------- Donut ----------
function Donut({ data, size = 160, thickness = 22 }) {
  // data: [{label, value, color}]
  const total = data.reduce((s, d) => s + Math.abs(d.value), 0) || 1;
  const r = size / 2 - thickness / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--inset)" strokeWidth={thickness} />
      {data.map((d, i) => {
        const frac = Math.abs(d.value) / total;
        const len = c * frac;
        const dasharray = `${len} ${c - len}`;
        const dashoffset = c * 0.25 - offset;
        offset += len;
        return (
          <circle key={i}
            cx={size/2} cy={size/2} r={r}
            fill="none"
            stroke={`var(--c-${d.color}-ink)`}
            strokeWidth={thickness}
            strokeDasharray={dasharray}
            strokeDashoffset={dashoffset}
            strokeLinecap="butt"
            opacity="0.92"
          />
        );
      })}
    </svg>
  );
}
window.Donut = Donut;

// ---------- Line chart with axis ----------
function LineChart({ series, height = 220, showAxis = true, yFormatter = fmtMoneyShort }) {
  // series: [{label, color, points: [{x, y}]}]  x can be label string
  if (!series.length) return null;
  const allY = series.flatMap((s) => s.points.map((p) => p.y));
  const maxY = Math.max(...allY) * 1.1 || 100;
  const minY = 0;
  const n = series[0].points.length;
  const w = 600;
  const h = height;
  const pad = { l: 44, r: 12, t: 14, b: 26 };
  const xw = w - pad.l - pad.r;
  const yh = h - pad.t - pad.b;
  const xAt = (i) => pad.l + (i / (n - 1)) * xw;
  const yAt = (v) => pad.t + (1 - (v - minY) / (maxY - minY)) * yh;
  const ticks = 4;
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) => minY + (i / ticks) * (maxY - minY));
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: "100%", height }}>
      {/* gridlines */}
      {showAxis && yTicks.map((t, i) => (
        <g key={i}>
          <line x1={pad.l} x2={w - pad.r} y1={yAt(t)} y2={yAt(t)} stroke="var(--line-soft)" />
          <text x={pad.l - 8} y={yAt(t)} textAnchor="end" dominantBaseline="middle"
                fontSize="10" fill="var(--muted)" fontFamily="var(--mono)">
            {yFormatter(t)}
          </text>
        </g>
      ))}
      {/* x labels */}
      {showAxis && series[0].points.map((p, i) => (
        <text key={i} x={xAt(i)} y={h - 8} textAnchor="middle" fontSize="10" fill="var(--muted)" fontFamily="var(--mono)">
          {p.x}
        </text>
      ))}
      {/* lines */}
      {series.map((s, si) => {
        const d = s.points.map((p, i) => `${i === 0 ? "M" : "L"} ${xAt(i)} ${yAt(p.y)}`).join(" ");
        const area = d + ` L ${xAt(n - 1)} ${yAt(0)} L ${xAt(0)} ${yAt(0)} Z`;
        return (
          <g key={si}>
            {s.fill && <path d={area} fill={s.color} opacity="0.10" />}
            <path d={d} fill="none" stroke={s.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            {s.points.map((p, i) => (
              <circle key={i} cx={xAt(i)} cy={yAt(p.y)} r="2.5" fill={s.color} />
            ))}
          </g>
        );
      })}
    </svg>
  );
}
window.LineChart = LineChart;

// ---------- Recategorize Popover ----------
function CategoryPopover({ value, onChange, onClose, anchor }) {
  const ref = useRef(null);
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const style = anchor ? (() => {
    const r = anchor.getBoundingClientRect();
    return { position: 'fixed', top: r.bottom + 6, left: r.left };
  })() : {};

  const cats = window.CATEGORIES_STORE.filter((c) => c.id !== 'uncategorized');
  const filtered = query.trim()
    ? cats.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
    : cats;
  const showCreate = query.trim().length > 0 && !cats.find((c) => c.name.toLowerCase() === query.trim().toLowerCase());

  const handleCreate = async () => {
    if (!query.trim()) return;
    setCreating(true);
    let newCat;
    if (window.api) {
      newCat = await window.api.createCategory(query.trim());
      const all = await window.api.getCategories();
      window.CATEGORIES_STORE = all;
    } else {
      newCat = { id: query.trim().toLowerCase().replace(/\s+/g, '_'), name: query.trim(), color: 'stone', icon: 'question' };
      window.CATEGORIES_STORE = [...window.CATEGORIES_STORE, newCat];
    }
    onChange(newCat.id);
    onClose();
  };

  return (
    <div className="popover" ref={ref} style={{ ...style, minWidth: 220 }}>
      <div style={{ padding: '4px 4px 6px' }}>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && showCreate) handleCreate(); if (e.key === 'Escape') onClose(); }}
          placeholder="Search or create…"
          style={{ width: '100%', padding: '5px 8px', border: '1px solid var(--line)', borderRadius: 6, fontSize: 12.5, background: 'var(--inset)', color: 'var(--text)', outline: 'none', boxSizing: 'border-box' }}
        />
      </div>
      <div style={{ maxHeight: 220, overflowY: 'auto' }}>
        {filtered.map((c) => (
          <button key={c.id} className={c.id === value ? "selected" : ""}
                  onClick={() => { onChange(c.id); onClose(); }}>
            <span className={`dot ${c.color}`}></span>
            {c.name}
          </button>
        ))}
        {showCreate && (
          <button onClick={handleCreate} disabled={creating} style={{ color: 'var(--primary)', fontWeight: 500 }}>
            <span style={{ fontSize: 14, lineHeight: 1 }}>+</span>
            Create "{query.trim()}"
          </button>
        )}
        {filtered.length === 0 && !showCreate && (
          <div style={{ padding: '6px 8px', fontSize: 12, color: 'var(--muted)' }}>No matches</div>
        )}
      </div>
    </div>
  );
}
window.CategoryPopover = CategoryPopover;

// ---------- Toast ----------
function Toast({ message }) {
  if (!message) return null;
  return <div className="toast">{message}</div>;
}
window.Toast = Toast;

// Expose helpers
Object.assign(window, { fmtMoney, fmtMoneyShort, fmtDate, fmtDateRel, monthKey, monthLabel, catById, accById });
