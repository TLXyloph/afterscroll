import {
  GraduationCap,
  Trophy,
  MapPin,
  FolderGit2,
  Rocket,
  Package,
  BookOpen,
  type LucideIcon,
} from "lucide-react";
import type { IconKey, Tint } from "@/lib/data";
import { tintStyle } from "@/lib/ui";

const iconMap: Record<IconKey, LucideIcon> = {
  cap: GraduationCap,
  trophy: Trophy,
  pin: MapPin,
  folder: FolderGit2,
  rocket: Rocket,
  package: Package,
  book: BookOpen,
};

export function CategoryIcon({
  icon,
  tint,
  size = 40,
}: {
  icon: IconKey;
  tint: Tint;
  size?: number;
}) {
  const Icon = iconMap[icon];
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-xl"
      style={{ width: size, height: size, ...tintStyle[tint] }}
    >
      <Icon size={size * 0.5} strokeWidth={2} />
    </span>
  );
}

export function XLogo({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
