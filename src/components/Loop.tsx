import {
  Bookmark,
  Sparkles,
  Infinity as InfinityIcon,
  Zap,
  ChevronRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const steps: {
  icon: LucideIcon;
  title: string;
  bg: string;
  fg: string;
}[] = [
  {
    icon: Bookmark,
    title: "Save",
    bg: "var(--blue-bg)",
    fg: "var(--blue)",
  },
  {
    icon: Sparkles,
    title: "Understand",
    bg: "var(--primary-50)",
    fg: "var(--primary)",
  },
  {
    icon: InfinityIcon,
    title: "Remember",
    bg: "var(--amber-bg)",
    fg: "var(--amber)",
  },
  {
    icon: Zap,
    title: "Act",
    bg: "var(--success-bg)",
    fg: "var(--success)",
  },
];

export default function Loop() {
  return (
    <section className="card p-5">
      <div className="flex items-center justify-between gap-1">
        {steps.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={s.title} className="flex flex-1 items-center gap-1">
              <div
                className="animate-fade-up group flex flex-1 flex-col items-center gap-2 text-center"
                style={{ animationDelay: `${i * 90}ms` }}
              >
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 group-hover:-translate-y-0.5"
                  style={{ background: s.bg, color: s.fg }}
                >
                  <Icon size={20} strokeWidth={2} />
                </span>
                <p className="text-[13.5px] font-semibold">{s.title}</p>
              </div>
              {i < steps.length - 1 && (
                <ChevronRight
                  size={18}
                  className="shrink-0"
                  style={{ color: "var(--muted-soft)" }}
                />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
