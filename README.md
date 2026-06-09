# ⚡ Trading Hive

> **AI-Powered ICT Market Analysis & Signal Terminal**
> An advanced trading assistant that analyzes chart images, cross-references macro news sentiment, and uses Gemini AI to execute high-precision ICT (Inner Circle Trader) setups.

---

## 🚀 Key Features

*   **📈 Multi-Timeframe ICT Analysis** — Validates structures across 4H (Gate 1), 1H (Gate 2), and 15M (Gate 3) charts automatically.
*   **🧠 Gemini AI Core** — Analyzes liquidity sweeps, Judas swings, MSS, SMT divergence, and OTE zones.
*   **📰 Macro & News Integration** — Fetches news sentiment and volatility metrics to overlay fundamental direction on technical bias.
*   **⚡ Realtime Dashboard** — Interactive trade signal history, win-rate trackers, live price feeds, and manual chart uploads.
*   **💳 Subscription & Tokens** — Complete Stripe & PayMongo billing engine built-in.

---

## 🛠️ The Tech Stack

*   **Frontend & API**: Next.js 16 (Turbopack) & React 19
*   **Styling**: TailwindCSS 4 (Modern & responsive glassmorphism)
*   **Database & Auth**: Supabase (PostgreSQL with Row Level Security)
*   **Payment Processor**: Stripe / PayMongo
*   **AI Engine**: Google Gemini API (2.5 Flash)
*   **Automation**: n8n Webhook Workflow Engine

---

## ⚙️ Quick Start

### 1. Configure Environments
Create a `.env` file in the root directory:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Payments (Stripe / PayMongo)
PAYMONGO_PUBLIC_KEY=your_paymongo_public_key
PAYMONGO_SECRET_KEY=your_paymongo_secret_key
PAYMONGO_WEBHOOK_SECRET=your_webhook_secret

# TwelveData
TWELVEDATA_API_KEY=your_twelvedata_api_key
```

### 2. Install & Start

```bash
# Install dependencies
npm install

# Run the development server
npm run dev
```

### 3. Deploy
This project builds natively on **Dokploy** or any **Nixpacks** container environment.

```bash
npm run build
```

---

## 🔄 AI Prompt & n8n Workflow

The background engine runs via n8n, validating:
1. **Gate 1 (4H Trend)** — Market structure bias.
2. **Gate 2 (1H Trend)** — Alignment confirmation.
3. **Gate 3 (15M Execution)** — Liquidity sweep, Market Structure Shift (MSS), and Optimal Trade Entry (OTE).

All scripts, prompt templates, and n8n nodes are archived in the `.gemini/antigravity/brain/` workspace metadata.
