import type { ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { AlertIcon, CheckIcon, InfoIcon, WarningIcon } from "@/components/ui/Icons";

export type BannerVariant = "danger" | "success" | "pending" | "info";

const ICONS = {
  danger: AlertIcon,
  success: CheckIcon,
  pending: WarningIcon,
  info: InfoIcon,
} as const;

const TONES: Record<BannerVariant, string> = {
  danger: "border-danger-solid bg-danger-bg text-danger-fg",
  success: "border-success-solid bg-success-bg text-success-fg",
  pending: "border-pending-solid bg-pending-bg text-pending-fg",
  info: "border-info-solid bg-info-bg text-info-fg",
};

export type BannerProps = {
  variant?: BannerVariant;
  message: ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
};

/** Pesan yang berlaku untuk seluruh halaman (Panduan UI 3 · Notifikasi · Banner). */
export function Banner({ variant = "danger", message, onRetry, retryLabel = "Coba lagi" }: BannerProps) {
  const Icon = ICONS[variant];
  return (
    <div
      role={variant === "danger" ? "alert" : "status"}
      className={`flex flex-col gap-3 rounded-lg border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${TONES[variant]}`}
    >
      <p className="flex items-center gap-2 text-body">
        <Icon aria-hidden />
        {message}
      </p>
      {onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
