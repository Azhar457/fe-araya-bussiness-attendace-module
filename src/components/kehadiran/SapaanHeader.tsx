"use client";

import { Card } from "@/components/ui/Card";
import { Clock } from "lucide-react";
import { useWibClock, wibGreeting } from "@/lib/useWibClock";

/**
 * Header dashboard: sapaan nama + shift + jam live.
 * Sesuai mockup: "Selamat Pagi, Dimas" + "Shift Reguler · Pagi" + jam besar.
 */
export function SapaanHeader({ userName }: { userName: string }) {
  const time = useWibClock();

  const greeting = wibGreeting(new Date().getHours());

  return (
    <Card className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1">
        <p className="text-h2 text-text">
          {greeting}, {userName}
        </p>
        <p className="text-body text-muted">Shift Reguler &middot; Pagi</p>
      </div>
      <div className="flex items-center gap-2" aria-label={`Jam saat ini ${time} WIB`}>
        <Clock aria-hidden size={18} className="text-primary" />
        <span className="text-display font-head tabular-nums text-primary">{time}</span>
        <span className="text-caption text-muted">WIB</span>
      </div>
    </Card>
  );
}
