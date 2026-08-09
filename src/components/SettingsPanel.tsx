"use client";

import { FormEvent, useState } from "react";
import { Check, KeyRound, LockKeyhole, Save, SlidersHorizontal } from "lucide-react";
import SourceConnect, { type Connections } from "./SourceConnect";

import ExtensionTokenCard from "./ExtensionTokenCard";
import BillingCard from "./BillingCard";

export default function SettingsPanel({
  connections,
  connectError,
  onSynced,
}: {
  connections: Connections;
  connectError?: "x" | "google" | null;
  onSynced?: () => void;
}) {
  const [xClientId, setXClientId] = useState("");
  const [xClientSecret, setXClientSecret] = useState("");
  const [aiApiKey, setAiApiKey] = useState("");
  const [saved, setSaved] = useState(false);

  const saveConfiguration = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaved(true);
  };

  return (
    <div className="mx-auto w-full max-w-[1160px] pb-10">
      <header className="mb-8 max-w-2xl">
        <span className="panel-eyebrow">Workspace settings</span>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight">Connections and credentials.</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Keep source setup and provider credentials in one place. Values stay in this demo session until a secure backend is connected.
        </p>
      </header>

      <div className="mb-6">
        <BillingCard />
      </div>

      <div className="mb-6">
        <ExtensionTokenCard />
      </div>

      <div className="space-y-8">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <SlidersHorizontal size={15} style={{ color: "var(--primary)" }} />
            <h2 className="text-sm font-bold">Sources</h2>
          </div>
          <SourceConnect
            connections={connections}
            connectError={connectError}
            onSynced={onSynced}
          />
        </div>

        <form onSubmit={saveConfiguration} className="card p-6">
          <div className="flex items-start justify-between gap-6 border-b border-border pb-5">
            <div>
              <div className="flex items-center gap-2">
                <KeyRound size={16} style={{ color: "var(--primary)" }} />
                <h2 className="text-lg font-bold">API credentials</h2>
              </div>
              <p className="mt-1 text-[12.5px] text-muted">
                Use server-side environment variables before connecting real accounts.
              </p>
            </div>
            {saved && (
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-success-bg px-2.5 py-1.5 text-[11px] font-bold text-success">
                <Check size={13} strokeWidth={3} />
                Saved for this session
              </span>
            )}
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">X client ID</span>
              <input
                value={xClientId}
                onChange={(event) => {
                  setXClientId(event.target.value);
                  setSaved(false);
                }}
                placeholder="Paste your X OAuth client ID"
                className="mt-2 h-11 w-full rounded-lg border border-border bg-card-muted px-3 text-sm outline-none transition-colors placeholder:text-muted-soft focus:border-primary"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">X client secret</span>
              <input
                type="password"
                value={xClientSecret}
                onChange={(event) => {
                  setXClientSecret(event.target.value);
                  setSaved(false);
                }}
                placeholder="Paste your X OAuth client secret"
                className="mt-2 h-11 w-full rounded-lg border border-border bg-card-muted px-3 text-sm outline-none transition-colors placeholder:text-muted-soft focus:border-primary"
              />
            </label>
            <label className="block lg:col-span-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">AI provider API key</span>
              <div className="relative mt-2">
                <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={15} />
                <input
                  type="password"
                  value={aiApiKey}
                  onChange={(event) => {
                    setAiApiKey(event.target.value);
                    setSaved(false);
                  }}
                  placeholder="Paste an API key for your chosen model provider"
                  className="h-11 w-full rounded-lg border border-border bg-card-muted py-0 pl-10 pr-3 text-sm outline-none transition-colors placeholder:text-muted-soft focus:border-primary"
                />
              </div>
            </label>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white transition-transform hover:-translate-y-0.5"
            >
              <Save size={15} />
              Save configuration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}