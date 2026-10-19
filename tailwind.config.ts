import type { Config } from "tailwindcss";

/**
 * Token desain M13 — sumber nilai: Panduan UI Bersama v1.0 (Lampiran).
 * Semua warna/font/jarak mengacu ke CSS variable di src/styles/tokens.css.
 * Skala `spacing` dan `fontSize` di-override total supaya nilai di luar
 * panduan (mis. text-xl, p-9) tidak bisa dipakai.
 */
const status = (name: string) => ({
  fg: `var(--${name}-fg)`,
  bg: `var(--${name}-bg)`,
  solid: `var(--${name}-solid)`,
});

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    colors: {
      transparent: "transparent",
      current: "currentColor",
      inherit: "inherit",
      page: "var(--bg)",
      surface: "var(--surface)",
      "surface-2": "var(--surface-2)",
      line: "var(--line)",
      "line-strong": "var(--line-strong)",
      text: "var(--text)",
      muted: "var(--text-muted)",
      primary: {
        DEFAULT: "var(--primary)",
        hover: "var(--primary-hover)",
        soft: "var(--primary-soft)",
      },
      "on-primary": "var(--on-primary)",
      accent: "var(--accent)",
      success: status("success"),
      pending: status("pending"),
      danger: status("danger"),
      info: status("info"),
      neutral: status("neutral"),
      "danger-action": "var(--danger-action)",
      "on-danger-action": "var(--on-danger-action)",
      overlay: "rgb(15 23 42 / 0.45)",
    },
    borderColor: {
      DEFAULT: "var(--line)",
      line: "var(--line)",
      "line-strong": "var(--line-strong)",
      primary: "var(--primary)",
      transparent: "transparent",
      "success-solid": "var(--success-solid)",
      "pending-solid": "var(--pending-solid)",
      "danger-solid": "var(--danger-solid)",
      "info-solid": "var(--info-solid)",
      "neutral-solid": "var(--neutral-solid)",
    },
    divideColor: {
      DEFAULT: "var(--line)",
      line: "var(--line)",
    },
    ringColor: {
      DEFAULT: "var(--primary)",
      primary: "var(--primary)",
    },
    fontFamily: {
      head: "var(--font-head)",
      body: "var(--font-body)",
    },
    // Catatan: Tailwind tidak menerima fontFamily di tuple fontSize.
    // Judul memakai font head lewat aturan `h1,h2,h3` di globals.css.
    fontSize: {
      display: ["2rem", { lineHeight: "2.5rem", fontWeight: "800" }],
      h1: ["1.75rem", { lineHeight: "2.25rem", fontWeight: "700" }],
      h2: ["1.375rem", { lineHeight: "1.875rem", fontWeight: "700" }],
      h3: ["1.125rem", { lineHeight: "1.625rem", fontWeight: "600" }],
      "body-lg": ["1rem", { lineHeight: "1.5rem", fontWeight: "400" }],
      body: ["0.875rem", { lineHeight: "1.375rem", fontWeight: "400" }],
      label: ["0.875rem", { lineHeight: "1.25rem", fontWeight: "600" }],
      caption: ["0.75rem", { lineHeight: "1rem", fontWeight: "400" }],
    },
    spacing: {
      0: "0px",
      1: "var(--space-1)",
      2: "var(--space-2)",
      3: "var(--space-3)",
      4: "var(--space-4)",
      5: "var(--space-5)",
      6: "var(--space-6)",
      7: "var(--space-7)",
      navbar: "56px",
      sidebar: "240px",
      control: "var(--control-h)",
      "control-sm": "var(--control-h-sm)",
    },
    borderRadius: {
      sm: "var(--radius-sm)",
      lg: "var(--radius-lg)",
      full: "var(--radius-full)",
    },
    boxShadow: {
      DEFAULT: "var(--shadow)",
    },
    maxWidth: {
      content: "1280px",
      form: "640px",
      card: "480px",
      toast: "360px",
    },
    extend: {},
  },
  plugins: [],
};

export default config;
