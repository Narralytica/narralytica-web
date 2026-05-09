"use client";

import { useEffect, useRef, useState } from "react";

interface Kline {
  s: string;
  t: number;
  o: string;
  c: string;
  h: string;
  l: string;
  a: string;
  v: string;
}

interface Candle {
  time: number;
  open: number;
  close: number;
  high: number;
  low: number;
  bullish: boolean;
}

interface NewsMarker {
  id: string;
  release_time: number;
  x?: number;
}

// Kline config per asset: { base, interval, limit, hasStartTime }
const KLINE_CONFIG: Record<string, { base: string; interval: string; limit: number; hasStartTime: boolean }> = {
  BTC:  { base: "https://mainnet-gw.sodex.dev/futures/fapi/market/v1/public/q/kline?symbol=BTC-USD", interval: "5m", limit: 500, hasStartTime: true },
  ETH:  { base: "https://mainnet-gw.sodex.dev/futures/fapi/market/v1/public/q/kline?symbol=ETH-USD", interval: "5m", limit: 500, hasStartTime: true },
  DOGE: { base: "https://mainnet-gw.sodex.dev/pro/p/quotation/kline?symbol=vDOGE_vUSDC", interval: "5m", limit: 500, hasStartTime: true },
  ADA:  { base: "https://mainnet-gw.sodex.dev/pro/p/quotation/kline?symbol=vADA_vUSDC", interval: "5m", limit: 500, hasStartTime: true },
  SOL:  { base: "https://mainnet-gw.sodex.dev/pro/p/quotation/kline?symbol=vSOL_vUSDC", interval: "5m", limit: 500, hasStartTime: true },
  SUI:  { base: "https://mainnet-gw.sodex.dev/pro/p/quotation/kline?symbol=vSUI_vUSDC", interval: "1m", limit: 1500, hasStartTime: false },
  BNB:  { base: "https://mainnet-gw.sodex.dev/pro/p/quotation/kline?symbol=vBNB_vUSDC", interval: "5m", limit: 500, hasStartTime: true },
  LINK: { base: "https://mainnet-gw.sodex.dev/pro/p/quotation/kline?symbol=vLINK_vUSDC", interval: "1m", limit: 1500, hasStartTime: false },
  XRP:  { base: "https://mainnet-gw.sodex.dev/pro/p/quotation/kline?symbol=vXRP_vUSDC", interval: "5m", limit: 500, hasStartTime: true },
  AVAX: { base: "https://mainnet-gw.sodex.dev/pro/p/quotation/kline?symbol=vAVAX_vUSDC", interval: "5m", limit: 500, hasStartTime: false },
  HBAR: { base: "https://mainnet-gw.sodex.dev/futures/fapi/market/v1/public/q/kline?symbol=HBAR-USD", interval: "5m", limit: 500, hasStartTime: false },
};

function getKlineUrl(asset: string): string | null {
  const config = KLINE_CONFIG[asset];
  if (!config) return null;
  
  const now = Date.now();
  let url = `${config.base}&interval=${config.interval}&limit=${config.limit}&endTime=${now}`;
  
  // For assets with startTime, calculate based on interval and limit
  if (config.hasStartTime) {
    const intervalMs = config.interval === "1m" ? 60000 : 300000; // 1min or 5min in ms
    const startTime = now - (config.limit * intervalMs);
    url += `&startTime=${startTime}`;
  }
  
  return url;
}

const BULL  = "#22c55e";
const BEAR  = "#ef4444";
const GRID  = "#161616";
const LABEL = "#444444";

const PAD_TOP   = 8;
const PAD_BOT   = 28;
const PAD_LEFT  = 0;
const PAD_RIGHT = 68;
const CHART_H   = 320;
const MOBILE_CHART_H = 260;

function fmtTime(ts: number) {
  return new Date(ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function fmtPrice(p: number) {
  return p >= 1000
    ? `$${Math.round(p)}`
    : `$${p.toFixed(2)}`;
}

interface PriceChartProps { 
  asset: string;
  newsMarkers?: NewsMarker[];
  hoveredNewsId?: string | null;
  onNewsHover?: (id: string | null) => void;
  compact?: boolean;
  compactHeight?: number;
  compactCandles?: number;
  compactChangePct?: number | null;
  onLatestPrice?: (price: number | null) => void;
}

export function PriceChart({
  asset,
  newsMarkers = [],
  hoveredNewsId,
  onNewsHover,
  compact = false,
  compactHeight = 300,
  compactCandles = 72,
  compactChangePct = null,
  onLatestPrice,
}: PriceChartProps) {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading]  = useState(true);
  const [error, setError]      = useState(false);
  const [width, setWidth]     = useState(0);
  const [hovered, setHovered] = useState<{ candle: Candle; x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Only measure width — height is fixed
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  // Fetch candles on mount and every 3 seconds
  useEffect(() => {
    let ignore = false;

    // Clear state when asset changes to prevent mixing data from different assets
    setCandles([]);
    setLoading(true);
    setError(false);

    // If no kline config for this asset, show placeholder
    if (!KLINE_CONFIG[asset]) {
      setLoading(false);
      return;
    }
    
    const fetchKlines = () => {
      const url = getKlineUrl(asset); 
      if (!url) return;
      
      fetch(url)
        .then(r => r.json())
        .then((json: { code: number; data: Kline[] }) => {
          if (ignore) return;
          if (json.code !== 0 || !json.data) { setError(true); return; }
          
          const sorted = [...json.data].sort((a, b) => a.t - b.t);
          const newCandles = sorted.map(k => {
            const o = parseFloat(k.o), c = parseFloat(k.c);
            return { time: k.t, open: o, close: c, high: parseFloat(k.h), low: parseFloat(k.l), bullish: c >= o };
          });
          
          setCandles((prev) => {
            // If the effect was cleaned up or asset changed, don't update with old data
            if (ignore) return prev;
            if (prev.length === 0) {
              setLoading(false);
              return newCandles;
            }
            // Polling update: merge with existing
            const map = new Map(prev.map(c => [c.time, c]));
            newCandles.forEach(c => map.set(c.time, c));
            return Array.from(map.values()).sort((a, b) => a.time - b.time);
          });
        })
        .catch(() => {
          if (ignore) return;
          setError(true);
        });
    };

    fetchKlines();
    const interval = setInterval(fetchKlines, 3000);
    
    return () => {
      ignore = true;
      clearInterval(interval);
    };
  }, [asset]);

  const display = candles.slice(-(compact ? compactCandles : 100));
  const lastCandle = display[display.length - 1] ?? null;
  const firstCandle = display[0] ?? null;
  const priceChange = lastCandle && firstCandle
    ? ((lastCandle.close - firstCandle.open) / firstCandle.open) * 100 : null;
  const isUp = priceChange !== null ? priceChange >= 0 : true;
  const compactIsUp = compactChangePct != null ? compactChangePct >= 0 : isUp;
  const compactTone = compactIsUp ? BULL : BEAR;

  useEffect(() => {
    onLatestPrice?.(lastCandle?.close ?? null);
  }, [lastCandle?.close, onLatestPrice]);

  // Price range
  const highs = display.map(d => d.high);
  const lows  = display.map(d => d.low);
  const rawMin = lows.length ? Math.min(...lows) : 0;
  const rawMax = highs.length ? Math.max(...highs) : 1;
  const pad = (rawMax - rawMin) * 0.06;
  const yMin = rawMin - pad;
  const yMax = rawMax + pad;

  const compactPadRight = 14;
  const compactPadBottom = 0;
  const chartH = compact ? (width > 0 && width < 640 ? Math.min(compactHeight, 180) : compactHeight) : width > 0 && width < 640 ? MOBILE_CHART_H : CHART_H;
  const rightPad = compact ? compactPadRight : PAD_RIGHT;
  const bottomPad = compact ? compactPadBottom : PAD_BOT;
  const drawW = Math.max(0, width - PAD_LEFT - rightPad);
  const effectiveDrawH = chartH - PAD_TOP - bottomPad;
  const toX = (i: number) => PAD_LEFT + (i / (display.length - 1 || 1)) * drawW;
  const toY = (price: number) => PAD_TOP + effectiveDrawH - ((price - yMin) / (yMax - yMin)) * effectiveDrawH;

  // Y-axis ticks — keep compact hero mode light, not empty.
  const yTickCount = compact ? 3 : 4;
  const yTicks = Array.from({ length: yTickCount }, (_, i) => yMin + (yMax - yMin) * (i / Math.max(1, yTickCount - 1)));
  // X-axis ticks — 5 evenly spaced
  const xTickCount = compact ? 3 : 5;
  const xTicks = Array.from({ length: xTickCount }, (_, i) =>
    Math.round((i / (xTickCount - 1)) * (display.length - 1))
  );

  const slotW   = display.length > 1 ? drawW / display.length : drawW;
  const candleW = compact ? Math.max(2, Math.min(6, slotW * 0.72)) : Math.max(1, slotW * 0.6);
  const closePoints = display.map((d, i) => ({ x: toX(i), y: toY(d.close), candle: d }));
  const linePath = closePoints.length
    ? closePoints.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ")
    : "";
  const areaPath = closePoints.length
    ? [
        `M ${closePoints[0].x} ${chartH - bottomPad}`,
        ...closePoints.map((point, index) => `${index === 0 ? "L" : "L"} ${point.x} ${point.y}`),
        `L ${closePoints[closePoints.length - 1].x} ${chartH - bottomPad}`,
        "Z",
      ].join(" ")
    : "";

  function onMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!display.length || !width) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left - PAD_LEFT;
    const idx = Math.round((mx / drawW) * (display.length - 1));
    const clamped = Math.max(0, Math.min(display.length - 1, idx));
    const candle = display[clamped];
    setHovered({ candle, x: toX(clamped), y: toY(candle.close) });
  }

  return (
    <div className="w-full" ref={containerRef}>
      {/* Price header */}
      {!compact ? (
      <div className="flex items-baseline gap-3 px-6 py-4">
        <span className="text-[28px] font-mono leading-none tabular-nums font-bold" style={{ color: "var(--foreground)" }}>
          {lastCandle ? fmtPrice(lastCandle.close) : "—"}
        </span>
        {priceChange !== null && (
          <span className="text-[13px] font-mono tabular-nums font-semibold" style={{ color: isUp ? BULL : BEAR }}>
            {isUp ? "+" : ""}{priceChange.toFixed(2)}%
          </span>
        )}
        <span className="ml-auto text-[11px] font-mono tabular-nums" style={{ color: "var(--foreground-dim)" }}>
          {lastCandle ? new Date(lastCandle.time).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }) : ""}
        </span>
      </div>
      ) : null}

      {loading && (
        <div style={{ height: chartH }} className="flex items-center justify-center">
          <span className="text-[11px] font-mono uppercase tracking-widest" style={{ color: LABEL }}>Loading…</span>
        </div>
      )}
      {error && !loading && (
        <div style={{ height: chartH }} className="flex items-center justify-center">
          <span className="text-[11px] font-mono uppercase tracking-widest" style={{ color: LABEL }}>Chart unavailable</span>
        </div>
      )}
      {!loading && !error && candles.length === 0 && (
        <div style={{ height: chartH }} className="flex flex-col items-center justify-center gap-2">
          <span className="text-[11px] font-mono uppercase tracking-widest" style={{ color: LABEL }}>Chart data coming soon</span>
          <span className="text-[10px] font-mono" style={{ color: LABEL }}>{asset} klines not yet configured</span>
        </div>
      )}
      {!loading && !error && width > 0 && display.length > 0 && (
        <svg
          width={width}
          height={chartH}
          style={{ display: "block" }}
          onMouseMove={onMouseMove}
          onMouseLeave={() => setHovered(null)}
        >
          <defs>
            <linearGradient id={`movement-area-${asset}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={compactTone} stopOpacity="0.46" />
              <stop offset="58%" stopColor={compactTone} stopOpacity="0.18" />
              <stop offset="100%" stopColor={compactTone} stopOpacity="0.02" />
            </linearGradient>
            <filter id={`movement-glow-${asset}`} x="-20%" y="-30%" width="140%" height="160%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Grid lines */}
          {yTicks.map((tick, i) => (
            <line key={i} x1={PAD_LEFT} x2={width - rightPad} y1={toY(tick)} y2={toY(tick)}
              stroke={GRID} strokeWidth={1} />
          ))}

          {/* Current price reference line */}
          {lastCandle && !compact && (
            <line x1={PAD_LEFT} x2={width - rightPad}
              y1={toY(lastCandle.close)} y2={toY(lastCandle.close)}
              stroke={isUp ? BULL : BEAR} strokeWidth={1} strokeDasharray="3 3" strokeOpacity={0.5} />
          )}

          {/* Crosshair */}
          {hovered && (
            <>
              <line x1={hovered.x} x2={hovered.x} y1={PAD_TOP} y2={chartH - bottomPad}
                stroke="#333" strokeWidth={1} />
              {!compact ? (
                <line x1={PAD_LEFT} x2={width - rightPad} y1={hovered.y} y2={hovered.y}
                  stroke="#333" strokeWidth={1} strokeDasharray="2 2" />
              ) : null}
            </>
          )}

          {/* News Markers */}
          {newsMarkers.map((m) => {
            // Find closest candle index
            let closestIdx = -1;
            let minDiff = Infinity;
            display.forEach((c, i) => {
              const diff = Math.abs(c.time - m.release_time);
              if (diff < minDiff) {
                minDiff = diff;
                closestIdx = i;
              }
            });

            if (closestIdx === -1) return null;
            const mx = toX(closestIdx);
            const isHovered = hoveredNewsId === m.id;

            return (
              <g 
                key={m.id} 
                onMouseEnter={() => onNewsHover?.(m.id)}
                onMouseLeave={() => onNewsHover?.(null)}
                style={{ cursor: "pointer" }}
              >
                <line 
                  x1={mx} 
                  x2={mx} 
                  y1={PAD_TOP} 
                  y2={chartH - bottomPad} 
                  stroke={isHovered ? "var(--accent)" : "rgba(255,255,255,0.1)"} 
                  strokeWidth={isHovered ? 2 : 1}
                  strokeDasharray="4 2"
                />
                <circle 
                  cx={mx} 
                  cy={PAD_TOP + 10} 
                  r={isHovered ? 5 : 3} 
                  fill={isHovered ? "var(--accent)" : "rgba(255,255,255,0.2)"} 
                />
              </g>
            );
          })}

          {/* Movement area in compact mode */}
          {compact ? (
            <>
              <path d={areaPath} fill={`url(#movement-area-${asset})`} />
              <path d={linePath} fill="none" stroke={compactTone} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" strokeOpacity={0.1} filter={`url(#movement-glow-${asset})`} />
              <path d={linePath} fill="none" stroke={compactTone} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
              {hovered ? (
                <circle cx={hovered.x} cy={hovered.y} r={4.5} fill={compactTone} stroke="#050505" strokeWidth={1.5} />
              ) : null}
            </>
          ) : null}

          {/* Candlesticks */}
          {!compact ? display.map((d, i) => {
            const cx      = PAD_LEFT + slotW * i + slotW / 2;
            const highY   = toY(d.high);
            const lowY    = toY(d.low);
            const openY   = toY(d.open);
            const closeY  = toY(d.close);
            const bodyTop = Math.min(openY, closeY);
            const bodyH   = Math.max(1.5, Math.abs(closeY - openY));
            const color   = d.bullish ? BULL : BEAR;
            return (
              <g key={i}>
                <line x1={cx} x2={cx} y1={highY} y2={lowY} stroke={color} strokeWidth={1} strokeOpacity={0.7} />
                <rect x={cx - candleW / 2} y={bodyTop} width={candleW} height={bodyH} fill={color} fillOpacity={0.9} />
              </g>
            );
          }) : null}

          {/* Y-axis labels */}
          {!compact ? yTicks.map((tick, i) => (
            <text key={i} x={width - PAD_RIGHT + 6} y={toY(tick) + 4}
              fill={LABEL} fontSize={10} fontFamily="var(--font-mono)" textAnchor="start">
              {fmtPrice(tick)}
            </text>
          )) : null}

          {/* X-axis labels */}
          {!compact ? xTicks.map((idx, i) => display[idx] && (
            <text key={i} x={PAD_LEFT + slotW * idx + slotW / 2} y={chartH - 6}
              fill={LABEL} fontSize={10} fontFamily="var(--font-mono)" textAnchor="middle">
              {fmtTime(display[idx].time)}
            </text>
          )) : null}

          {/* Hover tooltip */}
          {hovered && (() => {
            const d = hovered.candle;
            const pct = ((d.close - d.open) / d.open * 100).toFixed(2);
            const compactTipW = 88;
            const compactTipH = 28;
            const tipX = compact ? Math.min(hovered.x + 10, width - compactTipW - 4) : Math.min(hovered.x + 10, width - 180);
            const tipY = compact ? Math.max(PAD_TOP + 4, hovered.y - 46) : Math.max(PAD_TOP + 4, hovered.y - 60);
            if (compact) {
              return (
                <g>
                  <rect x={tipX} y={tipY} width={compactTipW} height={compactTipH} rx={3}
                    fill="#0d0d0d" stroke="#222" strokeWidth={1} />
                  <text x={tipX + 10} y={tipY + 18} fill="#ddd" fontSize={12} fontFamily="var(--font-mono)" fontWeight={700}>
                    {fmtPrice(d.close)}
                  </text>
                </g>
              );
            }
            return (
              <g>
                <rect x={tipX} y={tipY} width={170} height={72} rx={3}
                  fill="#0d0d0d" stroke="#222" strokeWidth={1} />
                <text x={tipX + 10} y={tipY + 16} fill="#555" fontSize={10} fontFamily="var(--font-mono)">
                  {new Date(d.time).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })}
                </text>
                <text x={tipX + 10} y={tipY + 34} fill="#aaa" fontSize={10} fontFamily="var(--font-mono)">
                  {`O ${fmtPrice(d.open)}  H ${fmtPrice(d.high)}`}
                </text>
                <text x={tipX + 10} y={tipY + 50} fill="#aaa" fontSize={10} fontFamily="var(--font-mono)">
                  {`L ${fmtPrice(d.low)}  C ${fmtPrice(d.close)}`}
                </text>
                <text x={tipX + 10} y={tipY + 66} fill={d.bullish ? BULL : BEAR} fontSize={10} fontFamily="var(--font-mono)">
                  {d.bullish ? "+" : ""}{pct}%
                </text>
              </g>
            );
          })()}
        </svg>
      )}
    </div>
  );
}
