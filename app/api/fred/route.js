import { NextResponse } from "next/server";

const FRED_SERIES = {
  tips:    "DFII10",
  usd:     "DTWEXBGS",
  fed:     "DFF",
  deficit: "MTSDS133FMS",
};

async function fetchYahooPrice(symbol) {
  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=5d`;
    const resp = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 3600 },
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
    return price ? { value: price, date: new Date().toISOString().slice(0, 10) } : null;
  } catch (err) {
    console.error(`Yahoo ${symbol}:`, err.message);
    return null;
  }
}

export async function GET() {
  const key = process.env.FRED_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "FRED_API_KEY not configured" }, { status: 500 });
  }

  const results = {};
  const dates = {};

  const entries = Object.entries(FRED_SERIES);
  const fetches = entries.map(async ([name, seriesId]) => {
    try {
      const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${key}&file_type=json&sort_order=desc&limit=5`;
      const resp = await fetch(url, { next: { revalidate: 3600 } });
      if (!resp.ok) return;
      const data = await resp.json();
      const obs = data.observations?.find((o) => o.value !== ".");
      if (obs) {
        results[name] = parseFloat(obs.value);
        dates[name] = obs.date;
      }
    } catch (err) {
      console.error(`FRED ${name}:`, err.message);
    }
  });

  // Fetch gold & oil from Yahoo Finance for real-time prices
  const yahooFetches = [
    { key: "gold", symbol: "GC=F" },
    { key: "oil", symbol: "BZ=F" },
  ].map(({ key, symbol }) =>
    fetchYahooPrice(symbol).then((r) => {
      if (r) {
        results[key] = r.value;
        dates[key] = r.date;
      }
    })
  );

  await Promise.all([...fetches, ...yahooFetches]);

  return NextResponse.json({ data: results, dates, fetched: new Date().toISOString() });
}
