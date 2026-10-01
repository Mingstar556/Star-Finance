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

…or press **“Explore the demo account”** on the login screen. You can also sign up with any email — each account gets its own seeded dataset.

## Features

- **Login system** — sign up, log in, log out, change password, delete account. Passwords are salted + SHA-256 hashed, sessions persist for 30 days. *(Client-side demo auth — for production, connect a real backend; the `Store` API is designed to mirror one.)*
- **Dashboard** — KPI cards with sparklines (balance, income, spending, savings rate), 6M/12M balance chart, spending-by-category donut, recent activity, quick actions.
- **Analytics** — income vs expenses bars, net savings trend, monthly budget progress, all-time category breakdown.
- **Transactions** — search, filter by type/category, sort, pagination, add/edit/delete with inline confirm.
- **Settings** — profile, currency (USD/EUR/GBP), theme picker, security, data reset.
- **Two professional themes** — *Royal* (black & gold) and *Emerald* (white & green). Switchable from the top bar; saved per account.
- **Fully responsive** — sidebar drawer on mobile, fluid charts, touch-friendly, works from 320 px up.
- **Zero dependencies** — hand-rolled SVG chart engine (line/area, bars, donut, sparklines) with hover tooltips; works offline.

## Project structure

```
Star Finance/
├── index.html        # app shell
├── css/styles.css    # design system (both themes)
├── js/
│   ├── util.js       # helpers, icons, formatting, toasts
│   ├── charts.js     # SVG chart engine
│   ├── store.js      # accounts, sessions, data, statistics
│   ├── auth.js       # login / sign-up screen
│   ├── views.js      # dashboard, analytics, transactions, settings
│   └── app.js        # routing & shell wiring
└── serve.js          # optional zero-dep local server
```

## Deploying

It's a static site — drop the folder on **Netlify**, **Vercel**, **GitHub Pages**, **Cloudflare Pages** or any web host. No server-side code required.

> **Note:** this build stores accounts and data in the browser's `localStorage` (per browser/profile). It is a demo-grade auth system; don't use it to guard real financial data without a backend.
