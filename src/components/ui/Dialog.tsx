"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { Button } from "@/components/ui/Button";

export type DialogProps = {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: "primary" | "danger";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Konfirmasi wajib untuk aksi yang tidak bisa dibatalkan (Panduan UI 3 · Dialog). */
export function Dialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Batal",
  variant = "danger",
  loading = false,
  onConfirm,
  onCancel,
}: DialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  // shortcut: tanpa focus trap penuh — cukup fokus awal ke "Batal" + tutup via Escape.
  // Tambahkan trap bila dialog dipakai untuk alur panjang/bertingkat.
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby={description ? "dialog-description" : undefined}
        className="w-full max-w-card rounded-lg border border-line bg-surface p-5 shadow"
      >
        <h2 id="dialog-title" className="text-h3 text-text">
          {title}
        </h2>
        {description ? (
          <div id="dialog-description" className="mt-3 text-body text-muted">
            {description}
          </div>
        ) : null}
        <div className="mt-5 flex justify-end gap-3">
          <Button ref={cancelRef} variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={variant} loading={loading} loadingText="Memproses…" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
