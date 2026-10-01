# ★ Star Finance

A professional, fully responsive personal-finance dashboard — works on desktop, tablet and mobile straight from a static website. No build tools, no frameworks, no dependencies.

![theme](https://img.shields.io/badge/themes-2-gold) ![platform](https://img.shields.io/badge/platform-web-green) ![deps](https://img.shields.io/badge/dependencies-0-brightgreen)

## Run it

**Option A — just open it**
Double-click `index.html`. Everything works from the local file.

**Option B — tiny local server (recommended)**
```bash
node serve.js
```
Then open [http://localhost:4890](http://localhost:4890).

## Demo login

| Email | Password |
|---|---|
| `demo@starfinance.app` | `demo1234` |

…or press **“Explore the demo account”** on the login screen — it's pre-filled with a year of realistic sample data so you can explore every chart. **Every account you create starts fresh at $0** with no transactions; your dashboard fills in as you add income and expenses.

## Features

- **Login system** — sign up, log in, log out, change password, delete account. Passwords are salted + SHA-256 hashed, sessions persist for 30 days. *(Client-side demo auth — for production, connect a real backend; the `Store` API is designed to mirror one.)*
- **Dashboard** — KPI cards with sparklines (balance, income, spending, savings rate), balance chart with **1M (daily) / 6M / 12M** ranges, spending-by-category donut, recent activity, quick actions. New accounts get a clean start-at-zero experience with guided empty states.
- **Analytics** — income vs expenses bars, net savings trend, monthly budget progress, all-time category breakdown.
- **Transactions** — search, filter by type/category, sort, pagination, add/edit/delete with inline confirm.
- **Settings** — profile, currency (USD/EUR/GBP), theme picker, security, data reset.
- **Two professional themes** — *Royal* (black & gold) and *Emerald* (white & green). Switchable from the top bar; saved per account.
- **Fully responsive** — sidebar drawer on mobile, fluid charts, touch-friendly, works from 320 px up.
- **Zero dependencies** — hand-rolled SVG chart engine (line/area, bars, donut, sparklines) with hover tooltips; works offline.

## Project structure

```
Star Finance/
├── index.html        # app shell (sidebar on desktop, bottom tabs + FAB on mobile)
├── manifest.json     # PWA manifest — installable on Android
├── sw.js             # service worker — offline support
├── icon-512.png      # app icon
├── css/styles.css    # design system (both themes)
├── js/
│   ├── util.js       # helpers, icons, formatting, toasts
│   ├── charts.js     # SVG chart engine
│   ├── db.js         # StarDB — tiny on-device document DB (IndexedDB)
│   ├── store.js      # accounts, sessions, ledgers on top of StarDB
│   ├── auth.js       # login / sign-up screen
│   ├── views.js      # dashboard, analytics, transactions, settings
│   └── app.js        # routing & shell wiring
└── serve.js          # optional zero-dep local server
```

## Use it on your Android (personal setup)

Star Finance is an installable app (PWA): it runs full-screen from your home screen, uses an on-device database, and works offline.

### Option A — host it (recommended, gives install + offline)

1. **Netlify Drop** (free, keeps this repo private): go to `app.netlify.com/drop`, drag this folder in, and you get an `https://…netlify.app` URL in seconds.
2. On your Android phone, open that URL in **Chrome**.
3. Tap **⋮ → Add to Home screen** (or "Install app") → confirm.
4. Launch **StarFin** from your home screen — it opens full-screen like a native app, keeps you logged in, and works with no internet.

*(GitHub Pages also works if you make the repo public — Pages requires HTTPS, which is what enables the install + offline behavior.)*

### Option B — run it from your PC on the same Wi-Fi

```bash
node serve.js
```
It prints a **Network** URL like `http://192.168.x.x:4890` — open that in Chrome on your phone. (No HTTPS on this path, so no home-screen install; use it inside the browser tab.)

## Your data — StarDB (the mini database)

All data lives in **StarDB**, a tiny document database built into the app (`js/db.js`):

| Table | Contents |
|---|---|
| `users` | accounts (name, salted + SHA-256 password hash, prefs) |
| `data` | each account's ledger: opening balance, transactions, budgets |
| `session` | current login (30-day session) |

- Engine: **IndexedDB** (falls back to localStorage automatically) — private to your device, nothing ever leaves it.
- **Settings → Data & backup**: **Export** downloads a JSON backup of everything; **Restore** replaces device data with a backup file. Export a backup regularly — clearing Chrome's site data wipes the database.

## Deploying

It's a static site — drop the folder on **Netlify**, **Vercel**, **GitHub Pages**, **Cloudflare Pages** or any web host. No server-side code required.

> **Note:** auth is client-side (salted + hashed) and data stays on-device by design — this is a personal single-device app. Don't treat it as multi-user or bank-grade without adding a real backend.

