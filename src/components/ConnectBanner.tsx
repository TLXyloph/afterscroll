import { ArrowRight, Check } from "lucide-react";
import { importState } from "@/lib/data";
import { formatNumber } from "@/lib/ui";
import { XLogo } from "./icons";
import CountUp from "./CountUp";

export default function ConnectBanner() {
  const pct = Math.round(
    (importState.bookmarksFound / importState.bookmarksTotal) * 100
  );

  return (
    <section className="card flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
      <div
        className="flex items-center gap-3 rounded-xl border p-3 sm:w-[210px]"
        style={{
          borderColor: "var(--success)",
          background: "var(--success-bg)",
        }}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-black text-white">
          <XLogo size={15} />
        </span>
        <div className="leading-tight">
          <p className="text-[13px] font-semibold">X (Twitter)</p>
          <p
            className="flex items-center gap-1 text-[11px] font-medium"
            style={{ color: "var(--success)" }}
          >
            <Check size={12} strokeWidth={3} /> Connected
          </p>
        </div>
      </div>

      <div className="flex-1">
        <div className="flex items-center justify-between text-[11px] text-muted">
          <span>Bookmarks imported</span>
          <span className="tabular font-semibold text-foreground">
            {importState.bookmarksFound}/{importState.bookmarksTotal}
          </span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-primary-50">
          <div
            className="animate-bar h-full rounded-full"
            style={{
              width: `${pct}%`,
              background: "linear-gradient(90deg, var(--primary), #b39bff)",
            }}
          />
        </div>
      </div>

      <div className="shrink-0 text-center sm:text-left">
        <p className="text-[11px] text-muted">Raw tokens</p>
        <p className="tabular text-lg font-bold">
          <CountUp value={importState.rawTokens} />
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-center gap-1.5">
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 sm:w-auto"
          style={{
            background:
              "linear-gradient(135deg, var(--primary) 0%, #7c5cff 100%)",
            boxShadow: "0 10px 24px -10px var(--primary)",
          }}
        >
          Build My Memory
          <ArrowRight size={16} strokeWidth={2.5} />
        </button>
        <p className="whitespace-nowrap text-center text-[11px] text-muted-soft">
          {formatNumber(importState.rawTokens)} tokens ready to compress
        </p>
      </div>
    </section>
  );
}
