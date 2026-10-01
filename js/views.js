/* ============================================================
   Star Finance — views.js
   Dashboard · Analytics · Transactions · Settings
   ============================================================ */
window.Views = (function () {
  "use strict";
  const { $, $$, el, esc, I, fmtMoney, fmtCompact, fmtDate, monthLabel, toast, countUp, greeting } = U;

  const SUBTITLES = {
    dashboard: () => `${greeting()}, here is your financial orbit today.`,
    analytics: () => "Deep dive into trends, budgets and category breakdowns.",
    transactions: () => "Search, filter and manage every movement of your money.",
    settings: () => "Profile, appearance and account controls.",
  };

  /* ============================================================
     DASHBOARD
     ============================================================ */
  function dashboard(view, ctx) {
    const { user, data } = ctx;
    const cur = user.prefs.currency || "USD";
    const s = Store.compute(data);
    const pal = Store.palette();
    const hasData = data.transactions.length > 0;

    // --- KPI row
    const kpis = el("div", { class: "kpi-grid" },
      kpiCard({
        label: "Total balance", icon: "wallet",
        value: s.balanceNow, cur, spark: s.balance,
        delta: s.balance[10] > 0 ? pctDelta(s.balance[11], s.balance[10]) : null,
        hint: "vs last month",
      }),
      kpiCard({
        label: "Income · this month", icon: "up", positive: true,
        value: s.monthIncome, cur, spark: s.income,
        delta: hasData ? s.incDelta : null, hint: "vs last month",
      }),
      kpiCard({
        label: "Spending · this month", icon: "down", negative: true,
        value: s.monthExpense, cur, spark: s.expense,
        delta: hasData ? s.expDelta : null, hint: "vs last month", invert: true,
      }),
      kpiCard({
        label: "Savings rate", icon: "trend",
        value: s.savingsRate, cur, isPct: true, spark: s.netHistory,
        delta: null, hint: "income kept this month",
      })
    );

    // --- Main chart + donut
    const rangeSeg = el("div", { class: "seg" },
      el("button", { "data-range": "1" }, "1M"),
      el("button", { "data-range": "6" }, "6M"),
      el("button", { class: "active", "data-range": "12" }, "12M")
    );
    if (!hasData) rangeSeg.classList.add("hidden");
    const chartBody = el("div", { class: "chart-wrap" });
    const mainCard = el("section", { class: "card card-pad" },
      el("div", { class: "card-head", style: "padding:0; margin-bottom:6px;" },
        el("div", null,
          el("div", { class: "card-title" }, "Balance over time"),
          el("div", { class: "card-sub" }, hasData ? "Net worth trend across your accounts" : "Day-by-day (1M) and month-by-month (6M · 12M)")
        ),
        rangeSeg
      ),
      chartBody
    );
    const drawMain = (n) => {
      let labels, values;
      if (n === 1) {
        labels = s.days.map((d) => fmtDate(d, "day"));
        values = s.daily;
      } else {
        labels = s.months.slice(-n).map(monthLabel);
        values = s.balance.slice(-n);
      }
      Charts.lineChart(chartBody, {
        labels,
        series: [{ name: "Balance", color: pal[0], values }],
        fmtY: (v) => fmtCompact(v, cur),
        fmtTip: (v) => fmtMoney(v, cur, { cents: false }),
        height: 300,
      });
    };
    if (hasData) {
      drawMain(12);
      rangeSeg.addEventListener("click", (e) => {
        const b = e.target.closest("button"); if (!b) return;
        $$("button", rangeSeg).forEach((x) => x.classList.toggle("active", x === b));
        drawMain(+b.dataset.range);
      });
    } else {
      chartBody.appendChild(emptyCta(ctx, "Your balance story starts here", "Add your first income or expense and watch this chart come to life."));
    }

    // donut
    const donutBody = el("div", { class: "chart-wrap", style: "display:flex; justify-content:center; padding: 8px 0 4px;" });
    const legend = el("div", { class: "legend", style: "margin-top: 16px;" });
    const donutCard = el("section", { class: "card card-pad" },
      el("div", { class: "card-head", style: "padding:0; margin-bottom:6px;" },
        el("div", null,
          el("div", { class: "card-title" }, "Spending by category"),
          el("div", { class: "card-sub" }, "This month")
        )
      ),
      donutBody, legend
    );
    const total = s.categories.reduce((a, c) => a + c.total, 0);
    if (hasData && s.categories.length) {
      Charts.donutChart(donutBody, {
        segments: s.categories.slice(0, 6).map((c, i) => ({ name: c.name, value: c.total, color: pal[i % pal.length] })),
        total,
        fmt: (v) => fmtMoney(v, cur, { cents: false }),
        centerLabel: "SPENT",
      });
      s.categories.slice(0, 6).forEach((c, i) => {
        legend.appendChild(el("div", { class: "legend-item" },
          el("span", { class: "dot", style: `background:${pal[i % pal.length]}` }),
          el("span", { class: "l-name" }, c.name),
          el("span", { class: "l-val" }, fmtMoney(c.total, cur, { cents: false })),
          el("span", { class: "l-pct" }, `${total ? Math.round((c.total / total) * 100) : 0}%`)
        ));
      });
    } else {
      donutBody.appendChild(el("div", { class: "empty", style: "padding: 44px 10px;" },
        el("span", { html: I("pie") }),
        el("b", null, hasData ? "No expenses this month" : "No spending yet"),
        el("span", null, hasData ? "Log an expense this month to see the breakdown." : "Your category breakdown appears after your first expense.")
      ));
    }

    // --- Recent activity + quick actions
    const list = el("div", { class: "tx-list" });
    s.recent.forEach((t) => list.appendChild(txRow(t, cur)));
    if (!s.recent.length) list.appendChild(emptyHint("No transactions yet — add your first one."));

    const recentCard = el("section", { class: "card" },
      el("div", { class: "card-head" },
        el("div", null,
          el("div", { class: "card-title" }, "Recent activity"),
          el("div", { class: "card-sub" }, "Latest movements across accounts")
        ),
        el("a", { class: "btn btn-ghost", href: "#/transactions", style: "padding:7px 14px; font-size:13px;" }, "View all")
      ),
      list
    );

    const qaCard = el("section", { class: "card card-pad" },
      el("div", { class: "card-title", style: "margin-bottom: 2px;" }, "Quick actions"),
      el("div", { class: "card-sub", style: "margin-bottom: 14px;" }, "Keep your ledger in orbit"),
      el("div", { class: "qa-grid", style: "padding:0;" },
        qaBtn("Add income", "up", () => ctx.openTxModal("income")),
        qaBtn("Add expense", "down", () => ctx.openTxModal("expense")),
        qaBtn("Full report", "chart", () => { location.hash = "#/analytics"; })
      ),
      el("div", { style: "height:1px; background:var(--border); margin:18px 0 16px; border:0;" }),
      el("div", { class: "card-title", style: "font-size:13.5px;" }, "Biggest expenses this month"),
      biggestList(s.biggest, cur)
    );

    view.append(kpis, mainCard && wrap2(mainCard, donutCard), recentCard && wrap2(recentCard, qaCard));
  }

  function wrap2(a, b) {
    const g = el("div", { class: "grid-dash" });
    g.append(a, b);
    return g;
  }

  function kpiCard(o) {
    const cur = o.cur;
    const fmt = o.isPct ? (v) => `${v.toFixed(1)}%` : (v) => fmtMoney(v, cur, { cents: v < 1000 });
    const valNode = el("div", { class: "kpi-value" }, "—");
    let deltaNode = null;
    if (o.delta !== null && o.delta !== undefined && isFinite(o.delta)) {
      const good = o.invert ? o.delta < 0 : o.delta >= 0; // for spending, down is good
      const dir = o.delta >= 0 ? "up" : "down";
      deltaNode = el("span", {
        class: `delta ${good ? "up" : "down"}`,
        html: `${I(dir)} ${Math.abs(o.delta).toFixed(1)}%`,
      });
    }
    const sparkNode = el("div", { class: "kpi-spark" });
    const card = el("section", { class: "card kpi" },
      el("div", { class: "kpi-top" },
        el("span", { class: "kpi-label" }, o.label),
        el("span", { class: "kpi-ico", html: I(o.icon) })
      ),
      valNode,
      el("div", { class: "kpi-foot" },
        el("span", { class: "kpi-hint" }, o.hint),
        deltaNode
      ),
      sparkNode
    );
    // animate value, draw spark after layout
    requestAnimationFrame(() => {
      countUp(valNode, o.value, fmt);
      Charts.sparkline(sparkNode, o.spark, o.positive ? "var(--up)" : o.negative ? "var(--down)" : "var(--accent)");
    });
    return card;
  }

  function pctDelta(cur, prev) { return prev > 0 ? ((cur - prev) / prev) * 100 : 0; }

  function txRow(t, cur) {
    const isIn = t.type === "income";
    return el("div", { class: "tx-row" },
      el("span", { class: `tx-ico ${t.type}`, html: I(Store.CAT_ICONS[t.category] || "coins") }),
      el("div", { class: "tx-meta" },
        el("strong", null, t.desc),
        el("small", null, `${t.category} · ${t.account} · ${fmtDate(t.date)}`)
      ),
      el("span", { class: `tx-amt ${t.type}` }, `${isIn ? "+" : "−"}${fmtMoney(t.amount, cur)}`)
    );
  }

  function biggestList(items, cur) {
    const wrap = el("div", { style: "margin-top: 10px; display:flex; flex-direction:column; gap:10px;" });
    items.slice(0, 4).forEach((t) => {
      wrap.appendChild(el("div", { style: "display:flex; justify-content:space-between; gap:10px; font-size:13.5px; align-items:center;" },
        el("span", { class: "cat-chip" }, el("span", { class: "cat-dot", style: "background:var(--accent)" }), t.desc),
        el("b", { style: "font-variant-numeric: tabular-nums; white-space:nowrap;" }, fmtMoney(t.amount, cur))
      ));
    });
    if (!items.length) wrap.appendChild(emptyHint("Nothing yet."));
    return wrap;
  }

  function qaBtn(label, icon, fn) {
    return el("button", { class: "qa", html: I(icon), onclick: fn }, el("span", null, label));
  }
  function emptyHint(msg) {
    return el("div", { class: "empty", style: "padding:22px;" }, el("span", null, msg));
  }
  function emptyCta(ctx, title, msg) {
    return el("div", { class: "empty", style: "padding: 56px 18px;" },
      el("span", { html: I("chart") }),
      el("b", null, title),
      el("span", { style: "max-width: 40ch;" }, msg),
      el("div", { style: "display:flex; gap:10px; margin-top:10px; flex-wrap:wrap; justify-content:center;" },
        el("button", { class: "btn btn-primary", onclick: () => ctx.openTxModal("income"), html: `${I("up")}<span>Add income</span>` }),
        el("button", { class: "btn btn-ghost", onclick: () => ctx.openTxModal("expense"), html: `${I("down")}<span>Add expense</span>` })
      )
    );
  }

  /* ============================================================
     ANALYTICS
     ============================================================ */
  function analytics(view, ctx) {
    const { user, data } = ctx;
    const cur = user.prefs.currency || "USD";
    const s = Store.compute(data);
    const pal = Store.palette();

    if (!data.transactions.length) {
      view.appendChild(el("section", { class: "card" },
        el("div", { class: "empty", style: "padding: 80px 24px;" },
          el("span", { html: I("chart") }),
          el("b", null, "Nothing to analyze yet"),
          el("span", { style: "max-width: 44ch;" }, "Once you add transactions, this page fills with cash-flow charts, budget progress and category insights."),
          el("div", { style: "display:flex; gap:10px; margin-top:10px; flex-wrap:wrap; justify-content:center;" },
            el("button", { class: "btn btn-primary", onclick: () => ctx.openTxModal("income"), html: `${I("up")}<span>Add income</span>` }),
            el("button", { class: "btn btn-ghost", onclick: () => ctx.openTxModal("expense"), html: `${I("down")}<span>Add expense</span>` })
          )
        )
      ));
      return;
    }

    const incExpBody = el("div", { class: "chart-wrap" });
    Charts.barChart(incExpBody, {
      labels: s.months.map(monthLabel),
      series: [
        { name: "Income", color: pal[1], values: s.income },
        { name: "Expenses", color: pal[0], values: s.expense },
      ],
      fmtY: (v) => fmtCompact(v, cur),
      fmtTip: (v) => fmtMoney(v, cur, { cents: false }),
      height: 290,
    });
    const incExpCard = el("section", { class: "card card-pad" },
      el("div", { class: "card-head", style: "padding:0; margin-bottom:6px;" },
        el("div", null,
          el("div", { class: "card-title" }, "Income vs expenses"),
          el("div", { class: "card-sub" }, "Monthly cash flow, last 12 months")
        ),
        el("div", { class: "legend", style: "flex-direction:row; gap:16px;" },
          legendMini(pal[1], "Income"), legendMini(pal[0], "Expenses")
        )
      ),
      incExpBody
    );

    const netBody = el("div", { class: "chart-wrap" });
    Charts.lineChart(netBody, {
      labels: s.months.map(monthLabel),
      series: [{ name: "Net saved", color: pal[2], values: s.netHistory }],
      fmtY: (v) => fmtCompact(v, cur),
      fmtTip: (v) => fmtMoney(v, cur, { cents: false }),
      height: 290,
    });
    const netCard = el("section", { class: "card card-pad" },
      el("div", { class: "card-head", style: "padding:0; margin-bottom:6px;" },
        el("div", null,
          el("div", { class: "card-title" }, "Net savings"),
          el("div", { class: "card-sub" }, "What you keep each month")
        )
      ),
      netBody
    );

    // Budgets
    const budgetBody = el("div", { style: "padding: 6px 22px 16px;" });
    const budgets = data.budgets || {};
    const entries = Object.entries(budgets);
    entries.forEach(([name, budget]) => {
      const spent = (s.categories.find((c) => c.name === name) || { total: 0 }).total;
      const pctv = budget ? (spent / budget) * 100 : 0;
      const bar = el("div", { class: `prog-bar ${pctv > 100 ? "over" : pctv > 80 ? "warn" : ""}` });
      requestAnimationFrame(() => (bar.style.width = `${Math.min(100, pctv)}%`));
      budgetBody.appendChild(el("div", { class: "prog-row" },
        el("div", { class: "prog-top" },
          el("b", null, name),
          el("span", { class: "p-amt" }, `${fmtMoney(spent, cur, { cents: false })} / ${fmtMoney(budget, cur, { cents: false })} · ${Math.round(pctv)}%`)
        ),
        el("div", { class: "prog" }, bar)
      ));
    });
    const budgetCard = el("section", { class: "card" },
      el("div", { class: "card-head" },
        el("div", null,
          el("div", { class: "card-title" }, "Budgets — this month"),
          el("div", { class: "card-sub" }, "Spend against your monthly plan")
        )
      ),
      budgetBody
    );

    // Category table (12-month totals)
    const allCat = {};
    data.transactions.filter((t) => t.type === "expense").forEach((t) => { allCat[t.category] = (allCat[t.category] || 0) + t.amount; });
    const rows = Object.entries(allCat).sort((a, b) => b[1] - a[1]);
    const grand = rows.reduce((a, r) => a + r[1], 0) || 1;
    const catBody = el("div", { class: "legend", style: "padding: 18px 22px 22px;" });
    rows.forEach(([name, total], i) => {
      catBody.appendChild(el("div", { class: "legend-item" },
        el("span", { class: "dot", style: `background:${pal[i % pal.length]}` }),
        el("span", { class: "l-name" }, name),
        el("span", { class: "l-val" }, fmtMoney(total, cur, { cents: false })),
        el("span", { class: "l-pct" }, `${Math.round((total / grand) * 100)}%`)
      ));
    });
    const catCard = el("section", { class: "card" },
      el("div", { class: "card-head" },
        el("div", null,
          el("div", { class: "card-title" }, "Where money goes"),
          el("div", { class: "card-sub" }, "All-time expenses by category")
        )
      ),
      catBody
    );

    view.append(
      grid(incExpCard, netCard, "grid-dash"),
      grid(budgetCard, catCard, "grid-dash")
    );
  }

  function legendMini(color, name) {
    return el("span", { style: "display:inline-flex; align-items:center; gap:7px; font-size:12.5px; color:var(--muted);" },
      el("span", { class: "dot", style: `background:${color}; width:9px; height:9px; border-radius:3px;` }), name);
  }
  function grid(a, b, cls) {
    const g = el("div", { class: cls || "grid-2" });
    g.append(a, b); return g;
  }

  /* ============================================================
     TRANSACTIONS
     ============================================================ */
  let txState = { q: "", type: "all", category: "all", sort: "new", page: 1 };
  const PAGE = 12;

  function transactions(view, ctx) {
    const { user, data } = ctx;
    const cur = user.prefs.currency || "USD";
    txState.page = 1;
    txState.q = ""; txState.type = "all"; txState.category = "all"; txState.sort = "new";

    const search = el("input", { class: "input", placeholder: "Search description, category…", "aria-label": "Search transactions" });
    const typeSel = el("select", { class: "select", "aria-label": "Filter by type" },
      el("option", { value: "all" }, "All types"),
      el("option", { value: "income" }, "Income"),
      el("option", { value: "expense" }, "Expense")
    );
    const catSel = el("select", { class: "select", "aria-label": "Filter by category" },
      el("option", { value: "all" }, "All categories"),
      Store.CATEGORIES.income.concat(Store.CATEGORIES.expense).map((c) => el("option", { value: c }, c))
    );
    const sortSel = el("select", { class: "select", "aria-label": "Sort" },
      el("option", { value: "new" }, "Newest first"),
      el("option", { value: "old" }, "Oldest first"),
      el("option", { value: "high" }, "Largest amount")
    );
    const addBtn = el("button", { class: "btn btn-primary", html: `${I("plus")} Add transaction` });
    addBtn.addEventListener("click", () => ctx.openTxModal("expense"));

    const tableWrap = el("div", { class: "table-wrap" });
    const foot = el("div", { class: "table-foot" });

    const cardEl = el("section", { class: "card" },
      el("div", { class: "toolbar" },
        el("div", { class: "search-box", html: I("search") }, search),
        typeSel, catSel, sortSel, addBtn
      ),
      tableWrap,
      foot
    );
    view.appendChild(cardEl);

    function apply() {
      let list = data.transactions.slice();
      const q = txState.q.toLowerCase();
      if (q) list = list.filter((t) => t.desc.toLowerCase().includes(q) || t.category.toLowerCase().includes(q) || t.account.toLowerCase().includes(q));
      if (txState.type !== "all") list = list.filter((t) => t.type === txState.type);
      if (txState.category !== "all") list = list.filter((t) => t.category === txState.category);
      if (txState.sort === "old") list.reverse();
      if (txState.sort === "high") list.sort((a, b) => b.amount - a.amount);

      const pages = Math.max(1, Math.ceil(list.length / PAGE));
      txState.page = Math.min(txState.page, pages);
      const slice = list.slice((txState.page - 1) * PAGE, txState.page * PAGE);

      // totals of the FILTERED list
      const tin = list.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
      const tout = list.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

      tableWrap.innerHTML = "";
      if (!slice.length) {
        tableWrap.appendChild(el("div", { class: "empty" },
          el("span", { html: I("search") }),
          el("b", null, "No transactions found"),
          el("span", null, "Try adjusting your search or filters.")
        ));
      } else {
        const tbody = el("tbody");
        slice.forEach((t) => tbody.appendChild(txTr(t, cur, ctx)));
        tableWrap.appendChild(el("table", { class: "tbl" },
          el("thead", null, el("tr", null,
            el("th", null, "Date"), el("th", null, "Description"), el("th", null, "Category"),
            el("th", null, "Account"), el("th", { style: "text-align:right" }, "Amount"), el("th", null, "")
          )),
          tbody
        ));
      }

      foot.innerHTML = "";
      foot.append(
        el("span", { class: "info" }, `${list.length} result${list.length === 1 ? "" : "s"} · in ${fmtMoney(tin, cur, { cents: false })} · out ${fmtMoney(tout, cur, { cents: false })}`),
        pager(pages)
      );
    }

    function pager(pages) {
      const p = el("div", { class: "pager" });
      const prev = el("button", { html: I("chevL"), "aria-label": "Previous page" });
      const next = el("button", { html: I("chevR"), "aria-label": "Next page" });
      prev.disabled = txState.page <= 1;
      next.disabled = txState.page >= pages;
      prev.addEventListener("click", () => { txState.page--; apply(); });
      next.addEventListener("click", () => { txState.page++; apply(); });
      p.append(prev);
      const win = [];
      for (let i = 1; i <= pages; i++) {
        if (i === 1 || i === pages || Math.abs(i - txState.page) <= 1) win.push(i);
      }
      let last = 0;
      win.forEach((i) => {
        if (i - last > 1) p.appendChild(el("span", { style: "color:var(--faint); padding:0 2px;" }, "…"));
        const b = el("button", { class: i === txState.page ? "active" : "" }, String(i));
        b.addEventListener("click", () => { txState.page = i; apply(); });
        p.appendChild(b);
        last = i;
      });
      p.appendChild(next);
      return p;
    }

    search.addEventListener("input", U.debounce(() => { txState.q = search.value; txState.page = 1; apply(); }, 160));
    typeSel.addEventListener("change", () => { txState.type = typeSel.value; txState.page = 1; apply(); });
    catSel.addEventListener("change", () => { txState.category = catSel.value; txState.page = 1; apply(); });
    sortSel.addEventListener("change", () => { txState.sort = sortSel.value; apply(); });

    apply();
  }

  function txTr(t, cur, ctx) {
    const isIn = t.type === "income";
    const del = el("button", { class: "btn-tiny", "aria-label": "Delete transaction", html: I("trash") });
    del.addEventListener("click", () => {
      if (!del.classList.contains("confirm")) {
        del.classList.add("confirm");
        del.textContent = "Delete?";
        setTimeout(() => { del.classList.remove("confirm"); del.innerHTML = I("trash"); }, 2600);
        return;
      }
      Store.deleteTransaction(ctx.user.id, t.id);
      ctx.refresh();
      toast("Transaction deleted", "info");
    });
    const edit = el("button", { class: "btn-tiny", "aria-label": "Edit transaction", html: I("edit") });
    edit.addEventListener("click", () => ctx.openTxModal(t.type, t));

    return el("tr", null,
      el("td", { class: "t-date" }, fmtDate(t.date)),
      el("td", null, el("strong", { style: "font-weight:600" }, t.desc)),
      el("td", null, el("span", { class: "cat-chip" },
        el("span", { class: "cat-dot", style: `background:${isIn ? "var(--up)" : "var(--accent)"}` }), t.category)),
      el("td", { style: "color:var(--muted); font-size:13px;" }, t.account),
      el("td", { class: `t-amt ${t.type}` }, `${isIn ? "+" : "−"}${fmtMoney(t.amount, cur)}`),
      el("td", null, el("div", { class: "row-actions" }, edit, del))
    );
  }

  /* ---------- add / edit modal ---------- */
  function txModal(ctx, presetType, existing) {
    const cur = ctx.user.prefs.currency || "USD";
    const type = existing ? existing.type : presetType || "expense";
    let curType = type;

    const typeSeg = el("div", { class: "seg seg-full" },
      el("button", { type: "button", class: `income ${curType === "income" ? "active" : ""}`, "data-t": "income" }, "Income"),
      el("button", { type: "button", class: `expense ${curType === "expense" ? "active" : ""}`, "data-t": "expense" }, "Expense")
    );

    const descI = el("input", { class: "input", id: "m_desc", placeholder: "e.g. Verde Market groceries", value: existing ? existing.desc : "" });
    const amtI = el("input", { class: "input", id: "m_amt", type: "number", min: "0.01", step: "0.01", placeholder: "0.00", value: existing ? existing.amount : "" });
    const dateI = el("input", { class: "input", id: "m_date", type: "date", value: existing ? existing.date : U.todayISO() });
    const accSel = el("select", { class: "select", id: "m_acc" }, Store.ACCOUNTS.map((a) => el("option", { value: a, selected: existing ? existing.account === a : a === "Star Checking" }, a)));
    const catSel = el("select", { class: "select", id: "m_cat" });
    const errNode = el("div", { class: "err", style: "margin-bottom:8px;" });

    function fillCats() {
      catSel.innerHTML = "";
      Store.CATEGORIES[curType].forEach((c) => catSel.appendChild(el("option", { value: c }, c)));
      if (existing && existing.type === curType) catSel.value = existing.category;
    }
    fillCats();

    typeSeg.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      curType = b.dataset.t;
      $$("button", typeSeg).forEach((x) => x.classList.toggle("active", x === b));
      fillCats();
    });

    const form = el("form", { id: "txForm", novalidate: true },
      typeSeg,
      el("div", { class: "field" }, el("label", { for: "m_desc" }, "Description"), descI),
      el("div", { class: "form-2col" },
        el("div", { class: "field" }, el("label", { for: "m_amt" }, `Amount (${cur})`), amtI),
        el("div", { class: "field" }, el("label", { for: "m_date" }, "Date"), dateI)
      ),
      el("div", { class: "form-2col" },
        el("div", { class: "field" }, el("label", { for: "m_cat" }, "Category"), catSel),
        el("div", { class: "field" }, el("label", { for: "m_acc" }, "Account"), accSel)
      ),
      errNode
    );

    const modal = openModal({
      title: existing ? "Edit transaction" : "Add transaction",
      body: form,
      actions: [
        el("button", { class: "btn btn-ghost", type: "button", "data-close": true }, "Cancel"),
        el("button", { class: "btn btn-primary", type: "submit", form: "txForm" }, existing ? "Save changes" : "Add transaction"),
      ],
    });
    form.addEventListener("submit", (ev) => {
      ev.preventDefault();
      const amount = parseFloat(amtI.value);
      if (!descI.value.trim()) { errNode.textContent = "Please add a description."; return; }
      if (!(amount > 0)) { errNode.textContent = "Enter an amount greater than zero."; return; }
      if (!dateI.value) { errNode.textContent = "Pick a date."; return; }
      const payload = {
        type: curType, desc: descI.value.trim(), amount, date: dateI.value,
        category: catSel.value, account: accSel.value,
      };
      if (existing) Store.updateTransaction(ctx.user.id, existing.id, payload);
      else Store.addTransaction(ctx.user.id, payload);
      closeModal();
      ctx.refresh();
      toast(existing ? "Transaction updated" : `${curType === "income" ? "Income" : "Expense"} added`, "success");
    });
    setTimeout(() => descI.focus(), 60);
    return modal;
  }

  /* ---------- generic modal ---------- */
  function openModal({ title, body, actions, wide }) {
    const root = document.getElementById("modal-root");
    const scrim = el("div", { class: "modal-scrim", role: "dialog", "aria-modal": "true", "aria-label": title });
    const box = el("div", { class: "modal", style: wide ? "max-width:560px" : "" },
      el("div", { class: "modal-head" },
        el("h3", null, title),
        el("button", { class: "btn-icon", "data-close": true, "aria-label": "Close dialog", html: I("x") })
      ),
      el("div", { class: "modal-body" }, body),
      actions && actions.length ? el("div", { class: "modal-foot" }, actions) : null
    );
    scrim.appendChild(box);
    scrim.addEventListener("click", (e) => { if (e.target === scrim || e.target.closest("[data-close]")) closeModal(); });
    const onKey = (e) => { if (e.key === "Escape") closeModal(); };
    document.addEventListener("keydown", onKey);
    root.appendChild(scrim);
    function closeModal() {
      scrim.remove();
      document.removeEventListener("keydown", onKey);
    }
    return { close: closeModal, box };
  }
  function closeModal() {
    const m = $("#modal-root .modal-scrim");
    if (m) m.remove();
  }

  /* ============================================================
     SETTINGS
     ============================================================ */
  function settings(view, ctx) {
    const { user } = ctx;
    const prefs = user.prefs || {};

    // --- Profile card
    const nameI = el("input", { class: "input", id: "s_name", value: user.name });
    const curSel = el("select", { class: "select", id: "s_cur" },
      ["USD", "EUR", "GBP"].map((c) => el("option", { value: c, selected: (prefs.currency || "USD") === c }, c === "USD" ? "USD — US Dollar ($)" : c === "EUR" ? "EUR — Euro (€)" : "GBP — British Pound (£)"))
    );
    const saveBtn = el("button", { class: "btn btn-primary", type: "submit" }, "Save changes");
    const profileForm = el("form", { novalidate: true },
      el("div", { style: "display:flex; align-items:center; gap:14px; margin-bottom:18px;" },
        el("span", { class: "avatar", style: "width:52px; height:52px; font-size:18px;" }, U.initials(user.name)),
        el("div", null,
          el("div", { style: "font-weight:700; font-size:15px;" }, user.name),
          el("div", { style: "color:var(--muted); font-size:13px;" }, user.email)
        )
      ),
      el("div", { class: "field" }, el("label", { for: "s_name" }, "Display name"), nameI),
      el("div", { class: "field" }, el("label", { for: "s_cur" }, "Currency"), curSel),
      el("div", { class: "err", id: "s_err" }),
      saveBtn
    );
    profileForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (nameI.value.trim().length < 2) { $("#s_err").textContent = "Name is too short."; return; }
      Store.updateProfile(user.id, { name: nameI.value.trim() });
      Store.setPrefs(user.id, { currency: curSel.value });
      toast("Profile updated", "success");
      ctx.onProfileChanged();
    });

    const profileCard = el("section", { class: "card card-pad" },
      el("div", { class: "card-title" }, "Profile"),
      el("div", { class: "card-sub", style: "margin-bottom:16px;" }, "How you appear across Star Finance"),
      profileForm
    );

    // --- Appearance
    const themeOpts = el("div", { class: "theme-options" },
      themeOpt("royal", "Royal — Black & Gold", "Rich dark UI with gold accents"),
      themeOpt("emerald", "Emerald — White & Green", "Clean light UI with green accents")
    );
    function themeOpt(id, name, desc) {
      const node = el("button", { type: "button", class: `theme-opt ${prefs.theme === id ? "active" : ""}`, "data-theme-opt": id },
        el("span", { class: `theme-swatch ${id}` }),
        el("b", null, name),
        el("small", null, desc)
      );
      node.addEventListener("click", () => {
        $$(".theme-opt", themeOpts).forEach((x) => x.classList.toggle("active", x === node));
        Store.setPrefs(user.id, { theme: id });
        ctx.setTheme(id);
      });
      return node;
    }
    const appearanceCard = el("section", { class: "card card-pad" },
      el("div", { class: "card-title" }, "Appearance"),
      el("div", { class: "card-sub", style: "margin-bottom:16px;" }, "Pick the look that suits your desk"),
      themeOpts
    );

    // --- Security
    const curPw = el("input", { class: "input", type: "password", id: "s_pw0", placeholder: "Current password", autocomplete: "current-password" });
    const newPw = el("input", { class: "input", type: "password", id: "s_pw1", placeholder: "New password (min. 8 chars)", autocomplete: "new-password" });
    const newPw2 = el("input", { class: "input", type: "password", id: "s_pw2", placeholder: "Repeat new password", autocomplete: "new-password" });
    const pwForm = el("form", { novalidate: true },
      el("div", { class: "field" }, el("label", { for: "s_pw0" }, "Current password"), curPw),
      el("div", { class: "field" }, el("label", { for: "s_pw1" }, "New password"), newPw),
      el("div", { class: "field" }, el("label", { for: "s_pw2" }, "Confirm new password"), newPw2),
      el("div", { class: "err", id: "s_pwerr" }),
      el("button", { class: "btn btn-ghost", type: "submit" }, "Update password")
    );
    pwForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const err = $("#s_pwerr");
      if (newPw.value.length < 8) { err.textContent = "New password must be at least 8 characters."; return; }
      if (newPw.value !== newPw2.value) { err.textContent = "New passwords do not match."; return; }
      const fresh = Store.findById(user.id);
      if (!(await Store.verifyPassword(fresh, curPw.value))) { err.textContent = "Current password is incorrect."; return; }
      await Store.changePassword(fresh, curPw.value, newPw.value);
      err.textContent = "";
      curPw.value = newPw.value = newPw2.value = "";
      toast("Password updated", "success");
    });
    const securityCard = el("section", { class: "card card-pad" },
      el("div", { class: "card-title" }, "Security"),
      el("div", { class: "card-sub", style: "margin-bottom:16px;" }, "Passwords are salted + hashed (SHA-256) in this demo build"),
      pwForm
    );

    // --- Data & backup (StarDB on-device database)
    const fileI = el("input", { type: "file", accept: "application/json,.json", style: "display:none", "aria-hidden": "true" });
    fileI.addEventListener("change", () => {
      const f = fileI.files && fileI.files[0];
      fileI.value = "";
      if (!f) return;
      const reader = new FileReader();
      reader.onload = () => {
        let parsed;
        try { parsed = JSON.parse(String(reader.result)); }
        catch (e) { toast("That file is not valid JSON", "error"); return; }
        confirmModal(
          "Restore this backup?",
          "Everything currently stored on this device will be replaced by the backup file. This cannot be undone.",
          () => {
            try {
              Store.importAll(parsed);
              toast("Backup restored — reloading", "success");
              setTimeout(() => location.reload(), 700);
            } catch (e) {
              toast(e.message || "Could not restore this backup", "error");
            }
          },
          "Replace everything"
        );
      };
      reader.readAsText(f);
    });

    const exportBtn = el("button", { class: "btn btn-ghost", type: "button", html: `${I("down")}<span>Export</span>` });
    exportBtn.addEventListener("click", () => {
      const blob = new Blob([Store.exportAll()], { type: "application/json" });
      const a = el("a", { href: URL.createObjectURL(blob), download: `star-finance-backup-${U.todayISO()}.json` });
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      toast("Backup downloaded", "success");
    });
    const importBtn = el("button", { class: "btn btn-ghost", type: "button", html: `${I("up")}<span>Restore</span>` });
    importBtn.addEventListener("click", () => fileI.click());

    const dataCard = el("section", { class: "card card-pad" },
      fileI,
      el("div", { class: "card-title" }, "Data & backup"),
      el("div", { class: "card-sub", style: "margin-bottom:8px;" }, `StarDB — your on-device database · engine: ${Store.storageMode()}`),
      el("div", { class: "set-row" },
        el("div", { class: "s-label" }, el("b", null, "Storage engine"), el("small", null, "Everything lives in this device's database — nothing leaves your phone")),
        el("span", { class: "chip income", style: "text-transform:none;" }, Store.storageMode().split(" ")[0])
      ),
      el("div", { class: "set-row" },
        el("div", { class: "s-label" }, el("b", null, "Export backup"), el("small", null, "Download all accounts & ledgers as a JSON file")),
        exportBtn
      ),
      el("div", { class: "set-row" },
        el("div", { class: "s-label" }, el("b", null, "Restore backup"), el("small", null, "Replace everything on this device with a backup file")),
        importBtn
      )
    );

    // --- Danger zone
    const isDemo = user.id === "u_demo_star";
    const resetBtn = el("button", { class: "btn btn-ghost", type: "button" }, isDemo ? "Reset demo data" : "Reset my data");
    resetBtn.addEventListener("click", () => {
      confirmModal(
        isDemo ? "Reset demo data?" : "Reset all data?",
        isDemo
          ? "This restores a fresh set of sample transactions and clears your changes."
          : "This permanently clears every transaction and returns your balance to $0.",
        async () => {
          Store.resetData(user.id, user.name);
          ctx.refresh();
          toast(isDemo ? "Demo data restored" : "All data cleared — starting from $0", "success");
        }
      );
    });
    const delBtn = el("button", { class: "btn btn-danger", type: "button" }, "Delete account");
    delBtn.addEventListener("click", () => {
      confirmModal("Delete this account?", "All data for this account will be permanently removed from this browser. This cannot be undone.", () => {
        Store.deleteAccount(user.id);
        location.hash = "";
        location.reload();
      }, "Delete forever");
    });
    const dangerCard = el("section", { class: "card card-pad danger-zone" },
      el("div", { class: "card-title" }, "Danger zone"),
      el("div", { class: "card-sub", style: "margin-bottom:16px;" }, "Irreversible actions — proceed carefully"),
      el("div", { class: "set-row" },
        el("div", { class: "s-label" },
          el("b", null, isDemo ? "Reset demo data" : "Reset my data"),
          el("small", null, isDemo ? "Restore sample transactions and budgets" : "Clear all transactions and start from zero")
        ),
        resetBtn
      ),
      el("div", { class: "set-row" },
        el("div", { class: "s-label" }, el("b", null, "Delete account"), el("small", null, "Remove this account and all of its data")),
        delBtn
      )
    );

    view.append(
      grid(profileCard, appearanceCard, "settings-grid"),
      grid(securityCard, dangerCard, "settings-grid"),
      dataCard
    );
  }

  function confirmModal(title, msg, onYes, yesLabel) {
    const m = openModal({
      title,
      body: el("p", { style: "color:var(--muted); font-size:14px;" }, msg),
      actions: [
        el("button", { class: "btn btn-ghost", "data-close": true }, "Cancel"),
        el("button", { class: "btn btn-danger", onclick: () => { m.close(); onYes(); } }, yesLabel || "Confirm"),
      ],
    });
    return m;
  }

  return {
    dashboard, analytics, transactions, settings,
    txModal, openModal, closeModal, confirmModal,
    SUBTITLES,
  };
})();
