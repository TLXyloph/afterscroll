"use client";

import { Home, Brain, Sparkles, BarChart3, Check, Settings2 } from "lucide-react";
import { XLogo } from "./icons";
import ThemeToggle from "./ThemeToggle";

export const navItems = [
  { label: "Home", icon: Home },
  { label: "Saved", icon: Brain },
  { label: "Ask", icon: Sparkles },
  { label: "Settings", icon: Settings2 },
] as const;

export type NavLabel = (typeof navItems)[number]["label"];

export default function Sidebar({
  active,
  onNavChange,
  xConnected,
}: {
  active: NavLabel;
  onNavChange: (label: NavLabel) => void;
  xConnected: boolean;
}) {
  return (
    <aside className="custom-scroll sticky top-0 flex h-screen w-[84px] shrink-0 flex-col items-center gap-5 overflow-y-auto border-r border-border bg-card px-3 py-5">
      <span
        title="AfterScroll"
        className="flex h-10 w-10 items-center justify-center rounded-xl text-[13px] font-extrabold text-white"
        style={{ background: "var(--primary)" }}
      >
        AS
      </span>

      <nav className="flex w-full flex-col items-center gap-2 border-y border-border py-3">
        {navItems.map(({ label, icon: Icon }) => (
          <button
            key={label}
            type="button"
            aria-current={active === label ? "page" : undefined}
            aria-label={label}
            title={label}
            onClick={() => onNavChange(label)}
            className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
              active === label
                ? "bg-primary text-white shadow-sm"
                : "text-muted hover:bg-primary-50 hover:text-primary"
            }`}
          >
            <Icon size={17} strokeWidth={2.1} />
            <span className="sr-only">{label}</span>
          </button>
        ))}
      </nav>

      <div className="mt-auto flex flex-col items-center gap-3">
        <span
          title={xConnected ? "X connected" : "X not connected"}
          className={`relative flex h-9 w-9 items-center justify-center rounded-lg border ${
            xConnected ? "border-success bg-success-bg text-success" : "border-border bg-card-muted text-muted"
          }`}
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-black text-white">
            <XLogo size={12} />
          </span>
          {xConnected && <Check className="absolute -right-1 -top-1 rounded-full bg-success p-0.5 text-white" size={13} strokeWidth={3} />}
        </span>
        <ThemeToggle />
      </div>
    </aside>
  );
}
