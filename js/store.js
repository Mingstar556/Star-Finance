/* ============================================================
   Star Finance — store.js
   Accounts, sessions and per-user ledgers, backed by StarDB
   (js/db.js — IndexedDB with localStorage fallback).

   Architecture: everything is mirrored in memory (instant sync
   reads for the UI); every mutation is written through to the
   database. Legacy localStorage data is migrated automatically.
   ============================================================ */
window.Store = (function () {
  "use strict";

  const SESSION_DAYS = 30;
  const state = { users: [], session: null, data: {} }; // in-memory mirror
  let db = null;      // active engine (set by init)
  let ready = false;

  /* ---------------- password hashing (SHA-256 + salt, sync fallback) ---------------- */
  function bufHex(buf) {
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  function fallbackHash(s) {
    let h1 = 0x811c9dc5, h2 = 0x1000193;
    for (let r = 0; r < 4; r++) {
      for (let i = 0; i < s.length; i++) { h1 ^= s.charCodeAt(i); h1 = Math.imul(h1, 16777619) >>> 0; h2 = (Math.imul(h2 ^ s.charCodeAt(s.length - 1 - i), 2246822519)) >>> 0; }
      s = h1.toString(16) + h2.toString(16);
    }
    return "fb_" + h1.toString(16) + h2.toString(16);
  }
  async function hashPassword(password, salt) {
    const msg = `${salt}::${password}`;
    if (window.crypto && crypto.subtle && crypto.subtle.digest) {
      try {
        const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(msg));
        return bufHex(buf);
      } catch (e) { /* fall through */ }
    }
    return fallbackHash(msg);
  }
  function makeSalt() {
    const a = new Uint8Array(16);
    (window.crypto || {}).getRandomValues ? crypto.getRandomValues(a) : a.forEach((_, i) => a[i] = Math.floor(Math.random() * 256));
    return bufHex(a.buffer);
  }

  /* ---------------- write-through persistence ---------------- */
  async function put(table, doc) {
    if (!db) return;
    try { await db.set(table, doc); } catch (e) { /* stays in memory */ }
  }
  const persistUsers = () => put("users", state.users);
  const persistData = () => put("data", state.data);
  const persistSession = () => put("session", state.session);

  /* ---------------- users (in-memory, sync) ---------------- */
  function users() { return state.users; }
  function findByEmail(email) {
    const e = String(email || "").trim().toLowerCase();
    return state.users.find((u) => u.email === e) || null;
  }
  function findById(id) { return state.users.find((u) => u.id === id) || null; }

  async function createUser(name, email, password) {
    const salt = makeSalt();
    const user = {
      id: "u_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      name: name.trim(),
      email: String(email).trim().toLowerCase(),
      salt,
      hash: await hashPassword(password, salt),
      createdAt: new Date().toISOString(),
      prefs: { theme: "royal", currency: "USD" },
    };
    state.users.push(user);
    state.data[user.id] = emptyData();
    await persistUsers();
    await persistData();
    return user;
  }

  async function verifyPassword(user, password) {
    const h = await hashPassword(password, user.salt);
    return h === user.hash;
  }

  async function changePassword(user, currentPw, newPw) {
    if (!(await verifyPassword(user, currentPw))) return false;
    const u = findById(user.id);
    u.salt = makeSalt();
    u.hash = await hashPassword(newPw, u.salt);
    await persistUsers();
    return true;
  }

  function updateProfile(userId, patch) {
    const u = findById(userId);
    if (!u) return null;
    Object.assign(u, patch);
    persistUsers();
    return u;
  }
  function setPrefs(userId, prefs) {
    const u = findById(userId);
    if (!u) return;
    u.prefs = Object.assign({}, u.prefs, prefs);
    persistUsers();
    return u;
  }

  function deleteAccount(userId) {
    state.users = state.users.filter((u) => u.id !== userId);
    delete state.data[userId];
    state.session = null;
    persistUsers();
    persistData();
    persistSession();
  }

  function resetData(userId, name) {
    // the demo account gets its sample dataset back; everyone else resets to a clean $0 slate
    state.data[userId] = userId === "u_demo_star" ? seedUserData(userId, name) : emptyData();
    persistData();
  }

  /* ---------------- session ---------------- */
  function createSession(userId) {
    const s = { userId, token: makeSalt(), exp: Date.now() + SESSION_DAYS * 864e5 };
    state.session = s;
    persistSession();
    return s;
  }
  function getSession() {
    const s = state.session;
    if (!s || !s.exp || s.exp < Date.now() || !findById(s.userId)) return null;
    return s;
  }
  function endSession() { state.session = null; persistSession(); }

  /* ---------------- ledger data ---------------- */
  function emptyData() {
    return {
      opening: 0,
      transactions: [],
      budgets: { Housing: 1600, Groceries: 520, Dining: 320, Transport: 220, Shopping: 260, Subscriptions: 70, Utilities: 240, Health: 120, Entertainment: 150 },
    };
  }

  function getData(userId) {
    if (!state.data[userId]) {
      state.data[userId] = userId === "u_demo_star" ? seedUserData(userId, findById(userId)?.name || "user") : emptyData();
      persistData();
    }
    return state.data[userId];
  }
  function saveData(userId, data) { state.data[userId] = data; persistData(); }

  function addTransaction(userId, t) {
    const d = getData(userId);
    d.transactions.unshift({ id: U.uid(), date: t.date, desc: t.desc, category: t.category, type: t.type, amount: Math.round(t.amount * 100) / 100, account: t.account || "Star Checking" });
    d.transactions.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    persistData();
  }
  function updateTransaction(userId, id, patch) {
    const d = getData(userId);
    const t = d.transactions.find((x) => x.id === id);
    if (t) Object.assign(t, patch);
    d.transactions.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    persistData();
  }
  function deleteTransaction(userId, id) {
    const d = getData(userId);
    d.transactions = d.transactions.filter((x) => x.id !== id);
    persistData();
  }

  /* ---------------- backup export / import ---------------- */
  function exportAll() {
    return JSON.stringify({
      app: "star-finance",
      version: 1,
      exportedAt: new Date().toISOString(),
      users: state.users,
      data: state.data,
    }, null, 2);
  }
  function importAll(json) {
    const parsed = typeof json === "string" ? JSON.parse(json) : json;
    if (!parsed || parsed.app !== "star-finance" || !Array.isArray(parsed.users) || typeof parsed.data !== "object") {
      throw new Error("Not a Star Finance backup file");
    }
    state.users = parsed.users;
    state.data = parsed.data;
    state.session = state.session && findById(state.session.userId) ? state.session : null;
    persistUsers();
    persistData();
    persistSession();
    return { users: state.users.length, accounts: Object.keys(state.data).length };
  }
  function storageMode() { return db ? db.name : "Memory only"; }

  /* ---------------- boot: hydrate, migrate, demo account ---------------- */
  async function init() {
    db = await DB.ready();
    state.users = (await db.get("users")) || [];
    state.data = (await db.get("data")) || {};
    state.session = (await db.get("session")) || null;

    // one-time migration from the old localStorage-only build
    if (!state.users.length) {
      try {
        const legacy = JSON.parse(localStorage.getItem("sf_users_v1") || "null");
        if (Array.isArray(legacy) && legacy.length) {
          state.users = legacy;
          for (const u of legacy) {
            try {
              const raw = JSON.parse(localStorage.getItem("sf_data_" + u.id) || "null");
              if (raw) state.data[u.id] = raw;
            } catch (e) { /* skip bad row */ }
          }
          const sess = JSON.parse(localStorage.getItem("sf_session_v1") || "null");
          if (sess && sess.exp > Date.now() && findById(sess.userId)) state.session = sess;
          await persistUsers();
          await persistData();
          await persistSession();
        }
      } catch (e) { /* no legacy data */ }
    }

    await ensureDemo();
    ready = true;
  }

  async function ensureDemo() {
    let u = findById("u_demo_star") || findByEmail("demo@starfinance.app");
    if (!u) {
      const salt = makeSalt();
      u = {
        id: "u_demo_star",
        name: "Aurora Lane",
        email: "demo@starfinance.app",
        salt,
        hash: await hashPassword("demo1234", salt),
        createdAt: new Date().toISOString(),
        prefs: { theme: "royal", currency: "USD" },
      };
      state.users.push(u);
      state.data[u.id] = seedUserData(u.id, u.name);
      await persistUsers();
      await persistData();
    } else if (!u.hash) {
      u.hash = await hashPassword("demo1234", u.salt);
      await persistUsers();
    }
  }

  /* ---------------- demo seed data ---------------- */
  const CATEGORIES = {
    income: ["Salary", "Freelance", "Investments", "Other income"],
    expense: ["Housing", "Groceries", "Dining", "Transport", "Subscriptions", "Shopping", "Utilities", "Health", "Entertainment"],
  };
  const CAT_ICONS = {
    Salary: "briefcase", Freelance: "zap", Investments: "trend", "Other income": "coins",
    Housing: "home", Groceries: "bag", Dining: "coffee", Transport: "car", Subscriptions: "tv",
    Shopping: "bag", Utilities: "zap", Health: "heart", Entertainment: "star",
  };
  const ACCOUNTS = ["Star Checking", "Star Savings", "Gold Card"];

  function pad(n) { return String(n).padStart(2, "0"); }
  function iso(y, m, d) { return `${y}-${pad(m + 1)}-${pad(d)}`; }

  function seedTestData(name) {
    const rnd = U.mulberry32(U.seedFrom(name + "|starfin"));
    const tx = [];
    const now = new Date();
    const y0 = now.getFullYear(), m0 = now.getMonth(), d0 = now.getDate();
    const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
    const amt = (lo, hi) => Math.round((lo + rnd() * (hi - lo)) * 100) / 100;

    function add(date, desc, category, type, amount, account) {
      tx.push({ id: "t_" + Math.random().toString(36).slice(2, 10), date, desc, category, type, amount, account });
    }

    for (let back = 11; back >= 0; back--) {
      const m = m0 - back;
      const year = y0 + Math.floor(m / 12);
      const month = ((m % 12) + 12) % 12;
      const dim = new Date(year, month + 1, 0).getDate();
      const capDay = back === 0 ? d0 : dim; // never seed future dates
      const D = (d) => iso(year, month, Math.max(1, Math.min(Math.round(d), capDay)));
      const RD = (maxBase) => D(1 + Math.floor(rnd() * Math.min(maxBase, capDay)));

      // Income
      add(D(1), "Monthly salary — Nebula Systems", "Salary", "income", 5240, "Star Checking");
      if (rnd() < 0.62) add(RD(22), `Freelance project — ${pick(["Orbit Labs", "Comet Studio", "Nova Media", "Pulsar Co"])}`, "Freelance", "income", amt(340, 1250), "Star Checking");
      if (month % 3 === 1) add(RD(15), "Dividend — S&P 500 ETF", "Investments", "income", amt(90, 260), "Star Savings");
      if (rnd() < 0.18) add(RD(20), pick(["Marketplace sale", "Cashback reward", "Refund — airline"]), "Other income", "income", amt(25, 140), "Star Checking");

      // Fixed expenses
      add(RD(3), "Rent — Aurora Residence", "Housing", "expense", 1520, "Star Checking");
      add(RD(5), "Netflix", "Subscriptions", "expense", 15.99, "Gold Card");
      add(RD(6), "Spotify Premium", "Subscriptions", "expense", 10.99, "Gold Card");
      add(RD(7), "iCloud+ storage", "Subscriptions", "expense", 2.99, "Gold Card");
      add(RD(8), "Iron Pearl Gym", "Subscriptions", "expense", 29, "Gold Card");
      add(RD(10), "Electricity & water", "Utilities", "expense", amt(85, 165), "Star Checking");
      add(RD(12), "Home internet — Fiber 1G", "Utilities", "expense", 54.9, "Star Checking");

      // Variable expenses
      const nGroceries = 4 + Math.floor(rnd() * 3);
      for (let i = 0; i < nGroceries; i++) add(RD(26), pick(["Verde Market", "Sunrise Grocers", "Golden Harvest", "Corner Market"]), "Groceries", "expense", amt(48, 135), i % 2 ? "Gold Card" : "Star Checking");
      const nDining = 4 + Math.floor(rnd() * 4);
      for (let i = 0; i < nDining; i++) add(RD(26), pick(["Café Lumen", "Ember & Oak", "Sakura Ramen", "Bistro Nova", "Taco Sol", "Green Fork"]), "Dining", "expense", amt(14, 72), "Gold Card");
      const nTransport = 3 + Math.floor(rnd() * 3);
      for (let i = 0; i < nTransport; i++) add(RD(26), pick(["Metro card top-up", "RideShare", "Fuel — Solar Station", "Parking garage"]), "Transport", "expense", amt(18, 64), back % 2 ? "Gold Card" : "Star Checking");
      const nShop = 1 + Math.floor(rnd() * 3);
      for (let i = 0; i < nShop; i++) add(RD(24), pick(["Lumen Electronics", "Aster Apparel", "HomeNest", "Page & Co. Books"]), "Shopping", "expense", amt(28, 240), "Gold Card");
      if (rnd() < 0.5) add(RD(22), pick(["Pharmacy Plus", "Dental care", "Vitamins & supplements"]), "Health", "expense", amt(12, 95), "Star Checking");
      if (rnd() < 0.75) add(RD(24), pick(["Cinema Nova", "Concert — The Eclipses", "Board game night", "Museum pass"]), "Entertainment", "expense", amt(16, 85), "Gold Card");
    }

    tx.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    return {
      opening: 14600 + Math.round(rnd() * 5200),
      transactions: tx,
      budgets: { Housing: 1600, Groceries: 520, Dining: 320, Transport: 220, Shopping: 260, Subscriptions: 70, Utilities: 240, Health: 120, Entertainment: 150 },
    };
  }

  function seedUserData(id, name) {
    const data = seedTestData(name);
    data.transactions.forEach((t, i) => (t.id = `${id}_${i}`));
    return data;
  }

  /* ---------------- derived statistics ---------------- */
  function monthKey(isoDate) { return isoDate.slice(0, 7); }

  function compute(data) {
    const tx = data.transactions || [];
    const now = new Date();
    const curKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevKey = `${prevDate.getFullYear()}-${pad(prevDate.getMonth() + 1)}`;

    const months = [];
    for (let back = 11; back >= 0; back--) {
      const d = new Date(now.getFullYear(), now.getMonth() - back, 1);
      months.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`);
    }

    const sum = (list, type) => list.reduce((s, t) => (t.type === type ? s + t.amount : s), 0);
    const byMonth = {};
    months.forEach((m) => (byMonth[m] = []));
    tx.forEach((t) => { if (byMonth[monthKey(t.date)]) byMonth[monthKey(t.date)].push(t); });

    const income = months.map((m) => Math.round(sum(byMonth[m], "income") * 100) / 100);
    const expense = months.map((m) => Math.round(sum(byMonth[m], "expense") * 100) / 100);

    const balance = [];
    let run = data.opening;
    for (let i = 0; i < months.length; i++) {
      run += income[i] - expense[i];
      balance.push(Math.round(run * 100) / 100);
    }

    const curTx = byMonth[curKey] || [];
    const prevTx = byMonth[prevKey] || [];
    const curIn = sum(curTx, "income"), curOut = sum(curTx, "expense");
    const prevIn = sum(prevTx, "income"), prevOut = sum(prevTx, "expense");

    const catMap = {};
    curTx.filter((t) => t.type === "expense").forEach((t) => { catMap[t.category] = (catMap[t.category] || 0) + t.amount; });
    const categories = Object.entries(catMap)
      .map(([name, total]) => ({ name, total: Math.round(total * 100) / 100 }))
      .sort((a, b) => b.total - a.total);

    const allCat = {};
    tx.filter((t) => t.type === "expense").forEach((t) => { allCat[t.category] = (allCat[t.category] || 0) + t.amount; });

    const pct = (cur, prev) => (prev > 0 ? ((cur - prev) / prev) * 100 : cur > 0 ? 100 : 0);

    // Daily balance over the last 30 days (powers the 1M range)
    const days = [];
    const daily = [];
    const asc = tx.slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    let runD = data.opening;
    let p = 0;
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const isoDay = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      while (p < asc.length && asc[p].date <= isoDay) {
        runD += asc[p].type === "income" ? asc[p].amount : -asc[p].amount;
        p++;
      }
      days.push(isoDay);
      daily.push(Math.round(runD * 100) / 100);
    }

    return {
      months,
      days,
      daily,
      income, expense, balance,
      balanceNow: balance[balance.length - 1],
      monthIncome: curIn, monthExpense: curOut,
      incDelta: pct(curIn, prevIn), expDelta: pct(curOut, prevOut),
      savingsRate: curIn > 0 ? ((curIn - curOut) / curIn) * 100 : 0,
      categories,
      biggest: tx.filter((t) => t.type === "expense" && monthKey(t.date) === curKey).sort((a, b) => b.amount - a.amount).slice(0, 5),
      recent: tx.slice(0, 6),
      netHistory: months.map((m, i) => Math.round((income[i] - expense[i]) * 100) / 100),
    };
  }

  function palette() {
    const css = getComputedStyle(document.documentElement);
    return ["--c1", "--c2", "--c3", "--c4", "--c5", "--c6"].map((v) => css.getPropertyValue(v).trim() || "#d4af37");
  }

  return {
    init, storageMode,
    findByEmail, findById, createUser, verifyPassword, changePassword,
    updateProfile, setPrefs, deleteAccount, resetData,
    createSession, getSession, endSession,
    getData, saveData, addTransaction, updateTransaction, deleteTransaction,
    exportAll, importAll,
    compute, palette, CATEGORIES, CAT_ICONS, ACCOUNTS,
  };
})();
