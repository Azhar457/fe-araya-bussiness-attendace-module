/** Tipe domain M13 — bentuk ini = kontrak ASUMSI FE (lihat README bagian Kontrak API). */

export type Role = "admin_hr" | "karyawan";

/** 5 status baku panduan UI. Tidak boleh ditambah. */
export type AttendanceStatus = "hadir" | "terlambat" | "izin" | "sakit" | "cuti" | "alpa";

export type AbsenceType = "izin" | "sakit";
export type AbsenceStatus = "pending" | "approved" | "rejected";

export type Session = {
  id: string;
  name: string;
  role: Role;
};

/** Akun untuk halaman masuk. Hanya ada di mode mock sampai BE menetapkan SSO/token. */
export type Account = {
  id: string;
  name: string;
  division: string;
  role: Role;
};

export type WorkSettings = {
  workStart: string; // "08:00"
  workEnd: string; // "17:00"
  lateToleranceMinutes: number; // 15
  timezone: string; // "Asia/Jakarta"
  updatedAt: string; // ISO
};

export type TodayAttendance = {
  date: string; // "2026-10-05"
  checkInAt: string | null;
  checkOutAt: string | null;
  status: AttendanceStatus | null;
  isLate: boolean;
  lateMinutes: number; // menit lewat (jamMasuk + toleransi)
};

export type AbsenceRequest = {
  id: string;
  employeeId: string;
  type: AbsenceType;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  reason: string;
  status: AbsenceStatus;
  createdAt: string;
};

export type MonthlySummaryRow = {
  employeeId: string;
  name: string;
  division: string;
  present: number; // hadir (tepat waktu)
  late: number; // terlambat
  izin: number;
  sakit: number;
  cuti: number; // dari cuti M12 berstatus disetujui
  alpa: number;
  totalWorkDays: number;
};

export type MonthlySummary = {
  month: string; // "2026-10"
  hasData: boolean;
  rows: MonthlySummaryRow[];
};

export type ApprovedLeave = {
  employeeId: string;
  date: string; // YYYY-MM-DD
};

export type ApiErrorBody = {
  code: string;
  message: string;
  field?: string;
};
