/* ============================================================
   Star Finance — db.js
   StarDB: a tiny on-device document database.
   3 tables: users · data · session  (each table = one document)
   Engine: IndexedDB, automatic localStorage fallback.
   ============================================================ */
window.DB = (function () {
  "use strict";
  const NAME = "starfinance";
  const VERSION = 1;
  const TABLES = ["users", "data", "session"];

  let connPromise = null;
  let enginePromise = null;

  function connect() {
    if (connPromise) return connPromise;
    connPromise = new Promise((resolve, reject) => {
      if (!("indexedDB" in window)) return reject(new Error("IndexedDB unavailable"));
      let req;
      try { req = indexedDB.open(NAME, VERSION); }
      catch (e) { return reject(e); }
      req.onupgradeneeded = () => {
        const db = req.result;
        for (const t of TABLES) if (!db.objectStoreNames.contains(t)) db.createObjectStore(t);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error("IndexedDB open failed"));
      req.onblocked = () => reject(new Error("IndexedDB blocked by another tab"));
    });
    connPromise.catch(() => { connPromise = null; }); // allow retry after failure
    return connPromise;
  }

  function run(table, mode, fn) {
    return connect().then((db) => new Promise((resolve, reject) => {
      const t = db.transaction(table, mode);
      const r = fn(t.objectStore(table));
      t.oncomplete = () => resolve(r && r.result);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error || new Error("transaction aborted"));
    }));
  }

  /* engines share one API: get(table) -> doc | null · set(table, doc) */
  const indexeddb = {
    name: "IndexedDB",
    async get(table) { return (await run(table, "readonly", (s) => s.get(table))) ?? null; },
    async set(table, doc) { await run(table, "readwrite", (s) => s.put(doc, table)); },
  };

  const localstorage = {
    name: "LocalStorage (fallback)",
    async get(table) {
      try { return JSON.parse(localStorage.getItem("sfdb_" + table)) ?? null; }
      catch (e) { return null; }
    },
    async set(table, doc) {
      try { localStorage.setItem("sfdb_" + table, JSON.stringify(doc)); }
      catch (e) { /* storage full or blocked — keep working in memory */ }
    },
  };

  /* ready() resolves to the engine that will be used for this device */
  function ready() {
    if (!enginePromise) {
      enginePromise = connect().then(() => indexeddb).catch(() => localstorage);
    }
    return enginePromise;
  }

  return { ready, TABLES, engineName: () => ready().then((e) => e.name) };
})();
