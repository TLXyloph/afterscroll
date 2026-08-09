"use client";

import { useRef, useState } from "react";
import {
  ArrowRight,
  CalendarCheck2,
  CalendarPlus,
  Check,
  LoaderCircle,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { XLogo } from "./icons";
import HomeScout from "./HomeScout";
import { api, isPaywallResponse, startCheckout } from "@/lib/clientApi";

export type Connections = { x: boolean; google: boolean };

export type SyncResult = {
  synced: number;
  todos: number;
  events: number;
  insights: number;
  needsReview: number;
};

const comingSoon = [
  { name: "Instagram", mark: "IG", className: "bg-[#e9507a] text-white" },
  { name: "LinkedIn", mark: "in", className: "bg-[#0a78b5] text-white" },
] as const;

export default function SourceConnect({
  connections,
  connectError,
  onSynced,
  onOpenAsk,
}: {
  connections: Connections;
  connectError?: "x" | "google" | null;
  onSynced?: (result: SyncResult) => void;
  onOpenAsk?: () => void;
}) {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [syncError, setSyncError] = useState("");
  const linkRef = useRef<HTMLInputElement>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [importNote, setImportNote] = useState("");
  const [paywalled, setPaywalled] = useState(false);
  const [startingTrial, setStartingTrial] = useState(false);

  const startTrial = async () => {
    if (startingTrial) return;
    setStartingTrial(true);
    try {
      await startCheckout();
    } catch {
      setStartingTrial(false);
    }
  };

  const importLink = async () => {
    if (!linkUrl.trim() || importing) return;
    setImporting(true);
    setImportNote("");
    try {
      const r = await api<SyncResult>("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: linkUrl.trim() }),
      });
      setImportNote(
        r.synced === 0
          ? "Already in your memory."
          : `Kept ${r.todos} todos, ${r.events} events, ${r.insights} insights from that link.`,
      );
      setLinkUrl("");
      if (r.synced > 0) onSynced?.(r);
    } catch (err) {
      if (isPaywallResponse(err)) {
        setPaywalled(true);
      } else {
        setImportNote(err instanceof Error ? err.message : "Couldn't read that link — try another.");
      }
    } finally {
      setImporting(false);
    }
  };

  const xConnected = connections.x;

  const sync = async () => {
    if (!xConnected || syncing) return;
    setSyncing(true);
    setSyncError("");
    try {
      const r = await api<SyncResult>("/api/sync", { method: "POST" });
      setResult(r);
      onSynced?.(r);
    } catch (err) {
      if (isPaywallResponse(err)) {
        setPaywalled(true);
      } else {
        setSyncError(
          err instanceof Error && err.message
            ? err.message
            : "Sync hit a snag — give it another try.",
        );
      }
    } finally {
      setSyncing(false);
    }
  };

  const description = syncing
    ? "Scout is reading each new save and turning it into todos, events, and insights."
    : result
      ? result.synced === 0
        ? "You're all caught up — nothing new since your last sync."
        : `Scout read ${result.synced} new ${result.synced === 1 ? "save" : "saves"} and kept ${result.todos} todos, ${result.events} events, and ${result.insights} insights.${result.needsReview > 0 ? ` ${result.needsReview} need a second look.` : ""}`
      : xConnected
        ? "Your X connection is live. Pull in what you saved most recently."
        : "Connect X once, then bring your best finds back when they matter.";

  const errorNote =
    connectError === "x"
      ? "X didn't finish connecting — give it one more try."
      : connectError === "google"
        ? "Google Calendar didn't finish connecting — give it one more try."
        : syncError;

  const buttonLabel = syncing
    ? "Reading your saves…"
    : xConnected
      ? result
        ? "Sync again"
        : "Sync latest saves"
      : "Connect X";
  const ButtonIcon = syncing ? LoaderCircle : xConnected ? RefreshCw : ArrowRight;
  const ctaStyle = {
    background: "var(--primary)",
    color: "var(--primary-ink)",
    boxShadow: "0 14px 30px -18px var(--primary)",
  } as const;
  const ctaClass =
    "inline-flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-bold transition-transform hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-75";

  return (
    <section className="card relative w-full overflow-hidden">
      <div className="absolute inset-y-0 left-0 w-1 bg-primary" />
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background:
            "radial-gradient(circle at 82% 18%, var(--primary-50), transparent 27%), linear-gradient(90deg, transparent 58%, var(--card-muted))",
        }}
      />

      <div
        className={`relative grid gap-7 p-7 lg:p-8 ${
          onOpenAsk
            ? "lg:min-h-[370px] lg:grid-cols-[1.05fr_0.95fr] lg:items-center"
            : "lg:grid-cols-1"
        }`}
      >
        <div>
          <span className="panel-eyebrow">
            {xConnected ? "01 / Import ready" : "01 / Connect a source"}
          </span>
          <h1 className="mt-2 max-w-xl text-[34px] font-extrabold leading-[1.08] tracking-tight sm:text-[42px]">
            {xConnected
              ? "Your saved posts are in motion."
              : "Turn saved posts into next moves."}
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
            {description}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            {xConnected ? (
              <span
                title="X connected"
                className="relative flex h-10 items-center gap-2 rounded-lg border border-primary bg-primary-50 px-2.5 text-[11px] font-bold text-primary"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-black text-white">
                  <XLogo size={12} />
                </span>
                <span>X connected</span>
                <Check size={13} strokeWidth={3} />
              </span>
            ) : (
              <a
                href="/api/connect/x"
                title="Connect X"
                aria-label="Connect X"
                className="relative flex h-10 items-center gap-2 rounded-lg border border-primary bg-primary-50 px-2.5 text-[11px] font-bold text-primary transition-all hover:-translate-y-0.5"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-black text-white">
                  <XLogo size={12} />
                </span>
                <span>X</span>
              </a>
            )}
            {connections.google ? (
              <div
                title="YouTube connected — liked videos sync too"
                className="relative flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-2.5 text-[11px] font-bold"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#ef4444] text-white">
                  <span className="text-[10px] font-extrabold tracking-tight">▶</span>
                </span>
                <span>YouTube</span>
                <Check size={12} style={{ color: "var(--success)" }} />
              </div>
            ) : (
              <a
                href="/api/connect/google"
                title="Connect YouTube (uses your Google sign-in)"
                className="relative flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-2.5 text-[11px] font-bold transition-all hover:-translate-y-0.5 hover:border-border-strong"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#ef4444] text-white">
                  <span className="text-[10px] font-extrabold tracking-tight">▶</span>
                </span>
                <span>YouTube</span>
                <ArrowRight size={11} />
              </a>
            )}
            {comingSoon.map(({ name, mark, className }) => (
              <button
                key={name}
                type="button"
                onClick={() => linkRef.current?.focus()}
                title={`Paste a ${name} link below — Scout reads the page`}
                aria-label={`Import a ${name} link`}
                className="relative flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-2.5 text-[11px] font-bold transition-all hover:-translate-y-0.5 hover:border-border-strong"
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-md ${className}`}
                >
                  <span className="text-[10px] font-extrabold tracking-tight">
                    {mark}
                  </span>
                </span>
                <span>{name}</span>
              </button>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-2">
            <input
              ref={linkRef}
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void importLink();
              }}
              placeholder="Or paste any link — Instagram, LinkedIn, an article…"
              className="h-10 w-full max-w-sm rounded-lg border border-border bg-card px-3 text-[12px] font-medium outline-none transition-colors placeholder:text-muted-soft focus:border-primary"
            />
            <button
              type="button"
              onClick={() => void importLink()}
              disabled={importing || !linkUrl.trim()}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-card-muted px-3.5 text-[12px] font-bold text-muted transition-colors hover:bg-primary-50 hover:text-primary disabled:cursor-wait disabled:opacity-60"
            >
              {importing ? <LoaderCircle size={13} className="animate-spin" /> : <ArrowRight size={13} />}
              {importing ? "Reading…" : "Import"}
            </button>
          </div>
          {importNote && (
            <p className="mt-2 text-[11px] font-semibold text-muted">{importNote}</p>
          )}

          <div className="mt-6 flex items-center gap-3">
            {xConnected ? (
              <button
                type="button"
                onClick={sync}
                disabled={syncing}
                className={ctaClass}
                style={ctaStyle}
              >
                <ButtonIcon
                  size={16}
                  className={syncing ? "animate-spin" : ""}
                  strokeWidth={2.6}
                />
                {buttonLabel}
              </button>
            ) : (
              <a href="/api/connect/x" className={ctaClass} style={ctaStyle}>
                <ButtonIcon size={16} strokeWidth={2.6} />
                {buttonLabel}
              </a>
            )}
            <span className="text-[10px] font-semibold text-muted">
              {syncing
                ? "Claude reads every new save — up to 30 seconds"
                : result
                  ? "Synced just now"
                  : xConnected
                    ? "Last sync brings in your newest bookmarks"
                    : "Takes less than a minute"}
            </span>
          </div>

          <div className="mt-4 flex items-center gap-2 text-[11px] font-semibold">
            {connections.google ? (
              <span className="inline-flex items-center gap-1.5 text-success">
                <CalendarCheck2 size={13} />
                Google Calendar connected
              </span>
            ) : (
              <a
                href="/api/connect/google"
                className="inline-flex items-center gap-1.5 text-primary hover:text-primary-600"
              >
                <CalendarPlus size={13} />
                Connect Google Calendar
              </a>
            )}
            <span className="font-medium text-muted-soft">
              — event saves land there in one tap
            </span>
          </div>

          {paywalled ? (
            <div className="mt-4 flex max-w-md flex-wrap items-center gap-2.5 rounded-lg border border-primary bg-primary-50 px-3 py-2.5">
              <p className="text-[11px] font-semibold text-primary">
                Scout&apos;s AI reading is part of the plan — try it free for a week.
              </p>
              <button
                type="button"
                onClick={() => void startTrial()}
                disabled={startingTrial}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-[11px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {startingTrial ? (
                  <LoaderCircle size={12} className="animate-spin" />
                ) : (
                  <Sparkles size={12} />
                )}
                Start free trial
              </button>
            </div>
          ) : (
            errorNote && (
              <p
                className="mt-4 max-w-md rounded-lg border px-3 py-2 text-[11px] font-semibold"
                style={{
                  borderColor: "var(--red)",
                  background: "var(--red-bg)",
                  color: "var(--red)",
                }}
              >
                {errorNote}
              </p>
            )
          )}
        </div>

        {onOpenAsk && <HomeScout onOpenAsk={onOpenAsk} />}
      </div>
    </section>
  );
}
