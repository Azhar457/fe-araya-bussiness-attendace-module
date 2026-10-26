/**
 * API layer — BE LIVE (laboratorium-backend.vercel.app).
 *
 * Semua endpoint terproteksi memakai `Authorization: Bearer <token>` dari
 * POST /api/auth/login. Header `X-Employee-Id` sudah tidak dikirim FE.
 *
 *  - POST /api/auth/login             (NIK + password)
 *  - POST /api/auth/logout
 *  - GET  /api/attendance/today
 *  - POST /api/attendance/check-in
 *  - POST /api/attendance/check-out
 *  - GET  /api/leave-permissions
 *  - POST /api/leave-permissions
 *  - GET  /api/attendance/recap?bulan=&tahun=
 *  - POST /api/working-hours          (Admin HR)
 *
 * Semua data mock (`src/mocks/**`) sudah dihapus.
 */
import { request } from "@/lib/api/client";
import type {
  LiveCheckInResult,
  LiveLeaveList,
  LiveLeaveResult,
  LiveLoginResult,
  LiveRecap,
  LiveToday,
  LiveWorkingHoursResult,
  M12EmployeeList,
  M14PushResult,
} from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Autentikasi                                                        */
/* ------------------------------------------------------------------ */

/** POST /api/auth/login — identitas dan peran ditentukan BE, bukan pengguna. */
export function login(nik: string, password: string): Promise<LiveLoginResult> {
  return request<LiveLoginResult>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ nik, password }),
  });
}

/** POST /api/auth/logout — token dicabut di sisi BE (tabel revoked_tokens). */
export function logout(): Promise<{ message: string }> {
  return request<{ message: string }>("/api/auth/logout", { method: "POST", body: "{}" });
}

/* ------------------------------------------------------------------ */
/* Aturan jam kerja (US1) — satu baris global, disimpan via POST.      */
/* ------------------------------------------------------------------ */

export type WorkingHoursInput = {
  jam_masuk: string; // "08:00"
  jam_pulang: string; // "17:00"
  toleransi_keterlambatan: number; // menit
};

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

/** POST /api/attendance/check-in (SA v0.2 — identitas dari header X-Employee-Id). */
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
    `/api/attendance/recap?bulan=${encodeURIComponent(String(bulan))}&tahun=${encodeURIComponent(String(tahun))}`,
  );
}

/* ------------------------------------------------------------------ */
/* Integrasi antar modul — lewat route handler FE sendiri (same-origin)*/
/* karena M12 tidak mengirim header CORS dan M14 belum punya endpoint. */
/* ------------------------------------------------------------------ */

/** PULL M12: daftar karyawan aktif (dipakai /masuk + nama pada rekap). */
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

