/**
 * API layer — BE LIVE (laboratorium-backend.vercel.app).
 *
 * Hanya memanggil endpoint yang benar-benar ada di BE deployed:
 *  - GET  /api/attendance/today        (header X-Employee-Id)
 *  - POST /api/attendance/check-in     (header X-Employee-Id)
 *  - POST /api/attendance/check-out    (header X-Employee-Id)
 *  - GET  /api/leave-permissions       (header X-Employee-Id)
 *  - POST /api/leave-permissions       (header X-Employee-Id)
 *  - GET  /api/attendance/recap?bulan=&tahun=
 *  - POST /api/working-hours           (HR)
 *
 * Semua data mock (`src/mocks/**`) sudah dihapus.
 */
import { ApiError, request } from "@/lib/api/client";
import type {
  LiveCheckInResult,
  LiveLeaveList,
  LiveLeaveResult,
  LiveRecap,
  LiveSession,
  LiveToday,
  LiveWorkingHoursResult,
} from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Sesi / identitas (mode BE: tidak ada endpoint /me di BE live;       */
/* identitas disimpan di cookie oleh halaman /masuk, dibaca client).   */
/* ------------------------------------------------------------------ */

/**
 * BE live tidak menyediakan `GET /api/me`. Identitas (numeric X-Employee-Id +
 * label) disimpan oleh halaman /masuk ke cookie sesi dan dibaca di client.
 * Fungsi ini hanya dipakai server-side untuk guard; di BE mode ia melempar
 * jelas agar tidak diandalkan.
 */
export function getSession(_signal?: AbortSignal): Promise<LiveSession> {
  return Promise.reject(
    new ApiError(
      0,
      "NO_SESSION",
      "Modus BE asli tidak memiliki endpoint sesi; identitas diambil dari cookie oleh client.",
    ),
  );
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

/** GET /api/leave-permissions — daftar milik karyawan (header X-Employee-Id). */
export function listLeaves(): Promise<LiveLeaveList> {
  return request<LiveLeaveList>("/api/leave-permissions");
}

/** POST /api/leave-permissions — ajukan izin/sakit (header X-Employee-Id). */
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
