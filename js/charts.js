/* ============================================================
   Star Finance — charts.js
   Dependency-free SVG chart engine: area/line, grouped bars,
   donut, sparklines — theme aware, hover tooltips, responsive.
   ============================================================ */
window.Charts = (function () {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";
  const tip = () => document.getElementById("chart-tip");

  function svgEl(tag, attrs) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }
  function cssVar(name, fb) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fb;
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

  /* ---------- tooltip ---------- */
  function showTip(html, clientX, clientY) {
    const t = tip(); if (!t) return;
    t.innerHTML = html;
    t.classList.remove("hidden");
    const r = t.getBoundingClientRect();
    let x = clientX + 16, y = clientY - r.height - 12;
    if (x + r.width > window.innerWidth - 8) x = clientX - r.width - 16;
    if (y < 8) y = clientY + 18;
    t.style.left = x + "px";
    t.style.top = y + "px";
  }
  function hideTip() { const t = tip(); if (t) t.classList.add("hidden"); }

  /* ---------- helpers ---------- */
  function niceExtent(values, padToZero) {
    let min = Math.min(...values), max = Math.max(...values);
    if (padToZero) min = 0;
    if (min === max) { min -= 1; max += 1; }
    const span = max - min;
    max += span * 0.10;
    if (!padToZero) min -= span * 0.08;
    return [min, max];
  }
  function smoothPath(pts) {
    if (pts.length < 2) return pts.length ? `M ${pts[0].x} ${pts[0].y}` : "";
    let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return d;
  }
  function gridAndYAxis(svg, x0, x1, y0, y1, min, max, fmtY) {
    const g = svgEl("g", {});
    for (let i = 0; i <= 4; i++) {
      const v = min + ((max - min) * i) / 4;
      const y = y1 - ((v - min) / (max - min)) * (y1 - y0);
      g.appendChild(svgEl("line", { x1: x0, x2: x1, y1: y, y2: y, stroke: cssVar("--border", "#888"), "stroke-dasharray": "3 5", "stroke-width": 1 }));
      const lbl = svgEl("text", { x: x0 - 8, y: y + 4, "text-anchor": "end", fill: cssVar("--faint", "#999"), "font-size": 11 });
      lbl.textContent = fmtY(v);
      g.appendChild(lbl);
    }
    svg.appendChild(g);
  }
  function xLabels(svg, labels, x0, x1, y, maxShow) {
    const step = Math.max(1, Math.ceil(labels.length / (maxShow || 6)));
    for (let i = 0; i < labels.length; i += step) {
      const x = x0 + ((x1 - x0) * i) / Math.max(1, labels.length - 1);
      const t = svgEl("text", { x, y: y + 16, "text-anchor": "middle", fill: cssVar("--faint", "#999"), "font-size": 11 });
      t.textContent = labels[i];
      svg.appendChild(t);
    }
  }
  function tipHTML(label, entries) {
    const rows = entries.map((e) =>
      `<div class="tt-row"><span style="display:inline-flex;align-items:center;gap:6px"><span class="cat-dot" style="background:${e.color}"></span>${U.esc(e.name)}</span><b>${e.value}</b></div>`
    ).join("");
    return `<div class="tt-label">${U.esc(label)}</div>${rows}`;
  }

  /* ============================================================
     lineChart(el, { labels, series:[{name,color,values}], fmtY, fmtTip, area })
     ============================================================ */
  function lineChart(el, cfg) {
    const render = () => {
      const W = Math.max(280, el.clientWidth || 620);
      const H = cfg.height || 300;
      const padL = 52, padR = 14, padT = 16, padB = 30;
      const x0 = padL, x1 = W - padR, y0 = padT, y1 = H - padB;
      clear(el);

      const all = cfg.series.flatMap((s) => s.values);
      const [min, max] = niceExtent(all, cfg.zeroBase !== false);
      const n = cfg.labels.length;
      const X = (i) => (n === 1 ? (x0 + x1) / 2 : x0 + ((x1 - x0) * i) / (n - 1));
      const Y = (v) => y1 - ((v - min) / (max - min)) * (y1 - y0);
      const fmtY = cfg.fmtY || ((v) => U.fmtCompact(v));

      const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "none", "aria-hidden": "true" });
      svg.style.height = H + "px";
      const uid = "g" + Math.random().toString(36).slice(2, 8);

      gridAndYAxis(svg, x0, x1, y0, y1, min, max, fmtY);
      xLabels(svg, cfg.labels, x0, x1, y1, 6);

      const defs = svgEl("defs", {});
      cfg.series.forEach((s, si) => {
        const grad = svgEl("linearGradient", { id: `${uid}_${si}`, x1: 0, y1: 0, x2: 0, y2: 1 });
        grad.appendChild(svgEl("stop", { offset: "0%", "stop-color": s.color, "stop-opacity": cfg.area === false ? 0 : 0.30 }));
        grad.appendChild(svgEl("stop", { offset: "100%", "stop-color": s.color, "stop-opacity": 0 }));
        defs.appendChild(grad);
      });
      svg.appendChild(defs);

      cfg.series.forEach((s, si) => {
        const pts = s.values.map((v, i) => ({ x: X(i), y: Y(v) }));
        const line = smoothPath(pts);
        if (cfg.area !== false) {
          svg.appendChild(svgEl("path", { d: `${line} L ${x1} ${y1} L ${x0} ${y1} Z`, fill: `url(#${uid}_${si})`, stroke: "none" }));
        }
        svg.appendChild(svgEl("path", { d: line, fill: "none", stroke: s.color, "stroke-width": 2.4, "stroke-linecap": "round" }));
        // end dot
        const last = pts[pts.length - 1];
        svg.appendChild(svgEl("circle", { cx: last.x, cy: last.y, r: 4, fill: s.color }));
        svg.appendChild(svgEl("circle", { cx: last.x, cy: last.y, r: 7.5, fill: s.color, opacity: 0.22 }));
      });

      // hover guide + hit area
      const guide = svgEl("line", { x1: 0, x2: 0, y1: y0, y2: y1, stroke: cssVar("--accent", "#d4af37"), "stroke-width": 1, "stroke-dasharray": "4 4", opacity: 0 });
      svg.appendChild(guide);
      const dots = cfg.series.map((s) => {
        const c = svgEl("circle", { r: 4.5, fill: cssVar("--card", "#111"), stroke: s.color, "stroke-width": 2.5, opacity: 0 });
        svg.appendChild(c); return c;
      });
      const hit = svgEl("rect", { x: x0, y: y0, width: x1 - x0, height: y1 - y0, fill: "transparent" });
      hit.addEventListener("mousemove", (ev) => {
        const rect = svg.getBoundingClientRect();
        const relX = ((ev.clientX - rect.left) / rect.width) * W;
        const i = Math.max(0, Math.min(n - 1, Math.round(((relX - x0) / (x1 - x0)) * (n - 1))));
        const gx = X(i);
        guide.setAttribute("x1", gx); guide.setAttribute("x2", gx); guide.setAttribute("opacity", 0.7);
        dots.forEach((c, si) => { c.setAttribute("cx", gx); c.setAttribute("cy", Y(cfg.series[si].values[i])); c.setAttribute("opacity", 1); });
        const entries = cfg.series.map((s) => ({ name: s.name, color: s.color, value: (cfg.fmtTip || fmtY)(s.values[i]) }));
        showTip(tipHTML(cfg.labels[i], entries), ev.clientX, ev.clientY);
      });
      hit.addEventListener("mouseleave", () => {
        guide.setAttribute("opacity", 0);
        dots.forEach((c) => c.setAttribute("opacity", 0));
        hideTip();
      });
      svg.appendChild(hit);
      el.appendChild(svg);
    };
    mount(el, render);
  }

  /* ============================================================
     barChart(el, { labels, series:[{name,color,values}], fmtY, fmtTip })
     ============================================================ */
  function barChart(el, cfg) {
    const render = () => {
      const W = Math.max(280, el.clientWidth || 620);
      const H = cfg.height || 300;
      const padL = 52, padR = 14, padT = 16, padB = 30;
      const x0 = padL, x1 = W - padR, y0 = padT, y1 = H - padB;
      clear(el);

      const [min, max] = niceExtent(cfg.series.flatMap((s) => s.values), true);
      const n = cfg.labels.length;
      const Y = (v) => y1 - ((v - min) / (max - min)) * (y1 - y0);
      const fmtY = cfg.fmtY || ((v) => U.fmtCompact(v));
      const slot = (x1 - x0) / n;
      const groupW = Math.min(slot * 0.62, 54);
      const bw = groupW / cfg.series.length;

      const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, "aria-hidden": "true" });
      svg.style.height = H + "px";
      gridAndYAxis(svg, x0, x1, y0, y1, min, max, fmtY);
      xLabels(svg, cfg.labels, x0, x1, y1, 12);

      cfg.series.forEach((s, si) => {
        s.values.forEach((v, i) => {
          const gx = x0 + slot * i + (slot - groupW) / 2 + si * bw;
          const h = Math.max(2, y1 - Y(v));
          const rect = svgEl("rect", {
            x: gx + 1, y: y1 - h, width: Math.max(2, bw - 2.5), height: h,
            rx: Math.min(5, (bw - 2.5) / 2), fill: s.color, opacity: si === 0 ? 0.95 : 0.75,
          });
          rect.addEventListener("mousemove", (ev) => {
            rect.setAttribute("opacity", 1);
            showTip(tipHTML(cfg.labels[i], [{ name: s.name, color: s.color, value: (cfg.fmtTip || fmtY)(v) }]), ev.clientX, ev.clientY);
          });
          rect.addEventListener("mouseleave", () => { rect.setAttribute("opacity", si === 0 ? 0.95 : 0.75); hideTip(); });
          svg.appendChild(rect);
        });
      });
      el.appendChild(svg);
    };
    mount(el, render);
  }

  /* ============================================================
     donutChart(el, { segments:[{name,value,color}], fmt, centerLabel })
     ============================================================ */
  function donutChart(el, cfg) {
    const render = () => {
      const size = cfg.size || 210;
      const sw = 24, r = (size - sw) / 2 - 6;
      const c = size / 2;
      const total = (cfg.total ?? cfg.segments.reduce((s, x) => s + x.value, 0)) || 1;
      clear(el);

      const svg = svgEl("svg", { viewBox: `0 0 ${size} ${size}`, "aria-hidden": "true" });
      svg.style.maxWidth = size + "px";
      svg.style.margin = "0 auto";
      svg.appendChild(svgEl("circle", { cx: c, cy: c, r, fill: "none", stroke: cssVar("--card-2", "#222"), "stroke-width": sw }));

      const CIRC = 2 * Math.PI * r;
      let offset = 0;
      cfg.segments.forEach((seg) => {
        const frac = seg.value / total;
        const arc = svgEl("circle", {
          cx: c, cy: c, r, fill: "none", stroke: seg.color, "stroke-width": sw,
          "stroke-dasharray": `${Math.max(0, frac * CIRC - 2)} ${CIRC}`,
          "stroke-dashoffset": -offset * CIRC,
          transform: `rotate(-90 ${c} ${c})`, "stroke-linecap": "butt",
          style: "transition: stroke-width .2s, opacity .2s; cursor: pointer;",
        });
        arc.addEventListener("mouseenter", () => { arc.setAttribute("stroke-width", sw + 6); });
        arc.addEventListener("mouseleave", () => { arc.setAttribute("stroke-width", sw); hideTip(); });
        arc.addEventListener("mousemove", (ev) => {
          showTip(tipHTML(cfg.centerLabel || "Spending", [{ name: seg.name, color: seg.color, value: (cfg.fmt || ((v) => v))(seg.value) }]), ev.clientX, ev.clientY);
        });
        svg.appendChild(arc);
        offset += frac;
      });

      const t1 = svgEl("text", { x: c, y: c - 4, "text-anchor": "middle", fill: cssVar("--text", "#fff"), "font-size": 20, "font-weight": 800 });
      t1.textContent = (cfg.fmt || String)(total);
      const t2 = svgEl("text", { x: c, y: c + 18, "text-anchor": "middle", fill: cssVar("--muted", "#999"), "font-size": 11.5, "letter-spacing": "0.06em" });
      t2.textContent = cfg.centerLabel || "TOTAL";
      svg.appendChild(t1); svg.appendChild(t2);
      el.appendChild(svg);
    };
    mount(el, render);
  }

  /* ============================================================
     sparkline(el, values, color, { w, h })
     ============================================================ */
  function sparkline(el, values, color, opts = {}) {
    const W = opts.w || 130, H = opts.h || 38;
    clear(el);
    if (!values.length) return;
    const min = Math.min(...values), max = Math.max(...values);
    const span = max - min || 1;
    const pts = values.map((v, i) => ({
      x: 3 + ((W - 6) * i) / Math.max(1, values.length - 1),
      y: H - 5 - ((v - min) / span) * (H - 10),
    }));
    const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "none", "aria-hidden": "true" });
    svg.style.width = "100%";
    svg.style.height = H + "px";
    svg.style.display = "block";
    const line = smoothPath(pts);
    const uid = "sp" + Math.random().toString(36).slice(2, 8);
    const defs = svgEl("defs", {});
    const grad = svgEl("linearGradient", { id: uid, x1: 0, y1: 0, x2: 0, y2: 1 });
    grad.appendChild(svgEl("stop", { offset: "0%", "stop-color": color, "stop-opacity": 0.35 }));
    grad.appendChild(svgEl("stop", { offset: "100%", "stop-color": color, "stop-opacity": 0 }));
    defs.appendChild(grad); svg.appendChild(defs);
    svg.appendChild(svgEl("path", { d: `${line} L ${pts[pts.length - 1].x} ${H} L ${pts[0].x} ${H} Z`, fill: `url(#${uid})` }));
    svg.appendChild(svgEl("path", { d: line, fill: "none", stroke: color, "stroke-width": 2, "stroke-linecap": "round" }));
    const last = pts[pts.length - 1];
    svg.appendChild(svgEl("circle", { cx: last.x, cy: last.y, r: 3, fill: color }));
    el.appendChild(svg);
  }

  /* ---------- responsive remount ---------- */
  function mount(el, renderFn) {
    el.__render = renderFn;
    renderFn();
    if (window.ResizeObserver && !el.__ro) {
      el.__ro = new ResizeObserver(U.debounce(() => { if (el.isConnected && el.__render) el.__render(); }, 140));
      el.__ro.observe(el);
    }
  }

  return { lineChart, barChart, donutChart, sparkline, palette: () => Store.palette(), cssVar, hideTip };
})();
