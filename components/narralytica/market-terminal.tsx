"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { formatCurrencyCompact } from "@/lib/format";
import { PriceChart } from "@/components/narralytica/price-chart";

const B = "var(--border-subtle)";

type TerminalPayload = {
  manifest?: Record<string, unknown>;
  hero?: any;
  overview?: any;
  desk?: any;
  desk_brief?: any;
  market_structure?: any;
  news?: any;
  macro?: any;
  watchlist?: any;
  analysis?: any;
};

function n(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function pct(value: unknown, digits = 2) {
  const parsed = n(value);
  if (parsed == null) return "--";
  return `${parsed >= 0 ? "+" : ""}${(parsed * 100).toFixed(digits)}%`;
}

function pctChange(current: unknown, previous: unknown) {
  const currentValue = n(current);
  const previousValue = n(previous);
  if (currentValue == null || previousValue == null || previousValue === 0) return null;
  return (currentValue - previousValue) / previousValue;
}

function money(value: unknown) {
  const parsed = n(value);
  if (parsed == null) return "--";
  return formatCurrencyCompact(parsed);
}

function compact(value: unknown) {
  const parsed = n(value);
  if (parsed == null) return "--";
  return parsed.toLocaleString("en-US", { maximumFractionDigits: parsed >= 100 ? 0 : 2 });
}

function dateLabel(value: string | null | undefined) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function Sparkline({ rows, field }: { rows: Record<string, unknown>[]; field: string }) {
  const values = rows.map((row) => n(row[field])).filter((value): value is number => value != null).reverse();
  if (values.length < 2) return <div className="h-10 border-t" style={{ borderColor: B }} />;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100;
      const y = 38 - ((value - min) / range) * 34;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 42" className="h-10 w-full overflow-visible">
      <polyline points={points} fill="none" stroke="rgba(255,255,255,0.76)" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
      <line x1="0" x2="100" y1="39" y2="39" stroke="rgba(255,255,255,0.08)" />
    </svg>
  );
}

function FearGreedRail({ latest, delta }: { latest: unknown; delta: unknown }) {
  const value = Math.max(0, Math.min(100, n(latest) ?? 0));
  const deltaValue = n(delta);
  const tone = value < 35 ? "var(--bear)" : value < 65 ? "#d6a83d" : "var(--bull)";

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <DataCell label="Fear Greed" value={`${compact(value)} / 100`} />
        <p className="text-[11px] font-mono tabular-nums" style={{ color: deltaValue == null ? "var(--foreground-faint)" : deltaValue >= 0 ? "var(--bull)" : "var(--bear)" }}>
          {deltaValue == null ? "Delta --" : `Delta ${deltaValue >= 0 ? "+" : ""}${compact(deltaValue)}`}
        </p>
      </div>
      <div className="mt-8">
        <div
          className="relative h-2 overflow-hidden rounded-full"
          style={{
            background: "linear-gradient(90deg, var(--bear) 0%, var(--bear) 33%, #d6a83d 33%, #d6a83d 66%, var(--bull) 66%, var(--bull) 100%)",
          }}
        >
          <div className="absolute inset-0 bg-black/35" />
          <div className="absolute bottom-[-7px] top-[-7px] w-px" style={{ left: `${value}%`, background: "var(--foreground)" }} />
        </div>
        <div className="mt-3 flex justify-between text-[10px] font-mono uppercase tracking-[0.14em]" style={{ color: "var(--foreground-faint)" }}>
          <span>Fear</span>
          <span>Neutral</span>
          <span>Greed</span>
        </div>
        <p className="mt-5 text-[22px] font-mono font-bold tabular-nums" style={{ color: tone }}>
          {compact(value)}
        </p>
      </div>
    </div>
  );
}

function MarketCapArea({ rows, latest, changePct }: { rows: Record<string, unknown>[]; latest: unknown; changePct: unknown }) {
  const values = rows.map((row) => n(row.total_crypto_market_cap)).filter((value): value is number => value != null).reverse();
  const isUp = (n(changePct) ?? 0) >= 0;
  const tone = isUp ? "var(--bull)" : "var(--bear)";

  if (values.length < 2) {
    return <div className="mt-6 h-36 border-t" style={{ borderColor: B }} />;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * 100;
    const y = 96 - ((value - min) / range) * 78;
    return { x, y, value };
  });
  const line = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const area = `${line} L 100 104 L 0 104 Z`;

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <DataCell label="Crypto Market Cap" value={money(latest)} tone={isUp ? "up" : "down"} />
        <p className="text-[12px] font-mono font-bold tabular-nums" style={{ color: tone }}>
          1D {pct(changePct)}
        </p>
      </div>
      <svg viewBox="0 0 100 110" className="mt-5 h-40 w-full overflow-visible" preserveAspectRatio="none">
        <defs>
          <linearGradient id="market-cap-pulse-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={isUp ? "rgb(34,197,94)" : "rgb(239,68,68)"} stopOpacity="0.22" />
            <stop offset="100%" stopColor={isUp ? "rgb(34,197,94)" : "rgb(239,68,68)"} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[20, 52, 84].map((y) => (
          <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="rgba(255,255,255,0.07)" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
        ))}
        <path d={area} fill="url(#market-cap-pulse-area)" />
        <path d={line} fill="none" stroke={tone} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="mt-2 flex justify-between text-[10px] font-mono tabular-nums" style={{ color: "var(--foreground-faint)" }}>
        <span>{money(min)}</span>
        <span>{money(max)}</span>
      </div>
    </div>
  );
}

function TrendArea({
  rows,
  field,
  tone,
}: {
  rows: Record<string, unknown>[];
  field: string;
  tone: "up" | "down" | "neutral";
}) {
  const values = rows.map((row) => n(row[field])).filter((value): value is number => value != null).reverse();
  const color = tone === "up" ? "var(--bull)" : tone === "down" ? "var(--bear)" : "rgba(255,255,255,0.78)";

  if (values.length < 2) {
    return <div className="mt-5 h-24 border-t" style={{ borderColor: B }} />;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * 100;
    const y = 82 - ((value - min) / range) * 64;
    return { x, y };
  });
  const line = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const area = `${line} L 100 90 L 0 90 Z`;

  return (
    <svg viewBox="0 0 100 92" className="mt-5 h-28 w-full overflow-visible" preserveAspectRatio="none">
      {[22, 52, 82].map((y) => (
        <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
      ))}
      <path d={area} fill={color} opacity="0.08" />
      <path d={line} fill="none" stroke={color} strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function DataCell({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" | "muted" }) {
  const color = tone === "up" ? "var(--bull)" : tone === "down" ? "var(--bear)" : tone === "muted" ? "var(--foreground-faint)" : "var(--foreground)";
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-mono uppercase tracking-[0.14em]" style={{ color: "var(--foreground-faint)" }}>
        {label}
      </p>
      <p className="mt-1 truncate text-[13px] font-mono font-bold tabular-nums" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

function macroValue(value: unknown) {
  if (value == null || value === "") return "--";
  const text = String(value);
  if (text.includes("%")) return text;
  const parsed = n(text);
  if (parsed == null) return text;
  if (Math.abs(parsed) >= 1_000_000) {
    return formatCurrencyCompact(parsed).replace("$", "");
  }
  return parsed.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function directionPhrase(...values: unknown[]) {
  const parsed = values.map((value) => n(value)).filter((value): value is number => value != null);
  if (parsed.length === 0) return "move without a clear direction";
  if (parsed.every((value) => value >= 0)) return "trade higher";
  if (parsed.every((value) => value < 0)) return "trade lower";
  return "trade mixed";
}

function tokenAmount(value: unknown) {
  const parsed = n(value);
  if (parsed == null) return "--";
  const abs = Math.abs(parsed);
  if (abs >= 1_000_000_000) return `${(parsed / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${(parsed / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${(parsed / 1_000).toFixed(2)}K`;
  return parsed.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

const DEFAULT_TAPE_ASSETS = ["BTC", "ETH", "XRP", "SOL", "LINK", "AVAX", "SUI", "DOGE"];

function SectionBlock({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <section id={id} className="border-b scroll-mt-16" style={{ borderColor: B }}>
      <div className="border-b px-4 py-4 sm:px-6" style={{ borderColor: B }}>
        <p className="text-[12px] font-mono uppercase tracking-[0.22em] font-bold" style={{ color: "var(--foreground)" }}>
          {label}
        </p>
      </div>
      {children}
    </section>
  );
}

function AssetTape({ assets }: { assets: any[] }) {
  const availableSymbols = assets.map((asset) => asset.asset).filter(Boolean);
  const [editing, setEditing] = useState(false);
  const [watchSymbols, setWatchSymbols] = useState<string[]>(DEFAULT_TAPE_ASSETS);

  useEffect(() => {
    const stored = window.localStorage.getItem("narralytica.assetTape.watchlist");
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.every((item) => typeof item === "string")) {
        setWatchSymbols(parsed);
      }
    } catch {
      window.localStorage.removeItem("narralytica.assetTape.watchlist");
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("narralytica.assetTape.watchlist", JSON.stringify(watchSymbols));
  }, [watchSymbols]);

  const visibleAssets = assets.filter((asset) => watchSymbols.includes(asset.asset));
  const shownAssets = visibleAssets.length > 0 ? visibleAssets : assets.slice(0, 8);

  function toggleSymbol(symbol: string) {
    setWatchSymbols((current) => {
      if (current.includes(symbol)) {
        return current.filter((item) => item !== symbol);
      }
      return [...current, symbol];
    });
  }

  return (
    <div className="relative border-b" style={{ borderColor: B }}>
      <div className="grid grid-cols-2 pr-12 md:grid-cols-4 xl:grid-cols-8" style={{ borderColor: B }}>
        {shownAssets.map((asset) => {
          const snap = asset.snapshot ?? {};
          const change = n(snap.changePct24h);
          return (
            <div key={asset.asset} className="min-w-0 border-r px-4 py-3 last:border-r-0" style={{ borderColor: B }}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[12px] font-mono font-bold uppercase tracking-[0.18em]" style={{ color: "var(--foreground)" }}>
                  {asset.asset}
                </span>
                <span className="text-[11px] font-mono tabular-nums" style={{ color: change == null ? "var(--foreground-faint)" : change >= 0 ? "var(--bull)" : "var(--bear)" }}>
                  {pct(change)}
                </span>
              </div>
              <p className="mt-2 text-[16px] font-mono font-bold tabular-nums" style={{ color: "var(--foreground)" }}>
                {money(snap.price)}
              </p>
              <p className="mt-1 truncate text-[10px] font-mono" style={{ color: "var(--foreground-faint)" }}>
                Vol {money(snap.turnover24h)}
              </p>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => setEditing((value) => !value)}
        className="absolute right-0 top-0 flex h-full w-12 items-center justify-center border-l text-[14px] font-mono transition-colors hover:bg-white/[0.03]"
        style={{ borderColor: B, color: editing ? "var(--foreground)" : "var(--foreground-faint)" }}
        aria-label="Edit asset tape watchlist"
      >
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
          <path d="M3.25 10.95L4.05 8.1L9.95 2.2C10.55 1.6 11.5 1.6 12.1 2.2C12.7 2.8 12.7 3.75 12.1 4.35L6.2 10.25L3.25 10.95Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M8.95 3.2L11.1 5.35" stroke="currentColor" strokeWidth="1.2" />
          <path d="M2.5 13H12.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </button>
      {editing ? (
        <div className="border-t px-4 py-4" style={{ borderColor: B, background: "var(--surface)" }}>
          <div className="mb-3 flex items-center justify-between gap-4">
            <p className="text-[11px] font-mono uppercase tracking-[0.16em] font-bold" style={{ color: "var(--foreground)" }}>
              Watchlist Tokens
            </p>
            <button
              type="button"
              onClick={() => setWatchSymbols(DEFAULT_TAPE_ASSETS.filter((symbol) => availableSymbols.includes(symbol)))}
              className="text-[10px] font-mono uppercase tracking-[0.14em] transition-colors hover:text-white"
              style={{ color: "var(--foreground-faint)" }}
            >
              Reset Default
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {availableSymbols.map((symbol) => {
              const active = watchSymbols.includes(symbol);
              return (
                <button
                  key={`watch-token-${symbol}`}
                  type="button"
                  onClick={() => toggleSymbol(symbol)}
                  className="border px-3 py-2 text-[11px] font-mono font-bold uppercase tracking-[0.14em] transition-colors"
                  style={{
                    borderColor: active ? "var(--foreground-dim)" : B,
                    color: active ? "var(--foreground)" : "var(--foreground-faint)",
                    background: active ? "var(--surface-2)" : "transparent",
                  }}
                >
                  {symbol}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function EtfFlowDeck({ hero }: { hero: any }) {
  const assets = Object.values(hero?.assets ?? {}) as any[];
  return (
    <div className="grid grid-cols-1 border-b lg:grid-cols-2" style={{ borderColor: B }}>
      {assets.map((asset) => {
        const latest = n(asset.etf?.dailyNetInflow);
        const positioning = asset.positioning?.latest ?? {};
        const longShare = n(positioning.longAccountShare);
        const shortShare = n(positioning.shortAccountShare);
        return (
          <div key={asset.asset} className="border-r px-5 py-5 last:border-r-0" style={{ borderColor: B }}>
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="text-[11px] font-mono uppercase tracking-[0.16em] font-bold" style={{ color: "var(--foreground-dim)" }}>
                  {asset.asset} ETF Net Flow
                </p>
                <p className="mt-2 text-[26px] font-mono font-bold tabular-nums" style={{ color: latest == null ? "var(--foreground)" : latest >= 0 ? "var(--bull)" : "var(--bear)" }}>
                  {latest != null && latest > 0 ? "+" : ""}{money(latest)}
                </p>
              </div>
              <div className="w-28">
                <div className="flex h-3 overflow-hidden border" style={{ borderColor: B }}>
                  <div style={{ width: `${(longShare ?? 0) * 100}%`, background: "var(--bull)" }} />
                  <div style={{ width: `${(shortShare ?? 0) * 100}%`, background: "var(--bear)" }} />
                </div>
                <div className="mt-2 flex justify-between text-[10px] font-mono" style={{ color: "var(--foreground-faint)" }}>
                  <span>L {longShare == null ? "--" : `${Math.round(longShare * 100)}%`}</span>
                  <span>S {shortShare == null ? "--" : `${Math.round(shortShare * 100)}%`}</span>
                </div>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-5 gap-px">
              {(asset.etf?.history5d ?? []).slice(0, 5).map((row: any, index: number) => {
                const flow = n(row.totalNetInflow);
                return (
                  <div key={`${asset.asset}-${row.date ?? "session"}-${index}`} className="border px-2 py-2" style={{ borderColor: B, background: flow == null ? "transparent" : flow >= 0 ? "rgba(34,197,94,0.09)" : "rgba(239,68,68,0.09)" }}>
                    <p className="text-[10px] font-mono" style={{ color: "var(--foreground-faint)" }}>{dateLabel(row.date)}</p>
                    <p className="mt-2 truncate text-[11px] font-mono font-bold tabular-nums" style={{ color: flow == null ? "var(--foreground)" : flow >= 0 ? "var(--bull)" : "var(--bear)" }}>
                      {money(flow)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TopContextSection({
  data,
  assets,
  selectedAsset,
  onSelectedAssetChange,
}: {
  data: TerminalPayload;
  assets: any[];
  selectedAsset: string;
  onSelectedAssetChange: (asset: string) => void;
}) {
  const [klinePrice, setKlinePrice] = useState<number | null>(null);
  const assetRow = assets.find((asset) => asset.asset === selectedAsset) ?? assets[0] ?? {};
  const heroAsset = data.hero?.assets?.[selectedAsset];
  const snapshot = assetRow.snapshot ?? heroAsset?.snapshot ?? {};
  const leadPair = assetRow.leadPair;
  const etf = heroAsset?.etf;
  const positioning = heroAsset?.positioning?.latest ?? {};
  const longShare = n(positioning.longAccountShare);
  const shortShare = n(positioning.shortAccountShare);
  const rangeLow = n(snapshot.low24h);
  const rangeHigh = n(snapshot.high24h);
  const price = klinePrice ?? n(snapshot.price);
  const rangePosition =
    price != null && rangeLow != null && rangeHigh != null && rangeHigh !== rangeLow
      ? Math.max(0, Math.min(1, (price - rangeLow) / (rangeHigh - rangeLow)))
      : null;
  const etfHistory = (etf?.history5d ?? []).slice(0, 5);
  const latestFlow = n(etf?.dailyNetInflow);
  const topPairs = assets.slice(0, 8);
  const change24h = n(snapshot.changePct24h);

  useEffect(() => {
    setKlinePrice(null);
  }, [selectedAsset]);

  return (
    <div className="grid grid-cols-1 border-b xl:grid-cols-[240px_minmax(420px,0.82fr)_minmax(460px,0.9fr)]" style={{ borderColor: B }}>
      <div className="flex border-b px-5 py-5 xl:min-h-[430px] xl:flex-col xl:justify-between xl:border-b-0 xl:border-r xl:px-5 xl:py-8" style={{ borderColor: B }}>
        {longShare != null && shortShare != null ? (
          <div className="flex w-full flex-col gap-6">
            <div>
              <p className="text-[11px] font-mono uppercase tracking-[0.14em] font-bold" style={{ color: "var(--foreground)" }}>
                Total Binance Longs vs Shorts
              </p>
              <p className="mt-2 text-[10px] font-mono uppercase tracking-[0.16em]" style={{ color: "var(--foreground-faint)" }}>
                Account share
              </p>
            </div>
            <div className="flex h-56 items-end gap-4 xl:h-64">
              <div className="flex h-full flex-1 flex-col">
                <p className="mb-2 text-[11px] font-mono uppercase tracking-[0.12em]" style={{ color: "var(--foreground-muted)" }}>Long</p>
                <p className="mb-4 text-[20px] font-mono font-bold tabular-nums" style={{ color: "var(--foreground)" }}>{(longShare * 100).toFixed(2)}%</p>
                <div className="relative mt-auto h-36 border-t xl:h-44" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                  <div
                    className="absolute bottom-0 left-0 right-0 rounded-sm border"
                    style={{
                      height: `${Math.max(4, longShare * 100)}%`,
                      borderColor: "rgba(34,197,94,0.32)",
                      background: "var(--bull)",
                    }}
                  />
                </div>
              </div>
              <div className="flex h-full flex-1 flex-col">
                <p className="mb-2 text-[11px] font-mono uppercase tracking-[0.12em]" style={{ color: "var(--foreground-muted)" }}>Shorts</p>
                <p className="mb-4 text-[20px] font-mono font-bold tabular-nums" style={{ color: "var(--foreground)" }}>{(shortShare * 100).toFixed(2)}%</p>
                <div className="relative mt-auto h-36 border-t xl:h-44" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                  <div
                    className="absolute bottom-0 left-0 right-0 rounded-sm border"
                    style={{
                      height: `${Math.max(4, shortShare * 100)}%`,
                      borderColor: "rgba(239,68,68,0.32)",
                      background: "var(--bear)",
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.08)" }} />
              <p className="text-[10px] font-mono uppercase tracking-[0.16em]" style={{ color: "var(--foreground-faint)" }}>
                {selectedAsset}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex w-full items-center justify-between gap-4 xl:h-full xl:flex-col xl:items-center xl:justify-center">
            <DataCell label="Rank" value={`#${compact(snapshot.marketCapRank)}`} />
            <div className="h-1 flex-1 border-t xl:h-32 xl:w-px xl:flex-none xl:border-l xl:border-t-0" style={{ borderColor: B }} />
            <DataCell label="Turnover" value={money(snapshot.turnover24h)} />
          </div>
        )}
      </div>

      <div className="border-b px-5 py-6 xl:border-b-0 xl:border-r xl:px-7 xl:py-8" style={{ borderColor: B }}>
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-[0.18em] font-bold" style={{ color: "var(--foreground-dim)" }}>
              {selectedAsset} Market Context
            </p>
            <div className="mt-2 flex flex-wrap items-baseline gap-4">
              <p className="text-[34px] font-mono font-bold leading-none tabular-nums" style={{ color: "var(--foreground)" }}>
                {money(price)}
              </p>
              <p className="text-[13px] font-mono font-bold tabular-nums" style={{ color: n(snapshot.changePct24h) != null && n(snapshot.changePct24h)! >= 0 ? "var(--bull)" : "var(--bear)" }}>
                {pct(snapshot.changePct24h)}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-5">
            <DataCell label="Market Cap" value={money(snapshot.marketCap)} />
            <DataCell label="Volume" value={money(snapshot.turnover24h)} />
          </div>
        </div>

        <div className="mt-7 border-t pt-5" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          {etfHistory.length > 0 ? (
            <>
              <div className="mb-4 flex items-baseline justify-between gap-4">
                <div>
                  <p className="text-[11px] font-mono uppercase tracking-[0.16em] font-bold" style={{ color: "var(--foreground-dim)" }}>
                    ETF Net Flow
                  </p>
                  <p className="mt-1 text-[24px] font-mono font-bold tabular-nums" style={{ color: latestFlow != null && latestFlow < 0 ? "var(--bear)" : "var(--bull)" }}>
                    {latestFlow != null && latestFlow > 0 ? "+" : ""}{money(latestFlow)}
                  </p>
                </div>
                <p className="text-[10px] font-mono uppercase tracking-[0.14em]" style={{ color: "var(--foreground-faint)" }}>
                  Past 5 sessions
                </p>
              </div>
              <div className="grid grid-cols-5 gap-px">
                {etfHistory.map((row: any, index: number) => {
                  const flow = n(row.totalNetInflow);
                  return (
                    <div key={`${selectedAsset}-top-etf-${row.date ?? "session"}-${index}`} className="border px-2 py-3" style={{ borderColor: B, background: flow == null ? "transparent" : flow >= 0 ? "rgba(34,197,94,0.09)" : "rgba(239,68,68,0.09)" }}>
                      <p className="text-[10px] font-mono" style={{ color: "var(--foreground-faint)" }}>{dateLabel(row.date)}</p>
                      <p className="mt-2 truncate text-[11px] font-mono font-bold tabular-nums" style={{ color: flow == null ? "var(--foreground)" : flow >= 0 ? "var(--bull)" : "var(--bear)" }}>
                        {money(flow)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <div className="mb-4 flex items-baseline justify-between gap-4">
                <p className="text-[11px] font-mono uppercase tracking-[0.16em] font-bold" style={{ color: "var(--foreground-dim)" }}>
                  Lead Venue
                </p>
                <p className="text-[10px] font-mono uppercase tracking-[0.14em]" style={{ color: "var(--foreground-faint)" }}>
                  24h range
                </p>
              </div>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_1.15fr]">
                <div className="grid grid-cols-2 gap-4">
                  <DataCell label="Pair" value={leadPair ? `${leadPair.market} ${leadPair.base}/${leadPair.target}` : "--"} />
                  <DataCell label="Turnover" value={money(leadPair?.turnover24h)} />
                  <DataCell label="+2% Depth" value={money(leadPair?.costToMoveUpUsd)} />
                  <DataCell label="-2% Depth" value={money(leadPair?.costToMoveDownUsd)} />
                </div>
                <div className="flex flex-col justify-center">
                  <div className="relative h-2 border" style={{ borderColor: B, background: "rgba(255,255,255,0.04)" }}>
                    <div className="absolute bottom-[-5px] top-[-5px] w-px" style={{ left: `${(rangePosition ?? 0) * 100}%`, background: "var(--foreground)" }} />
                  </div>
                  <div className="mt-3 flex justify-between text-[10px] font-mono tabular-nums" style={{ color: "var(--foreground-faint)" }}>
                    <span>{money(rangeLow)}</span>
                    <span>{money(rangeHigh)}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="px-5 py-6 xl:px-7 xl:py-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-[0.18em] font-bold" style={{ color: "var(--foreground-dim)" }}>
              Price Context
            </p>
          </div>
          <div className="flex flex-wrap border" style={{ borderColor: B }}>
            {topPairs.map((asset) => {
              const active = selectedAsset === asset.asset;
              return (
                <button
                  key={`chart-pair-${asset.asset}`}
                  type="button"
                  onClick={() => onSelectedAssetChange(asset.asset)}
                  className="border-r px-3 py-2 text-[11px] font-mono font-bold uppercase tracking-[0.14em] last:border-r-0"
                  style={{
                    borderColor: B,
                    color: active ? "var(--foreground)" : "var(--foreground-dim)",
                    background: active ? "var(--surface-2)" : "transparent",
                  }}
                >
                  {asset.asset}
                </button>
              );
            })}
          </div>
        </div>
        <div className="h-[330px] overflow-hidden border-t pt-3" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <PriceChart
            asset={selectedAsset}
            compact
            compactHeight={318}
            compactCandles={86}
            compactChangePct={change24h}
            onLatestPrice={setKlinePrice}
          />
        </div>
      </div>
    </div>
  );
}

function PulseView({ overview }: { overview: any }) {
  const pulse = overview?.marketPulse ?? {};
  const sectors = overview?.sectorRotation?.leadersByChange ?? [];
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[0.85fr_1.15fr_1.25fr]" style={{ borderColor: B }}>
      <div className="border-b px-5 py-6 lg:border-b-0 lg:border-r" style={{ borderColor: B }}>
        <FearGreedRail latest={pulse.fearGreed?.latest} delta={pulse.fearGreed?.delta} />
      </div>
      <div className="border-b px-5 py-6 lg:border-b-0 lg:border-r" style={{ borderColor: B }}>
        <MarketCapArea
          rows={pulse.totalCryptoMarketCap?.series ?? []}
          latest={pulse.totalCryptoMarketCap?.latest}
          changePct={pulse.totalCryptoMarketCap?.dayChangePct}
        />
      </div>
      <div className="px-5 py-6">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[11px] font-mono uppercase tracking-[0.16em] font-bold" style={{ color: "var(--foreground-dim)" }}>Sector Rotation</p>
          <p className="text-[10px] font-mono" style={{ color: "var(--foreground-faint)" }}>24h</p>
        </div>
        <div className="grid gap-2">
          {sectors.slice(0, 7).map((sector: any) => (
            <div key={sector.name} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-t py-2" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <span className="text-[12px] font-mono uppercase" style={{ color: "var(--foreground)" }}>{sector.name}</span>
              <span className="text-[11px] font-mono tabular-nums" style={{ color: "var(--foreground-faint)" }}>{pct(sector.marketCapDominance)}</span>
              <span className="text-[12px] font-mono font-bold tabular-nums" style={{ color: n(sector.changePct24h) != null && n(sector.changePct24h)! >= 0 ? "var(--bull)" : "var(--bear)" }}>{pct(sector.changePct24h)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DeskView({ desk, brief }: { desk: any; brief?: any }) {
  const liquidity = desk?.liquidityWatch ?? [];
  const flows = desk?.flowWatch ?? [];
  const sectors = desk?.rotationWatch?.sectors ?? [];
  const indices = desk?.rotationWatch?.indices ?? [];
  const macro = desk?.catalysts?.macro ?? [];
  const news = desk?.catalysts?.news ?? [];
  const stocks = desk?.tradfiProxy?.cryptoStocks ?? [];
  const priceMap = desk?.priceMap ?? [];
  const latestOi = desk?.leverageWatch?.futuresOpenInterest?.[0] ?? {};
  const previousOi = desk?.leverageWatch?.futuresOpenInterest?.[1] ?? {};
  const latestFunding = desk?.leverageWatch?.fundingRate?.[0] ?? {};
  const stable = desk?.pulse?.stablecoinMarketCap ?? {};
  const fearGreed = desk?.pulse?.fearGreed ?? {};
  const marketCap = desk?.pulse?.totalCryptoMarketCap ?? {};
  const btc = priceMap.find((row: any) => row.asset === "BTC") ?? {};
  const eth = priceMap.find((row: any) => row.asset === "ETH") ?? {};
  const briefGenerated = brief?.generated_at ? new Date(brief.generated_at) : null;
  const deskGenerated = desk?.generated_at ? new Date(desk.generated_at) : null;
  const briefIsStale =
    briefGenerated != null &&
    deskGenerated != null &&
    !Number.isNaN(briefGenerated.getTime()) &&
    !Number.isNaN(deskGenerated.getTime()) &&
    briefGenerated.getTime() + 5 * 60 * 1000 < deskGenerated.getTime();
  const btcFlow = flows.find((flow: any) => flow.asset === "BTC") ?? {};
  const ethFlow = flows.find((flow: any) => flow.asset === "ETH") ?? {};
  const oiDelta = pctChange(latestOi.all, previousOi.all);
  const macroRisk = (brief?.week_ahead ?? []).some((item: any) => item.importance === "high") ? "high" : macro.length > 0 ? "medium" : "low";
  const catalyst = (brief?.week_ahead ?? []).find((item: any) => item.importance === "high") ?? (brief?.week_ahead ?? [])[0];
  const readableHeadline = `Crypto market cap is ${money(marketCap.latest)} while BTC and ETH ${directionPhrase(btc.changePct24h, eth.changePct24h)} ahead of ${catalyst?.label ?? "macro catalysts"}`;
  const readableSubheadline = [
    `Crypto market cap ${money(marketCap.latest)} (${pct(marketCap.dayChangePct)})`,
    `BTC ${money(btc.price)} (${pct(btc.changePct24h)})`,
    `ETH ${money(eth.price)} (${pct(eth.changePct24h)})`,
    `Fear & Greed ${compact(fearGreed.latest)}`,
  ].join(" · ");
  const heat = [
    { label: "Spot", value: pct(marketCap.dayChangePct), tone: n(marketCap.dayChangePct) != null && n(marketCap.dayChangePct)! >= 0 ? "up" : "down" },
    { label: "BTC ETF", value: money(btcFlow.dailyNetInflow), tone: n(btcFlow.dailyNetInflow) != null && n(btcFlow.dailyNetInflow)! >= 0 ? "up" : "down" },
    { label: "ETH ETF", value: money(ethFlow.dailyNetInflow), tone: n(ethFlow.dailyNetInflow) != null && n(ethFlow.dailyNetInflow)! >= 0 ? "up" : "down" },
    { label: "Funding", value: pct(latestFunding.binance, 3), tone: n(latestFunding.binance) != null && n(latestFunding.binance)! >= 0 ? "up" : "down" },
    { label: "OI", value: pct(oiDelta), tone: oiDelta != null && oiDelta >= 0 ? "up" : "down" },
    { label: "Macro", value: macroRisk, tone: macroRisk === "high" ? "down" : macroRisk === "medium" ? "neutral" : "up" },
    { label: "News", value: `${news.length} hot`, tone: news.length >= 5 ? "neutral" : "muted" },
  ];

  return (
    <div style={{ borderColor: B }}>
      {brief ? (
        <div className="border-b" style={{ borderColor: B }}>
          {briefIsStale ? (
            <div className="border-b px-5 py-3 text-[11px] font-mono uppercase tracking-[0.14em]" style={{ borderColor: B, color: "#d6841f", background: "rgba(214,132,31,0.08)" }}>
              Brief generated before latest desk payload. Refresh the daily brief when you want AI commentary aligned to the newest data.
            </div>
          ) : null}
          <div className="grid grid-cols-1 xl:grid-cols-[0.62fr_1.38fr]" style={{ borderColor: B }}>
          <div className="relative min-h-[560px] overflow-hidden border-b px-6 py-8 xl:border-b-0 xl:border-r" style={{ borderColor: B }}>
            <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 26% 18%, rgba(0,145,255,0.24), transparent 28%), radial-gradient(circle at 76% 72%, rgba(214,132,31,0.18), transparent 34%), linear-gradient(145deg, #030404 0%, #080b0d 52%, #020202 100%)" }} />
            <div className="absolute inset-0 opacity-[0.16]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)", backgroundSize: "42px 42px" }} />
            <div className="absolute inset-x-[-12%] bottom-[-12%] h-[46%] rotate-[-6deg] opacity-70">
              {Array.from({ length: 14 }).map((_, index) => (
                <div
                  key={`desk-circuit-h-${index}`}
                  className="absolute h-px"
                  style={{
                    left: `${index % 3 === 0 ? 0 : 8}%`,
                    right: `${index % 4 === 0 ? 4 : 18}%`,
                    top: `${index * 7}%`,
                    background: index % 5 === 0 ? "rgba(214,132,31,0.55)" : "rgba(255,255,255,0.13)",
                  }}
                />
              ))}
              {Array.from({ length: 11 }).map((_, index) => (
                <div
                  key={`desk-circuit-v-${index}`}
                  className="absolute w-px"
                  style={{
                    left: `${8 + index * 8}%`,
                    top: `${index % 2 === 0 ? 4 : 20}%`,
                    bottom: `${index % 3 === 0 ? 12 : 0}%`,
                    background: index % 4 === 0 ? "rgba(0,145,255,0.42)" : "rgba(255,255,255,0.12)",
                  }}
                />
              ))}
              {Array.from({ length: 18 }).map((_, index) => (
                <span
                  key={`desk-node-${index}`}
                  className="absolute h-2 w-2 rounded-full"
                  style={{
                    left: `${5 + ((index * 17) % 86)}%`,
                    top: `${8 + ((index * 23) % 74)}%`,
                    background: index % 4 === 0 ? "rgba(214,132,31,0.9)" : "rgba(255,255,255,0.22)",
                    boxShadow: index % 4 === 0 ? "0 0 18px rgba(214,132,31,0.4)" : "none",
                  }}
                />
              ))}
            </div>
            <div className="absolute left-8 right-8 top-28 h-28 opacity-50">
              {Array.from({ length: 34 }).map((_, index) => {
                const height = 18 + ((index * 19) % 86);
                return (
                  <span
                    key={`desk-bars-${index}`}
                    className="absolute bottom-0 w-[3px]"
                    style={{
                      left: `${index * 3}%`,
                      height: `${height}%`,
                      background: index % 7 === 0 ? "rgba(0,145,255,0.58)" : "rgba(255,255,255,0.1)",
                    }}
                  />
                );
              })}
            </div>
            <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.58) 72%, rgba(0,0,0,0.88))" }} />
            <div className="relative z-10 flex h-full flex-col justify-between">
              <div>
                <p className="text-[11px] font-mono uppercase tracking-[0.35em]" style={{ color: "var(--foreground-faint)" }}>
                  Narralytica Desk
                </p>
                <p className="mt-3 text-[11px] font-mono uppercase tracking-[0.22em]" style={{ color: "var(--foreground-faint)" }}>
                  {brief.valid_for_date}
                </p>
              </div>
              <div>
                <h2 className="max-w-md text-[34px] font-mono font-bold leading-tight md:text-[44px]" style={{ color: "var(--foreground)" }}>
                  {readableHeadline}
                </h2>
                <p className="mt-5 max-w-md text-[12px] font-mono leading-relaxed" style={{ color: "var(--foreground-muted)" }}>
                  {readableSubheadline}
                </p>
                <div className="mt-7 inline-flex border px-4 py-2 text-[10px] font-mono uppercase tracking-[0.18em]" style={{ borderColor: B, color: "var(--foreground-faint)" }}>
                  AI brief: {brief.headline}
                </div>
                <div className="mt-8 grid grid-cols-2 gap-px">
                  <div className="border px-3 py-3" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
                    <DataCell label="BTC" value={`${money(btc.price)} ${pct(btc.changePct24h)}`} tone={n(btc.changePct24h) != null && n(btc.changePct24h)! >= 0 ? "up" : "down"} />
                  </div>
                  <div className="border px-3 py-3" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
                    <DataCell label="ETH" value={`${money(eth.price)} ${pct(eth.changePct24h)}`} tone={n(eth.changePct24h) != null && n(eth.changePct24h)! >= 0 ? "up" : "down"} />
                  </div>
                  <div className="border px-3 py-3" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
                    <DataCell label="Fear Greed" value={`${compact(fearGreed.latest)} / 100`} />
                  </div>
                  <div className="border px-3 py-3" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
                    <DataCell label="Mcap" value={`${money(marketCap.latest)} ${pct(marketCap.dayChangePct)}`} tone={n(marketCap.dayChangePct) != null && n(marketCap.dayChangePct)! >= 0 ? "up" : "down"} />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div>
            <div className="grid grid-cols-2 border-b md:grid-cols-4 xl:grid-cols-7" style={{ borderColor: B }}>
              {heat.map((item) => {
                const color = item.tone === "up" ? "var(--bull)" : item.tone === "down" ? "var(--bear)" : item.tone === "neutral" ? "#d6841f" : "var(--foreground-faint)";
                return (
                  <div key={`desk-heat-${item.label}`} className="border-r px-4 py-4 last:border-r-0" style={{ borderColor: B }}>
                    <p className="text-[10px] font-mono uppercase tracking-[0.14em]" style={{ color: "var(--foreground-faint)" }}>{item.label}</p>
                    <p className="mt-2 truncate text-[12px] font-mono font-bold tabular-nums uppercase" style={{ color }}>{item.value}</p>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_0.95fr]" style={{ borderColor: B }}>
              <div className="border-b xl:border-b-0 xl:border-r" style={{ borderColor: B }}>
                <div className="border-b px-6 py-7" style={{ borderColor: B }}>
                  <p className="mb-5 text-[11px] font-mono uppercase tracking-[0.24em]" style={{ color: "var(--bear)" }}>
                    What's New
                  </p>
                  <div className="grid gap-4">
                    {(brief.whats_new ?? []).map((item: any, index: number) => {
                      const color = item.tone === "green" ? "var(--bull)" : item.tone === "red" ? "var(--bear)" : "#d6841f";
                      return (
                        <div key={`brief-new-${index}`} className="grid grid-cols-[10px_1fr] gap-4">
                          <span className="mt-2 h-2 w-2 rounded-full" style={{ background: color }} />
                          <div>
                            <p className="text-[15px] font-mono leading-relaxed" style={{ color: "var(--foreground)" }}>{item.text}</p>
                            <p className="mt-1 text-[10px] font-mono uppercase tracking-[0.14em]" style={{ color: "var(--foreground-faint)" }}>{item.source}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="px-6 py-7">
                  <p className="mb-4 text-[11px] font-mono uppercase tracking-[0.22em]" style={{ color: "#d6841f" }}>
                    Market Setup
                  </p>
                  <div className="border px-5 py-5" style={{ borderColor: B, background: "rgba(255,255,255,0.02)" }}>
                    <p className="text-[13px] font-mono font-bold uppercase tracking-[0.12em]" style={{ color: "var(--foreground)" }}>
                      {brief.trade_setup?.title ?? "Daily desk brief"}
                    </p>
                    <p className="mt-4 whitespace-pre-line text-[13px] font-mono leading-relaxed" style={{ color: "var(--foreground-muted)" }}>
                      {brief.trade_setup?.analysis}
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <div className="border-b px-6 py-7" style={{ borderColor: B }}>
                  <p className="mb-4 text-[11px] font-mono uppercase tracking-[0.22em]" style={{ color: "var(--accent)" }}>
                    Watchlist Matrix
                  </p>
                  <div className="border" style={{ borderColor: B }}>
                    <div className="grid grid-cols-[72px_1fr_auto] gap-3 border-b px-3 py-2 text-[10px] font-mono uppercase tracking-[0.12em]" style={{ borderColor: B, color: "var(--foreground-faint)" }}>
                      <span>Asset</span>
                      <span>Watch</span>
                      <span>Risk</span>
                    </div>
                    {(brief.trade_setup?.watchlist ?? []).slice(0, 6).map((token: any) => (
                      <div key={`brief-watch-${token.symbol}`} className="grid grid-cols-[72px_1fr_auto] gap-3 border-b px-3 py-3 text-[11px] font-mono last:border-b-0" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                        <span className="font-bold" style={{ color: "var(--foreground)" }}>{token.symbol}</span>
                        <span className="min-w-0" style={{ color: "var(--foreground-muted)" }}>
                          <span style={{ color: "var(--foreground)" }}>{token.watch_for}</span>
                          <span className="mt-1 block truncate" style={{ color: "var(--foreground-faint)" }}>{token.reason}</span>
                        </span>
                        <span className="max-w-[120px] truncate text-right" style={{ color: "var(--bear)" }}>{token.risk}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="px-6 py-7">
                  <p className="mb-4 text-[11px] font-mono uppercase tracking-[0.22em]" style={{ color: "var(--foreground-faint)" }}>
                    Risk Notes
                  </p>
                  <div className="grid gap-3">
                    {(brief.risk_notes ?? []).slice(0, 4).map((note: string, index: number) => (
                      <div key={`risk-note-${index}`} className="border-l-2 py-1 pl-4 text-[12px] font-mono leading-relaxed" style={{ borderColor: "var(--bear)", color: "var(--foreground-muted)" }}>
                        {note}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 border-t md:grid-cols-2" style={{ borderColor: B }}>
              <div className="border-b px-6 py-5 md:border-b-0 md:border-r" style={{ borderColor: B }}>
                <p className="mb-4 text-[11px] font-mono uppercase tracking-[0.18em]" style={{ color: "var(--foreground-faint)" }}>Catalyst Timeline</p>
                <div className="relative">
                  <div className="absolute bottom-4 left-0 right-0 hidden border-t md:block" style={{ borderColor: "rgba(255,255,255,0.12)" }} />
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    {(brief.week_ahead ?? []).slice(0, 4).map((item: any, index: number) => {
                      const high = item.importance === "high";
                      return (
                        <div key={`brief-week-${index}`} className="relative border px-3 py-3" style={{ borderColor: high ? "rgba(239,68,68,0.35)" : B, background: high ? "rgba(239,68,68,0.06)" : "transparent" }}>
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <span className="text-[10px] font-mono font-bold uppercase" style={{ color: "var(--foreground-faint)" }}>{dateLabel(item.date)}</span>
                            <span className="h-2 w-2 rounded-full" style={{ background: high ? "var(--bear)" : "#d6841f" }} />
                          </div>
                          <p className="text-[12px] font-mono font-bold" style={{ color: "var(--foreground)" }}>{item.label}</p>
                          <p className="mt-2 line-clamp-2 text-[10px] font-mono leading-relaxed" style={{ color: "var(--foreground-muted)" }}>{item.detail}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="px-6 py-5">
                <p className="mb-3 text-[11px] font-mono uppercase tracking-[0.18em]" style={{ color: "var(--foreground-faint)" }}>Key Data</p>
                <div className="grid grid-cols-1 gap-px sm:grid-cols-2">
                  {(brief.key_data ?? []).slice(0, 6).map((item: any, index: number) => (
                    <div key={`brief-data-${index}`} className="border px-3 py-3" style={{ borderColor: B }}>
                      <div className="flex items-baseline justify-between gap-4">
                        <span className="text-[10px] font-mono uppercase tracking-[0.12em]" style={{ color: "var(--foreground-faint)" }}>{item.label}</span>
                        <span className="text-[12px] font-mono font-bold tabular-nums" style={{ color: "var(--foreground)" }}>{item.value}</span>
                      </div>
                      <p className="mt-2 truncate text-[10px] font-mono" style={{ color: "var(--foreground-muted)" }}>{item.context}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 border-b xl:grid-cols-[0.92fr_1.08fr]" style={{ borderColor: B }}>
        <div className="border-b px-5 py-6 xl:border-b-0 xl:border-r" style={{ borderColor: B }}>
          <div className="mb-5 flex items-center justify-between gap-4">
            <p className="text-[11px] font-mono uppercase tracking-[0.16em] font-bold" style={{ color: "var(--foreground-dim)" }}>Flow Vs Leverage</p>
            <p className="text-[10px] font-mono uppercase tracking-[0.14em]" style={{ color: "var(--foreground-faint)" }}>Spot demand / perp tape</p>
          </div>
          <div className="grid gap-4">
                {flows.slice(0, 4).map((flow: any) => {
                  const net = n(flow.dailyNetInflow);
                  const long = n(flow.longAccountShare);
                  const short = n(flow.shortAccountShare);
                  const aligned = (net ?? 0) >= 0 && (long ?? 0) >= 0.5;
                  return (
                    <div key={`desk-flow-${flow.asset}`} className="border px-4 py-4" style={{ borderColor: B }}>
                      <div className="flex items-baseline justify-between gap-4">
                        <span className="text-[12px] font-mono font-bold" style={{ color: "var(--foreground)" }}>{flow.asset}</span>
                        <span className="text-[10px] font-mono uppercase tracking-[0.14em]" style={{ color: aligned ? "var(--bull)" : "#d6841f" }}>{aligned ? "Aligned" : "Mixed"}</span>
                      </div>
                      <div className="mt-4 grid grid-cols-[92px_1fr] items-center gap-4">
                        <span className="text-[11px] font-mono font-bold tabular-nums" style={{ color: net != null && net < 0 ? "var(--bear)" : "var(--bull)" }}>{net != null && net > 0 ? "+" : ""}{money(net)}</span>
                        <div className="h-2 overflow-hidden border" style={{ borderColor: B }}>
                          <div className="h-full" style={{ width: `${Math.max(0, Math.min(100, (long ?? 0) * 100))}%`, background: "var(--bull)" }} />
                        </div>
                      </div>
                      <div className="mt-2 flex justify-between text-[10px] font-mono tabular-nums" style={{ color: "var(--foreground-faint)" }}>
                        <span>Flow</span>
                        <span>Long {long == null ? "--" : `${(long * 100).toFixed(1)}%`} / Short {short == null ? "--" : `${(short * 100).toFixed(1)}%`}</span>
                      </div>
                    </div>
                  );
                })}
          </div>
        </div>

        <div className="px-5 py-6">
          <p className="mb-4 text-[11px] font-mono uppercase tracking-[0.16em] font-bold" style={{ color: "var(--foreground-dim)" }}>Desk Watch</p>
          <div className="grid grid-cols-1 gap-px md:grid-cols-3">
            <div className="border px-4 py-4" style={{ borderColor: B }}>
              <DataCell label="Stablecoins" value={money(stable.latest)} tone={n(stable.dayChangePct) != null && n(stable.dayChangePct)! >= 0 ? "up" : "down"} />
              <p className="mt-3 text-[11px] font-mono tabular-nums" style={{ color: "var(--foreground-muted)" }}>1D {pct(stable.dayChangePct)}</p>
            </div>
            <div className="border px-4 py-4" style={{ borderColor: B }}>
              <DataCell label="Futures OI" value={money(latestOi.all)} tone={oiDelta != null && oiDelta >= 0 ? "up" : "down"} />
              <p className="mt-3 text-[11px] font-mono" style={{ color: "var(--foreground-muted)" }}>Delta {pct(oiDelta)}</p>
            </div>
            <div className="border px-4 py-4" style={{ borderColor: B }}>
              <DataCell label="Funding" value={pct(latestFunding.binance, 3)} tone={n(latestFunding.binance) != null && n(latestFunding.binance)! >= 0 ? "up" : "down"} />
              <p className="mt-3 text-[11px] font-mono" style={{ color: "var(--foreground-muted)" }}>Binance perp</p>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div>
              <p className="mb-3 text-[11px] font-mono uppercase tracking-[0.16em] font-bold" style={{ color: "var(--foreground-dim)" }}>Rotation</p>
              <div className="grid gap-2">
                {[...sectors.slice(0, 4), ...indices.slice(0, 3)].map((row: any, index: number) => {
                  const label = row.name ?? row.ticker ?? "Unknown";
                  const change = n(row.changePct24h);
                  return (
                    <div key={`desk-rotation-${label}-${index}`} className="grid grid-cols-[1fr_auto] border-t py-3" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                      <span className="text-[12px] font-mono uppercase" style={{ color: "var(--foreground)" }}>{label}</span>
                      <span className="text-[12px] font-mono font-bold tabular-nums" style={{ color: change != null && change >= 0 ? "var(--bull)" : "var(--bear)" }}>{pct(change)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="mb-3 text-[11px] font-mono uppercase tracking-[0.16em] font-bold" style={{ color: "var(--foreground-dim)" }}>Liquidity</p>
              <div className="grid gap-2">
            {liquidity.slice(0, 5).map((row: any) => {
              const imbalance = n(row.depthImbalancePct);
              return (
                <div key={`desk-liq-${row.asset}-${row.market}-${row.pair}`} className="border px-3 py-3" style={{ borderColor: B }}>
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="text-[12px] font-mono font-bold" style={{ color: "var(--foreground)" }}>{row.asset} <span style={{ color: "var(--foreground-faint)" }}>{row.market} {row.pair}</span></p>
                    <p className="text-[11px] font-mono tabular-nums" style={{ color: "var(--foreground-muted)" }}>{money(row.turnover24h)}</p>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-3">
                    <DataCell label="+2%" value={money(row.costToMoveUpUsd)} tone="up" />
                    <DataCell label="-2%" value={money(row.costToMoveDownUsd)} tone="down" />
                    <DataCell label="Skew" value={pct(imbalance)} tone={imbalance != null && imbalance >= 0 ? "up" : "down"} />
                  </div>
                </div>
              );
            })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[0.9fr_1.1fr]" style={{ borderColor: B }}>
        <div className="border-b px-5 py-6 xl:border-b-0 xl:border-r" style={{ borderColor: B }}>
          <p className="mb-4 text-[11px] font-mono uppercase tracking-[0.16em] font-bold" style={{ color: "var(--foreground-dim)" }}>Catalyst Queue</p>
          <div className="grid gap-3">
            {macro.slice(0, 4).map((day: any, index: number) => (
              <div key={`desk-macro-${day.date ?? index}`} className="grid grid-cols-[72px_1fr] gap-4 border-t py-3" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <span className="text-[11px] font-mono font-bold" style={{ color: "var(--foreground)" }}>{dateLabel(day.date)}</span>
                <div className="space-y-2">
                  {(day.events ?? []).slice(0, 2).map((event: any) => (
                    <p key={`${day.date}-${event.name}`} className="text-[11px] font-mono leading-relaxed" style={{ color: "var(--foreground-muted)" }}>
                      <span style={{ color: "var(--foreground)" }}>{event.name}</span> actual {macroValue(event.actual)} / forecast {macroValue(event.forecast)}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="px-5 py-6">
          <p className="mb-4 text-[11px] font-mono uppercase tracking-[0.16em] font-bold" style={{ color: "var(--foreground-dim)" }}>TradFi Proxy</p>
          <div className="grid grid-cols-1 gap-px md:grid-cols-3">
            {stocks.slice(0, 6).map((stock: any) => (
              <div key={`desk-stock-${stock.ticker}`} className="border px-4 py-4" style={{ borderColor: B }}>
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-[12px] font-mono font-bold" style={{ color: "var(--foreground)" }}>{stock.ticker}</span>
                  <span className="text-[12px] font-mono font-bold tabular-nums" style={{ color: "var(--foreground)" }}>{money(stock.price)}</span>
                </div>
                <p className="mt-2 truncate text-[10px] font-mono" style={{ color: "var(--foreground-faint)" }}>{stock.name}</p>
                <p className="mt-3 text-[11px] font-mono tabular-nums" style={{ color: "var(--foreground-muted)" }}>Turnover {money(stock.turnover)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StructureView({ structure }: { structure: any }) {
  const [indexSort, setIndexSort] = useState<"changePct24h" | "roi7d" | "roi1m" | "ytd">("changePct24h");
  const latestOi = structure?.futuresOpenInterest?.[0] ?? {};
  const latestFunding = structure?.fundingRate?.[0] ?? {};
  const funding = n(latestFunding.binance);
  const indices = [...(structure?.indexLeadership ?? [])].sort((a: any, b: any) => (n(b[indexSort]) ?? -Infinity) - (n(a[indexSort]) ?? -Infinity));
  const liquidityRows = Object.entries(structure?.liquidity ?? {}).flatMap(([asset, pairs]) =>
    (pairs as any[]).slice(0, 3).map((pair) => ({ asset, ...pair }))
  );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[0.95fr_1.05fr]" style={{ borderColor: B }}>
      <div className="border-b xl:border-b-0 xl:border-r" style={{ borderColor: B }}>
        <div className="grid grid-cols-1 border-b md:grid-cols-2" style={{ borderColor: B }}>
          <div className="border-b px-5 py-6 md:border-b-0 md:border-r" style={{ borderColor: B }}>
            <div className="flex items-start justify-between gap-4">
              <DataCell label="Total Futures OI" value={money(latestOi.all)} />
              <p className="text-[10px] font-mono uppercase tracking-[0.14em]" style={{ color: "var(--foreground-faint)" }}>
                All venues
              </p>
            </div>
            <TrendArea rows={structure?.futuresOpenInterest ?? []} field="all" tone="neutral" />
          </div>
          <div className="px-5 py-6">
            <div className="flex items-start justify-between gap-4">
              <DataCell label="Binance Funding" value={pct(latestFunding.binance, 3)} tone={funding != null && funding >= 0 ? "up" : "down"} />
              <p className="text-[10px] font-mono uppercase tracking-[0.14em]" style={{ color: "var(--foreground-faint)" }}>
                Perpetuals
              </p>
            </div>
            <TrendArea rows={structure?.fundingRate ?? []} field="binance" tone={funding != null && funding >= 0 ? "up" : "down"} />
          </div>
        </div>

        <div className="px-5 py-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <p className="text-[11px] font-mono uppercase tracking-[0.16em] font-bold" style={{ color: "var(--foreground-dim)" }}>Liquidity Map</p>
            <p className="text-[10px] font-mono uppercase tracking-[0.14em]" style={{ color: "var(--foreground-faint)" }}>Turnover / +/-2%</p>
          </div>
          <div className="border" style={{ borderColor: B }}>
            <div className="grid grid-cols-[0.55fr_1fr_auto_auto_auto] gap-3 border-b px-3 py-2 text-[10px] font-mono uppercase tracking-[0.12em]" style={{ borderColor: B, color: "var(--foreground-faint)" }}>
              <span>Asset</span>
              <span>Venue Pair</span>
              <span>Volume</span>
              <span>Up</span>
              <span>Down</span>
            </div>
            {liquidityRows.slice(0, 10).map((pair: any) => (
              <div key={`${pair.asset}-${pair.market}-${pair.target}`} className="grid grid-cols-[0.55fr_1fr_auto_auto_auto] gap-3 border-b px-3 py-3 text-[11px] font-mono last:border-b-0" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <span className="font-bold" style={{ color: "var(--foreground)" }}>{pair.asset}</span>
                <span className="truncate" style={{ color: "var(--foreground-muted)" }}>{pair.market} {pair.base}/{pair.target}</span>
                <span className="tabular-nums" style={{ color: "var(--foreground)" }}>{money(pair.turnover24h)}</span>
                <span className="tabular-nums" style={{ color: "var(--bull)" }}>{money(pair.costToMoveUpUsd)}</span>
                <span className="tabular-nums" style={{ color: "var(--bear)" }}>{money(pair.costToMoveDownUsd)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-5 py-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <p className="text-[11px] font-mono uppercase tracking-[0.16em] font-bold" style={{ color: "var(--foreground-dim)" }}>SoSoValue Indices</p>
          <div className="flex border" style={{ borderColor: B }}>
            {([
              ["changePct24h", "24H"],
              ["roi7d", "7D"],
              ["roi1m", "1M"],
              ["ytd", "YTD"],
            ] as const).map(([key, label]) => {
              const active = indexSort === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setIndexSort(key)}
                  className="border-r px-3 py-2 text-[10px] font-mono font-bold uppercase tracking-[0.14em] last:border-r-0"
                  style={{
                    borderColor: B,
                    color: active ? "var(--foreground)" : "var(--foreground-faint)",
                    background: active ? "var(--surface-2)" : "transparent",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2">
          {indices.map((index: any) => (
            <div key={index.ticker} className="border-b border-r px-5 py-5 md:odd:border-r" style={{ borderColor: B }}>
              <div className="flex items-baseline justify-between gap-5">
                <span className="text-[13px] font-mono font-bold" style={{ color: "var(--foreground)" }}>{index.ticker}</span>
                <span className="text-[12px] font-mono font-bold tabular-nums" style={{ color: n(index.changePct24h) != null && n(index.changePct24h)! >= 0 ? "var(--bull)" : "var(--bear)" }}>{pct(index.changePct24h)}</span>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-5">
                <DataCell label="7D" value={pct(index.roi7d)} />
                <DataCell label="1M" value={pct(index.roi1m)} />
                <DataCell label="YTD" value={pct(index.ytd)} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EventsView({ news, macro }: { news: any; macro: any }) {
  const [expandedNewsId, setExpandedNewsId] = useState<string | null>(null);
  const calendar = macro?.calendar ?? [];
  const eventHistory = macro?.eventHistory ?? {};
  const hotNews = (news?.hot ?? []).slice(0, 10);

  return (
    <div style={{ borderColor: B }}>
      <div className="border-b px-5 py-8 lg:px-7 lg:py-10" style={{ borderColor: B }}>
        <div className="mb-10">
          <p className="text-[11px] font-mono uppercase tracking-[0.18em] font-bold" style={{ color: "var(--foreground-dim)" }}>
            Macro Calendar
          </p>
          <p className="mt-2 text-[18px] font-mono font-bold" style={{ color: "var(--foreground)" }}>
            Upcoming market catalysts
          </p>
        </div>
        <div className="relative">
          <div className="absolute left-0 right-0 top-[74px] hidden border-t border-dashed md:block" style={{ borderColor: "rgba(255,255,255,0.16)" }} />
          <div className="grid grid-cols-1 gap-7 md:grid-cols-2 xl:grid-cols-5">
          {calendar.slice(0, 5).map((day: any, index: number) => {
            const active = index === 0;
            const primaryEvent = day.events?.[0];
            const history = primaryEvent ? eventHistory[primaryEvent]?.[0] : null;
            return (
              <div key={day.date ?? index} className="relative min-h-52 text-center">
                <p className="text-[13px] font-mono font-bold" style={{ color: active ? "var(--foreground)" : "var(--foreground-muted)" }}>
                  {dateLabel(day.date)}
                </p>
                <div className="relative z-10 mx-auto mt-5 flex h-9 w-9 items-center justify-center rounded-full border" style={{ borderColor: active ? "var(--accent)" : "rgba(255,255,255,0.18)", background: "var(--surface)" }}>
                  <span className="h-2 w-2 rounded-full" style={{ background: active ? "var(--accent)" : "rgba(255,255,255,0.42)" }} />
                </div>
                <div className="mx-auto mt-6 max-w-[210px] space-y-2">
                  {(day.events ?? []).slice(0, 3).map((event: string, eventIndex: number) => (
                    <p key={`${day.date}-${eventIndex}`} className="text-[11px] font-mono leading-relaxed" style={{ color: active ? "var(--foreground)" : "var(--foreground-muted)" }}>
                      {event}
                    </p>
                  ))}
                </div>
                {history ? (
                  <div className="mx-auto mt-5 grid max-w-[260px] grid-cols-3 gap-3 border-t pt-3" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                    {[
                      ["Actual", history.actual],
                      ["Forecast", history.forecast],
                      ["Prev", history.previous],
                    ].map(([label, value]) => (
                      <div key={String(label)} className="min-w-0">
                        <p className="text-[10px] font-mono uppercase tracking-[0.14em]" style={{ color: "var(--foreground-faint)" }}>
                          {String(label)}
                        </p>
                        <p className="mt-2 text-[12px] font-mono font-bold tabular-nums" style={{ color: "var(--foreground)" }}>
                          {macroValue(value)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-5 text-[10px] font-mono uppercase tracking-[0.12em]" style={{ color: "var(--foreground-faint)" }}>
                    History pending
                  </p>
                )}
              </div>
            );
          })}
          </div>
        </div>
      </div>

      <div className="px-5 py-6 lg:px-7">
        <div className="mb-5 flex items-center justify-between gap-4">
          <p className="text-[11px] font-mono uppercase tracking-[0.16em] font-bold" style={{ color: "var(--foreground-dim)" }}>
            Hot News
          </p>
          <p className="text-[10px] font-mono uppercase tracking-[0.14em]" style={{ color: "var(--foreground-faint)" }}>
            Scroll horizontal
          </p>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4 [scrollbar-color:rgba(255,255,255,0.2)_transparent]">
          {hotNews.map((item: any) => {
            const expanded = expandedNewsId === item.id;
            const body = item.content ?? item.contentExcerpt ?? "No summary available.";
            return (
              <article
                key={item.id}
                className="flex min-h-72 w-[310px] shrink-0 flex-col border bg-black/10 md:w-[360px]"
                style={{ borderColor: expanded ? "rgba(255,255,255,0.28)" : B }}
              >
                <button
                  type="button"
                  onClick={() => setExpandedNewsId(expanded ? null : item.id)}
                  className="flex flex-1 flex-col px-5 py-5 text-left transition-colors hover:bg-white/[0.03]"
                >
                  <div className="mb-5 flex items-start justify-between gap-5">
                    <span className="text-[10px] font-mono uppercase tracking-[0.14em]" style={{ color: "var(--foreground-faint)" }}>
                      {dateLabel(item.timestampIso)}
                    </span>
                    <span className="text-[16px] leading-none" style={{ color: "var(--foreground-faint)" }}>
                      {expanded ? "x" : "+"}
                    </span>
                  </div>
                  <p className="text-[14px] font-mono font-bold leading-relaxed" style={{ color: "var(--foreground)" }}>
                    {item.title || "Untitled update"}
                  </p>
                  <p className={`mt-5 text-[11px] font-mono leading-relaxed ${expanded ? "" : "line-clamp-5"}`} style={{ color: "var(--foreground-muted)" }}>
                    {body}
                  </p>
                </button>
                {item.sourceLink ? (
                  <div className="border-t px-5 py-3" style={{ borderColor: B }}>
                    <a href={item.sourceLink} target="_blank" rel="noreferrer" className="text-[10px] font-mono uppercase tracking-[0.14em] transition-colors hover:text-white" style={{ color: "var(--foreground-faint)" }}>
                      Source
                    </a>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function FlowBars({ rows, field }: { rows: Record<string, unknown>[]; field: string }) {
  const values = rows
    .map((row) => ({ label: dateLabel(String(row.date ?? row.timestampIso ?? "")), value: n(row[field]) }))
    .filter((row): row is { label: string; value: number } => row.value != null)
    .reverse();
  const max = Math.max(...values.map((row) => Math.abs(row.value)), 1);

  if (values.length < 2) return <div className="mt-5 h-20 border-t" style={{ borderColor: B }} />;

  return (
    <div className="mt-5 grid h-24 grid-flow-col items-end gap-1 border-t pt-4" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
      {values.map((row, index) => {
        const height = Math.max(6, (Math.abs(row.value) / max) * 72);
        const positive = row.value >= 0;
        return (
          <div key={`${row.label}-${index}`} className="flex h-full min-w-0 flex-col justify-end gap-2">
            <div className="mx-auto w-full max-w-7 border" style={{ height, borderColor: positive ? "rgba(34,197,94,0.34)" : "rgba(239,68,68,0.34)", background: positive ? "rgba(34,197,94,0.58)" : "rgba(239,68,68,0.58)" }} />
            <span className="truncate text-center text-[9px] font-mono" style={{ color: "var(--foreground-faint)" }}>{row.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function SupplyDonut({ unlocked, locked }: { unlocked: unknown; locked: unknown }) {
  const unlockedValue = Math.max(0, n(unlocked) ?? 0);
  const lockedValue = Math.max(0, n(locked) ?? 0);
  const total = unlockedValue + lockedValue || 1;
  const unlockedPct = unlockedValue / total;
  const radius = 34;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="relative h-28 w-28 shrink-0">
      <svg viewBox="0 0 96 96" className="h-28 w-28 rotate-[-90deg]">
        <circle cx="48" cy="48" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
        <circle cx="48" cy="48" r={radius} fill="none" stroke="var(--bull)" strokeWidth="10" strokeDasharray={`${circumference * unlockedPct} ${circumference}`} strokeLinecap="round" />
        <circle cx="48" cy="48" r={radius - 12} fill="none" stroke="var(--bear)" strokeWidth="4" strokeDasharray={`${circumference * (1 - unlockedPct)} ${circumference}`} opacity="0.72" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[18px] font-mono font-bold tabular-nums" style={{ color: "var(--foreground)" }}>{Math.round(unlockedPct * 100)}%</span>
        <span className="text-[9px] font-mono uppercase tracking-[0.14em]" style={{ color: "var(--foreground-faint)" }}>Free</span>
      </div>
    </div>
  );
}

function AnalysisView({ analysis }: { analysis: any }) {
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const flowAssets = analysis?.flowLens?.assets ?? [];
  const macroEvents = analysis?.macroShock?.events ?? [];
  const unlockAssets = analysis?.unlockSupply?.assets ?? [];
  const indices = analysis?.sectorRotation?.indices ?? [];
  const activeToken = unlockAssets.find((asset: any) => asset.asset === selectedToken) ?? unlockAssets[0] ?? {};
  const maxSurprise = Math.max(...macroEvents.map((event: any) => Math.abs(n(event.surprise) ?? 0)), 0.01);
  const maxUnlock = Math.max(...(activeToken.nextUnlocks ?? []).map((unlock: any) => n(unlock.totalAmount) ?? 0), 1);

  useEffect(() => {
    if (!selectedToken && unlockAssets[0]?.asset) setSelectedToken(unlockAssets[0].asset);
  }, [selectedToken, unlockAssets]);

  return (
    <div style={{ borderColor: B }}>
      <div className="grid grid-cols-1 border-b xl:grid-cols-[0.95fr_1.05fr]" style={{ borderColor: B }}>
        <div className="border-b px-5 py-6 xl:border-b-0 xl:border-r" style={{ borderColor: B }}>
          <div className="mb-5 flex items-center justify-between gap-4">
            <p className="text-[11px] font-mono uppercase tracking-[0.16em] font-bold" style={{ color: "var(--foreground-dim)" }}>ETF Flow Lens</p>
            <p className="text-[10px] font-mono uppercase tracking-[0.14em]" style={{ color: "var(--foreground-faint)" }}>Net assets / flow</p>
          </div>
          <div className="grid grid-cols-1 gap-px md:grid-cols-2">
            {flowAssets.slice(0, 6).map((asset: any) => {
              const latestFlow = n(asset.dailyNetInflow);
              const netAssets = n(asset.totalNetAssets);
              const flowIntensity = latestFlow != null && netAssets ? latestFlow / netAssets : null;
              return (
                <div key={`flow-lens-${asset.asset}`} className="border px-4 py-4" style={{ borderColor: B }}>
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-[13px] font-mono font-bold" style={{ color: "var(--foreground)" }}>{asset.asset}</span>
                    <span className="text-[12px] font-mono font-bold tabular-nums" style={{ color: latestFlow == null ? "var(--foreground)" : latestFlow >= 0 ? "var(--bull)" : "var(--bear)" }}>
                      {latestFlow != null && latestFlow > 0 ? "+" : ""}{money(latestFlow)}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <DataCell label="Assets" value={money(asset.totalNetAssets)} />
                    <DataCell label="Intensity" value={pct(flowIntensity, 3)} tone={flowIntensity == null ? "muted" : flowIntensity >= 0 ? "up" : "down"} />
                  </div>
                  <FlowBars rows={asset.history ?? []} field="totalNetInflow" />
                </div>
              );
            })}
          </div>
        </div>

        <div className="px-5 py-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <p className="text-[11px] font-mono uppercase tracking-[0.16em] font-bold" style={{ color: "var(--foreground-dim)" }}>Macro Surprise Tracker</p>
            <p className="text-[10px] font-mono uppercase tracking-[0.14em]" style={{ color: "var(--foreground-faint)" }}>Actual vs forecast</p>
          </div>
          <div className="border" style={{ borderColor: B }}>
            <div className="grid grid-cols-[86px_1fr_92px_auto] gap-3 border-b px-3 py-2 text-[10px] font-mono uppercase tracking-[0.12em]" style={{ borderColor: B, color: "var(--foreground-faint)" }}>
              <span>Date</span>
              <span>Event</span>
              <span>Magnitude</span>
              <span>Surprise</span>
            </div>
            {macroEvents.slice(0, 10).map((event: any, index: number) => {
              const surprise = n(event.surprise);
              const surpriseWidth = Math.max(4, ((Math.abs(surprise ?? 0) / maxSurprise) * 100));
              return (
                <div key={`macro-surprise-${event.event ?? index}`} className="grid grid-cols-[86px_1fr_92px_auto] items-center gap-3 border-b px-3 py-3 text-[11px] font-mono last:border-b-0" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                  <span className="tabular-nums" style={{ color: "var(--foreground-muted)" }}>{dateLabel(event.date)}</span>
                  <span className="truncate" style={{ color: "var(--foreground)" }}>{event.event} <span style={{ color: "var(--foreground-faint)" }}>({macroValue(event.actual)})</span></span>
                  <span className="h-2 border" style={{ borderColor: B, background: "rgba(255,255,255,0.04)" }}>
                    <span className="block h-full" style={{ width: `${surpriseWidth}%`, background: surprise == null ? "rgba(255,255,255,0.16)" : surprise >= 0 ? "var(--bull)" : "var(--bear)" }} />
                  </span>
                  <span className="tabular-nums font-bold" style={{ color: surprise == null ? "var(--foreground-faint)" : surprise >= 0 ? "var(--bull)" : "var(--bear)" }}>{pct(surprise)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.05fr_0.95fr]" style={{ borderColor: B }}>
        <div className="border-b px-5 py-6 xl:border-b-0 xl:border-r" style={{ borderColor: B }}>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <p className="text-[11px] font-mono uppercase tracking-[0.16em] font-bold" style={{ color: "var(--foreground-dim)" }}>Tokenomics Risk</p>
            <div className="flex flex-wrap border" style={{ borderColor: B }}>
              {unlockAssets.slice(0, 6).map((asset: any) => {
                const active = activeToken.asset === asset.asset;
                return (
                  <button
                    key={`token-risk-${asset.asset}`}
                    type="button"
                    onClick={() => setSelectedToken(asset.asset)}
                    className="border-r px-3 py-2 text-[10px] font-mono font-bold uppercase tracking-[0.14em] last:border-r-0"
                    style={{
                      borderColor: B,
                      color: active ? "var(--foreground)" : "var(--foreground-faint)",
                      background: active ? "var(--surface-2)" : "transparent",
                    }}
                  >
                    {asset.asset}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-[0.9fr_1.1fr]">
            <div className="border px-4 py-4" style={{ borderColor: B }}>
              <div className="flex items-start justify-between gap-5">
                <div>
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-[18px] font-mono font-bold" style={{ color: "var(--foreground)" }}>{activeToken.asset ?? "--"}</span>
                    <span className="text-[10px] font-mono uppercase tracking-[0.14em]" style={{ color: "var(--foreground-faint)" }}>Unlocks</span>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-4">
                    <DataCell label="Unlocked" value={tokenAmount(activeToken.unlocked)} />
                    <DataCell label="Locked" value={tokenAmount(activeToken.totalLocked)} />
                  </div>
                </div>
                <SupplyDonut unlocked={activeToken.unlocked} locked={activeToken.totalLocked} />
              </div>
              <div className="mt-5 space-y-3">
                {(activeToken.topAllocations ?? []).slice(0, 4).map((row: any, index: number) => (
                  <div key={`allocation-${activeToken.asset}-${row.holder ?? index}`}>
                    <div className="mb-1 flex justify-between gap-4 text-[10px] font-mono" style={{ color: "var(--foreground-faint)" }}>
                      <span className="truncate">{row.holder ?? "Holder"}</span>
                      <span>{compact(row.percentage)}%</span>
                    </div>
                    <div className="h-1 border" style={{ borderColor: B, background: "rgba(255,255,255,0.04)" }}>
                      <div className="h-full" style={{ width: `${Math.min(100, n(row.percentage) ?? 0)}%`, background: "var(--accent)" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="border" style={{ borderColor: B }}>
              <div className="grid grid-cols-[92px_1fr_112px_auto] gap-3 border-b px-3 py-2 text-[10px] font-mono uppercase tracking-[0.12em]" style={{ borderColor: B, color: "var(--foreground-faint)" }}>
                <span>Date</span>
                <span>Batch</span>
                <span>Size</span>
                <span>Amount</span>
              </div>
              {(activeToken.nextUnlocks ?? []).slice(0, 6).map((unlock: any, index: number) => {
                const unlockAmount = n(unlock.totalAmount) ?? 0;
                return (
                <div key={`unlock-${activeToken.asset}-${unlock.timestamp ?? index}`} className="grid grid-cols-[92px_1fr_112px_auto] items-center gap-3 border-b px-3 py-3 text-[11px] font-mono last:border-b-0" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                  <span style={{ color: "var(--foreground-muted)" }}>{dateLabel(unlock.timestampIso)}</span>
                  <span className="truncate" style={{ color: "var(--foreground)" }}>{(unlock.vestings ?? []).map((item: any) => item.label).filter(Boolean).join(", ") || "Scheduled"}</span>
                  <span className="h-2 border" style={{ borderColor: B, background: "rgba(255,255,255,0.04)" }}>
                    <span className="block h-full" style={{ width: `${Math.max(4, (unlockAmount / maxUnlock) * 100)}%`, background: "#d6841f" }} />
                  </span>
                  <span className="tabular-nums font-bold" style={{ color: "var(--foreground)" }}>{tokenAmount(unlock.totalAmount)}</span>
                </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="px-5 py-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <p className="text-[11px] font-mono uppercase tracking-[0.16em] font-bold" style={{ color: "var(--foreground-dim)" }}>Index Constituents</p>
            <p className="text-[10px] font-mono uppercase tracking-[0.14em]" style={{ color: "var(--foreground-faint)" }}>Narrative weights</p>
          </div>
          <div className="grid grid-cols-1 gap-px md:grid-cols-2">
            {indices.slice(0, 6).map((index: any) => (
              <div key={`index-constituents-${index.ticker}`} className="border px-4 py-4" style={{ borderColor: B }}>
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-[12px] font-mono font-bold" style={{ color: "var(--foreground)" }}>{index.ticker}</span>
                  <span className="text-[11px] font-mono font-bold tabular-nums" style={{ color: n(index.changePct24h) != null && n(index.changePct24h)! >= 0 ? "var(--bull)" : "var(--bear)" }}>{pct(index.changePct24h)}</span>
                </div>
                <div className="mt-4 space-y-2">
                  {(index.topConstituents ?? []).slice(0, 5).map((item: any, itemIndex: number) => {
                    const weight = n(item.weight) ?? 0;
                    return (
                    <div key={`${index.ticker}-${item.symbol ?? itemIndex}`} className="grid grid-cols-[62px_1fr_auto] items-center gap-3 text-[11px] font-mono">
                      <span className="truncate" style={{ color: "var(--foreground-muted)" }}>{item.symbol ?? "--"}</span>
                      <span className="h-1.5 border" style={{ borderColor: B, background: "rgba(255,255,255,0.04)" }}>
                        <span className="block h-full" style={{ width: `${Math.min(100, weight * 100)}%`, background: "var(--accent)" }} />
                      </span>
                      <span className="tabular-nums" style={{ color: "var(--foreground)" }}>{pct(item.weight)}</span>
                    </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function WatchView({ watchlist, analysis }: { watchlist: any; analysis?: any }) {
  const stockSectors = watchlist?.stockSectors ?? analysis?.cryptoStocksBridge?.sectors ?? [];
  const stocks = watchlist?.cryptoStocks ?? [];
  const treasuries = watchlist?.btcTreasuries ?? [];
  const totalBtc = treasuries.reduce((sum: number, company: any) => sum + (n(company.btcHolding) ?? 0), 0);
  const totalCost = treasuries.reduce((sum: number, company: any) => sum + (n(company.acquisitionCost) ?? 0), 0);
  const maxStockTurnover = Math.max(...stocks.map((stock: any) => n(stock.turnover) ?? 0), 1);
  const maxTreasuryHolding = Math.max(...treasuries.map((company: any) => n(company.btcHolding) ?? 0), 1);

  return (
    <div style={{ borderColor: B }}>
      <div className="grid grid-cols-1 border-b md:grid-cols-3" style={{ borderColor: B }}>
        <div className="border-b px-5 py-5 md:border-b-0 md:border-r" style={{ borderColor: B }}>
          <DataCell label="Tracked Equity Proxies" value={String(stocks.length)} />
        </div>
        <div className="border-b px-5 py-5 md:border-b-0 md:border-r" style={{ borderColor: B }}>
          <DataCell label="Tracked Treasury BTC" value={`${compact(totalBtc)} BTC`} />
        </div>
        <div className="px-5 py-5">
          <DataCell label="Recorded Cost Basis" value={money(totalCost)} />
        </div>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2" style={{ borderColor: B }}>
      <div className="border-b xl:border-b-0 xl:border-r" style={{ borderColor: B }}>
        <p className="border-b px-5 py-4 text-[11px] font-mono uppercase tracking-[0.16em] font-bold" style={{ borderColor: B, color: "var(--foreground-dim)" }}>Crypto Stocks</p>
        {stocks.map((stock: any) => {
          const turnover = n(stock.turnover) ?? 0;
          return (
          <div key={stock.ticker} className="border-b px-5 py-4" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4">
            <div>
              <p className="text-[12px] font-mono font-bold" style={{ color: "var(--foreground)" }}>{stock.ticker}</p>
              <p className="text-[10px] font-mono" style={{ color: "var(--foreground-faint)" }}>{stock.sector ?? stock.name}</p>
            </div>
            <span className="text-[12px] font-mono font-bold tabular-nums" style={{ color: "var(--foreground)" }}>{money(stock.price)}</span>
            <span className="text-[11px] font-mono tabular-nums" style={{ color: "var(--foreground-muted)" }}>{money(stock.turnover)}</span>
            <span className="text-[11px] font-mono tabular-nums" style={{ color: "var(--foreground-muted)" }}>P/B {compact(stock.pb)}</span>
          </div>
            <div className="mt-3 h-1.5 border" style={{ borderColor: B, background: "rgba(255,255,255,0.04)" }}>
              <div className="h-full" style={{ width: `${Math.max(3, (turnover / maxStockTurnover) * 100)}%`, background: "var(--accent)" }} />
            </div>
          </div>
          );
        })}
        {stockSectors.length > 0 ? (
          <div className="px-5 py-5">
            <p className="mb-3 text-[11px] font-mono uppercase tracking-[0.16em] font-bold" style={{ color: "var(--foreground-dim)" }}>Equity Proxy Sectors</p>
            <div className="grid grid-cols-1 gap-px md:grid-cols-2">
              {stockSectors.slice(0, 6).map((sector: any) => (
                <div key={`stock-sector-${sector.sectorName}`} className="border px-3 py-3" style={{ borderColor: B }}>
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="truncate text-[11px] font-mono uppercase" style={{ color: "var(--foreground)" }}>{sector.sectorName}</span>
                    <span className="text-[11px] font-mono font-bold tabular-nums" style={{ color: n(sector.changePct24h) != null && n(sector.changePct24h)! >= 0 ? "var(--bull)" : "var(--bear)" }}>{pct(sector.changePct24h)}</span>
                  </div>
                  <p className="mt-2 text-[10px] font-mono tabular-nums" style={{ color: "var(--foreground-faint)" }}>{money(sector.totalMarketCap)}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
      <div>
        <p className="border-b px-5 py-4 text-[11px] font-mono uppercase tracking-[0.16em] font-bold" style={{ borderColor: B, color: "var(--foreground-dim)" }}>BTC Treasuries</p>
        {treasuries.map((company: any) => {
          const holding = n(company.btcHolding) ?? 0;
          return (
          <div key={company.ticker} className="border-b px-5 py-4" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4">
            <div>
              <p className="text-[12px] font-mono font-bold" style={{ color: "var(--foreground)" }}>{company.ticker}</p>
              <p className="text-[10px] font-mono" style={{ color: "var(--foreground-faint)" }}>{company.name}</p>
            </div>
            <span className="text-[12px] font-mono font-bold tabular-nums" style={{ color: "var(--foreground)" }}>{compact(company.btcHolding)} BTC</span>
            <span className="text-[11px] font-mono tabular-nums" style={{ color: "var(--foreground-muted)" }}>{dateLabel(company.latestPurchaseDate)}</span>
            </div>
            <div className="mt-3 h-2 border" style={{ borderColor: B, background: "rgba(255,255,255,0.04)" }}>
              <div className="h-full" style={{ width: `${Math.max(3, (holding / maxTreasuryHolding) * 100)}%`, background: "rgba(247,147,26,0.78)" }} />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-4">
              <DataCell label="Acquired" value={`${compact(company.btcAcquired)} BTC`} />
              <DataCell label="Avg Cost" value={money(company.avgBtcCost)} />
              <DataCell label="Cost" value={money(company.acquisitionCost)} />
            </div>
            {(company.recentPurchases ?? []).length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {(company.recentPurchases ?? []).slice(0, 3).map((purchase: any, index: number) => (
                  <span key={`${company.ticker}-purchase-${purchase.date ?? index}`} className="border px-2 py-1 text-[10px] font-mono tabular-nums" style={{ borderColor: B, color: "var(--foreground-faint)" }}>
                    {dateLabel(purchase.date)} {compact(purchase.btcAcquired)} BTC
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}

export function MarketTerminal({ data }: { data: TerminalPayload | null }) {
  const [selectedAsset, setSelectedAsset] = useState("BTC");
  const assets = data?.overview?.assetBoard ?? [];
  const generatedAt = data?.manifest?.generated_at as string | undefined;

  if (!data) {
    return (
      <div className="px-6 py-8">
        <p className="text-[12px] font-mono uppercase tracking-[0.16em]" style={{ color: "var(--foreground-faint)" }}>
          Loading terminal data
        </p>
      </div>
    );
  }

  return (
    <section className="border-b" style={{ borderColor: B }}>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b px-4 py-4 sm:px-6" style={{ borderColor: B }}>
        <div>
          <p className="text-[11px] font-mono uppercase tracking-[0.18em] font-bold" style={{ color: "var(--foreground-dim)" }}>Market Context Terminal</p>
          <p className="mt-1 text-[12px] font-mono" style={{ color: "var(--foreground-faint)" }}>Updated {generatedAt ? new Date(generatedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "--"}</p>
        </div>
        <div className="flex flex-wrap gap-4 text-[11px] font-mono uppercase tracking-[0.16em]" style={{ color: "var(--foreground-faint)" }}>
          <a href="#pulse" className="transition-colors hover:text-white">Pulse</a>
          <a href="#structure" className="transition-colors hover:text-white">Structure</a>
          <a href="#analysis" className="transition-colors hover:text-white">Analysis</a>
          <a href="#events" className="transition-colors hover:text-white">Events</a>
          <a href="#watch" className="transition-colors hover:text-white">Watch</a>
        </div>
      </div>

      <TopContextSection
        data={data}
        assets={assets}
        selectedAsset={assets.some((asset: any) => asset.asset === selectedAsset) ? selectedAsset : (assets[0]?.asset ?? "BTC")}
        onSelectedAssetChange={setSelectedAsset}
      />
      <AssetTape assets={assets} />

      <SectionBlock id="pulse" label="Pulse">
        <PulseView overview={data.overview} />
      </SectionBlock>
      <SectionBlock id="structure" label="Structure">
        <StructureView structure={data.market_structure} />
      </SectionBlock>
      <SectionBlock id="analysis" label="Analysis">
        <AnalysisView analysis={data.analysis} />
      </SectionBlock>
      <SectionBlock id="events" label="Events">
        <EventsView news={data.news} macro={data.macro} />
      </SectionBlock>
      <SectionBlock id="watch" label="Watch">
        <WatchView watchlist={data.watchlist} analysis={data.analysis} />
      </SectionBlock>
    </section>
  );
}
