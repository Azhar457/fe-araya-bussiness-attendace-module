import type { ReactNode } from "react";

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`rounded-lg border border-line bg-surface ${className}`}>{children}</div>;
}
