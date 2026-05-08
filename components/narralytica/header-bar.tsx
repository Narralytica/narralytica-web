"use client";

export type ActiveView = "decision" | "desk" | "relationship";

interface HeaderBarProps {
  activeView: ActiveView;
  onViewChange: (view: ActiveView) => void;
}

export function HeaderBar({
  activeView,
  onViewChange,
}: HeaderBarProps) {
  return (
    <header
      className="sticky top-0 z-50 flex min-w-0 w-full flex-col border-b md:h-14 md:flex-row md:items-stretch"
      style={{ background: "var(--surface)", borderColor: "var(--border-subtle)" }}
    >
      {/* Wordmark */}
      <div
        className="flex h-14 items-center border-b px-4 shrink-0 md:border-b-0 md:border-r md:px-6"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <span className="font-mono text-[13px] tracking-[0.28em] uppercase select-none font-bold" style={{ color: "var(--foreground)" }}>
          Narralytica
        </span>
      </div>

      {/* View tabs */}
      <div className="order-3 flex w-full items-stretch border-t md:order-none md:w-[420px] md:shrink-0 md:border-t-0" style={{ borderColor: "var(--border-subtle)" }}>
        {(["decision", "desk", "relationship"] as ActiveView[]).map((v) => {
          const active = activeView === v;
          const label =
            v === "decision"
              ? "terminal"
              : v === "desk"
                ? "desk"
                : "analysis";
          return (
            <button
              key={v}
              onClick={() => onViewChange(v)}
              className="relative flex flex-1 items-center justify-center px-3 py-3 text-[11px] font-mono uppercase tracking-[0.14em] border-r font-semibold transition-colors whitespace-nowrap md:px-6 md:text-[12px]"
              style={{
                borderColor: "var(--border-subtle)",
                color: active ? "var(--foreground)" : "var(--foreground-dim)",
                background: active ? "var(--surface-2)" : "transparent",
              }}
            >
              <span>{label}</span>
              {active && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-[2px]"
                  style={{ background: "var(--accent)" }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Spacer */}
      <div className="hidden min-w-0 flex-1 md:block" />
      <div
        className="order-2 flex h-14 items-center justify-end border-t px-4 md:order-none md:border-l md:border-t-0 md:px-6"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <div className="relative h-7 w-16 overflow-hidden" aria-hidden="true">
          <style>{`
            @keyframes narralyticaHeaderTrace {
              0% { stroke-dashoffset: 84; opacity: 0.25; }
              42% { opacity: 1; }
              100% { stroke-dashoffset: 0; opacity: 0.45; }
            }
            @keyframes narralyticaHeaderPulse {
              0%, 100% { transform: scale(0.78); opacity: 0.45; }
              50% { transform: scale(1); opacity: 1; }
            }
            @keyframes narralyticaHeaderScan {
              0% { transform: translateX(-28px); opacity: 0; }
              18% { opacity: 0.55; }
              100% { transform: translateX(84px); opacity: 0; }
            }
          `}</style>
          <div className="absolute inset-y-1 w-7" style={{ background: "linear-gradient(90deg, transparent, rgba(21,154,91,0.16), transparent)", animation: "narralyticaHeaderScan 3s linear infinite" }} />
          <svg viewBox="0 0 72 30" className="h-7 w-16">
            <path d="M14 6H9C7.3 6 6 7.3 6 9V21C6 22.7 7.3 24 9 24H14" fill="none" stroke="#159A5B" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M58 6H63C64.7 6 66 7.3 66 9V21C66 22.7 64.7 24 63 24H58" fill="none" stroke="#159A5B" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M18 21L29 13L39 18L51 8L57 11" fill="none" stroke="rgba(21,154,91,0.2)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M18 21L29 13L39 18L51 8L57 11" fill="none" stroke="#159A5B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="32 32" style={{ animation: "narralyticaHeaderTrace 3s ease-in-out infinite" }} />
            <circle cx="51" cy="8" r="3.3" fill="#159A5B" style={{ transformOrigin: "51px 8px", animation: "narralyticaHeaderPulse 3s ease-in-out infinite" }} />
          </svg>
        </div>
      </div>
    </header>
  );
}
