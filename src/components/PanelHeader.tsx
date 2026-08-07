import type { ReactNode } from "react";

export function PanelHeader({
  number,
  title,
  right,
}: {
  number?: number;
  title: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="panel-eyebrow">
        {number != null && <span className="panel-badge">{number}</span>}
        {title}
      </span>
      {right}
    </div>
  );
}
