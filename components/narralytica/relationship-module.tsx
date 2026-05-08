"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface Candle {
  time: number;
  close: number;
}

interface SeriesData {
  asset: string;
  candles: Candle[];
  normalized: Candle[];
}

interface NewsEvent {
  id: string;
  title: string;
  content: string;
  timestamp: number;
  source: string;
}

type RelationshipGroup = "crypto" | "macro" | "equities" | "sosovalue";
type Lookback = "24H" | "3D" | "7D";

const B = "var(--border-subtle)";
const GREEN = "#22c55e";
const RED = "#ef4444";
const BLUE = "var(--accent)";
const MUTED = "rgba(255,255,255,0.38)";
const GRID = "rgba(255,255,255,0.075)";
const CHART_H = 420;
const PAD = { top: 28, right: 78, bottom: 42, left: 44 };

const BASE_ASSETS = ["BTC", "ETH", "SOL", "XRP", "SUI", "DOGE"] as const;
const LOOKBACKS: Lookback[] = ["24H", "3D", "7D"];
const GROUPS: Record<RelationshipGroup, { label: string; assets: string[]; note: string }> = {
  crypto: {
    label: "Crypto Majors",
    assets: ["BTC", "ETH", "SOL", "XRP", "BNB", "DOGE", "LINK", "AVAX", "SUI"],
    note: "Token beta, rotation, and decoupling.",
  },
  macro: {
    label: "Macro Hedges",
    assets: ["USTECH100", "US500", "XAUT", "GOLD", "CL"],
    note: "Risk assets, gold, oil, and crypto sensitivity.",
  },
  equities: {
    label: "Equity Leaders",
    assets: ["NVDA", "MSFT", "AAPL", "AMZN", "TSLA"],
    note: "AI and megacap impulse against crypto.",
  },
  sosovalue: {
    label: "SoSoValue Indices",
    assets: ["MAG7SSI", "DEFISSI", "MEMESSI"],
    note: "Native sector baskets versus the selected base.",
  },
};

const LOOKBACK_MS: Record<Lookback, number> = {
  "24H": 24 * 60 * 60 * 1000,
  "3D": 3 * 24 * 60 * 60 * 1000,
  "7D": 7 * 24 * 60 * 60 * 1000,
};

const INTERVAL_BY_LOOKBACK: Record<Lookback, "5m" | "15m" | "1h"> = {
  "24H": "5m",
  "3D": "15m",
  "7D": "1h",
};

const INTERVAL_MS = {
  "5m": 5 * 60 * 1000,
  "15m": 15 * 60 * 1000,
  "1h": 60 * 60 * 1000,
};

const KLINE_CONFIG: Partial<Record<string, { base: string; hasStartTime: boolean }>> = {
  BTC: { base: "https://mainnet-gw.sodex.dev/futures/fapi/market/v1/public/q/kline?symbol=BTC-USD", hasStartTime: true },
  ETH: { base: "https://mainnet-gw.sodex.dev/futures/fapi/market/v1/public/q/kline?symbol=ETH-USD", hasStartTime: true },
  DOGE: { base: "https://mainnet-gw.sodex.dev/pro/p/quotation/kline?symbol=vDOGE_vUSDC", hasStartTime: true },
  SOL: { base: "https://mainnet-gw.sodex.dev/pro/p/quotation/kline?symbol=vSOL_vUSDC", hasStartTime: true },
  SUI: { base: "https://mainnet-gw.sodex.dev/pro/p/quotation/kline?symbol=vSUI_vUSDC", hasStartTime: false },
  BNB: { base: "https://mainnet-gw.sodex.dev/pro/p/quotation/kline?symbol=vBNB_vUSDC", hasStartTime: true },
  LINK: { base: "https://mainnet-gw.sodex.dev/pro/p/quotation/kline?symbol=vLINK_vUSDC", hasStartTime: false },
  XRP: { base: "https://mainnet-gw.sodex.dev/pro/p/quotation/kline?symbol=vXRP_vUSDC", hasStartTime: true },
  AVAX: { base: "https://mainnet-gw.sodex.dev/pro/p/quotation/kline?symbol=vAVAX_vUSDC", hasStartTime: false },
  AAPL: { base: "https://mainnet-gw.sodex.dev/futures/fapi/market/v1/public/q/kline?symbol=AAPL-USD", hasStartTime: true },
  TSLA: { base: "https://mainnet-gw.sodex.dev/futures/fapi/market/v1/public/q/kline?symbol=TSLA-USD", hasStartTime: true },
  NVDA: { base: "https://mainnet-gw.sodex.dev/futures/fapi/market/v1/public/q/kline?symbol=NVDA-USD", hasStartTime: true },
  MSFT: { base: "https://mainnet-gw.sodex.dev/futures/fapi/market/v1/public/q/kline?symbol=MSFT-USD", hasStartTime: true },
  AMZN: { base: "https://mainnet-gw.sodex.dev/futures/fapi/market/v1/public/q/kline?symbol=AMZN-USD", hasStartTime: true },
  XAUT: { base: "https://mainnet-gw.sodex.dev/futures/fapi/market/v1/public/q/kline?symbol=XAUT-USD", hasStartTime: true },
  CL: { base: "https://mainnet-gw.sodex.dev/futures/fapi/market/v1/public/q/kline?symbol=CL-USD", hasStartTime: true },
  GOLD: { base: "https://mainnet-gw.sodex.dev/futures/fapi/market/v1/public/q/kline?symbol=GOLD-USD", hasStartTime: true },
  USTECH100: { base: "https://mainnet-gw.sodex.dev/futures/fapi/market/v1/public/q/kline?symbol=USTECH100-USD", hasStartTime: true },
  US500: { base: "https://mainnet-gw.sodex.dev/futures/fapi/market/v1/public/q/kline?symbol=US500-USD", hasStartTime: true },
  MAG7SSI: { base: "https://mainnet-gw.sodex.dev/pro/p/quotation/kline?symbol=MAG7ssi%2FUSDC", hasStartTime: true },
  DEFISSI: { base: "https://mainnet-gw.sodex.dev/pro/p/quotation/kline?symbol=DEFIssi%2FUSDC", hasStartTime: true },
  MEMESSI: { base: "https://mainnet-gw.sodex.dev/pro/p/quotation/kline?symbol=MEMEssi%2FUSDC", hasStartTime: true },
};

function klineUrl(asset: string, lookback: Lookback) {
  const config = KLINE_CONFIG[asset];
  if (!config) return null;

  const interval = INTERVAL_BY_LOOKBACK[lookback];
  const now = Date.now();
  const limit = Math.min(500, Math.max(48, Math.ceil(LOOKBACK_MS[lookback] / INTERVAL_MS[interval])));
  const start = now - LOOKBACK_MS[lookback];
  let url = `${config.base}&interval=${interval}&limit=${limit}&endTime=${now}`;
  if (config.hasStartTime) url += `&startTime=${start}`;
  return url;
}

function parseCandle(raw: unknown): Candle | null {
  if (Array.isArray(raw)) {
    const time = Number(raw[0]);
    const close = Number(raw[4] ?? raw[1]);
    if (!Number.isFinite(time) || !Number.isFinite(close) || close <= 0) return null;
    return { time, close };
  }

  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const time = Number(row.t ?? row.time ?? row.openTime ?? row.timestamp);
  const close = Number(row.c ?? row.close ?? row.price);
  if (!Number.isFinite(time) || !Number.isFinite(close) || close <= 0) return null;
  return { time, close };
}

async function fetchSeries(asset: string, lookback: Lookback): Promise<SeriesData | null> {
  const url = klineUrl(asset, lookback);
  if (!url) return null;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  const payload = await res.json();
  const rows = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
  const candles = rows.map(parseCandle).filter((item): item is Candle => Boolean(item)).sort((a, b) => a.time - b.time);
  if (candles.length < 3) return null;

  const first = candles[0].close;
  return {
    asset,
    candles,
    normalized: candles.map((point) => ({ time: point.time, close: ((point.close - first) / first) * 100 })),
  };
}

function pctMove(series?: SeriesData | null) {
  if (!series?.normalized.length) return 0;
  return series.normalized[series.normalized.length - 1].close;
}

function periodReturns(series?: SeriesData | null) {
  if (!series) return [];
  const values: number[] = [];
  for (let i = 1; i < series.candles.length; i += 1) {
    const prev = series.candles[i - 1].close;
    const next = series.candles[i].close;
    if (prev > 0) values.push(((next - prev) / prev) * 100);
  }
  return values;
}

function alignArrays(a: number[], b: number[]) {
  const n = Math.min(a.length, b.length);
  return [a.slice(a.length - n), b.slice(b.length - n)] as const;
}

function correlation(a: number[], b: number[]) {
  const [x, y] = alignArrays(a, b);
  if (x.length < 4) return 0;
  const mx = x.reduce((sum, value) => sum + value, 0) / x.length;
  const my = y.reduce((sum, value) => sum + value, 0) / y.length;
  let cov = 0;
  let vx = 0;
  let vy = 0;
  for (let i = 0; i < x.length; i += 1) {
    const dx = x[i] - mx;
    const dy = y[i] - my;
    cov += dx * dy;
    vx += dx * dx;
    vy += dy * dy;
  }
  if (!vx || !vy) return 0;
  return cov / Math.sqrt(vx * vy);
}

function beta(peerReturns: number[], baseReturns: number[]) {
  const [peer, base] = alignArrays(peerReturns, baseReturns);
  if (peer.length < 4) return 0;
  const mb = base.reduce((sum, value) => sum + value, 0) / base.length;
  const mp = peer.reduce((sum, value) => sum + value, 0) / peer.length;
  let cov = 0;
  let variance = 0;
  for (let i = 0; i < peer.length; i += 1) {
    cov += (base[i] - mb) * (peer[i] - mp);
    variance += (base[i] - mb) ** 2;
  }
  return variance ? cov / variance : 0;
}

function fmtPct(value: number, digits = 2) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}%`;
}

function n(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function fmtRatio(value: unknown, digits = 2) {
  const parsed = n(value);
  if (parsed == null) return "--";
  return `${parsed >= 0 ? "+" : ""}${(parsed * 100).toFixed(digits)}%`;
}

function compact(value: unknown) {
  const parsed = n(value);
  if (parsed == null) return "--";
  return parsed.toLocaleString("en-US", { maximumFractionDigits: parsed >= 100 ? 0 : 2 });
}

function money(value: unknown) {
  const parsed = n(value);
  if (parsed == null) return "--";
  const abs = Math.abs(parsed);
  if (abs >= 1_000_000_000) return `$${(parsed / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `$${(parsed / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `$${(parsed / 1_000).toFixed(2)}K`;
  return `$${parsed.toFixed(2)}`;
}

function dateLabel(value: unknown) {
  if (!value) return "--";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtDecimal(value: number) {
  return value.toFixed(2);
}

function eventTimestamp(raw: Record<string, unknown>) {
  const value = raw.timestamp ?? raw.timestamp_ms ?? raw.release_time ?? raw.releaseTime ?? raw.timestampIso ?? raw.timestamp_iso;
  const parsed = typeof value === "string" && Number.isNaN(Number(value)) ? Date.parse(value) : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeNewsPayload(payload: unknown): NewsEvent[] {
  const containers = [
    payload,
    payload && typeof payload === "object" ? (payload as Record<string, unknown>).data : null,
    payload && typeof payload === "object" ? (payload as Record<string, unknown>).hot : null,
    payload && typeof payload === "object" ? (payload as Record<string, unknown>).list : null,
  ];

  const rows =
    containers.find(Array.isArray) ??
    containers
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
      .map((item) => item.list ?? item.records ?? item.hot ?? item.data)
      .find(Array.isArray) ??
    [];

  return rows
    .map((item, index): NewsEvent | null => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const timestamp = eventTimestamp(row);
      if (!timestamp) return null;
      const title = String(row.title ?? row.original_title ?? row.originalTitle ?? "").trim();
      const content = String(row.contentExcerpt ?? row.content_excerpt ?? row.content ?? "").trim();
      return {
        id: String(row.id ?? `${timestamp}-${index}`),
        title: title || content.slice(0, 90) || "Market update",
        content,
        timestamp,
        source: String(row.sourceType ?? row.source_type ?? row.source ?? "SoSoValue"),
      };
    })
    .filter((item): item is NewsEvent => Boolean(item))
    .sort((a, b) => b.timestamp - a.timestamp);
}

function relationshipState(corr: number, spread: number, baseMove: number, peerMove: number) {
  const sameDirection = Math.sign(baseMove) === Math.sign(peerMove) || Math.abs(baseMove) < 0.15 || Math.abs(peerMove) < 0.15;
  if (corr > 0.62 && sameDirection) return "confirming";
  if (corr < -0.25) return "inverse";
  if (Math.abs(spread) > 2.5) return "diverging";
  return "loose";
}

function colorFor(value: number) {
  if (value > 0.02) return GREEN;
  if (value < -0.02) return RED;
  return "var(--foreground-dim)";
}

function buildPath(points: Candle[], width: number, height: number, min: number, max: number) {
  if (points.length < 2 || width <= 0) return "";
  const innerW = width - PAD.left - PAD.right;
  const innerH = height - PAD.top - PAD.bottom;
  const range = max - min || 1;
  return points
    .map((point, index) => {
      const x = PAD.left + (index / Math.max(1, points.length - 1)) * innerW;
      const y = PAD.top + (1 - (point.close - min) / range) * innerH;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function StatBlock({ label, value, meta, tone }: { label: string; value: string; meta: string; tone?: string }) {
  return (
    <div className="border-r border-b px-5 py-4 lg:border-b-0" style={{ borderColor: B }}>
      <p className="text-[10px] font-mono uppercase tracking-[0.26em]" style={{ color: "var(--foreground-faint)" }}>
        {label}
      </p>
      <p className="mt-3 text-[24px] font-mono font-bold tabular-nums" style={{ color: tone ?? "var(--foreground)" }}>
        {value}
      </p>
      <p className="mt-2 text-[11px] font-mono uppercase tracking-[0.16em]" style={{ color: "var(--foreground-muted)" }}>
        {meta}
      </p>
    </div>
  );
}

function MiniFlow({ rows }: { rows: any[] }) {
  const values = rows.map((row) => n(row.totalNetInflow)).filter((value): value is number => value != null).reverse();
  if (values.length < 2) return <div className="mt-4 h-10 border-t" style={{ borderColor: B }} />;
  const maxAbs = Math.max(...values.map((value) => Math.abs(value)), 1);
  return (
    <div className="mt-4 flex h-14 items-end gap-1">
      {values.map((value, index) => (
        <div
          key={index}
          className="flex-1"
          style={{
            height: `${Math.max(8, (Math.abs(value) / maxAbs) * 56)}px`,
            background: value >= 0 ? GREEN : RED,
            opacity: 0.35 + (Math.abs(value) / maxAbs) * 0.65,
          }}
        />
      ))}
    </div>
  );
}

function AnalysisToolsDeck({ payload }: { payload?: any }) {
  const macroEvents = payload?.macroShock?.events ?? [];
  const flowAssets = payload?.flowLens?.assets ?? [];
  const indices = payload?.sectorRotation?.indices ?? [];
  const unlocks = payload?.unlockSupply?.assets ?? [];
  const bridge = payload?.cryptoStocksBridge ?? {};
  const leadMacro = macroEvents[0];
  const leadFlow = flowAssets.find((row: any) => n(row.dailyNetInflow) != null) ?? flowAssets[0];
  const leadIndex = [...indices].sort((a: any, b: any) => Math.abs(n(b.changePct24h) ?? 0) - Math.abs(n(a.changePct24h) ?? 0))[0];
  const leadUnlock = unlocks.find((row: any) => (row.topAllocations ?? []).length) ?? unlocks[0];
  const leadStock = (bridge.stocks ?? [])[0];

  return (
    <div className="border-b" style={{ borderColor: B }}>
      <div className="border-b px-5 py-4 sm:px-7" style={{ borderColor: B }}>
        <p className="text-[12px] font-mono uppercase tracking-[0.28em] font-bold" style={{ color: "var(--foreground-dim)" }}>
          Analysis Tools
        </p>
        <p className="mt-2 text-[11px] font-mono uppercase tracking-[0.18em]" style={{ color: "var(--foreground-faint)" }}>
          SoSoValue API payloads converted into trader lenses
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5" style={{ background: B }}>
        <div className="min-h-[260px] p-5" style={{ background: "var(--bg)" }}>
          <p className="text-[10px] font-mono uppercase tracking-[0.24em]" style={{ color: "var(--foreground-faint)" }}>Macro Shock</p>
          <h3 className="mt-4 text-xl font-mono font-bold leading-tight">{leadMacro?.event ?? "Waiting for macro"}</h3>
          <p className="mt-2 text-[12px] font-mono uppercase tracking-[0.16em]" style={{ color: "var(--foreground-muted)" }}>{dateLabel(leadMacro?.date)}</p>
          <div className="mt-6 grid grid-cols-3 gap-px border" style={{ borderColor: B, background: B }}>
            {["actual", "forecast", "previous"].map((field) => (
              <div key={field} className="p-3" style={{ background: "var(--surface)" }}>
                <p className="text-[9px] font-mono uppercase tracking-[0.18em]" style={{ color: "var(--foreground-faint)" }}>{field}</p>
                <p className="mt-2 truncate text-[13px] font-mono font-bold">{leadMacro?.[field] ?? "--"}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-[12px] font-mono font-bold" style={{ color: colorFor(n(leadMacro?.surprise) ?? 0) }}>
            Surprise {fmtRatio(leadMacro?.surprise)}
          </p>
        </div>

        <div className="min-h-[260px] p-5" style={{ background: "var(--bg)" }}>
          <p className="text-[10px] font-mono uppercase tracking-[0.24em]" style={{ color: "var(--foreground-faint)" }}>Flow Lens</p>
          <h3 className="mt-4 text-3xl font-mono font-bold">{leadFlow?.asset ?? "--"}</h3>
          <p className="mt-2 text-[24px] font-mono font-bold tabular-nums" style={{ color: colorFor(n(leadFlow?.dailyNetInflow) ?? 0) }}>
            {money(leadFlow?.dailyNetInflow)}
          </p>
          <p className="mt-2 text-[11px] font-mono uppercase tracking-[0.16em]" style={{ color: "var(--foreground-muted)" }}>
            ETF net flow / assets {money(leadFlow?.totalNetAssets)}
          </p>
          <MiniFlow rows={leadFlow?.history ?? []} />
        </div>

        <div className="min-h-[260px] p-5" style={{ background: "var(--bg)" }}>
          <p className="text-[10px] font-mono uppercase tracking-[0.24em]" style={{ color: "var(--foreground-faint)" }}>Sector Rotation</p>
          <h3 className="mt-4 text-2xl font-mono font-bold">{leadIndex?.ticker ?? "--"}</h3>
          <p className="mt-2 text-[24px] font-mono font-bold tabular-nums" style={{ color: colorFor(n(leadIndex?.changePct24h) ?? 0) }}>
            {fmtRatio(leadIndex?.changePct24h)}
          </p>
          <div className="mt-5 space-y-2">
            {indices.slice(0, 4).map((row: any) => (
              <div key={row.ticker} className="flex items-center justify-between gap-3 border-t pt-2" style={{ borderColor: B }}>
                <span className="text-[11px] font-mono font-bold">{row.ticker}</span>
                <span className="text-[11px] font-mono font-bold" style={{ color: colorFor(n(row.changePct24h) ?? 0) }}>{fmtRatio(row.changePct24h)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="min-h-[260px] p-5" style={{ background: "var(--bg)" }}>
          <p className="text-[10px] font-mono uppercase tracking-[0.24em]" style={{ color: "var(--foreground-faint)" }}>Unlock / Supply</p>
          <h3 className="mt-4 text-3xl font-mono font-bold">{leadUnlock?.asset ?? "--"}</h3>
          <p className="mt-2 text-[12px] font-mono uppercase tracking-[0.16em]" style={{ color: "var(--foreground-muted)" }}>
            Top allocation pressure
          </p>
          <div className="mt-5 space-y-3">
            {(leadUnlock?.topAllocations ?? []).slice(0, 4).map((row: any) => (
              <div key={row.holder}>
                <div className="mb-1 flex items-center justify-between gap-3">
                  <span className="truncate text-[11px] font-mono">{row.holder}</span>
                  <span className="text-[11px] font-mono font-bold">{compact(row.percentage)}%</span>
                </div>
                <div className="h-1 bg-white/10">
                  <div className="h-full" style={{ width: `${Math.min(100, n(row.percentage) ?? 0)}%`, background: "var(--foreground)" }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="min-h-[260px] p-5" style={{ background: "var(--bg)" }}>
          <p className="text-[10px] font-mono uppercase tracking-[0.24em]" style={{ color: "var(--foreground-faint)" }}>Crypto Stocks Bridge</p>
          <h3 className="mt-4 text-2xl font-mono font-bold">{leadStock?.ticker ?? "--"}</h3>
          <p className="mt-2 truncate text-sm font-semibold" style={{ color: "var(--foreground-muted)" }}>{leadStock?.name ?? "TradFi proxy watch"}</p>
          <div className="mt-5 grid grid-cols-2 gap-px border" style={{ borderColor: B, background: B }}>
            <div className="p-3" style={{ background: "var(--surface)" }}>
              <p className="text-[9px] font-mono uppercase tracking-[0.18em]" style={{ color: "var(--foreground-faint)" }}>Turnover</p>
              <p className="mt-2 text-[13px] font-mono font-bold">{money(leadStock?.turnover)}</p>
            </div>
            <div className="p-3" style={{ background: "var(--surface)" }}>
              <p className="text-[9px] font-mono uppercase tracking-[0.18em]" style={{ color: "var(--foreground-faint)" }}>Treasuries</p>
              <p className="mt-2 text-[13px] font-mono font-bold">{compact((bridge.btcTreasuries ?? []).length)}</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {(bridge.btcTreasuries ?? []).slice(0, 3).map((row: any) => (
              <div key={row.ticker} className="flex items-center justify-between gap-3 border-t pt-2" style={{ borderColor: B }}>
                <span className="text-[11px] font-mono font-bold">{row.ticker}</span>
                <span className="text-[11px] font-mono">{compact(row.btcHolding)} BTC</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function EventImpactMap({
  baseAsset,
  baseSeries,
}: {
  baseAsset: string;
  baseSeries?: SeriesData;
}) {
  const [eventWindow, setEventWindow] = useState<Lookback>("7D");
  const [eventSeries, setEventSeries] = useState<SeriesData | null>(null);
  const [items, setItems] = useState<NewsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSeries, setLoadingSeries] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [width, setWidth] = useState(900);
  const ref = useRef<HTMLDivElement | null>(null);
  const height = 340;
  const days = eventWindow === "7D" ? 7 : eventWindow === "3D" ? 3 : 1;

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(320, entry.contentRect.width)));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadingSeries(true);
    fetchSeries(baseAsset, eventWindow)
      .then((next) => {
        if (!cancelled) setEventSeries(next);
      })
      .finally(() => {
        if (!cancelled) setLoadingSeries(false);
      });

    return () => {
      cancelled = true;
    };
  }, [baseAsset, eventWindow]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function loadNews() {
      const news: NewsEvent[] = [];
      try {
        const hot = await fetch(`/api/hot-news?days=${days}&page_size=80`, { cache: "no-store" });
        if (hot.ok) news.push(...normalizeNewsPayload(await hot.json()));
      } catch {
        // The terminal payload below is the offline fallback.
      }

      if (!news.length) {
        try {
          const terminal = await fetch("/api/terminal-data", { cache: "no-store" });
          if (terminal.ok) {
            const payload = await terminal.json();
            news.push(...normalizeNewsPayload(payload?.news?.hot));
          }
        } catch {
          // Keep the chart alive even if news is unavailable.
        }
      }

      if (!cancelled) {
        setItems(news);
        setActiveId(news[0]?.id ?? null);
        setLoading(false);
      }
    }

    loadNews();
    return () => {
      cancelled = true;
    };
  }, [days]);

  const displaySeries = eventSeries ?? baseSeries;

  const chart = useMemo(() => {
    const points = displaySeries?.normalized ?? [];
    if (points.length < 2) return null;
    const min = Math.min(...points.map((point) => point.close));
    const max = Math.max(...points.map((point) => point.close));
    const pad = Math.max(0.4, (max - min) * 0.12);
    const yMin = min - pad;
    const yMax = max + pad;
    const innerW = width - PAD.left - PAD.right;
    const innerH = height - PAD.top - PAD.bottom;
    const range = yMax - yMin || 1;
    const toX = (index: number) => PAD.left + (index / Math.max(1, points.length - 1)) * innerW;
    const toY = (value: number) => PAD.top + (1 - (value - yMin) / range) * innerH;
    const line = points.map((point, index) => `${index === 0 ? "M" : "L"} ${toX(index).toFixed(2)} ${toY(point.close).toFixed(2)}`).join(" ");
    const area = `${line} L ${PAD.left + innerW} ${height - PAD.bottom} L ${PAD.left} ${height - PAD.bottom} Z`;
    return { points, line, area, toX, toY, yMin, yMax };
  }, [displaySeries, width]);

  const markers = useMemo(() => {
    if (!chart) return [];
    const start = chart.points[0].time;
    const end = chart.points[chart.points.length - 1].time;
    return items
      .filter((item) => item.timestamp >= start && item.timestamp <= end)
      .slice(0, 18)
      .map((item) => {
        let closestIndex = 0;
        let closestDistance = Infinity;
        chart.points.forEach((point, index) => {
          const distance = Math.abs(point.time - item.timestamp);
          if (distance < closestDistance) {
            closestDistance = distance;
            closestIndex = index;
          }
        });
        const point = chart.points[closestIndex];
        return {
          item,
          x: chart.toX(closestIndex),
          y: chart.toY(point.close),
          move: point.close,
        };
      });
  }, [chart, items]);

  const active = markers.find((marker) => marker.item.id === activeId) ?? markers[0] ?? null;

  return (
    <div className="border-t" style={{ borderColor: B }}>
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px]" style={{ background: B }}>
        <div ref={ref} style={{ background: "var(--bg)" }}>
          <div className="flex flex-col gap-2 border-b px-5 py-4 sm:px-7" style={{ borderColor: B }}>
            <p className="text-[12px] font-mono uppercase tracking-[0.28em] font-bold" style={{ color: "var(--foreground-dim)" }}>
              Event Impact Map
            </p>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <p className="text-[11px] font-mono uppercase tracking-[0.18em]" style={{ color: "var(--foreground-faint)" }}>
                SoSoValue headlines pinned to the {baseAsset} movement path / default 7D
              </p>
              <div className="flex flex-wrap gap-2">
                {LOOKBACKS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setEventWindow(item)}
                    className="border px-3 py-2 text-[10px] font-mono font-bold uppercase tracking-[0.18em]"
                    style={{
                      borderColor: eventWindow === item ? BLUE : B,
                      color: eventWindow === item ? BLUE : "var(--foreground-muted)",
                      background: eventWindow === item ? "var(--accent-track)" : "transparent",
                    }}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="relative px-3 py-5 sm:px-6">
            {loading || loadingSeries ? (
              <div className="flex h-[340px] items-center justify-center">
                <p className="text-[11px] font-mono uppercase tracking-[0.28em]" style={{ color: "var(--foreground-faint)" }}>
                  Loading {eventWindow} event tape
                </p>
              </div>
            ) : !chart ? (
              <div className="flex h-[340px] items-center justify-center">
                <p className="text-[11px] font-mono uppercase tracking-[0.28em]" style={{ color: "var(--foreground-faint)" }}>
                  Waiting for {baseAsset} movement data
                </p>
              </div>
            ) : (
              <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
                <defs>
                  <linearGradient id="event-impact-fill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="rgb(255,255,255)" stopOpacity="0.1" />
                    <stop offset="100%" stopColor="rgb(255,255,255)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[0.25, 0.5, 0.75].map((ratio) => (
                  <line
                    key={ratio}
                    x1={PAD.left}
                    x2={width - PAD.right}
                    y1={PAD.top + ratio * (height - PAD.top - PAD.bottom)}
                    y2={PAD.top + ratio * (height - PAD.top - PAD.bottom)}
                    stroke={GRID}
                  />
                ))}
                <path d={chart.area} fill="url(#event-impact-fill)" />
                <path d={chart.line} fill="none" stroke="var(--foreground)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />

                {markers.map((marker, index) => {
                  const isActive = active?.item.id === marker.item.id;
                  const tone = marker.move >= 0 ? GREEN : RED;
                  return (
                    <g
                      key={`${marker.item.id}-${index}`}
                      onMouseEnter={() => setActiveId(marker.item.id)}
                      style={{ cursor: "pointer" }}
                    >
                      <line
                        x1={marker.x}
                        x2={marker.x}
                        y1={PAD.top}
                        y2={height - PAD.bottom}
                        stroke={isActive ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.1)"}
                        strokeDasharray="4 6"
                      />
                      <circle
                        cx={marker.x}
                        cy={marker.y}
                        r={isActive ? 6 : 4}
                        fill={tone}
                        stroke="#000"
                        strokeWidth={1.5}
                      />
                    </g>
                  );
                })}

                <text x={PAD.left} y={20} fill="rgba(255,255,255,0.42)" fontSize={10} fontFamily="var(--font-mono)">
                  {fmtPct(chart.yMax)}
                </text>
                <text x={PAD.left} y={height - 10} fill="rgba(255,255,255,0.42)" fontSize={10} fontFamily="var(--font-mono)">
                  {fmtPct(chart.yMin)}
                </text>
              </svg>
            )}
          </div>
        </div>

        <aside className="border-t px-5 py-5 xl:border-l xl:border-t-0" style={{ background: "var(--surface)", borderColor: B }}>
          <p className="text-[10px] font-mono uppercase tracking-[0.26em]" style={{ color: "var(--foreground-faint)" }}>
            Active Event
          </p>
          {active ? (
            <>
              <p className="mt-3 text-[12px] font-mono uppercase tracking-[0.18em]" style={{ color: "var(--foreground-dim)" }}>
                {new Date(active.item.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })} / {active.item.source}
              </p>
              <h3 className="mt-5 text-xl font-bold leading-tight">{active.item.title}</h3>
              {active.item.content && (
                <p className="mt-4 text-sm leading-relaxed" style={{ color: "var(--foreground-muted)" }}>
                  {active.item.content}
                </p>
              )}
              <p className="mt-5 text-[12px] font-mono font-bold tabular-nums" style={{ color: colorFor(active.move) }}>
                {baseAsset} path at event: {fmtPct(active.move)}
              </p>
            </>
          ) : (
            <p className="mt-5 text-sm" style={{ color: "var(--foreground-muted)" }}>
              No headline in the selected movement window yet.
            </p>
          )}

          <div className="mt-6 max-h-[260px] space-y-2 overflow-y-auto pr-1">
            {markers.map((marker) => (
              <button
                key={marker.item.id}
                type="button"
                onClick={() => setActiveId(marker.item.id)}
                className="w-full border px-3 py-3 text-left transition-colors"
                style={{
                  borderColor: active?.item.id === marker.item.id ? BLUE : B,
                  background: active?.item.id === marker.item.id ? "var(--accent-track)" : "transparent",
                }}
              >
                <p className="text-[10px] font-mono uppercase tracking-[0.16em]" style={{ color: "var(--foreground-faint)" }}>
                  {new Date(marker.item.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}
                </p>
                <p className="mt-2 line-clamp-2 text-[12px] font-semibold leading-snug">{marker.item.title}</p>
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

export function RelationshipModule({ asset }: { asset?: string }) {
  const [baseAsset, setBaseAsset] = useState((asset && KLINE_CONFIG[asset] ? asset : "BTC").toUpperCase());
  const [group, setGroup] = useState<RelationshipGroup>("crypto");
  const [lookback, setLookback] = useState<Lookback>("24H");
  const [series, setSeries] = useState<SeriesData[]>([]);
  const [analysisPayload, setAnalysisPayload] = useState<any>(null);
  const [selectedPeer, setSelectedPeer] = useState<string | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartWidth, setChartWidth] = useState(900);
  const chartRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (asset && KLINE_CONFIG[asset]) setBaseAsset(asset.toUpperCase());
  }, [asset]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/terminal-data", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (!cancelled) setAnalysisPayload(payload?.analysis ?? null);
      })
      .catch(() => {
        if (!cancelled) setAnalysisPayload(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const assets = useMemo(() => {
    const peers = GROUPS[group].assets.filter((item) => item !== baseAsset);
    return [baseAsset, ...peers];
  }, [baseAsset, group]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSelectedPeer(null);

    Promise.all(assets.map((item) => fetchSeries(item, lookback)))
      .then((result) => {
        if (cancelled) return;
        const next = result.filter((item): item is SeriesData => Boolean(item));
        setSeries(next);
        const firstPeer = next.find((item) => item.asset !== baseAsset)?.asset ?? null;
        setSelectedPeer(firstPeer);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [assets, baseAsset, lookback]);

  useEffect(() => {
    const node = chartRef.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => setChartWidth(Math.max(320, entry.contentRect.width)));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const baseSeries = series.find((item) => item.asset === baseAsset);
  const baseMove = pctMove(baseSeries);
  const basePeriodReturns = periodReturns(baseSeries);
  const peerRows = useMemo(() => {
    return series
      .filter((item) => item.asset !== baseAsset)
      .map((item) => {
        const peerMove = pctMove(item);
        const peerPeriodReturns = periodReturns(item);
        const corr = correlation(basePeriodReturns, peerPeriodReturns);
        const sensitivity = beta(peerPeriodReturns, basePeriodReturns);
        const spread = peerMove - baseMove;
        return {
          asset: item.asset,
          move: peerMove,
          corr,
          beta: sensitivity,
          spread,
          state: relationshipState(corr, spread, baseMove, peerMove),
        };
      })
      .sort((a, b) => Math.abs(b.corr) - Math.abs(a.corr));
  }, [baseMove, basePeriodReturns, baseAsset, series]);

  const selectedRow = peerRows.find((row) => row.asset === selectedPeer) ?? peerRows[0];
  const selectedSeries = series.find((item) => item.asset === selectedRow?.asset);
  const strongest = peerRows[0];
  const divergence = [...peerRows].sort((a, b) => Math.abs(b.spread) - Math.abs(a.spread))[0];
  const confirmingCount = peerRows.filter((row) => row.state === "confirming").length;
  const marketMode = peerRows.length && confirmingCount >= Math.ceil(peerRows.length / 2) ? "aligned" : "fragmented";

  const allPoints = series.flatMap((item) => item.normalized.map((point) => point.close));
  const rawMin = allPoints.length ? Math.min(...allPoints) : -1;
  const rawMax = allPoints.length ? Math.max(...allPoints) : 1;
  const pad = Math.max(0.5, (rawMax - rawMin) * 0.15);
  const min = rawMin - pad;
  const max = rawMax + pad;
  const zeroY = PAD.top + (1 - (0 - min) / (max - min || 1)) * (CHART_H - PAD.top - PAD.bottom);
  const hoverPoint = hoverIndex !== null && baseSeries?.normalized[hoverIndex] ? baseSeries.normalized[hoverIndex] : null;
  const hoverX = hoverIndex !== null && baseSeries?.normalized.length
    ? PAD.left + (hoverIndex / Math.max(1, baseSeries.normalized.length - 1)) * (chartWidth - PAD.left - PAD.right)
    : null;

  return (
    <section className="min-h-screen" style={{ background: "var(--bg)" }}>
      <div className="border-b px-5 py-5 sm:px-7" style={{ borderColor: B }}>
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-[0.34em]" style={{ color: "var(--foreground-faint)" }}>
              Analysis Workbench
            </p>
            <h1 className="mt-3 text-2xl font-mono font-bold tracking-[-0.04em] sm:text-4xl">
              {baseAsset} movement lenses
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed" style={{ color: "var(--foreground-muted)" }}>
              A workspace for trader analysis: movement relationships, spread behavior, and headline timing pinned directly to the market path.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {BASE_ASSETS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setBaseAsset(item)}
                className="border px-4 py-2 text-[11px] font-mono font-bold uppercase tracking-[0.2em] transition-colors"
                style={{
                  borderColor: baseAsset === item ? BLUE : B,
                  color: baseAsset === item ? BLUE : "var(--foreground-muted)",
                  background: baseAsset === item ? "var(--accent-track)" : "transparent",
                }}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 border-b lg:grid-cols-4" style={{ borderColor: B }}>
        <StatBlock label="Base Move" value={fmtPct(baseMove)} meta={`${baseAsset} / ${lookback}`} tone={colorFor(baseMove)} />
        <StatBlock label="Strongest Link" value={strongest ? strongest.asset : "--"} meta={strongest ? `corr ${fmtDecimal(strongest.corr)}` : "waiting for data"} tone={strongest?.corr && strongest.corr < 0 ? RED : GREEN} />
        <StatBlock label="Largest Spread" value={divergence ? divergence.asset : "--"} meta={divergence ? `${fmtPct(divergence.spread)} vs ${baseAsset}` : "waiting for data"} tone={divergence ? colorFor(divergence.spread) : undefined} />
        <StatBlock label="Market Mode" value={marketMode} meta={`${confirmingCount}/${peerRows.length || 0} confirming`} tone={marketMode === "aligned" ? GREEN : "var(--foreground)"} />
      </div>

      <AnalysisToolsDeck payload={analysisPayload} />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px]" style={{ background: B }}>
        <div style={{ background: "var(--bg)" }}>
          <div className="flex flex-col gap-4 border-b px-5 py-4 sm:px-7 lg:flex-row lg:items-center lg:justify-between" style={{ borderColor: B }}>
            <div>
              <p className="text-[12px] font-mono uppercase tracking-[0.28em] font-bold" style={{ color: "var(--foreground-dim)" }}>
                Normalized Return Path
              </p>
              <p className="mt-2 text-[11px] font-mono uppercase tracking-[0.18em]" style={{ color: "var(--foreground-faint)" }}>
                {GROUPS[group].note}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {LOOKBACKS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setLookback(item)}
                  className="border px-3 py-2 text-[10px] font-mono font-bold uppercase tracking-[0.18em]"
                  style={{
                    borderColor: lookback === item ? BLUE : B,
                    color: lookback === item ? BLUE : "var(--foreground-muted)",
                    background: lookback === item ? "var(--accent-track)" : "transparent",
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div ref={chartRef} className="relative min-h-[420px] px-3 py-5 sm:px-6">
            {loading ? (
              <div className="flex h-[420px] items-center justify-center">
                <p className="text-[11px] font-mono uppercase tracking-[0.28em]" style={{ color: "var(--foreground-faint)" }}>
                Fetching relationship klines
                </p>
              </div>
            ) : !baseSeries || series.length < 2 ? (
              <div className="flex h-[420px] items-center justify-center">
                <p className="text-[11px] font-mono uppercase tracking-[0.28em]" style={{ color: "var(--foreground-faint)" }}>
                  Not enough kline data for this analysis set
                </p>
              </div>
            ) : (
              <>
                <svg
                  width="100%"
                  height={CHART_H}
                  viewBox={`0 0 ${chartWidth} ${CHART_H}`}
                  preserveAspectRatio="none"
                  onMouseLeave={() => setHoverIndex(null)}
                  onMouseMove={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    const x = event.clientX - rect.left;
                    const innerW = rect.width - PAD.left - PAD.right;
                    const ratio = Math.min(1, Math.max(0, (x - PAD.left) / innerW));
                    const idx = Math.round(ratio * Math.max(0, baseSeries.normalized.length - 1));
                    setHoverIndex(idx);
                  }}
                >
                  {[0.25, 0.5, 0.75].map((ratio) => (
                    <line
                      key={ratio}
                      x1={PAD.left}
                      x2={chartWidth - PAD.right}
                      y1={PAD.top + ratio * (CHART_H - PAD.top - PAD.bottom)}
                      y2={PAD.top + ratio * (CHART_H - PAD.top - PAD.bottom)}
                      stroke={GRID}
                      strokeWidth={1}
                    />
                  ))}
                  <line x1={PAD.left} x2={chartWidth - PAD.right} y1={zeroY} y2={zeroY} stroke="rgba(255,255,255,0.18)" strokeDasharray="4 5" />

                  {series.map((item) => {
                    const isBase = item.asset === baseAsset;
                    const isSelected = item.asset === selectedRow?.asset;
                    const stroke = isBase ? BLUE : isSelected ? "var(--foreground)" : MUTED;
                    return (
                      <path
                        key={item.asset}
                        d={buildPath(item.normalized, chartWidth, CHART_H, min, max)}
                        fill="none"
                        stroke={stroke}
                        strokeWidth={isBase ? 2.4 : isSelected ? 1.9 : 1.1}
                        opacity={isBase || isSelected ? 1 : 0.52}
                        vectorEffect="non-scaling-stroke"
                      />
                    );
                  })}

                  {series.map((item) => {
                    const last = item.normalized[item.normalized.length - 1];
                    if (!last) return null;
                    const y = PAD.top + (1 - (last.close - min) / (max - min || 1)) * (CHART_H - PAD.top - PAD.bottom);
                    const isBase = item.asset === baseAsset;
                    const isSelected = item.asset === selectedRow?.asset;
                    if (!isBase && !isSelected) return null;
                    return (
                      <text
                        key={`${item.asset}-label`}
                        x={chartWidth - PAD.right + 12}
                        y={y + 4}
                        fill={isBase ? BLUE : "var(--foreground)"}
                        fontSize={11}
                        fontFamily="var(--font-mono)"
                        fontWeight="bold"
                      >
                        {item.asset}
                      </text>
                    );
                  })}

                  {hoverPoint && hoverX !== null && (
                    <>
                      <line x1={hoverX} x2={hoverX} y1={PAD.top} y2={CHART_H - PAD.bottom} stroke="rgba(255,255,255,0.22)" strokeDasharray="4 5" />
                      <circle
                        cx={hoverX}
                        cy={PAD.top + (1 - (hoverPoint.close - min) / (max - min || 1)) * (CHART_H - PAD.top - PAD.bottom)}
                        r={4}
                        fill={BLUE}
                      />
                    </>
                  )}

                  <text x={PAD.left} y={20} fill="rgba(255,255,255,0.42)" fontSize={10} fontFamily="var(--font-mono)">
                    {fmtPct(max)}
                  </text>
                  <text x={PAD.left} y={CHART_H - 10} fill="rgba(255,255,255,0.42)" fontSize={10} fontFamily="var(--font-mono)">
                    {fmtPct(min)}
                  </text>
                </svg>

                {hoverPoint && hoverX !== null && (
                  <div
                    className="pointer-events-none absolute top-8 min-w-[180px] border px-3 py-2"
                    style={{
                      left: Math.min(Math.max(20, hoverX + 18), Math.max(20, chartWidth - 220)),
                      borderColor: B,
                      background: "rgba(5,5,5,0.94)",
                    }}
                  >
                    <p className="text-[10px] font-mono uppercase tracking-[0.18em]" style={{ color: "var(--foreground-faint)" }}>
                      {new Date(hoverPoint.time).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })}
                    </p>
                    <p className="mt-2 text-[16px] font-mono font-bold tabular-nums" style={{ color: colorFor(hoverPoint.close) }}>
                      {baseAsset} {fmtPct(hoverPoint.close)}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <aside className="border-t xl:border-l xl:border-t-0" style={{ background: "var(--surface)", borderColor: B }}>
          <div className="border-b px-5 py-4" style={{ borderColor: B }}>
            <p className="text-[11px] font-mono uppercase tracking-[0.26em] font-bold" style={{ color: "var(--foreground-dim)" }}>
              Analysis Set
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {(Object.keys(GROUPS) as RelationshipGroup[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setGroup(item)}
                  className="border px-3 py-3 text-left text-[10px] font-mono font-bold uppercase tracking-[0.16em]"
                  style={{
                    borderColor: group === item ? BLUE : B,
                    color: group === item ? BLUE : "var(--foreground-muted)",
                    background: group === item ? "var(--accent-track)" : "transparent",
                  }}
                >
                  {GROUPS[item].label}
                </button>
              ))}
            </div>
          </div>

          <div className="px-5 py-5">
            <p className="text-[10px] font-mono uppercase tracking-[0.26em]" style={{ color: "var(--foreground-faint)" }}>
              Selected Lens
            </p>
            <p className="mt-3 text-3xl font-mono font-bold">{baseAsset} / {selectedRow?.asset ?? "--"}</p>
            <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden border" style={{ borderColor: B, background: B }}>
              <div className="p-3" style={{ background: "var(--bg)" }}>
                <p className="text-[10px] font-mono uppercase tracking-[0.2em]" style={{ color: "var(--foreground-faint)" }}>Corr</p>
                <p className="mt-2 text-xl font-mono font-bold">{selectedRow ? fmtDecimal(selectedRow.corr) : "--"}</p>
              </div>
              <div className="p-3" style={{ background: "var(--bg)" }}>
                <p className="text-[10px] font-mono uppercase tracking-[0.2em]" style={{ color: "var(--foreground-faint)" }}>Beta</p>
                <p className="mt-2 text-xl font-mono font-bold">{selectedRow ? fmtDecimal(selectedRow.beta) : "--"}</p>
              </div>
              <div className="p-3" style={{ background: "var(--bg)" }}>
                <p className="text-[10px] font-mono uppercase tracking-[0.2em]" style={{ color: "var(--foreground-faint)" }}>Spread</p>
                <p className="mt-2 text-xl font-mono font-bold" style={{ color: selectedRow ? colorFor(selectedRow.spread) : "var(--foreground)" }}>
                  {selectedRow ? fmtPct(selectedRow.spread) : "--"}
                </p>
              </div>
              <div className="p-3" style={{ background: "var(--bg)" }}>
                <p className="text-[10px] font-mono uppercase tracking-[0.2em]" style={{ color: "var(--foreground-faint)" }}>State</p>
                <p className="mt-2 text-xl font-mono font-bold uppercase" style={{ color: selectedRow?.state === "inverse" ? RED : selectedRow?.state === "confirming" ? GREEN : "var(--foreground)" }}>
                  {selectedRow?.state ?? "--"}
                </p>
              </div>
            </div>

            <div className="mt-5 border-t pt-5" style={{ borderColor: B }}>
              <p className="text-[12px] leading-relaxed" style={{ color: "var(--foreground-muted)" }}>
                {selectedRow?.state === "confirming" && `${selectedRow.asset} is moving with ${baseAsset}. This is useful confirmation when both are pressing in the same direction.`}
                {selectedRow?.state === "inverse" && `${selectedRow.asset} is trading against ${baseAsset}. Treat it as a hedge or macro-pressure lens, not confirmation.`}
                {selectedRow?.state === "diverging" && `${selectedRow.asset} has opened a wide spread versus ${baseAsset}. This is where relative value, catch-up, or decoupling risk lives.`}
                {selectedRow?.state === "loose" && `${selectedRow.asset} is not giving a clean analysis read against ${baseAsset} in this window.`}
              </p>
            </div>

            {selectedSeries && baseSeries && (
              <div className="mt-6">
                <p className="mb-3 text-[10px] font-mono uppercase tracking-[0.24em]" style={{ color: "var(--foreground-faint)" }}>
                  Latest Moves
                </p>
                <div className="space-y-3">
                  {[baseSeries, selectedSeries].map((item) => {
                    const move = pctMove(item);
                    return (
                      <div key={item.asset}>
                        <div className="mb-1 flex items-center justify-between text-[11px] font-mono font-bold uppercase tracking-[0.16em]">
                          <span>{item.asset}</span>
                          <span style={{ color: colorFor(move) }}>{fmtPct(move)}</span>
                        </div>
                        <div className="h-1 bg-white/10">
                          <div
                            className="h-full"
                            style={{
                              width: `${Math.min(100, Math.max(6, Math.abs(move) * 9))}%`,
                              background: colorFor(move),
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      <div className="border-t" style={{ borderColor: B }}>
        <div className="border-b px-5 py-4 sm:px-7" style={{ borderColor: B }}>
          <p className="text-[12px] font-mono uppercase tracking-[0.28em] font-bold" style={{ color: "var(--foreground-dim)" }}>
            Relationship Matrix
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse">
            <thead>
              <tr className="border-b" style={{ borderColor: B }}>
                {["Peer", "Move", "Spread", "Correlation", "Beta", "Read"].map((item) => (
                  <th key={item} className="px-5 py-3 text-left text-[10px] font-mono uppercase tracking-[0.24em]" style={{ color: "var(--foreground-faint)" }}>
                    {item}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-[11px] font-mono uppercase tracking-[0.24em]" style={{ color: "var(--foreground-faint)" }}>
                    Loading matrix
                  </td>
                </tr>
              ) : peerRows.length ? (
                peerRows.map((row) => {
                  const active = row.asset === selectedRow?.asset;
                  return (
                    <tr
                      key={row.asset}
                      className="cursor-pointer border-b transition-colors"
                      style={{ borderColor: B, background: active ? "var(--surface)" : "transparent" }}
                      onClick={() => setSelectedPeer(row.asset)}
                    >
                      <td className="px-5 py-4 text-[14px] font-mono font-bold">{row.asset}</td>
                      <td className="px-5 py-4 text-[13px] font-mono font-bold tabular-nums" style={{ color: colorFor(row.move) }}>{fmtPct(row.move)}</td>
                      <td className="px-5 py-4 text-[13px] font-mono font-bold tabular-nums" style={{ color: colorFor(row.spread) }}>{fmtPct(row.spread)}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="w-12 text-[13px] font-mono font-bold tabular-nums">{fmtDecimal(row.corr)}</span>
                          <div className="h-1.5 w-32 bg-white/10">
                            <div
                              className="h-full"
                              style={{
                                width: `${Math.min(100, Math.abs(row.corr) * 100)}%`,
                                background: row.corr >= 0 ? GREEN : RED,
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-[13px] font-mono font-bold tabular-nums">{fmtDecimal(row.beta)}</td>
                      <td className="px-5 py-4">
                        <span
                          className="border px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-[0.18em]"
                          style={{
                            borderColor: row.state === "confirming" ? "rgba(34,197,94,0.45)" : row.state === "inverse" ? "rgba(239,68,68,0.45)" : B,
                            color: row.state === "confirming" ? GREEN : row.state === "inverse" ? RED : "var(--foreground-muted)",
                          }}
                        >
                          {row.state}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-[11px] font-mono uppercase tracking-[0.24em]" style={{ color: "var(--foreground-faint)" }}>
                    No analysis rows available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <EventImpactMap baseAsset={baseAsset} baseSeries={baseSeries} />
    </section>
  );
}
