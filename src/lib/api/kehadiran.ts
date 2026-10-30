/**
 * API layer — M13 (BE live) untuk presensi. Login & me via M12
 * (proxy FE `/api/m12/auth/*`), token M12 dikirim ke semua endpoint M13
 * (shared `neondb`).
 *
 * Endpoint M13 (ke NEXT_PUBLIC_API_BASE_URL = laboratorium-backend):
 *   Presensi:
 *   - POST /api/working-hours       (HR)
 *   - GET  /api/working-hours
 *   - GET  /api/attendance/today
 *   - POST /api/attendance/check-in
 *   - POST /api/attendance/check-out
 *   - GET  /api/attendance?month=YYYY-MM          (riwayat presensi)
 *   - GET  /api/leave-permissions
 *   - GET  /api/leave-permissions?month=YYYY-MM
 *   - POST /api/leave-permissions
 *   - GET  /api/attendance/recap?month=YYYY-MM    (HR: rekap tim)
 */
import { request } from "@/lib/api/client";
import type {
  LiveCheckInResult,
  LiveLeaveList,
  LiveLeaveResult,
  LiveLoginResult,
  LiveRecap,
  LiveToday,
  LiveWorkingHours,
  LiveWorkingHoursResult,
  M12EmployeeList,
  M13AttendanceMonth,
  M13DailyRecap,
  M14PushResult,
  Role,
} from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Autentikasi — M12 (proxy FE /api/m12/auth/* → M12 POST /api/login) */
/* ------------------------------------------------------------------ */

/**
 * POST /api/m12/auth/login (proxy FE → M12 POST /api/login).
 * email + password → token M12 + identitas (role string M12).
 */
export function m12Login(email: string, password: string): Promise<LiveLoginResult> {
  return request<LiveLoginResult>("/api/m12/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  }, { local: true });
}

/**
 * POST /api/m12/auth/logout (proxy FE → M12 POST /api/logout, Bearer token).
 */
export function m12Logout(): Promise<{ message: string }> {
  return request<{ message: string }>("/api/m12/auth/logout", {
    method: "POST",
    body: "{}",
  }, { local: true });
}

/**
 * GET /api/m12/auth/me (proxy FE → M12 GET /api/me, Bearer token).
 * Balas M12: { employee_id, name, nik, role, ... } — role string
 * M12 ("Admin HR" | "Employee") dinormalisasi via `normalizeRole`.
 */
export type M12MeResponse = {
  success: boolean;
  employee_id: number;
  name: string;
  nik: string | null;
  /** "Admin HR" | "Employee" — label tampilan dari M12. */
  role: string;
};
export function getM12Me(): Promise<M12MeResponse> {
  return request<M12MeResponse>("/api/m12/auth/me", undefined, { local: true });
}

/**
 * Normalisasi role string M12 ("Admin HR" | "Employee") → Role FE
 * ("admin_hr" | "karyawan").
 */
export function normalizeRole(role: string): Role {
  const r = role.trim().toLowerCase();
  return r === "admin hr" || r === "admin_hr" || r === "admin" || r === "hr"
    ? "admin_hr"
    : "karyawan";
}

/* ------------------------------------------------------------------ */
/* Aturan jam kerja (US1) — satu baris global, disimpan via POST.      */
/* ------------------------------------------------------------------ */

export type WorkingHoursInput = {
  jam_masuk: string; // "08:00"
  jam_pulang: string; // "17:00"
  toleransi_keterlambatan: number; // menit
};

/** GET /api/working-hours (public) — aturan saat ini, untuk prefill form HR. */
export function getWorkingHours(): Promise<LiveWorkingHours> {
  return request<LiveWorkingHours>("/api/working-hours");
}
/** POST /api/working-hours (HR) — upsert aturan global (id=1). */
export function saveWorkingHours(input: WorkingHoursInput): Promise<LiveWorkingHoursResult> {
  return request<LiveWorkingHoursResult>("/api/working-hours", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/* ------------------------------------------------------------------ */
/* Kehadiran harian (US2)                                             */
/* ------------------------------------------------------------------ */

/** GET /api/attendance/today */
export function getToday(): Promise<LiveToday> {
  return request<LiveToday>("/api/attendance/today");
}

/** POST /api/attendance/check-in */
export function checkIn(): Promise<LiveCheckInResult> {
  return request<LiveCheckInResult>("/api/attendance/check-in", {
    method: "POST",
    body: "{}",
  });
}

/** POST /api/attendance/check-out */
export function checkOut(): Promise<LiveCheckInResult> {
  return request<LiveCheckInResult>("/api/attendance/check-out", {
    method: "POST",
    body: "{}",
  });
}

/* ------------------------------------------------------------------ */
/* Izin / sakit (US3)                                                */
/* ------------------------------------------------------------------ */

export type LeaveInput = {
  tanggal: string; // YYYY-MM-DD
  jenis: "izin" | "sakit";
  alasan: string;
};

/** GET /api/leave-permissions — daftar milik pemilik token. */
export function listLeaves(): Promise<LiveLeaveList> {
  return request<LiveLeaveList>("/api/leave-permissions");
}

/** POST /api/leave-permissions — ajukan izin/sakit (identitas dari token). */
export function submitLeave(input: LeaveInput): Promise<LiveLeaveResult> {
  return request<LiveLeaveResult>("/api/leave-permissions", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/* ------------------------------------------------------------------ */
/* Rekap bulanan (US5) — untuk payroll M14.                            */
/* ------------------------------------------------------------------ */

export function getRecap(bulan: number, tahun: number): Promise<LiveRecap> {
  return request<LiveRecap>(
    `/api/attendance/recap?month=${tahun}-${String(bulan).padStart(2, "0")}`,
  );
}

/* ------------------------------------------------------------------ */
/* Riwayat presensi per-bulan (halaman detail kehadiran)              */
/* ------------------------------------------------------------------ */

/**
 * GET /api/attendance?month=YYYY-MM → riwayat presensi semua karyawan
 * (HR) atau milik sendiri (Karyawan). Dipakai:
 *  - Karyawan: halaman detail kehadiran per-tanggal (pilih tanggal)
 *  - HR: rekapitulasi detail per hari (groupping per tanggal)
 */
export function getAttendanceMonth(month: string): Promise<M13AttendanceMonth> {
  return request<M13AttendanceMonth>(`/api/attendance?month=${month}`);
}

/** GET /api/leave-permissions?month=YYYY-MM → riwayat izin/sakit. */
export function listLeavesMonth(month: string): Promise<LiveLeaveList> {
  return request<LiveLeaveList>(`/api/leave-permissions?month=${month}`);
}

/** GET /api/attendance/recap/daily?month=YYYY-MM (HANYA HR) — detail per hari. */
export function getDailyRecap(month: string): Promise<M13DailyRecap> {
  return request<M13DailyRecap>(`/api/attendance/recap/daily?month=${month}`);
}

/* ------------------------------------------------------------------ */
/* Integrasi antar modul — lewat route handler FE sendiri (same-origin)*/
/* ------------------------------------------------------------------ */

/** PULL M12: daftar karyawan aktif (HANYA HR; dipakai rekap Admin HR). */
export function getKaryawanAktif(): Promise<M12EmployeeList> {
  return request<M12EmployeeList>("/api/m12/karyawan-aktif", undefined, { local: true });
}

/** PUSH M14: kirim rekap bulan terpilih ke endpoint M14. */
export function pushRekapKeM14(bulan: number, tahun: number): Promise<M14PushResult> {
  return request<M14PushResult>(
    "/api/m14/rekap",
    { method: "POST", body: JSON.stringify({ bulan, tahun }) },
    { local: true },
  );
}
