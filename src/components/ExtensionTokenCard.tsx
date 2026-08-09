"use client";

import { useState } from "react";
import { Copy, KeyRound, LoaderCircle, RefreshCw } from "lucide-react";
import { api } from "@/lib/clientApi";

// mints the device token the browser extension uses; shown once, rotate anytime
export default function ExtensionTokenCard() {
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  async function mint() {
    setBusy(true);
    setError("");
    setCopied(false);
    try {
      const r = await api<{ token: string }>("/api/extension/token", { method: "POST" });
      setToken(r.token);
    } catch (e: any) {
      setError(e.message ?? "Connect X or Google first, then generate a token.");
    }
    setBusy(false);
  }

  async function copy() {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <section className="card p-5">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-primary">
          <KeyRound size={15} />
        </span>
        <div>
          <h2 className="text-[14px] font-extrabold">Browser extension</h2>
          <p className="text-[11.5px] text-muted">
            The LinkedIn extension signs its captures with a device token. Generating a new one revokes the old.
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={mint}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-[11.5px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {busy ? <LoaderCircle size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          {token ? "Rotate token" : "Generate token"}
        </button>
        {token && (
          <>
            <code className="max-w-[260px] truncate rounded-lg border border-border bg-card-muted px-2.5 py-1.5 text-[11px]">
              {token}
            </code>
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-1.5 rounded-full bg-card-muted px-3 py-1.5 text-[11.5px] font-bold text-muted transition-colors hover:bg-primary-50 hover:text-primary"
            >
              <Copy size={12} />
              {copied ? "Copied ✓" : "Copy"}
            </button>
          </>
        )}
      </div>
      {token && (
        <p className="mt-2 text-[10.5px] font-medium text-muted-soft">
          Paste it into the extension's options page. It won't be shown again after you leave this tab.
        </p>
      )}
      {error && (
        <p className="mt-2 text-[11px] font-semibold" style={{ color: "var(--red)" }}>{error}</p>
      )}
    </section>
  );
}
