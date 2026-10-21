"use client";

import { useEffect, useState } from "react";

/** Jam live WIB (update tiap detik). Dipakai header dashboard. */
export function useWibClock(): string {
  const [time, setTime] = useState("--:--:--");

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const wib = new Date(now.getTime() + (now.getTimezoneOffset() + 420) * 60_000);
      const pad = (n: number) => String(n).padStart(2, "0");
      setTime(`${pad(wib.getHours())}:${pad(wib.getMinutes())}:${pad(wib.getSeconds())}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return time;
}

/** Sapaan sesuai jam WIB: pagi <12, siang 12–17, sore 17–19, malam ≥19. */
export function wibGreeting(hour: number): string {
  if (hour < 12) return "Selamat Pagi";
  if (hour < 17) return "Selamat Siang";
  if (hour < 19) return "Selamat Sore";
  return "Selamat Malam";
}
