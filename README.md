# Gold Macro Regime Dashboard

Real-time XAU/USD regime scoring matrix with a two-layer data architecture:

- **FRED API** (daily) → 10Y TIPS yield, gold price, Brent crude, fed funds rate, broad USD index
- **Claude AI + web search** (on-demand) → CB gold buying, ETF flows, fiscal deficit, geopolitical risk, liquidity trend

## Architecture

```
Browser → Next.js page (React)
              ↓
         /api/fred    → FRED API (server-side, daily data)
         /api/claude  → Anthropic API + web search (server-side, on-demand)
```

API keys are kept server-side in environment variables — never exposed to the browser.

## Setup

1. Clone this repo
2. Copy `.env.example` to `.env.local` and fill in your keys:
   ```
   cp .env.example .env.local
   ```
3. Get a free FRED API key: https://fred.stlouisfed.org/docs/api/api_key.html
4. Get an Anthropic API key: https://console.anthropic.com
5. Install and run:
   ```
   npm install
   npm run dev
   ```

## Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy (will prompt for env vars on first deploy)
vercel

# Or link to existing project
vercel --prod
```

Set environment variables in Vercel dashboard → Settings → Environment Variables:
- `FRED_API_KEY`
- `ANTHROPIC_API_KEY`

## Scoring Framework

| Driver | Weight | Source | Update freq |
|--------|--------|-------|------------|
| Real rates (10Y TIPS) | 25% | FRED DFII10 | Daily |
| USD strength (DXY) | 20% | AI search | On-demand |
| Central bank buying | 20% | WGC via AI | Monthly (6-8wk lag) |
| Fiscal deficit | 15% | CBO via AI | Quarterly |
| Global liquidity | 10% | AI assessment | On-demand |
| Geopolitical risk | 10% | AI assessment | On-demand |

## Regime Scores

- **0-30**: AVOID — reduce exposure
- **31-50**: NEUTRAL — hold current positions
- **51-70**: ACCUMULATE — build on dips
- **71-100**: STRONG BUY — full conviction

## Disclaimer

This is a directional analytical framework — not investment advice.
