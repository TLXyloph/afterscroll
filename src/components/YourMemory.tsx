"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { api } from "@/lib/clientApi";
import { categoryTint, categoryLabel } from "@/lib/ui";
import type { Category, Insight } from "@/lib/types";
import { XLogo } from "./icons";
import { PanelHeader } from "./PanelHeader";

const categoryOrder: Category[] = [
  "coding",
  "fitness",
  "career",
  "finance",
  "life",
  "other",
];

function formatSavedAt(createdAt: string): string {
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return "";
  return `Saved ${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

function InsightTile({ insight, index }: { insight: Insight; index: number }) {
  const tint = categoryTint[insight.category] ?? categoryTint.other;
  const savedAt = formatSavedAt(insight.createdAt);

  return (
    <article
      className="animate-fade-up group flex flex-col rounded-xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-border-strong hover:shadow-sm"
      style={{ animationDelay: `${index * 55 + 60}ms` }}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className="rounded-md px-1.5 py-0.5 text-[10px] font-bold"
          style={tint}
        >
          {categoryLabel[insight.category] ?? insight.category}
        </span>
        {savedAt && (
          <span className="text-[10px] font-medium text-muted-soft">
            {savedAt}
          </span>
        )}
      </div>
      <p className="mt-3 flex-1 text-[13px] font-semibold leading-relaxed">
        {insight.text}
      </p>
      <a
        href={insight.sourceUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex w-fit items-center gap-1.5 text-[10.5px] font-bold text-muted transition-colors hover:text-primary"
      >
        <span className="flex h-4 w-4 items-center justify-center rounded bg-black text-white">
          <XLogo size={8} />
        </span>
        View original post
        <ArrowRight size={11} />
      </a>
    </article>
  );
}

export default function YourMemory({
  onViewAll,
  fullPage = false,
}: {
  onViewAll?: () => void;
  fullPage?: boolean;
}) {
  const [active, setActive] = useState<"all" | Category>("all");
  const [insights, setInsights] = useState<Insight[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ insights: Insight[] }>("/api/insights")
      .then((r) => setInsights(r.insights))
      .catch(() =>
        setError("Scout couldn't open your memory — refresh to retry."),
      );
  }, []);

  const all = insights ?? [];
  const counts = new Map<Category, number>();
  for (const i of all) counts.set(i.category, (counts.get(i.category) ?? 0) + 1);
  const tabs: Array<{ key: "all" | Category; label: string; count: number }> = [
    { key: "all", label: "All", count: all.length },
    ...categoryOrder
      .filter((c) => (counts.get(c) ?? 0) > 0)
      .map((c) => ({ key: c, label: categoryLabel[c], count: counts.get(c)! })),
  ];

  const filtered = all.filter((i) => active === "all" || i.category === active);

  return (
    <section
      className={`card flex flex-col overflow-hidden ${
        fullPage ? "min-h-[calc(100vh-4rem)]" : "lg:h-[520px]"
      }`}
    >
      <div className="border-b border-border p-4">
        <PanelHeader
          title="Saved"
          right={
            <span className="rounded-full bg-card-muted px-2 py-1 text-[10px] font-bold text-muted">
              {insights === null ? "…" : `${filtered.length} remembered`}
            </span>
          }
        />
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tabs.map((tab) => {
            const isActive = active === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActive(tab.key)}
                aria-pressed={isActive}
                className={`rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-white"
                    : "bg-card-muted text-muted hover:bg-primary-50 hover:text-primary"
                }`}
              >
                {tab.label}{" "}
                <span className={isActive ? "opacity-80" : "opacity-60"}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="custom-scroll flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto p-4">
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
        {insights === null && !error && (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-[138px] animate-pulse rounded-xl bg-card-muted"
                style={{ animationDelay: `${i * 110}ms` }}
              />
            ))}
          </div>
        )}
        {insights !== null && filtered.length === 0 && (
          <div className="m-auto max-w-sm text-center">
            <p className="text-[13px] font-bold">
              {all.length === 0
                ? "Your memory is empty — for now."
                : "Nothing here — try a different tab."}
            </p>
            {all.length === 0 && (
              <p className="mt-1.5 text-[12px] leading-relaxed text-muted">
                Connect X on Home and hit Sync. Scout keeps the insights worth
                keeping and brings them back when you ask.
              </p>
            )}
          </div>
        )}
        {filtered.length > 0 && (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {filtered.map((insight, index) => (
              <InsightTile key={insight.id} insight={insight} index={index} />
            ))}
          </div>
        )}
      </div>

      {onViewAll && (
        <button
          type="button"
          onClick={onViewAll}
          className="flex items-center justify-center gap-1.5 border-t border-border py-3 text-[12.5px] font-semibold text-primary transition-colors hover:bg-primary-50"
        >
          Open saved library
          <ArrowRight size={14} />
        </button>
      )}
    </section>
  );
}
