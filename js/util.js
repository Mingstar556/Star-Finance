/* ============================================================
   Star Finance — util.js
   DOM helpers, icons, formatting, toasts, misc utilities
   ============================================================ */
window.U = (function () {
  "use strict";

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function el(tag, attrs, ...children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (k === "class") node.className = v;
        else if (k === "html") node.innerHTML = v;
        else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
        else if (v !== null && v !== undefined && v !== false) node.setAttribute(k, v);
      }
    }
    for (const c of children.flat()) {
      if (c === null || c === undefined || c === false) continue;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    }
    return node;
  }

  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  /* ---------------- Icons (inline SVG, stroke = currentColor) ---------------- */
  const P = {
    grid:    '<rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/>',
    chart:   '<path d="M3 21h18"/><rect x="5" y="12" width="3.5" height="6" rx="1"/><rect x="10.25" y="7" width="3.5" height="11" rx="1"/><rect x="15.5" y="10" width="3.5" height="8" rx="1"/>',
    list:    '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="3.5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="3.5" cy="18" r="1" fill="currentColor" stroke="none"/>',
    gear:    '<circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.56-1.11 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.09a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.09a1.7 1.7 0 0 0 1.56 1.03H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1.87z"/>',
    plus:    '<path d="M12 5v14M5 12h14"/>',
    minus:   '<path d="M5 12h14"/>',
    up:      '<path d="M12 19V5M5 12l7-7 7 7"/>',
    down:    '<path d="M12 5v14M19 12l-7 7-7-7"/>',
    sun:     '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon:    '<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/>',
    logout:  '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
    search:  '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    trash:   '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    edit:    '<path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>',
    check:   '<path d="M20 6L9 17l-5-5"/>',
    x:       '<path d="M18 6L6 18M6 6l12 12"/>',
    menu:    '<path d="M3 6h18M3 12h18M3 18h18"/>',
    wallet:  '<path d="M20 7H5a2 2 0 0 1 0-4h13v4"/><path d="M20 7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5"/><circle cx="16.5" cy="13.5" r="1.2" fill="currentColor" stroke="none"/>',
    trend:   '<path d="M22 7l-8.5 8.5-4-4L2 19"/><path d="M16 7h6v6"/>',
    pie:     '<path d="M21.2 15.9A10 10 0 1 1 8 2.8"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>',
    star:    '<path d="M12 2.5l2.6 6.9 6.9 2.6-6.9 2.6-2.6 6.9-2.6-6.9-6.9-2.6 6.9-2.6z" fill="currentColor" stroke="none"/>',
    calendar:'<rect x="3" y="4.5" width="18" height="17" rx="2.5"/><path d="M16 2.5v4M8 2.5v4M3 10h18"/>',
    eye:     '<path d="M1 12s4-7.5 11-7.5S23 12 23 12s-4 7.5-11 7.5S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff:  '<path d="M17.9 17.9A10.4 10.4 0 0 1 12 19.5C5 19.5 1 12 1 12a18.5 18.5 0 0 1 5.1-5.9M9.9 4.7A10.4 10.4 0 0 1 12 4.5c7 0 11 7.5 11 7.5a18.6 18.6 0 0 1-2.2 3.2"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/><path d="M2 2l20 20"/>',
    shield:  '<path d="M12 22s8-3.5 8-10V5.5L12 2 4 5.5V12c0 6.5 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>',
    user:    '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5"/>',
    filter:  '<path d="M22 3H2l8 9.5V19l4 2v-8.5z"/>',
    chevL:   '<path d="M15 18l-6-6 6-6"/>',
    chevR:   '<path d="M9 18l6-6-6-6"/>',
    info:    '<circle cx="12" cy="12" r="9.5"/><path d="M12 8h.01M12 11.5V16"/>',
    swap:    '<path d="M7 16V4M7 4L3.5 7.5M7 4l3.5 3.5"/><path d="M17 8v12m0 0l3.5-3.5M17 20l-3.5-3.5"/>',
    coins:   '<circle cx="8" cy="8" r="5.5"/><path d="M14.2 3.3a5.5 5.5 0 0 1 0 15.4M7 13.5a5.5 5.5 0 1 0 8.5 4.7"/>',
    bag:     '<path d="M6 7h12l1.2 13.2a1.8 1.8 0 0 1-1.8 1.8H6.6a1.8 1.8 0 0 1-1.8-1.8z"/><path d="M8.5 10V6a3.5 3.5 0 0 1 7 0v4"/>',
    home:    '<path d="M3 10.5L12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
    car:     '<path d="M5 16l1.5-5.4A2 2 0 0 1 8.4 9h7.2a2 2 0 0 1 1.9 1.6L19 16"/><rect x="3" y="16" width="18" height="4" rx="1.5"/><circle cx="7.5" cy="20" r="1.6" fill="currentColor" stroke="none"/><circle cx="16.5" cy="20" r="1.6" fill="currentColor" stroke="none"/>',
    coffee:  '<path d="M17 8h1.5a2.5 2.5 0 0 1 0 5H17"/><path d="M3 8h14v6a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5z"/><path d="M7 2.5v2M11 2.5v2"/>',
    heart:   '<path d="M12 21s-8.5-4.8-8.5-11A4.6 4.6 0 0 1 12 7a4.6 4.6 0 0 1 8.5 3c0 6.2-8.5 11-8.5 11z"/>',
    zap:     '<path d="M13 2L4.5 13.5H11L9.5 22 19 9.5h-6.5z"/>',
    tv:      '<rect x="2.5" y="7" width="19" height="13" rx="2"/><path d="M8 2.5l4 4 4-4"/>',
    briefcase:'<rect x="2.5" y="7" width="19" height="13" rx="2.5"/><path d="M8.5 7V5a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v2"/><path d="M2.5 12.5h19"/>',
  };

  function I(name, cls) {
    const body = P[name] || P.info;
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ${cls ? `class="${cls}"` : ""} aria-hidden="true">${body}</svg>`;
  }

  function hydrateIcons(root) {
    $$("[data-icon]", root || document).forEach((n) => { n.innerHTML = I(n.dataset.icon); });
  }

  /* ---------------- Brand ---------------- */
  const LOGO = `<svg viewBox="0 0 40 40" aria-hidden="true">
    <defs><linearGradient id="sfg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="var(--accent-2)"/><stop offset="1" stop-color="var(--accent)"/>
    </linearGradient></defs>
    <rect x="1" y="1" width="38" height="38" rx="11" fill="var(--card-2)" stroke="var(--border-strong)"/>
    <path d="M20 7l3.2 8.6L32 19l-8.8 3.4L20 31l-3.2-8.6L8 19l8.8-3.4z" fill="url(#sfg)"/>
    <circle cx="29.5" cy="10.5" r="1.6" fill="url(#sfg)"/>
    <circle cx="10.5" cy="29.5" r="1.3" fill="url(#sfg)"/>
  </svg>`;

  /* ---------------- Formatting ---------------- */
  const SYMBOLS = { USD: "$", EUR: "€", GBP: "£" };
  const nfCache = {};
  function fmtMoney(v, cur = "USD", opts = {}) {
    const key = cur + JSON.stringify(opts);
    if (!nfCache[key]) nfCache[key] = new Intl.NumberFormat(undefined, {
      style: "currency", currency: cur, maximumFractionDigits: opts.cents === false ? 0 : 2,
      minimumFractionDigits: opts.cents === false ? 0 : 2,
    });
    return nfCache[key].format(v);
  }
  function fmtCompact(v, cur = "USD") {
    const s = SYMBOLS[cur] || "$";
    const abs = Math.abs(v), sign = v < 0 ? "-" : "";
    if (abs >= 1_000_000) return sign + s + (abs / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
    if (abs >= 1000) return sign + s + (abs / 1000).toFixed(abs >= 10_000 ? 0 : 1).replace(/\.0$/, "") + "k";
    return sign + s + Math.round(abs);
  }
  function fmtDate(iso, style = "short") {
    const d = new Date(iso + (iso.length === 10 ? "T12:00:00" : ""));
    if (isNaN(d)) return iso;
    return d.toLocaleDateString(undefined, style === "short" ? { month: "short", day: "numeric", year: "numeric" } : { month: "long", day: "numeric" });
  }
  function monthLabel(isoMonth) {
    const d = new Date(isoMonth + "-01T12:00:00");
    return d.toLocaleDateString(undefined, { month: "short" });
  }
  function initials(name) {
    return String(name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?";
  }
  function todayISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  function greeting() {
    const h = new Date().getHours();
    if (h < 5) return "Up late";
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  }

  /* ---------------- Toasts ---------------- */
  function toast(msg, type = "info", ms = 3400) {
    const root = $("#toast-root");
    const iconName = type === "success" ? "check" : type === "error" ? "x" : "info";
    const t = el("div", { class: `toast ${type}`, html: I(iconName) }, el("span", null, msg));
    root.appendChild(t);
    setTimeout(() => {
      t.classList.add("leaving");
      t.addEventListener("animationend", () => t.remove(), { once: true });
    }, ms);
  }

  /* ---------------- Count-up animation ---------------- */
  function countUp(node, target, formatter, dur = 750) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      node.textContent = formatter(target); return;
    }
    const start = performance.now();
    const from = 0;
    function frame(now) {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      node.textContent = formatter(from + (target - from) * eased);
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ---------------- Seeded RNG ---------------- */
  function seedFrom(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function debounce(fn, ms) {
    let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  }
  function uid() {
    return "sf_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  return { $, $$, el, esc, I, hydrateIcons, LOGO, fmtMoney, fmtCompact, fmtDate, monthLabel, initials, todayISO, greeting, toast, countUp, seedFrom, mulberry32, debounce, uid, SYMBOLS };
})();
