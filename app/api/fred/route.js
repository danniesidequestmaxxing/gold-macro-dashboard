import { NextResponse } from "next/server";

const FRED_SERIES = {
  tips:    "DFII10",
  usd:     "DTWEXBGS",
  oil:     "DCOILBRENTEU",
  fed:     "DFF",
  deficit: "MTSDS133FMS",
};

async function fetchGoldPrice() {
  try {
    const url = "https://query2.finance.yahoo.com/v8/finance/chart/GC=F?interval=1d&range=5d";
    const resp = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 3600 },
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
    return price ? { value: price, date: new Date().toISOString().slice(0, 10) } : null;
  } catch (err) {
    console.error("Gold price fetch:", err.message);
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

  // Fetch gold price from Yahoo Finance (FRED discontinued LBMA gold series)
  const goldFetch = fetchGoldPrice().then((g) => {
    if (g) {
      results.gold = g.value;
      dates.gold = g.date;
    }
  });

  await Promise.all([...fetches, goldFetch]);

  return NextResponse.json({ data: results, dates, fetched: new Date().toISOString() });
}
