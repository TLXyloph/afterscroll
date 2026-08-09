"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Bookmark, ChevronDown, X } from "lucide-react";
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

function InsightTile({
  insight,
  index,
  onSelect,
}: {
  insight: Insight;
  index: number;
  onSelect: (i: Insight) => void;
}) {
  const tint = categoryTint[insight.category] ?? categoryTint.other;
  const savedAt = formatSavedAt(insight.createdAt);

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onSelect(insight)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onSelect(insight);
      }}
      className="animate-fade-up group flex cursor-pointer flex-col rounded-xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-border-strong hover:shadow-sm"
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
      <span className="mt-3 inline-flex w-fit items-center gap-1.5 text-[10.5px] font-bold text-muted transition-colors group-hover:text-primary">
        <Bookmark size={11} />
        Open intelligence
        <ArrowRight size={11} />
      </span>
    </article>
  );
}

function IntelligenceWindow({
  insight,
  onClose,
}: {
  insight: Insight;
  onClose: () => void;
}) {
  const tint = categoryTint[insight.category] ?? categoryTint.other;
  const [expanded, setExpanded] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function toggleExplain() {
    const next = !expanded;
    setExpanded(next);
    if (!next || explanation || loading) return;
    setLoading(true);
    setError("");
    try {
      const r = await api<{ explanation: string }>(
        "/api/explain",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ insightId: insight.id }),
        },
      );
      setExplanation(r.explanation);
    } catch (e: any) {
      setError(e.message ?? "Scout couldn't simplify this one — try again.");
    }
    setLoading(false);
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-4">
      <div className="animate-fade-up w-full max-w-xl rounded-2xl border border-border-strong bg-card p-4 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-primary">
              <Bookmark size={15} />
            </span>
            <div>
              <span
                className="rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                style={tint}
              >
                {categoryLabel[insight.category] ?? insight.category}
              </span>
              <p className="mt-0.5 text-[10px] font-medium text-muted-soft">
                {formatSavedAt(insight.createdAt)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close intelligence window"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition-colors hover:bg-card-muted hover:text-primary"
          >
            <X size={14} />
          </button>
        </div>

        <p className="mt-3 text-[13px] font-semibold leading-relaxed">
          {insight.text}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <a
            href={insight.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-[11.5px] font-bold text-white transition-opacity hover:opacity-90"
          >
            <span className="flex h-4 w-4 items-center justify-center rounded bg-black/30">
              <XLogo size={8} />
            </span>
            Take me to the post
            <ArrowRight size={12} />
          </a>
          <button
            type="button"
            onClick={toggleExplain}
            aria-expanded={expanded}
            className="inline-flex items-center gap-1.5 rounded-full bg-card-muted px-3.5 py-1.5 text-[11.5px] font-bold text-muted transition-colors hover:bg-primary-50 hover:text-primary"
          >
            Explain it simply
            <ChevronDown
              size={13}
              className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            />
          </button>
        </div>

        {expanded && (
          <div className="mt-3 rounded-xl border border-border bg-card-muted p-3">
            {loading && (
              <p className="animate-pulse text-[12px] font-medium text-muted">
                Scout is re-reading the post…
              </p>
            )}
            {error && (
              <p className="text-[12px] font-semibold" style={{ color: "var(--red)" }}>
                {error}
              </p>
            )}
            {explanation && (
              <>
                <p className="text-[12.5px] leading-relaxed">{explanation}</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
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
  const [selected, setSelected] = useState<Insight | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ insights: Insight[] }>("/api/insights")
      .then((r) => setInsights(r.insights))
      .catch(() =>
        setError("Scout couldn't open your memory — refresh to retry."),
      );
  }, []);

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

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
              <InsightTile
                key={insight.id}
                insight={insight}
                index={index}
                onSelect={setSelected}
              />
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

      {selected && (
        <IntelligenceWindow insight={selected} onClose={() => setSelected(null)} />
      )}
    </section>
  );
}
