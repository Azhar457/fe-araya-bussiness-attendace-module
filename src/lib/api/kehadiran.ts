/**
 * API layer — M12 (Kel. C3) untuk auth + karyawan, M13 (BE live) untuk presensi.
 *
 * Keputusan ERP: M12 = satu-satunya sumber login, identitas, dan role.
 * M13 tidak lagi issue auth token. Semua endpoint proteksi M13 menerima
 * Bearer token M12.
 *
 * Endpoint M13 (presensi, ke NEXT_PUBLIC_API_BASE_URL = laboratorium-backend):
 *   - POST /api/working-hours          (Admin HR)
 *   - GET  /api/attendance/today
 *   - POST /api/attendance/check-in
 *   - POST /api/attendance/check-out
 *   - GET  /api/leave-permissions
 *   - POST /api/leave-permissions
 *   - GET  /api/attendance/recap?bulan=&tahun=
 *
 * Endpoint M12 (auth + karyawan aktif, via proxy same-origin karena M12 tidak
 * mengirim CORS — lihat `src/app/api/m12/*`):
 *   - POST /api/m12/auth/login    → M12 POST /api/login
 *   - GET  /api/m12/auth/me       → M12 GET  /api/me
 *   - POST /api/m12/auth/logout   → M12 POST /api/logout
 *   - GET  /api/m12/karyawan-aktif → M12 GET /api/karyawan/aktif (HANYA HR)
 *
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
  M12Session,
  M14PushResult,
} from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Autentikasi — SEKARANG MENYATU DI M12 (Kel. C3)                    */
/* ------------------------------------------------------------------ */

/**
 * POST /api/m12/auth/login (proxy same-origin → M12 POST /api/login).
 * Satu-satunya entry point login di ERP; identitas & role berasal M12.
 */
export function login(email: string, password: string): Promise<LiveLoginResult> {
  return request<LiveLoginResult>(
    "/api/m12/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
    },
    { local: true },
  );
}

/** POST /api/m12/auth/logout — token dicabut di sisi M12. */
export function logout(): Promise<{ message: string }> {
  return request<{ message: string }>(
    "/api/m12/auth/logout",
    { method: "POST", body: "{}" },
    { local: true },
  );
}

/** GET /api/m12/auth/me — profil + role + data diri Karyawan. */
export function getMe(): Promise<M12Session> {
  return request<M12Session>("/api/m12/auth/me", undefined, { local: true });
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
