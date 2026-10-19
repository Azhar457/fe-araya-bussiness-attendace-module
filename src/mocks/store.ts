import { currentMonth, minutesToTime, monthRange, timeToMinutes, wibIso, wibNow } from "@/lib/format";
import type { AbsenceRequest, ApprovedLeave, Role, TodayAttendance, WorkSettings } from "@/lib/types";

/**
 * Store mock in-memory.
 * shortcut: state hilang saat server restart dan tidak dibagi antar instance.
 * Cukup untuk demo; ganti ke BE asli sebelum butuh data permanen.
 *
 * Seed di bawah = fixture sementara untuk membuktikan AC (bulan berisi/kosong, cuti vs alpa,
 * hari ini kosong), bukan sumber kebenaran. Setelah ERD/API contract SA keluar, sesuaikan
 * nama field & nilai di file ini saja — jangan dikosongkan, jangan ditambah.
 */

export type Employee = {
  id: string;
  name: string;
  division: string;
  role: Role;
};

export const EMPLOYEES: Employee[] = [
  { id: "emp-1", name: "Rani Kusumawati", division: "HR", role: "admin_hr" },
  { id: "emp-2", name: "Budi Santoso", division: "Keuangan", role: "karyawan" },
  { id: "emp-3", name: "Sinta Maharani", division: "Operasional", role: "karyawan" },
];

/** Hari kerja aktual per karyawan per bulan. sisanya dihitung dari izin/sakit/cuti. */
export type WorkRow = {
  employeeId: string;
  month: string;
  onTime: number;
  late: number;
  totalWorkDays: number;
};

export type MockState = {
  workSettings: WorkSettings;
  today: Record<string, TodayAttendance>;
  absenceRequests: AbsenceRequest[];
  approvedLeave: ApprovedLeave[];
  workRows: WorkRow[];
};

function seed(): MockState {
  const month = currentMonth();
  const { from: mFrom, to: mTo } = monthRange(month);
  const day = (n: number) => `${month}-${String(n).padStart(2, "0")}`;
  const nowIso = new Date().toISOString();

  return {
    workSettings: {
      workStart: "08:00",
      workEnd: "17:00",
      lateToleranceMinutes: 15,
      timezone: "Asia/Jakarta",
      updatedAt: nowIso,
    },
    // Kosong: karyawan contoh (emp-2) mulai tanpa catatan supaya alur
    // check-in → deteksi terlambat → check-out bisa didemokan utuh.
    today: {},
    absenceRequests: [
      {
        id: "abs-1",
        employeeId: "emp-2",
        type: "izin",
        startDate: day(12),
        endDate: day(12),
        reason: "Keperluan keluarga",
        status: "approved",
        createdAt: wibIso(mFrom, "09:10"),
      },
      {
        id: "abs-2",
        employeeId: "emp-2",
        type: "sakit",
        startDate: day(19),
        endDate: day(19),
        reason: "Demam, ada surat dokter",
        status: "pending",
        createdAt: wibIso(day(19), "06:40"),
      },
      {
        id: "abs-3",
        employeeId: "emp-3",
        type: "izin",
        startDate: day(20),
        endDate: day(21),
        reason: "Acara keluarga di luar kota",
        status: "pending",
        createdAt: wibIso(day(14), "15:05"),
      },
      {
        id: "abs-4",
        employeeId: "emp-3",
        type: "izin",
        startDate: day(3),
        endDate: day(3),
        reason: "Urusan administrasi",
        status: "rejected",
        createdAt: wibIso(day(2), "11:20"),
      },
      {
        id: "abs-5",
        employeeId: "emp-1",
        type: "sakit",
        startDate: day(14),
        endDate: day(14),
        reason: "Rawat jalan",
        status: "approved",
        createdAt: wibIso(day(14), "07:05"),
      },
      {
        id: "abs-6",
        employeeId: "emp-3",
        type: "sakit",
        startDate: day(6),
        endDate: day(6),
        reason: "Istirahat atas anjuran dokter",
        status: "approved",
        createdAt: wibIso(day(6), "07:30"),
      },
    ],
    // Kontrak cuti M12 (mock): hanya cuti berstatus disetujui yang masuk.
    approvedLeave: [
      { employeeId: "emp-2", date: day(7) },
      { employeeId: "emp-2", date: day(8) },
    ],
    workRows: [
      { employeeId: "emp-1", month, onTime: 20, late: 1, totalWorkDays: 23 },
      { employeeId: "emp-2", month, onTime: 18, late: 2, totalWorkDays: 23 },
      { employeeId: "emp-3", month, onTime: 15, late: 1, totalWorkDays: 23 },
    ],
  };
}

let state: MockState = seed();

export function getState(): MockState {
  return state;
}

export function resetState(): MockState {
  state = seed();
  return state;
}

export function emptyAttendance(date: string): TodayAttendance {
  return { date, checkInAt: null, checkOutAt: null, status: null, isLate: false, lateMinutes: 0 };
}

/**
 * Terlambat dihitung dari menit check-in terhadap (jamMasuk + toleransi),
 * bukan terhadap jamMasuk — sesuai contoh PRD 5.2 dan teks design.md 4.2.
 */
export function lateFromCheckIn(settings: WorkSettings, checkInMinutes: number): { isLate: boolean; lateMinutes: number } {
  const threshold = timeToMinutes(settings.workStart) + settings.lateToleranceMinutes;
  const lateMinutes = checkInMinutes - threshold;
  return lateMinutes > 0 ? { isLate: true, lateMinutes } : { isLate: false, lateMinutes: 0 };
}

export function currentTimeWib(): { dateKey: string; time: string; minutes: number } {
  const now = wibNow();
  return { dateKey: now.dateKey, time: minutesToTime(now.minutes), minutes: now.minutes };
}

/** Timestamp "sekarang" dengan offset WIB, sesuai contoh kontrak "…+07:00". */
export function nowWibIso(): string {
  const now = currentTimeWib();
  return wibIso(now.dateKey, now.time);
}
