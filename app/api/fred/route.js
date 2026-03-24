import { NextResponse } from "next/server";

const FRED_SERIES = {
  tips:    "DFII10",
  usd:     "DTWEXBGS",
  fed:     "DFF",
  deficit: "MTSDS133FMS",
};

async function fetchYahooPrice(symbol) {
  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=2d`;
    const resp = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 3600 },
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const meta = data?.chart?.result?.[0]?.meta;
    const price = meta?.regularMarketPrice;
    const prevClose = meta?.chartPreviousClose;
    if (!price) return null;
    const change = prevClose ? +(price - prevClose).toFixed(2) : null;
    const changePct = prevClose ? +((price - prevClose) / prevClose * 100).toFixed(2) : null;
    return { value: price, prevClose, change, changePct, date: new Date().toISOString().slice(0, 10) };
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
  const changes = {};

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

  // Fetch gold, oil & GLD from Yahoo Finance for real-time prices
  const yahooFetches = [
    { key: "gold", symbol: "GC=F" },
    { key: "oil", symbol: "BZ=F" },
    { key: "gld", symbol: "GLD" },
  ].map(({ key, symbol }) =>
    fetchYahooPrice(symbol).then((r) => {
      if (r) {
        results[key] = r.value;
        dates[key] = r.date;
        if (r.change != null) changes[key] = { change: r.change, changePct: r.changePct };
      }
    })
  );

  await Promise.all([...fetches, ...yahooFetches]);

  return NextResponse.json({ data: results, dates, changes, fetched: new Date().toISOString() });
}
