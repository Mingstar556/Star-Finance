/* ============================================================
   Star Finance — app.js
   Shell: boot, routing, theme, sidebar & menus
   ============================================================ */
(function () {
  "use strict";
  const { $, $$, el, I, toast } = U;

  const state = { user: null };
  const ROUTES = ["dashboard", "analytics", "transactions", "settings"];

  /* ---------------- theme ---------------- */
  function setTheme(theme) {
    const t = theme === "emerald" ? "emerald" : "royal";
    document.documentElement.setAttribute("data-theme", t);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", t === "emerald" ? "#f3f7f4" : "#0a0a0f");
    const btn = $("#themeBtn");
    if (btn) { btn.innerHTML = I(t === "royal" ? "sun" : "moon"); btn.title = t === "royal" ? "Switch to Emerald light theme" : "Switch to Royal dark theme"; }
  }
  function currentTheme() { return document.documentElement.getAttribute("data-theme"); }
  function toggleTheme() {
    const next = currentTheme() === "royal" ? "emerald" : "royal";
    if (state.user) Store.setPrefs(state.user.id, { theme: next });
    else localStorage.setItem("sf_guest_theme", next);
    setTheme(next);
    if (state.user) renderRoute(); // re-render charts with new palette
    toast(`${next === "royal" ? "Royal" : "Emerald"} theme activated`, "info", 1600);
  }

  /* ---------------- auth <-> app ---------------- */
  function showAuth() {
    state.user = null;
    $("#app").classList.add("hidden");
    Auth.render($("#auth-root"), "login", (user) => enterApp(user));
  }
  function enterApp(user) {
    state.user = user;
    $("#auth-root").classList.add("hidden");
    $("#auth-root").innerHTML = "";
    $("#app").classList.remove("hidden");
    setTheme(user.prefs && user.prefs.theme);
    fillIdentity();
    if (!location.hash || location.hash === "#/") location.hash = "#/dashboard";
    renderRoute();
  }
  function fillIdentity() {
    const u = state.user;
    const ini = U.initials(u.name);
    $("#sideAvatar").textContent = ini;
    $("#topAvatar").textContent = ini;
    $("#sideName").textContent = u.name;
    $("#sideEmail").textContent = u.email;
    $("#menuName").textContent = u.name;
    $("#menuEmail").textContent = u.email;
    $("#brandLogo").innerHTML = U.LOGO;
  }

  /* ---------------- routing ---------------- */
  function currentRoute() {
    const h = (location.hash || "#/dashboard").replace(/^#\//, "");
    return ROUTES.includes(h) ? h : "dashboard";
  }
  function renderRoute() {
    if (!state.user) return;
    // refresh user record (may have been edited in settings)
    state.user = Store.findById(state.user.id) || state.user;

    const route = currentRoute();
    const view = $("#view");
    view.innerHTML = "";

    $$(".nav-item").forEach((n) => n.classList.toggle("active", n.dataset.route === route));
    const titles = { dashboard: "Dashboard", analytics: "Analytics", transactions: "Transactions", settings: "Settings" };
    $("#pageTitle").textContent = titles[route];
    const sub = Views.SUBTITLES[route]();
    $("#pageSub").textContent = sub;

    const ctx = {
      user: state.user,
      data: Store.getData(state.user.id),
      refresh: () => renderRoute(),
      setTheme,
      onProfileChanged: () => { fillIdentity(); renderRoute(); },
      openTxModal: (preset, existing) => Views.txModal(ctx, preset, existing),
    };

    if (route === "dashboard") Views.dashboard(view, ctx);
    else if (route === "analytics") Views.analytics(view, ctx);
    else if (route === "transactions") Views.transactions(view, ctx);
    else Views.settings(view, ctx);

    closeDrawer();
    Charts.hideTip();
  }

  /* ---------------- sidebar drawer (mobile) ---------------- */
  function openDrawer() {
    $("#sidebar").classList.add("open");
    $("#scrim").classList.add("show");
  }
  function closeDrawer() {
    $("#sidebar").classList.remove("open");
    $("#scrim").classList.remove("show");
  }

  /* ---------------- add-transaction quick button ---------------- */
  function openAddModal() {
    if (!state.user) return;
    const ctx = {
      user: state.user,
      data: Store.getData(state.user.id),
      refresh: () => renderRoute(),
      openTxModal: (p, e) => Views.txModal(ctx, p, e),
    };
    Views.txModal(ctx, "expense");
  }

  /* ---------------- avatar dropdown ---------------- */
  function wireMenu() {
    const avatar = $("#topAvatar"), pop = $("#menuPop");
    avatar.addEventListener("click", (e) => {
      e.stopPropagation();
      const isHidden = pop.classList.contains("hidden");
      pop.classList.toggle("hidden", !isHidden);
      avatar.setAttribute("aria-expanded", String(isHidden));
    });
    document.addEventListener("click", (e) => {
      if (!pop.classList.contains("hidden") && !pop.contains(e.target)) {
        pop.classList.add("hidden");
        avatar.setAttribute("aria-expanded", "false");
      }
    });
    pop.addEventListener("click", (e) => {
      const item = e.target.closest(".menu-item");
      if (!item) return;
      pop.classList.add("hidden");
      const act = item.dataset.act;
      if (act === "logout") doLogout();
      else if (act === "theme") toggleTheme();
      else if (act === "settings") location.hash = "#/settings";
    });
  }

  function doLogout() {
    Store.endSession();
    toast("Logged out — see you soon", "info");
    showAuth();
  }

  /* ---------------- boot ---------------- */
  function boot() {
    Store.init();
    U.hydrateIcons();

    // wire shell
    $("#brandLogo").innerHTML = U.LOGO;
    $("#menuBtn").innerHTML = I("menu");
    $("#closeNav").innerHTML = I("x");
    $("#logoutBtn").innerHTML = I("logout");
    $("#addBtn").querySelector("[data-icon]") && U.hydrateIcons($("#addBtn"));
    $("#themeBtn").innerHTML = I("sun");
    $("#menuBtn").addEventListener("click", openDrawer);
    $("#closeNav").addEventListener("click", closeDrawer);
    $("#scrim").addEventListener("click", closeDrawer);
    $("#themeBtn").addEventListener("click", toggleTheme);
    $("#logoutBtn").addEventListener("click", doLogout);
    $("#addBtn").addEventListener("click", openAddModal);
    $("#nav").addEventListener("click", closeDrawer);
    wireMenu();
    window.addEventListener("hashchange", renderRoute);

    // session?
    const sess = Store.getSession();
    if (sess) {
      const user = Store.findById(sess.userId);
      if (user) { enterApp(user); return; }
    }
    // guest theme preference
    setTheme(localStorage.getItem("sf_guest_theme") || "royal");
    showAuth();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
