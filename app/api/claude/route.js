import { NextResponse } from "next/server";

const SEARCH_PROMPT = `You are a macro data extraction engine powering a real-time gold trading dashboard.

Search for each data point below using web search. Find the MOST RECENT value for each.

1. DXY dollar index level (e.g. 99.5)
2. Central bank gold purchases — latest quarterly figure in tonnes from World Gold Council 2026
3. Monthly gold ETF flows in billions USD (World Gold Council)
4. US federal budget deficit as % of GDP (latest fiscal year)
5. Geopolitical risk (rate 0-5: 0=calm, 5=active war/systemic crisis)
6. Global liquidity trend (rate -3 to +3 based on Fed/ECB/BOJ/PBOC balance sheets)

Return ONLY valid JSON — no markdown, no backticks:
{
  "dxy": <number or null>,
  "cb_buying_quarterly_tonnes": <number or null>,
  "etf_flows_monthly_bn": <number or null>,
  "fiscal_deficit_pct_gdp": <number or null>,
  "geopolitical_risk": <integer 0-5>,
  "liquidity_trend": <integer -3 to 3>,
  "geo_rationale": "<one sentence>",
  "liq_rationale": "<one sentence>",
  "cb_data_date": "<e.g. January 2026>",
  "notes": "<one sentence macro summary>"
}`;

export async function GET() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  try {
    // Step 1: Search
    const searchResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 6000,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{ role: "user", content: SEARCH_PROMPT }],
      }),
    });

    if (!searchResp.ok) {
      const errText = await searchResp.text();
      return NextResponse.json({ error: `Anthropic API: ${searchResp.status}`, detail: errText }, { status: 502 });
    }

    const searchData = await searchResp.json();
    const allText = (searchData.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    // Try direct parse
    let parsed = null;
    try {
      const m = allText.match(/\{[\s\S]*?"notes"[\s\S]*?\}/);
      if (m) parsed = JSON.parse(m[0]);
    } catch {}

    // Fallback: extraction pass
    if (!parsed) {
      const parseResp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system:
            'Extract macro data from the text. Return ONLY JSON, no markdown. Schema: {"dxy":number,"cb_buying_quarterly_tonnes":number,"etf_flows_monthly_bn":number,"fiscal_deficit_pct_gdp":number,"geopolitical_risk":int,"liquidity_trend":int,"geo_rationale":"str","liq_rationale":"str","cb_data_date":"str","notes":"str"}. null for unknowns.',
          messages: [{ role: "user", content: allText.slice(0, 10000) || "No data." }],
        }),
      });
      const parseData = await parseResp.json();
      const raw = (parseData.content || []).map((b) => b.text || "").join("");
      const clean = raw.replace(/```json|```/g, "").trim();
      const jm = clean.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jm ? jm[0] : clean);
    }

    return NextResponse.json({ data: parsed, fetched: new Date().toISOString() });
  } catch (err) {
    console.error("Claude proxy error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
