/**
 * API layer — M13 (BE live) untuk auth + presensi. M13 BE (JWT_SECRET
 * sudah di-set di Vercel) meng-issue Bearer token via POST /api/auth/login.
 *
 * Endpoint M13 (ke NEXT_PUBLIC_API_BASE_URL = laboratorium-backend):
 *   Auth:
 *   - POST /api/auth/login          → { token, user, expiresIn }
 *   - POST /api/auth/logout         (Bearer)
 *   - GET  /api/auth/me             (Bearer) → profil
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
  LiveRecap,
  LiveToday,
  LiveWorkingHours,
  LiveWorkingHoursResult,
  M12EmployeeList,
  M13AttendanceMonth,
  M13DailyRecap,
  M13LoginResult,
  M13Me,
  M14PushResult,
} from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Autentikasi — M13 NATIVE (nik + password → Bearer token)          */
/* ------------------------------------------------------------------ */

/** POST /api/auth/login — nik + password → Bearer token M13. */
export function login(nik: string, password: string): Promise<M13LoginResult> {
  return request<M13LoginResult>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ nik, password }),
  });
}

/** POST /api/auth/logout — token dicabut di sisi M13. */
export function logout(): Promise<{ message: string }> {
  return request<{ message: string }>("/api/auth/logout", { method: "POST", body: "{}" });
}

/** GET /api/auth/me — profil M13 (Bearer token). */
export function getMe(): Promise<M13Me> {
  return request<M13Me>("/api/auth/me");
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
