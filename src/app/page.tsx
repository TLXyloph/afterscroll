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
  const [refreshKey, setRefreshKey] = useState(0);
  const bump = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    api<Connections>("/api/connections")
      .then(setConnections)
      .catch(() => {});
    // OAuth sends the browser back with ?error=x_connect / ?error=google_connect
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (err === "x_connect") setConnectError("x");
    if (err === "google_connect") setConnectError("google");
    if (err) window.history.replaceState({}, "", window.location.pathname);
  }, []);

  return (
    <div className="flex min-h-screen">
      <Sidebar
        active={active}
        onNavChange={setActive}
        xConnected={connections.x}
      />

      <main className="mx-auto flex min-w-0 max-w-[1360px] flex-1 flex-col gap-6 p-4 sm:p-8">
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
