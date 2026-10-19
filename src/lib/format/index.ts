/** Format data wajib — Panduan UI Bersama v1.0 bagian "Format data". */

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const MONTHS_LONG = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];
const DAYS_LONG = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export const TIMEZONE = "Asia/Jakarta";

/** "2026-10-05" dibaca sebagai tanggal lokal WIB, bukan UTC. */
export function parseDate(input: string | Date): Date {
  if (input instanceof Date) return input;
  const plain = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
  if (plain) return new Date(Number(plain[1]), Number(plain[2]) - 1, Number(plain[3]));
  return new Date(input);
}

/** formatDate(new Date("2026-10-05")) → "5 Okt 2026" */
export function formatDate(input: string | Date): string {
  const d = parseDate(input);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

/** formatDateLong("2026-10-05") → "Senin, 5 Okt 2026" */
export function formatDateLong(input: string | Date): string {
  const d = parseDate(input);
  if (Number.isNaN(d.getTime())) return "—";
  return `${DAYS_LONG[d.getDay()]}, ${formatDate(d)}`;
}

/** formatDateTime(iso) → "5 Okt 2026, 17.01 WIB" */
export function formatDateTime(input: string | Date): string {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "—";
  const p = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const get = (t: Intl.DateTimeFormatPartTypes) => p.find((x) => x.type === t)?.value ?? "";
  return `${Number(get("day"))} ${MONTHS_SHORT[Number(get("month")) - 1]} ${get("year")}, ${get("hour")}.${get("minute")} WIB`;
}

/** formatTime("08:17") → "08.17 WIB" — juga menerima ISO. */
export function formatTime(input: string): string {
  const hm = /^(\d{2}):(\d{2})/.exec(input);
  if (hm && !input.includes("T")) return `${hm[1]}.${hm[2]} WIB`;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "—";
  const t = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(d);
  return `${t.replace(":", ".")} WIB`;
}

/** formatNumber(12500) → "12.500" · formatNumber(3.5) → "3,5" */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(value);
}

/** formatCurrency(1250000) → "Rp 1.250.000" */
export function formatCurrency(value: number): string {
  return `Rp ${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(value)}`;
}

/** formatMonthLabel("2026-10") → "Oktober 2026" */
export function formatMonthLabel(month: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  if (!m) return month;
  return `${MONTHS_LONG[Number(m[2]) - 1]} ${m[1]}`;
}

/** Bulan berjalan WIB, "2026-10". */
export function currentMonth(): string {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE, year: "numeric", month: "2-digit" }).formatToParts(
    new Date(),
  );
  const get = (t: Intl.DateTimeFormatPartTypes) => p.find((x) => x.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}`;
}

/** "2026-10" → { from: "2026-10-01", to: "2026-10-31" } */
export function monthRange(month: string): { from: string; to: string } {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, "0")}` };
}

/** "08:00" → 480 menit */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** 495 → "08:15" */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Waktu sekarang menurut WIB. Acuan server (jawaban pertanyaan terbuka #1 PRD). */
export function wibNow(): { dateKey: string; minutes: number; iso: string } {
  const now = new Date();
  const p = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: Intl.DateTimeFormatPartTypes) => p.find((x) => x.type === t)?.value ?? "";
  return {
    dateKey: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
    iso: now.toISOString(),
  };
}

/** Timestamp dengan offset WIB, sesuai contoh kontrak "…+07:00". */
export function wibIso(dateKey: string, time: string): string {
  return `${dateKey}T${time}:00+07:00`;
}
