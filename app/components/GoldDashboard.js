"use client";
import { useState, useEffect, useCallback, useRef } from "react";

// ── Scoring ──
function scoreReal(v) {
  if (v == null) return { pts: 0, max: 25, st: "no data" };
  if (v <= -1) return { pts: 25, max: 25, st: "strong tailwind" };
  if (v <= 0) return { pts: 20, max: 25, st: "tailwind" };
  if (v <= 0.5) return { pts: 16, max: 25, st: "mild support" };
  if (v <= 1) return { pts: 12, max: 25, st: "neutral" };
  if (v <= 1.5) return { pts: 8, max: 25, st: "headwind" };
  if (v <= 2) return { pts: 4, max: 25, st: "strong headwind" };
  return { pts: 0, max: 25, st: "severe headwind" };
}
function scoreDxy(v) {
  if (v == null) return { pts: 0, max: 20, st: "no data" };
  if (v <= 90) return { pts: 20, max: 20, st: "strong tailwind" };
  if (v <= 95) return { pts: 16, max: 20, st: "tailwind" };
  if (v <= 98) return { pts: 12, max: 20, st: "mild support" };
  if (v <= 100) return { pts: 8, max: 20, st: "neutral" };
  if (v <= 103) return { pts: 4, max: 20, st: "headwind" };
  return { pts: 0, max: 20, st: "strong headwind" };
}
function scoreCb(v) {
  if (v == null) return { pts: 8, max: 20, st: "est. moderate" };
  if (v >= 300) return { pts: 20, max: 20, st: "exceptional" };
  if (v >= 200) return { pts: 16, max: 20, st: "strong" };
  if (v >= 100) return { pts: 12, max: 20, st: "supportive" };
  if (v >= 50) return { pts: 8, max: 20, st: "moderate" };
  return { pts: 4, max: 20, st: "weak" };
}
function scoreFisc(v) {
  if (v == null) return { pts: 8, max: 15, st: "est. elevated" };
  if (v >= 8) return { pts: 15, max: 15, st: "crisis level" };
  if (v >= 6) return { pts: 12, max: 15, st: "strong tailwind" };
  if (v >= 4) return { pts: 8, max: 15, st: "mild support" };
  if (v >= 3) return { pts: 4, max: 15, st: "neutral" };
  return { pts: 0, max: 15, st: "headwind" };
}
function scoreLiq(v) {
  if (v == null) return { pts: 5, max: 10, st: "est. flat" };
  if (v >= 2) return { pts: 10, max: 10, st: "flood" };
  if (v >= 1) return { pts: 7, max: 10, st: "easing" };
  if (v >= 0) return { pts: 5, max: 10, st: "flat" };
  if (v >= -1) return { pts: 3, max: 10, st: "slowing" };
  return { pts: 0, max: 10, st: "tight" };
}
function scoreGeo(v) {
  if (v == null) return { pts: 6, max: 10, st: "est. elevated" };
  const l = ["calm", "low", "moderate", "elevated", "high", "crisis"];
  return { pts: Math.round(v * 2), max: 10, st: l[v] || "unknown" };
}
function getVerdict(t) {
  if (t <= 30) return { text: "AVOID", sub: "Reduce exposure — regime headwinds dominant", c: "#ef4444" };
  if (t <= 50) return { text: "NEUTRAL", sub: "Hold current — wait for catalyst shift", c: "#f59e0b" };
  if (t <= 70) return { text: "ACCUMULATE", sub: "Build position on dips — structural support intact", c: "#10b981" };
  return { text: "STRONG BUY", sub: "Full conviction — structural + tactical aligned", c: "#22c55e" };
}

// ── Sub-components ──
function Dot({ status }) {
  const c = status === "live" ? "#22c55e" : status === "loading" ? "#f59e0b" : status === "error" ? "#ef4444" : "#555";
  return (
    <span style={{ position: "relative", display: "inline-block", width: 7, height: 7 }}>
      <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: c }} />
      {status === "live" && <span style={{ position: "absolute", inset: -3, borderRadius: "50%", background: c, opacity: 0.2, animation: "pulse 2s ease infinite" }} />}
    </span>
  );
}

function Gauge({ value, max }) {
  const pct = Math.min(value / max, 1);
  const vd = getVerdict(value);
  const r = 64, cx = 76, cy = 74;
  const sx = cx - r, sy = cy;
  const ea = Math.PI - pct * Math.PI;
  const ex = cx + r * Math.cos(ea), ey = cy - r * Math.sin(ea);
  return (
    <svg width="152" height="96" viewBox="0 0 152 96">
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="11" strokeLinecap="round" />
      {pct > 0 && <path d={`M ${sx} ${sy} A ${r} ${r} 0 ${pct > 0.5 ? 1 : 0} 1 ${ex} ${ey}`} fill="none" stroke={vd.c} strokeWidth="11" strokeLinecap="round" style={{ transition: "all 0.8s ease" }} />}
      <text x={cx} y={cy - 8} textAnchor="middle" fill="#fff" fontSize="30" fontWeight="600" fontFamily="'JetBrains Mono',monospace">{value}</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="11" fontFamily="'JetBrains Mono',monospace">/ {max}</text>
    </svg>
  );
}

function Tag({ children, color }) {
  return <span style={{ fontSize: 10, background: `${color}18`, color, padding: "2px 7px", borderRadius: 4, fontFamily: "'JetBrains Mono',monospace" }}>{children}</span>;
}

function Card({ label, value, unit, score, source, sub, override, onOverride }) {
  const pct = score.max > 0 ? score.pts / score.max : 0;
  const bc = pct >= 0.6 ? "#10b981" : pct >= 0.3 ? "#f59e0b" : "#ef4444";
  const srcColor = source === "fred" ? "#60a5fa" : "#c084fc";
  return (
    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.055)", borderRadius: 10, padding: "13px 15px", display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 10.5, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "'JetBrains Mono',monospace" }}>{label}</span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 9, background: `${srcColor}18`, color: srcColor, padding: "2px 5px", borderRadius: 3, fontFamily: "'JetBrains Mono',monospace" }}>{source === "fred" ? "FRED" : "AI"}</span>
          <Tag color={bc}>{score.st}</Tag>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
        <span style={{ fontSize: 24, fontWeight: 600, color: "#fff", fontFamily: "'JetBrains Mono',monospace" }}>{value ?? "—"}</span>
        {unit && <span style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>{unit}</span>}
      </div>
      {sub && <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.28)", lineHeight: 1.4 }}>{sub}</div>}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.04)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct * 100}%`, background: bc, borderRadius: 2, transition: "width 0.7s ease" }} />
        </div>
        <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: bc, minWidth: 35, textAlign: "right" }}>{score.pts}/{score.max}</span>
      </div>
      {override && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 1 }}>
          <span style={{ fontSize: 9.5, color: "rgba(255,255,255,0.2)", minWidth: 38 }}>adjust</span>
          <input type="range" min={override.min} max={override.max} step={override.step} value={override.value} onChange={(e) => onOverride(parseFloat(e.target.value))} style={{ flex: 1 }} />
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: "'JetBrains Mono',monospace", minWidth: 44, textAlign: "right" }}>{override.display}</span>
        </div>
      )}
    </div>
  );
}

// ── Main Dashboard ──
export default function GoldDashboard() {
  const [fred, setFred] = useState({});
  const [fredDates, setFredDates] = useState({});
  const [fredChanges, setFredChanges] = useState({});
  const [ai, setAi] = useState({});
  const [ov, setOv] = useState({});
  const [fredStatus, setFredStatus] = useState("idle");
  const [aiStatus, setAiStatus] = useState("idle");
  const [error, setError] = useState(null);
  const init = useRef(false);

  const fetchFred = useCallback(async () => {
    setFredStatus("loading");
    try {
      const r = await fetch("/api/fred");
      const j = await r.json();
      if (j.error) throw new Error(j.error);
      setFred(j.data || {});
      setFredDates(j.dates || {});
      setFredChanges(j.changes || {});
      setFredStatus("live");
    } catch (err) {
      console.error("FRED:", err);
      setFredStatus("error");
    }
  }, []);

  const fetchAi = useCallback(async () => {
    setAiStatus("loading");
    try {
      const r = await fetch("/api/claude");
      const j = await r.json();
      if (j.error) throw new Error(j.error);
      setAi(j.data || {});
      setAiStatus("live");
    } catch (err) {
      console.error("AI:", err);
      setAiStatus("error");
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    if (!init.current) {
      init.current = true;
      fetchFred();
      fetchAi();
    }
  }, [fetchFred, fetchAi]);

  const refresh = () => { setOv({}); setError(null); fetchFred(); fetchAi(); };

  // Resolve: override > fred > ai > null
  const tips = ov.tips ?? fred.tips ?? null;
  const dxy = ov.dxy ?? ai.dxy ?? null;
  const goldPrice = fred.gold ?? null;
  const oilPrice = fred.oil ?? null;
  const fedRate = fred.fed ?? null;
  const cb = ov.cb ?? ai.cb_buying_quarterly_tonnes ?? null;
  const fisc = ov.fiscal ?? ai.fiscal_deficit_pct_gdp ?? null;
  const liq = ov.liq ?? ai.liquidity_trend ?? null;
  const geo = ov.geo ?? ai.geopolitical_risk ?? null;
  const gldPrice = fred.gld ?? null;

  const sR = scoreReal(tips), sD = scoreDxy(dxy), sC = scoreCb(cb);
  const sF = scoreFisc(fisc), sL = scoreLiq(liq), sG = scoreGeo(geo);
  const total = sR.pts + sD.pts + sC.pts + sF.pts + sL.pts + sG.pts;
  const vd = getVerdict(total);
  const anyLoading = fredStatus === "loading" || aiStatus === "loading";

  const liqL = { "-3": "Tight", "-2": "Contract.", "-1": "Slowing", "0": "Flat", "1": "Easing", "2": "Expanding", "3": "Flood" };
  const geoL = ["Calm", "Low", "Moderate", "Elevated", "High", "Crisis"];
  const so = (k, val) => setOv((p) => ({ ...p, [k]: val }));

  return (
    <div style={{ minHeight: "100vh", padding: "20px 18px", maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: "rgba(255,255,255,.3)", textTransform: "uppercase", letterSpacing: ".1em" }}>XAU/USD regime matrix</span>
            <Dot status={anyLoading ? "loading" : fredStatus === "live" || aiStatus === "live" ? "live" : "idle"} />
            <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: anyLoading ? "#f59e0b" : "#22c55e" }}>
              {anyLoading ? "Fetching..." : "Live"}
            </span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em", margin: 0 }}>Gold macro dashboard</h1>
          <div style={{ display: "flex", gap: 12, marginTop: 6, fontSize: 10, fontFamily: "'JetBrains Mono',monospace" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Dot status={fredStatus} /><span style={{ color: "rgba(255,255,255,.35)" }}>FRED API</span><span style={{ color: fredStatus === "live" ? "#60a5fa" : "rgba(255,255,255,.2)" }}>{fredStatus === "live" ? `${Object.keys(fred).length} series` : fredStatus}</span></span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Dot status={aiStatus} /><span style={{ color: "rgba(255,255,255,.35)" }}>AI search</span><span style={{ color: aiStatus === "live" ? "#c084fc" : "rgba(255,255,255,.2)" }}>{aiStatus}</span></span>
          </div>
        </div>
        <button onClick={refresh} disabled={anyLoading}>{anyLoading ? "Fetching..." : "Refresh all"}</button>
      </div>

      {/* Ticker */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 8, marginBottom: 16 }} className="fu">
        {[
          { l: "Gold spot", v: goldPrice, u: "USD/oz", f: (x) => x?.toLocaleString(), d: fredDates.gold, chg: fredChanges.gold },
          { l: "Brent crude", v: oilPrice, u: "USD/bbl", f: (x) => x?.toFixed(2), d: fredDates.oil, chg: fredChanges.oil },
          { l: "Fed rate", v: fedRate, u: "%", f: (x) => x?.toFixed(2), d: fredDates.fed },
          { l: "GLD ETF", v: gldPrice, u: "USD", f: (x) => x?.toFixed(2), d: fredDates.gld, chg: fredChanges.gld },
        ].map((t, i) => {
          const chgColor = t.chg ? (t.chg.change > 0 ? "#22c55e" : t.chg.change < 0 ? "#ef4444" : "rgba(255,255,255,.3)") : null;
          return (
            <div key={i} style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.05)", borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "rgba(255,255,255,.3)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 5, fontFamily: "'JetBrains Mono',monospace" }}>
                <span>{t.l}</span>{t.d && <span style={{ opacity: 0.6 }}>{t.d}</span>}
              </div>
              {anyLoading && t.v == null ? <div className="sh" style={{ width: 72, height: 22 }} /> : (
                <div>
                  <span style={{ fontSize: 20, fontWeight: 600, fontFamily: "'JetBrains Mono',monospace" }}>{t.v != null ? t.f(t.v) : "—"}</span>
                  {t.chg && (
                    <div style={{ display: "flex", gap: 8, marginTop: 4, fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: chgColor }}>
                      <span>{t.chg.change > 0 ? "+" : ""}{t.chg.change.toFixed(2)}</span>
                      <span>({t.chg.changePct > 0 ? "+" : ""}{t.chg.changePct.toFixed(2)}%)</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Gauge + Breakdown */}
      <div style={{ display: "grid", gridTemplateColumns: "200px minmax(0,1fr)", gap: 12, marginBottom: 16 }}>
        <div className="fu" style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.055)", borderRadius: 12, padding: "16px 12px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          {anyLoading ? <div className="sh" style={{ width: 110, height: 68 }} /> : <Gauge value={total} max={100} />}
          <div style={{ textAlign: "center", marginTop: 4 }}>
            <div style={{ fontSize: 17, fontWeight: 600, color: vd.c, fontFamily: "'JetBrains Mono',monospace", letterSpacing: ".04em" }}>{anyLoading ? "..." : vd.text}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.32)", marginTop: 3, maxWidth: 170, lineHeight: 1.4 }}>{anyLoading ? "" : vd.sub}</div>
          </div>
        </div>
        <div className="fu" style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.055)", borderRadius: 12, padding: "14px 16px" }}>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,.3)", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 10, fontFamily: "'JetBrains Mono',monospace" }}>Score breakdown</div>
          {[
            { n: "Real rates", w: "25%", s: sR, c: "#818cf8" },
            { n: "USD strength", w: "20%", s: sD, c: "#34d399" },
            { n: "CB buying", w: "20%", s: sC, c: "#fb923c" },
            { n: "Fiscal deficit", w: "15%", s: sF, c: "#f472b6" },
            { n: "Liquidity", w: "10%", s: sL, c: "#a78bfa" },
            { n: "Geopolitical", w: "10%", s: sG, c: "#94a3b8" },
          ].map((r, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,.38)", minWidth: 115, fontFamily: "'JetBrains Mono',monospace" }}>{r.n} ({r.w})</span>
              <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,.04)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: anyLoading ? "0%" : `${r.s.max > 0 ? (r.s.pts / r.s.max) * 100 : 0}%`, background: r.c, borderRadius: 2, transition: "width .8s ease" }} />
              </div>
              <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono',monospace", color: r.c, minWidth: 35, textAlign: "right" }}>{anyLoading ? "—" : `${r.s.pts}/${r.s.max}`}</span>
            </div>
          ))}
          {ai.notes && <div style={{ fontSize: 11, color: "rgba(255,255,255,.28)", marginTop: 8, lineHeight: 1.5, borderTop: "1px solid rgba(255,255,255,.04)", paddingTop: 8, fontStyle: "italic" }}>{ai.notes}</div>}
        </div>
      </div>

      {/* Driver cards */}
      <div style={{ fontSize: 10, color: "rgba(255,255,255,.3)", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 7, fontFamily: "'JetBrains Mono',monospace" }}>Regime drivers — sliders override live data</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 10, marginBottom: 16 }} className="fu">
        <Card label="10Y real rate" value={tips != null ? tips.toFixed(2) : null} unit="%" score={sR} source="fred"
          sub={`DFII10${fredDates.tips ? " · " + fredDates.tips : ""} · Wt 25%`}
          override={{ min: -2, max: 3, step: .25, value: tips ?? 2, display: `${(tips ?? 2).toFixed(2)}%` }}
          onOverride={(x) => so("tips", x)} />
        <Card label="DXY index" value={dxy != null ? dxy.toFixed(1) : null} unit="" score={sD} source="ai"
          sub="Dollar index · Wt 20%"
          override={{ min: 85, max: 115, step: .5, value: dxy ?? 100, display: (dxy ?? 100).toFixed(1) }}
          onOverride={(x) => so("dxy", x)} />
        <Card label="CB buying" value={cb != null ? Math.round(cb) : null} unit="t/qtr" score={sC} source="ai"
          sub={`WGC${ai.cb_data_date ? " · " + ai.cb_data_date : ""} · Wt 20%`}
          override={{ min: 0, max: 400, step: 10, value: cb ?? 80, display: `${Math.round(cb ?? 80)}t` }}
          onOverride={(x) => so("cb", x)} />
        <Card label="Fiscal deficit" value={fisc != null ? fisc.toFixed(1) : null} unit="% GDP" score={sF} source="ai"
          sub="CBO/Treasury · Wt 15%"
          override={{ min: 0, max: 12, step: .5, value: fisc ?? 6.5, display: `${(fisc ?? 6.5).toFixed(1)}%` }}
          onOverride={(x) => so("fiscal", x)} />
        <Card label="Global liquidity" value={liqL[String(Math.round(liq ?? 0))] || "Flat"} unit="" score={sL} source="ai"
          sub={ai.liq_rationale || "CB balance sheets · Wt 10%"}
          override={{ min: -3, max: 3, step: 1, value: liq ?? 0, display: liqL[String(Math.round(liq ?? 0))] || "Flat" }}
          onOverride={(x) => so("liq", x)} />
        <Card label="Geopolitical risk" value={geoL[Math.round(geo ?? 3)] || "—"} unit="" score={sG} source="ai"
          sub={ai.geo_rationale || "News synthesis · Wt 10%"}
          override={{ min: 0, max: 5, step: 1, value: geo ?? 3, display: geoL[Math.round(geo ?? 3)] || "—" }}
          onOverride={(x) => so("geo", x)} />
      </div>

      {/* Legend + footer */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 10.5, color: "rgba(255,255,255,.28)", fontFamily: "'JetBrains Mono',monospace", marginBottom: 10 }}>
        {[{ l: "0-30 Avoid", c: "#ef4444" }, { l: "31-50 Neutral", c: "#f59e0b" }, { l: "51-70 Accumulate", c: "#10b981" }, { l: "71-100 Strong buy", c: "#22c55e" }].map((x, i) => (
          <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 7, height: 7, borderRadius: 2, background: x.c }} />{x.l}
          </span>
        ))}
      </div>
      <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.18)", lineHeight: 1.6, maxWidth: 660 }}>
        Market data from FRED API (daily, 1-day lag). Institutional/qualitative data via Claude AI web search. CB buying has 6-8 week lag. Not investment advice.
      </div>
      {error && <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.15)", borderRadius: 8, fontSize: 12, color: "#f87171" }}>{error}</div>}
    </div>
  );
}
