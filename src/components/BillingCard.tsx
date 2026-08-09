"use client";

import { useEffect, useState } from "react";
import { CreditCard, LoaderCircle, Sparkles, TriangleAlert } from "lucide-react";
import { api, startCheckout } from "@/lib/clientApi";

type BillingStatus = {
  entitled: boolean;
  status: string;
  trialEnd: number | null;
  currentPeriodEnd: number | null;
};

function formatDate(epochSec: number | null): string {
  if (!epochSec) return "soon";
  return new Date(epochSec * 1000).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

// Subscription state + checkout / customer-portal entry points.
export default function BillingCard() {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api<BillingStatus>("/api/billing/status")
      .then(setStatus)
      .catch(() => setStatus({ entitled: false, status: "none", trialEnd: null, currentPeriodEnd: null }));
  }, []);

  async function checkout() {
    setBusy(true);
    setError("");
    try {
      await startCheckout();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't open checkout — try again.");
      setBusy(false);
    }
  }

  async function openPortal() {
    setBusy(true);
    setError("");
    try {
      const r = await api<{ url: string }>("/api/billing/portal", { method: "POST" });
      if (r.url) window.location.href = r.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't open billing — try again.");
      setBusy(false);
    }
  }

  const s = status?.status ?? "loading";
  const line =
    s === "loading"
      ? "Checking your plan…"
      : s === "trialing"
        ? `Trial active — ends ${formatDate(status?.trialEnd ?? null)}`
        : s === "active"
          ? `Pro · renews ${formatDate(status?.currentPeriodEnd ?? null)}`
          : s === "past_due"
            ? "Payment past due — update your card to keep Scout reading."
            : "Scout reads every save with AI. Try it free for a week.";

  const managed = s === "trialing" || s === "active" || s === "past_due";

  return (
    <section className="card p-5">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-primary">
          <CreditCard size={15} />
        </span>
        <div>
          <h2 className="text-[14px] font-extrabold">Plan</h2>
          <p className="text-[11.5px] text-muted">{line}</p>
        </div>
        {s === "past_due" && (
          <span
            className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-bold"
            style={{ background: "var(--red-bg)", color: "var(--red)" }}
          >
            <TriangleAlert size={12} />
            Action needed
          </span>
        )}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {managed ? (
          <button
            type="button"
            onClick={openPortal}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-[11.5px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {busy ? <LoaderCircle size={13} className="animate-spin" /> : <CreditCard size={13} />}
            Manage subscription
          </button>
        ) : (
          s !== "loading" && (
            <button
              type="button"
              onClick={checkout}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-[11.5px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {busy ? <LoaderCircle size={13} className="animate-spin" /> : <Sparkles size={13} />}
              Start 7-day free trial · $5/mo after
            </button>
          )
        )}
        {!managed && s !== "loading" && (
          <span className="text-[10.5px] font-medium text-muted-soft">
            Cancel anytime — promo codes accepted at checkout.
          </span>
        )}
      </div>
      {error && (
        <p className="mt-2 text-[11px] font-semibold" style={{ color: "var(--red)" }}>{error}</p>
      )}
    </section>
  );
}
