import type { Tint, ActionTone } from "./data";
import type { Category } from "./types";

// Live backend categories mapped onto the design's tint tokens
export const categoryTint: Record<
  Category,
  { background: string; color: string }
> = {
  coding: { background: "var(--blue-bg)", color: "var(--blue)" },
  fitness: { background: "var(--success-bg)", color: "var(--success)" },
  career: { background: "var(--amber-bg)", color: "var(--amber)" },
  finance: { background: "var(--primary-50)", color: "var(--primary)" },
  life: { background: "var(--rose-bg)", color: "var(--rose)" },
  other: { background: "var(--card-muted)", color: "var(--muted)" },
};

export const categoryLabel: Record<Category, string> = {
  coding: "Coding",
  fitness: "Fitness",
  career: "Career",
  finance: "Finance",
  life: "Life",
  other: "Other",
};

export const tintStyle: Record<Tint, { background: string; color: string }> = {
  primary: { background: "var(--primary-50)", color: "var(--primary)" },
  amber: { background: "var(--amber-bg)", color: "var(--amber)" },
  blue: { background: "var(--blue-bg)", color: "var(--blue)" },
  rose: { background: "var(--rose-bg)", color: "var(--rose)" },
  red: { background: "var(--red-bg)", color: "var(--red)" },
  success: { background: "var(--success-bg)", color: "var(--success)" },
};

export const actionStyle: Record<
  ActionTone,
  { background: string; color: string; border: string }
> = {
  success: {
    background: "var(--success-bg)",
    color: "var(--success)",
    border: "transparent",
  },
  blue: {
    background: "var(--blue-bg)",
    color: "var(--blue)",
    border: "transparent",
  },
  amber: {
    background: "var(--amber-bg)",
    color: "var(--amber)",
    border: "transparent",
  },
  neutral: {
    background: "var(--card)",
    color: "var(--muted)",
    border: "var(--border-strong)",
  },
};

export function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}
