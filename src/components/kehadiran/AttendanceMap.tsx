"use client";

import { Card } from "@/components/ui/Card";
import { formatMonthLabel, wibNow } from "@/lib/format";

export type MapDayTone = "success" | "pending" | "info" | "danger";

/** Isi satu sel kalender: tone warna + label singkat (jam masuk / status). */
export type MapDay = { tone?: MapDayTone; label: string };

const TONE_CELL: Record<MapDayTone, string> = {
  success: "bg-success-bg text-success-fg",
  pending: "bg-pending-bg text-pending-fg",
  info: "bg-info-bg text-info-fg",
  danger: "bg-danger-bg text-danger-fg",
};

const TONE_DOT: Record<MapDayTone, string> = {
  success: "bg-success-solid",
  pending: "bg-pending-solid",
  info: "bg-info-solid",
  danger: "bg-danger-solid",
};

const HARI = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

const LEGEND: { tone: MapDayTone; label: string }[] = [
  { tone: "success", label: "Tepat Waktu" },
  { tone: "pending", label: "Terlambat" },
  { tone: "info", label: "Cuti / Izin" },
  { tone: "danger", label: "Alpa" },
];

/**
 * Peta kehadiran bulanan (kalender Sen–Min). Hari tanpa data tetap tampil
 * sebagai sel kosong; Sabtu/Minggu ditandai "Libur". Bila `onSelect` diberikan,
 * tiap tanggal bisa diklik (dipakai halaman detail per hari).
 */
export function AttendanceMap({
  month,
  days,
  selected,
  onSelect,
}: {
  month: string; // YYYY-MM
  days: Record<string, MapDay>;
  selected?: string | null;
  onSelect?: (date: string) => void;
}) {
  const [tahun, bulan] = month.split("-").map(Number);
  const hariIni = wibNow().dateKey;
  const jumlahHari = new Date(Date.UTC(tahun, bulan, 0)).getUTCDate();
  const offset = (new Date(Date.UTC(tahun, bulan - 1, 1)).getUTCDay() + 6) % 7; // Senin = 0

  const cells: (string | null)[] = Array.from({ length: offset }, () => null);
  for (let d = 1; d <= jumlahHari; d += 1) {
    cells.push(`${month}-${String(d).padStart(2, "0")}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <Card className="flex flex-col gap-4 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-h3 text-text">
          Peta Kehadiran Bulanan ({formatMonthLabel(month)})
        </h2>
        <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {LEGEND.map((item) => (
            <li key={item.label} className="flex items-center gap-2 text-caption text-muted">
              <span aria-hidden className={`size-2 rounded-full ${TONE_DOT[item.tone]}`} />
              {item.label}
            </li>
          ))}
          <li className="flex items-center gap-2 text-caption text-muted">
            <span aria-hidden className="size-2 rounded-full bg-neutral-solid" />
            Libur Akhir Pekan
          </li>
        </ul>
      </div>

      <div>
        <div className="grid grid-cols-7 gap-2">
          {HARI.map((nama) => (
            <p
              key={nama}
              className={`text-caption font-semibold uppercase ${nama === "Sab" || nama === "Min" ? "text-danger-fg" : "text-muted"}`}
            >
              {nama}
            </p>
          ))}
        </div>

        <div className="mt-2 grid grid-cols-7 gap-2">
          {cells.map((date, index) => {
            if (!date) return <div key={`kosong-${index}`} aria-hidden />;

            const nomor = Number(date.slice(8, 10));
            const hari = new Date(`${date}T00:00:00Z`).getUTCDay();
            const libur = hari === 0 || hari === 6;
            const masaDepan = date > hariIni;
            const iniHari = date === hariIni;
            const data = days[date];

            const bisaKlik = Boolean(onSelect) && !masaDepan && !libur;
            const aktif = selected === date;

            let isi: React.ReactNode;
            let kelas = "bg-surface-2 text-muted";

            if (libur) {
              isi = <span className="text-caption">Libur</span>;
            } else if (masaDepan) {
              kelas = "border border-dashed border-line text-muted";
              isi = <span className="text-caption">—</span>;
            } else if (data?.tone) {
              kelas = TONE_CELL[data.tone];
              isi = (
                <span className="flex items-center gap-1 text-caption font-medium">
                  <span aria-hidden className={`size-1.5 shrink-0 rounded-full ${TONE_DOT[data.tone]}`} />
                  <span className="truncate">{data.label}</span>
                </span>
              );
            } else if (data) {
              isi = <span className="text-caption">{data.label}</span>;
            } else {
              kelas = "border border-dashed border-line text-muted";
              isi = <span className="text-caption">—</span>;
            }

            const sorot = aktif
              ? "ring-2 ring-primary"
              : iniHari
                ? "ring-1 ring-primary/40"
                : "";
            const dasar = `flex min-h-16 flex-col justify-between rounded-lg p-2 text-left ${kelas} ${sorot}`;

            const sel = (
              <>
                <span className="text-caption font-semibold tabular-nums">
                  {String(nomor).padStart(2, "0")}
                </span>
                {isi}
              </>
            );

            return bisaKlik ? (
              <button
                key={date}
                type="button"
                onClick={() => onSelect?.(date)}
                aria-pressed={aktif}
                aria-label={`Lihat detail ${date}`}
                className={`${dasar} transition-shadow hover:ring-2 hover:ring-primary/40`}
              >
                {sel}
              </button>
            ) : (
              <div key={date} className={dasar}>
                {sel}
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
