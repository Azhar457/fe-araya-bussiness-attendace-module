/**
 * API layer — M13 (BE live). Autentikasi, presensi, izin, dan rekap 100% ke
 * endpoint BE M13 langsung (`NEXT_PUBLIC_API_BASE_URL` = laboratorium-backend);
 * FE tidak memanggil M12 sendiri — BE M13 yang memverifikasi ke M12 saat login.
 *
 * Endpoint M13 yang dipanggil:
 *   Auth:
 *   - POST /api/auth/login           (login: email M12 atau nik lokal → token M13)
 *   - POST /api/auth/logout          (blacklist jti token di BE)
 *   - GET  /api/auth/me              (identitas pemilik token M13)
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
  LiveEmergencyContact,
  LiveLeaveList,
  LiveLeaveQuota,
  LiveLeaveResult,
  LiveRecap,
  LiveToday,
  LiveWorkingHours,
  LiveWorkingHoursResult,
  M13AttendanceMonth,
  M13DailyRecap,
  M14PushResult,
  M13ApprovalResult,
  Role,
} from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Autentikasi — M13 langsung (POST /api/auth/login & logout)          */
/* ------------------------------------------------------------------ */

/** Respons POST /api/auth/login M13 — role sudah bentuk FE ("admin_hr" | "karyawan"). */
export type M13LoginResult = {
  token: string;
  tokenType?: string;
  expiresIn?: number;
  user: {
    karyawanId: number;
    nik: string;
    nama: string;
    role: Role;
    jabatan?: string | null;
    divisi?: string | null;
  };
};

/**
 * POST /api/auth/login (BE M13 langsung, bukan lewat M12).
 * email (akun M12; password diverifikasi BE ke M12) ATAU nik (akun lokal M13)
 * → token Bearer M13 + identitas/role. Anggap satu-satunya pintu masuk FE.
 */
export function m13Login(email: string, password: string): Promise<M13LoginResult> {
  return request<M13LoginResult>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

/**
 * POST /api/auth/logout (BE M13) — jti token masuk blacklist di BE sampai
 * kadaluarsa. Pelengkap: FE tetap menghapus cookie walau panggilan gagal.
 */
export function m13Logout(): Promise<{ message?: string }> {
  return request<{ message?: string }>("/api/auth/logout", {
    method: "POST",
    body: "{}",
  });
}

/** GET /api/auth/me (BE M13 langsung) — identitas pemilik token M13. */
export type M13MeResponse = {
  karyawanId: number;
  nik: string | null;
  nama: string;
  role: Role;
  jabatan?: string | null;
  divisi?: string | null;
};
export function getM13Me(): Promise<M13MeResponse> {
  return request<M13MeResponse>("/api/auth/me");
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
/* M13-US6 — daftar semua pengajuan izin/sakit untuk ditinjau HR. */
export function listLeavesForHR(): Promise<LiveLeaveList> {
  return request<LiveLeaveList>("/api/leave-permissions?scope=all");
}

/* M13-US6 — setujui / tolak satu pengajuan (berlaku ke semua baris rentang). */
export function approveLeave(
  pengajuanId: number,
  status: "disetujui" | "ditolak",
  reviewerNote?: string,
): Promise<M13ApprovalResult> {
  return request<M13ApprovalResult>(`/api/leave-permissions/${pengajuanId}`, {
    method: "PUT",
    body: JSON.stringify({ status, reviewer_note: reviewerNote ?? "" }),
  });
}

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

export type LeaveJenis = "izin" | "sakit" | "tugas_khusus";

export type LeaveInput = {
  /** Satu hari (format lama BE). Isi ATAU mulai+selesai, bukan keduanya. */
  tanggal?: string; // YYYY-MM-DD
  /** Rentang multi-hari — BE pecah per hari kerja (Sen–Jin), maks 90. */
  mulai?: string; // YYYY-MM-DD
  selesai?: string; // YYYY-MM-DD
  jenis: LeaveJenis;
  alasan: string;
};

/** GET /api/leave-permissions — daftar milik pemilik token. */
export function listLeaves(): Promise<LiveLeaveList> {
  return request<LiveLeaveList>("/api/leave-permissions");
}

/** POST /api/leave-permissions — ajukan izin/sakit/tugas khusus (identitas dari token). */
export function submitLeave(input: LeaveInput): Promise<LiveLeaveResult> {
  return request<LiveLeaveResult>("/api/leave-permissions", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** POST /api/leave-permissions/{id}/attachment — unggah lampiran (multipart, maks 5MB, gambar/PDF). */
export function uploadLeaveAttachment(leaveId: number, file: File): Promise<{ message: string }> {
  const form = new FormData();
  form.append("file", file);
  return request(`/api/leave-permissions/${leaveId}/attachment`, {
    method: "POST",
    body: form,
  });
}

/** GET /api/leave-quotas?year=… — sisa cuti tahunan. */
export function listLeaveQuotas(tahun: number): Promise<LiveLeaveQuota> {
  return request<LiveLeaveQuota>(`/api/leave-quotas?year=${tahun}`);
}

/** GET /api/profile/contact — kontak darurat. */
export function getEmergencyContact(): Promise<LiveEmergencyContact> {
  return request<LiveEmergencyContact>("/api/profile/contact");
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

/** GET /api/attendance/recap/daily?month=YYYY-MM (HANYA HR) — detail per hari. */
export function getDailyRecap(month: string): Promise<M13DailyRecap> {
  return request<M13DailyRecap>(`/api/attendance/recap/daily?month=${month}`);
}

/* ------------------------------------------------------------------ */
/* Integrasi antar modul — lewat route handler FE sendiri (same-origin)*/
/* ------------------------------------------------------------------ */

/** PULL M12: daftar karyawan aktif (HANYA HR; dipakai rekap Admin HR). */
/** PUSH M14: kirim rekap bulan terpilih ke endpoint M14. */
export function pushRekapKeM14(bulan: number, tahun: number): Promise<M14PushResult> {
  return request<M14PushResult>(
    "/api/m14/rekap",
    { method: "POST", body: JSON.stringify({ bulan, tahun }) },
    { local: true },
  );
}
