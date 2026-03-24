import { NextResponse } from "next/server";

const FRED_SERIES = {
  tips:    "DFII10",
  usd:     "DTWEXBGS",
  gold:    "GOLDAMGBD228NLBM",
  oil:     "DCOILBRENTEU",
  fed:     "DFF",
  deficit: "MTSDS133FMS",
};

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
      const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${key}&file_type=json&sort_order=desc&limit=5&realtime_start=2025-01-01`;
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

  await Promise.all(fetches);

  return NextResponse.json({ data: results, dates, fetched: new Date().toISOString() });
}
