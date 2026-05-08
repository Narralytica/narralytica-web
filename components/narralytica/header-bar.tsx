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
        <span className="text-[11px] font-mono uppercase tracking-[0.18em] font-semibold" style={{ color: "var(--foreground-faint)" }}>
          Macro, flow, structure, positioning
        </span>
      </div>
    </header>
  );
}
