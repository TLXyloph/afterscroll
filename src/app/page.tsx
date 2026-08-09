"use client";

import { useCallback, useEffect, useState } from "react";
import Sidebar, { type NavLabel } from "@/components/Sidebar";
import YourMemory from "@/components/YourMemory";
import AskAfterScroll from "@/components/AskAfterScroll";
import ScoutInsights from "@/components/ScoutInsights";
import SettingsPanel from "@/components/SettingsPanel";
import SourceConnect, { type Connections } from "@/components/SourceConnect";
import { api } from "@/lib/clientApi";

export default function Home() {
  const [active, setActive] = useState<NavLabel>("Home");
  const [connections, setConnections] = useState<Connections>({
    x: false,
    google: false,
  });
  const [connectError, setConnectError] = useState<"x" | "google" | null>(null);
  const [billingNote, setBillingNote] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const bump = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    api<Connections>("/api/connections")
      .then(setConnections)
      .catch(() => {});
    // OAuth sends the browser back with ?error=x_connect / ?error=google_connect;
    // Stripe Checkout returns with ?billing=success / ?billing=cancelled.
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (err === "x_connect") setConnectError("x");
    if (err === "google_connect") setConnectError("google");
    const billing = params.get("billing");
    if (billing === "success") setBillingNote("Trial started — welcome aboard.");
    if (err || billing) window.history.replaceState({}, "", window.location.pathname);
  }, []);

  useEffect(() => {
    if (!billingNote) return;
    const t = setTimeout(() => setBillingNote(""), 6000);
    return () => clearTimeout(t);
  }, [billingNote]);

  return (
    <div className="flex min-h-screen">
      <Sidebar
        active={active}
        onNavChange={setActive}
        xConnected={connections.x}
      />

      <main className="mx-auto flex min-w-0 max-w-[1360px] flex-1 flex-col gap-6 p-4 sm:p-8">
        {billingNote && (
          <div className="mx-auto w-full max-w-[1160px]">
            <p className="inline-flex items-center gap-2 rounded-full bg-success-bg px-3.5 py-2 text-[11.5px] font-bold text-success">
              {billingNote}
            </p>
          </div>
        )}
        {active === "Home" && (
          <section className="mx-auto w-full max-w-[1160px] space-y-5 pt-2">
            <SourceConnect
              connections={connections}
              connectError={connectError}
              onSynced={bump}
              onOpenAsk={() => setActive("Ask")}
            />
            <ScoutInsights
              refreshKey={refreshKey}
              googleConnected={connections.google}
            />
          </section>
        )}

        {active === "Saved" && <YourMemory fullPage />}
        {active === "Ask" && <AskAfterScroll />}
        {active === "Settings" && (
          <SettingsPanel
            connections={connections}
            connectError={connectError}
            onSynced={bump}
          />
        )}
      </main>
    </div>
  );
}
