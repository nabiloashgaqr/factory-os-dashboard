# FactoryOS™ Live Dashboard

> From factory data to action, evidence, and executive clarity.

A premium, bilingual (English / Arabic + RTL) manufacturing-intelligence command center built with **Next.js 14 (App Router) · TypeScript · Tailwind CSS · Recharts · Zustand**. It connects to **4 Notion databases** and an **AI assistant powered by Gemini**, with secure server-side API routes so your keys never ship to the browser bundle.

This is the fully reconciled, production-ready implementation of the FactoryOS blueprint — every proposed feature is built, and the 3 critical audit gaps (Notion relation handling, real Gemini wiring in the voice log, and the `next/image` build error) are fixed.

---

## ✨ Features

**11 operational screens + AI + Settings**

| Group | Screens |
|---|---|
| Core Analytics | Executive Overview · KPI Measurement Intelligence · Digital Twin Layout · Pareto & OEE Breakdown |
| Predictive & Simulation | Predictive Monitor (MTBF/MTTR) · What-If Risk Simulator · Inventory Risk Monitor |
| Operations & Lean | Action Plan Control · Progress Evidence · Financial Lean ROI · Shift Handover · Voice Smart Shift Log |
| Intelligence | Reporting Center (daily/weekly/monthly) · AI Insights Panel |

- **Dynamic KPI averaging** — any variable in the `KPI Master Link` column is auto-detected and averaged (arithmetic mean) per day / filtered period. No code changes when you add new KPIs.
- **Global filters** — date range, production line, shift, alert level. Every card & chart reacts.
- **5 themes** — Executive Dark, Industrial Light, Command Center, Steel & Gold, Minimal White (persisted).
- **Bilingual** — full EN/AR with RTL.
- **Sync engine** — manual + auto-sync, live status banner, local cache fallback, graceful demo (mock) mode.
- **Contextual AI** on each analytical page (interpretation · 5-why root cause · engineered solution).
- **Secure** — Notion token + Gemini key proxied through `/api/*` server routes; masked in the UI; stored only in `localStorage` for this prototype.

---

## 🚀 Setup — step by step

### 1. Prerequisites
Install **Node.js** (LTS) from <https://nodejs.org>.

### 2. Install dependencies
```bash
cd factory-os-dashboard
npm install
```

### 3. Run
```bash
npm run dev
```
Open <http://localhost:3000>. It boots in **demo mode** with realistic mock data immediately — no keys required.

### 4. Connect Notion (live data)
1. Create an integration at <https://www.notion.so/my-integrations> and copy the **Internal Integration Token**.
2. **Share** each of the 4 databases with that integration (••• → Connections).
3. Copy each database **ID** (the 32-char string in its URL).
4. In the app → **⚙️ Control Settings** → paste the token + the 4 DB IDs → **Test Connection** → **Sync Now**.

### 5. Enable AI
In **Settings → API Gateways**, paste your **Gemini API key** (<https://aistudio.google.com/app/apikey>), pick a model, then **Test AI**.

> Prefer server-side keys? Copy `.env.example` → `.env.local` and fill them in. The API routes fall back to env vars when the client sends none.

### 6. Build for production
```bash
npm run build && npm start
```

---

## 🗂 Expected Notion fields

The mapper is defensive and tolerates missing/renamed fields, but ideal property names are:

- **KPI Measurement**: `KPI Master Link` (or KPI Name), `Date`, `Shift`, `Line`, `Actual Value`, `Target`, `Unit`, `Alert Level`, `Action Required`, `Root Cause Category`, `Notes`
- **Action Plans**: `Optimization Initiative`, `Target KPI`, `Owner`, `Status`, `Priority`, `Risk Level`, `Start Date`, `End Date`, `Days Open`, `Execution %`, `Projected ROI`, `Value Impact Score`, `Escalation Required`, `Root Cause (5-Why)`, `Notes`
- **Progress Tracker**: `Entry Title`, `Source Action Plan`, `Date`, `Progress Stage`, `Status`, `Baseline Value`, `Actual (Post-Fix)`, `Improvement %`, `Financial Saving ($)`, `Verified By`, `Notes`, `Lesson Learned`
- **Inventory Intelligence**: `Material Name`, `Category`, `Unit`, `Current Stock Level`, `Safety Stock Threshold`, `Daily Burn Rate (Avg)`, `Supplier Lead Time (Days)`, `Days Until Stock-Out`, `Inventory Health`, `Reorder Point`, `Recommended Order Qty`, `Procurement Signal`, `Coverage Gap (Days)`

> **`KPI Master Link` relation note:** if it's a *Relation*, Notion returns UUIDs. The mapper resolves a readable name via rollup/formula/text first. For the cleanest result, expose the KPI name as a **rollup/text** or use a Select/Text column.

---

## 🔐 Security

- Keys are sent to `/api/notion` and `/api/gemini` (server) — never bundled into client JS.
- Inputs are masked (`type="password"`).
- **Reset All Settings** clears local storage. Never commit a real `.env` or share keys publicly.

---

## 🧱 Project structure

```
src/
├─ app/
│  ├─ api/notion/route.ts      # Secure Notion proxy (4 DBs, paginated, normalized)
│  ├─ api/gemini/route.ts      # Secure Gemini proxy (summarised context, JSON mode)
│  ├─ globals.css              # 5 themes via CSS variables
│  ├─ layout.tsx · page.tsx    # Shell, grouped nav, RTL/theme, filters
├─ components/
│  ├─ layout/TopBanner.tsx
│  ├─ shared/ (DataProvider, FilterBar, ContextualAI, ui)
│  └─ dashboard/ (13 screens + Settings)
├─ lib/ (i18n, types, kpiProcessor, notionMapper, dataClient, mockData, utils)
└─ store/useStore.ts           # Zustand + persisted settings
```

---

_Tip: the in-app preview sandbox can't load the logo over the network, but it works fully in a normal browser via `npm run dev`._
