"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { AlertIcon, CheckIcon, CloseIcon, InfoIcon, WarningIcon } from "@/components/ui/Icons";

export type ToastVariant = "success" | "pending" | "danger" | "info";

export type ToastInput = {
  variant: ToastVariant;
  title: string;
  description?: string;
};

type ToastItem = ToastInput & { id: number };

const ICONS = { success: CheckIcon, pending: WarningIcon, danger: AlertIcon, info: InfoIcon } as const;

/** Kelas literal supaya ikut ter-scan Tailwind. */
const TONES: Record<ToastVariant, { border: string; circle: string }> = {
  success: { border: "border-l-success-solid", circle: "bg-success-bg text-success-fg" },
  pending: { border: "border-l-pending-solid", circle: "bg-pending-bg text-pending-fg" },
  danger: { border: "border-l-danger-solid", circle: "bg-danger-bg text-danger-fg" },
  info: { border: "border-l-info-solid", circle: "bg-info-bg text-info-fg" },
};

const ToastContext = createContext<{ push: (toast: ToastInput) => void } | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast harus dipakai di dalam <ToastProvider>.");
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const push = useCallback(
    (toast: ToastInput) => {
      const id = nextId.current++;
      setItems((current) => [...current, { ...toast, id }]);
      // Sukses & info hilang sendiri 5 detik; peringatan & galat tetap tampil.
      if (toast.variant === "success" || toast.variant === "info") {
        setTimeout(() => dismiss(id), 5000);
      }
    },
    [dismiss],
  );

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed left-5 right-5 top-5 z-50 flex flex-col gap-3 sm:left-auto sm:w-full sm:max-w-toast">
        {items.map((item) => {
          const Icon = ICONS[item.variant];
          return (
            <div
              key={item.id}
              role={item.variant === "danger" ? "alert" : "status"}
              className={`pointer-events-auto flex items-start gap-3 rounded-lg border border-line border-l-4 bg-surface p-4 shadow ${TONES[item.variant].border}`}
            >
              <span
                aria-hidden
                className={`flex size-6 shrink-0 items-center justify-center rounded-full ${TONES[item.variant].circle}`}
              >
                <Icon />
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="text-label text-text">{item.title}</p>
                {item.description ? <p className="text-body text-muted">{item.description}</p> : null}
              </div>
              <Button
                variant="tertiary"
                size="icon-sm"
                aria-label="Tutup notifikasi"
                onClick={() => dismiss(item.id)}
                leftIcon={<CloseIcon size={20} />}
              />
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
