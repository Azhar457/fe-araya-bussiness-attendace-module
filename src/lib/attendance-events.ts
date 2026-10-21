/** Broadcast perubahan kehadiran hari ini antar kartu dashboard (klien saja).
 *  PresensiCTA memancarkan setelah check-in/check-out sukses maupun gagal;
 *  kartu lain (Terminal, Rekapitulasi) memuat ulang saat menerima. */
export const ATTENDANCE_CHANGED = "araya:attendance-changed";

export function notifyAttendanceChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(ATTENDANCE_CHANGED));
  }
}

/** Daftar listener; kembalikan fungsi cleanup untuk useEffect. */
export function onAttendanceChanged(handler: () => void): () => void {
  window.addEventListener(ATTENDANCE_CHANGED, handler);
  return () => window.removeEventListener(ATTENDANCE_CHANGED, handler);
}
