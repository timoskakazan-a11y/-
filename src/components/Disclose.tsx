"use client";
import { useState } from "react";

/** Раскрывающийся блок, который не захлопывается сам после обновления данных */
export function Disclose({ initialOpen = false, summary, children, className = "disclose card" }: {
  initialOpen?: boolean;
  summary: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(initialOpen);
  return (
    <details className={className} open={open} onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}>
      <summary className="row" style={{ fontWeight: 600 }}>{summary}</summary>
      {children}
    </details>
  );
}
