import type { ButtonHTMLAttributes, ComponentPropsWithRef, ReactNode } from "react";

const VARIANTS = {
  primary: "border-transparent bg-primary text-on-primary hover:bg-primary-hover",
  secondary: "border-line-strong bg-surface text-text hover:bg-surface-2",
  tertiary: "border-transparent text-primary hover:bg-primary-soft",
  danger: "border-transparent bg-danger-action text-on-danger-action",
} as const;

const SIZES = {
  md: "h-control px-4",
  sm: "h-control-sm px-3",
  icon: "h-control w-control px-0",
  "icon-sm": "h-control-sm w-control-sm px-0",
} as const;

export type ButtonProps = ComponentPropsWithRef<"button"> & {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  loading?: boolean;
  /** Teks saat memproses, mis. "Menyimpan…" (Panduan UI 3 · Tombol). */
  loadingText?: string;
  leftIcon?: ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  loadingText,
  leftIcon,
  children,
  className = "",
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={[
        "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-sm border text-label transition-colors",
        VARIANTS[variant],
        SIZES[size],
        "disabled:cursor-not-allowed disabled:border-transparent disabled:bg-surface-2 disabled:text-muted",
        className,
      ].join(" ")}
    >
      {loading ? null : leftIcon}
      {loading ? (loadingText ?? children) : children}
    </button>
  );
}
