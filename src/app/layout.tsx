import type { Metadata } from "next";
import type { ReactNode } from "react";

import "@/styles/tokens.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kehadiran · Araya Business Hub",
  description: "Modul M13 Kehadiran — Araya Business Hub Platform (Kel. C4)",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&family=Source+Sans+3:wght@400;600;700&display=swap"
        />
      </head>
      <body>
        <a href="#konten" className="skip-link">
          Lewati ke konten
        </a>
        {children}
      </body>
    </html>
  );
}
