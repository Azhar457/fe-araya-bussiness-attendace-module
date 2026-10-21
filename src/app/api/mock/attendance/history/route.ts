import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { currentMonth, wibNow } from "@/lib/format";
import { getState } from "@/mocks/store";

export const dynamic = "force-dynamic";

/** Bentuk wire: entri riwayat presensi untuk karyawan sesi saat ini. */
type HistoryRow = {
  tanggal: string; // "YYYY-MM-DD"
  jam_check_in: string | null; // "HH:MM"
  jam_check_out: string | null; // "HH:MM"
  status: string; // hadir | terlambat | izin | alpa
  lokasi: string | null; // label titik (mock: sesuai geofence kantor)
};

/** 5 hari kerja sebelum hari ini dalam bulan berjalan (mock, Senin–Jumat). */
function seedHistory(month: string): HistoryRow[] {
  const rows: HistoryRow[] = [];
  const todayKey = wibNow().dateKey;
  let t = Date.parse(`${todayKey}T00:00:00Z`);
  while (rows.length < 5) {
    t -= 86_400_000;
    const key = new Date(t).toISOString().slice(0, 10);
    if (key < `${month}-01`) break; // mock hanya mengisi bulan berjalan
    const weekday = new Date(t).getUTCDay();
    if (weekday === 0 || weekday === 6) continue; // hanya hari kerja
    const late = (rows.length + 1) % 4 === 0;
    rows.push({
      tanggal: key,
      jam_check_in: late ? "08:27" : `07:5${rows.length}`,
      jam_check_out: `17:0${(rows.length + 1) % 5}`,
      status: late ? "terlambat" : "hadir",
      lokasi: "The Araya lantai 2",
    });
  }
  // Slot kosong (misal demo di awal bulan) tetap tampil agar tabel 5 baris penuh.
  while (rows.length < 5) {
    rows.push({ tanggal: "—", jam_check_in: null, jam_check_out: null, status: "izin", lokasi: null });
  }
  return rows;
}

/** GET /api/mock/attendance/history — 5 presensi terakhir karyawan sesi. */
export async function GET() {
  const session = await getSession();
  const month = currentMonth();

  // Gabungkan catatan check-in/check-out aktual hari ini + seed histori.
  const today = getState().today[session.id];
  const rows = seedHistory(month);
  if (today) {
    rows.unshift({
      tanggal: today.date,
      jam_check_in: today.checkInAt ? today.checkInAt.slice(11, 16) : null,
      jam_check_out: today.checkOutAt ? today.checkOutAt.slice(11, 16) : null,
      status: today.status ?? "hadir",
      lokasi: today.checkInAt ? "The Araya lantai 2" : null,
    });
  }
  return NextResponse.json(rows.slice(0, 5));
}
