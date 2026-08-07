"use client";

import { useEffect, useState } from "react";
import { BrainCircuit, Coins, Cpu, Sparkles } from "lucide-react";
import { api } from "@/lib/clientApi";
import { PanelHeader } from "./PanelHeader";
import CountUp from "./CountUp";

type Economics = {
  lifetimeCostUsd: number;
  totalCalls: number;
  totalTokens: number;
};

function StatBox({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card-muted p-3">
      <p className="text-[11px] text-muted">{label}</p>
      <p className="mt-1 text-[19px] font-bold leading-none">{children}</p>
    </div>
  );
}

export default function IntelligenceEconomics() {
  const [data, setData] = useState<Economics | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Economics>("/api/economics")
      .then(setData)
      .catch(() =>
        setError("Scout couldn't total up the ledger — refresh to retry."),
      );
  }, []);

  const avgPerCall =
    data && data.totalCalls > 0 ? data.lifetimeCostUsd / data.totalCalls : 0;

  return (
    <section className="card flex flex-col overflow-hidden">
      <div className="border-b border-border p-4">
        <PanelHeader
          number={4}
          title="Intelligence Economics"
          right={
            <span className="rounded-full bg-card-muted px-2 py-1 text-[10px] font-bold text-muted">
              All time
            </span>
          }
        />
      </div>

      <div className="custom-scroll flex flex-1 flex-col gap-2.5 overflow-y-auto p-4">
        {error && (
          <p
            className="rounded-lg border px-3 py-2 text-[11px] font-semibold"
            style={{
              borderColor: "var(--red)",
              background: "var(--red-bg)",
              color: "var(--red)",
            }}
          >
            {error}
          </p>
        )}

        {data === null && !error ? (
          <div className="grid grid-cols-2 gap-2.5">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-[74px] animate-pulse rounded-xl bg-card-muted"
                style={{ animationDelay: `${i * 110}ms` }}
              />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2.5">
              <StatBox label="Lifetime Claude Spend">
                <CountUp
                  value={data?.lifetimeCostUsd ?? 0}
                  decimals={4}
                  prefix="$"
                />
              </StatBox>
              <StatBox label="Claude Calls">
                <CountUp value={data?.totalCalls ?? 0} />
              </StatBox>
              <StatBox label="Total Tokens">
                <CountUp value={data?.totalTokens ?? 0} />
              </StatBox>
              <StatBox label="Avg Cost per Call">
                <span
                  className="flex items-center gap-1"
                  style={{ color: "var(--success)" }}
                >
                  <Coins size={16} />
                  <CountUp value={avgPerCall} decimals={4} prefix="$" />
                </span>
              </StatBox>
            </div>

            <div
              className="rounded-xl p-3.5"
              style={{ background: "var(--success-bg)" }}
            >
              <p
                className="flex items-center gap-1.5 text-[12px] font-bold"
                style={{ color: "var(--success)" }}
              >
                <Sparkles size={14} />
                Why this stays cheap
              </p>
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">
                Scout reads each save exactly once, keeps the distilled insight
                in memory, and answers questions from that memory instead of
                rereading your whole history. The whole ledger above is real —
                every Claude call this app has ever made.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="flex items-center gap-3 rounded-xl border border-border p-3.5">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                  style={{
                    color: "var(--blue)",
                    background: "var(--blue-bg)",
                  }}
                >
                  <Cpu size={17} strokeWidth={2.2} />
                </span>
                <div>
                  <p className="text-[12px] font-bold">One read per save</p>
                  <p className="text-[10.5px] text-muted">
                    Extraction happens at sync, never again
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-border p-3.5">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                  style={{
                    color: "var(--rose)",
                    background: "var(--rose-bg)",
                  }}
                >
                  <BrainCircuit size={17} strokeWidth={2.2} />
                </span>
                <div>
                  <p className="text-[12px] font-bold">Memory over context</p>
                  <p className="text-[10.5px] text-muted">
                    Answers retrieve only the relevant saves
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
