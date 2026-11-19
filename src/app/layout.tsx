import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Plus_Jakarta_Sans, Source_Sans_3 } from "next/font/google";

import "@/styles/tokens.css";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-head",
  display: "swap",
});

const sourceSans3 = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kehadiran · Araya Business Hub",
  description: "Modul Kehadiran — Araya Business Hub Platform",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" className={`${plusJakartaSans.variable} ${sourceSans3.variable}`}>
      <body>
        <a href="#konten" className="skip-link">
          Lewati ke konten
        </a>
        {children}
      </body>
    </html>
  );
}
