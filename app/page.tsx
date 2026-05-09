"use client";

import { useEffect, useState } from "react";
import { HeaderBar, type ActiveView } from "@/components/narralytica/header-bar";
import { DeskView, MarketTerminal } from "@/components/narralytica/market-terminal";
import { RelationshipModule } from "@/components/narralytica/relationship-module";

const B = "var(--border-subtle)";

export default function Page() {
  const [activeView, setActiveView] = useState<ActiveView>("decision");
  const [terminalData, setTerminalData] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    let ignore = false;

    async function fetchTerminalData() {
      try {
        const response = await fetch("/api/terminal-data", { cache: "no-store" });
        const payload = await response.json();
        if (!ignore && !payload?.error) setTerminalData(payload);
      } catch {
        if (!ignore) setTerminalData(null);
      }
    }

    fetchTerminalData();
    const interval = setInterval(fetchTerminalData, 60000);
    return () => {
      ignore = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="narralytica-shell min-h-screen w-full min-w-0 overflow-x-hidden" style={{ background: "var(--background)" }}>
      <HeaderBar activeView={activeView} onViewChange={setActiveView} />

      {activeView === "decision" ? (
        <div>
          <MarketTerminal data={terminalData} />
          <footer className="flex items-center justify-between px-6 py-4" style={{ borderTop: `1px solid ${B}` }}>
            <span className="text-[11px] font-mono uppercase tracking-[0.18em] font-semibold" style={{ color: "var(--foreground-faint)" }}>
              Narralytica · Market Context Terminal
            </span>
            <span className="text-[11px] font-mono tabular-nums font-semibold" style={{ color: "var(--foreground-faint)" }}>
              {terminalData?.manifest?.generated_at
                ? `data ${new Date(String(terminalData.manifest.generated_at)).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`
                : ""}
            </span>
          </footer>
        </div>
      ) : activeView === "desk" ? (
        <section className="border-b" style={{ borderColor: B }}>
          <div className="border-b px-4 py-4 sm:px-6" style={{ borderColor: B }}>
            <p className="text-[12px] font-mono uppercase tracking-[0.22em] font-bold" style={{ color: "var(--foreground)" }}>
              Desk
            </p>
          </div>
          <DeskView desk={terminalData?.desk} brief={terminalData?.desk_brief} />
        </section>
      ) : (
        <RelationshipModule asset="BTC" />
      )}
    </div>
  );
}
