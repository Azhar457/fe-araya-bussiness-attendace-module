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

/**
 * Respons M12 `GET /api/me` — profil + role + employee milik user login.
 * Nilai top-level: id, employee_id, user_id, nama/name, email, jabatan,
 * divisi, nik, status_kerja, role.
 *
 * `role` dari M12: "Admin HR" | "Employee". FE M13 menormalisasi ke
 * `Role` (admin_hr | karyawan) di `src/lib/auth/session.ts` (`normalizeRole`).
 */
export type M12Session = {
  success: boolean;
  id: number;
  employee_id: number;
  user_id: number;
  nama: string;
  name: string;
  email: string;
  jabatan: string;
  divisi: string;
  nik: string;
  status_kerja: string;
  /** "Admin HR" | "Employee" — label tampilan dari M12. */
  role: string;
  data?: {
    id: number;
    user_id: number;
    employee_id: number;
    name: string;
    nama: string;
    email: string;
    role: string;
    role_code: string;
    nik: string;
    jabatan?: string;
    divisi?: string;
    status_kerja?: string;
    employee?: {
      id: number;
      nik: string;
      nama: string;
      jabatan: string;
      divisi: string;
      status_kerja: string;
      tanggal_berhenti: string | null;
    };
  };
};

/**
 * Respons M12 `POST /api/login` (Kel. C3) — satu-satunya sumber login +
 * identitas + role di ERP (lihat CONFIRMATION_TO_M12.md §2).
 *
 * Top-level: { success, message, token, role, employee_id, name, nik, data }.
 * `role`: "Admin HR" | "Employee"; `role_code`: "hr" | "karyawan".
 * Token M12 dipakai di semua endpoint M13 (shared Neon `neondb`).
 */
export type LiveLoginResult = {
  success: boolean;
  message: string;
  /** Bearer token M12 — disimpan di cookie `araya_token` oleh FE M13. */
  token: string;
  /** "Admin HR" | "Employee". */
  role: string;
  /** Id numerik karyawan M12 (dipakai M13 di semua endpoint presensi). */
  employee_id: number;
  name: string;
  nik: string;
  data?: {
    token: string;
    token_type: string;
    role: string;
    employee_id: number;
    name: string;
    nik: string;
    user?: {
      id: number;
      name: string;
      email: string;
      role: string;
      /** "hr" | "karyawan" */
      role_code: string;
      employee_id: number;
      nik: string;
      employee?: {
        id: number;
        nik: string;
        nama: string;
        jabatan: string;
        divisi: string;
        status_kerja: string;
        tanggal_berhenti: string | null;
      };
    };
  };
};
/* ================================================================== */
/* Bentuk wire M13 LIVE (endpoint presensi BE live)                    */
/* ================================================================== */

/** GET /api/attendance?month=YYYY-MM → riwayat presensi per-bulan (punya token). */
export type M13AttendanceMonth = {
  month: string; // "2026-10"
  items: M13AttendanceItem[];
};

/** Satu baris riwayat presensi per hari. */
export type M13AttendanceItem = {
  id: number;
  employeeId: number;
  date: string; // "2026-10-24"
  checkInAt: string | null;
  checkOutAt: string | null;
  status: "hadir" | "terlambat" | "izin" | "sakit" | "cuti" | "alpa" | null;
  isLate: boolean;
  lateMinutes: number;
};

/**
 * GET /api/attendance/recap/daily?month=YYYY-MM (HANYA HR, baru di BE).
 * Rekapitulasi detail per hari: setiap baris = satu (karyawan × tanggal).
 */
export type M13DailyRecap = {
  success: boolean;
  data: {
    periode: { bulan: number; tahun: number };
    items: Array<{
      karyawanId: number;
      nama: string;
      nik: string | null;
      tanggal: string;
      checkInAt: string | null;
      checkOutAt: string | null;
      status: "hadir" | "terlambat" | "izin" | "sakit" | "cuti" | "alpa" | null;
      isLate: boolean;
      lateMinutes: number;
    }>;
    kosong: boolean;
  };
};

/* ================================================================== */
/* Bentuk wire BE LIVE (laboratorium-backend.vercel.app)               */
/* ================================================================== */

/** GET /api/attendance/today → attendance */
export type LiveTodayAttendance = {
  id: number;
  employeeId: number;
  date: string; // "2026-10-24"
  checkInAt: string | null; // ISO +07:00
  checkOutAt: string | null;
  status: "hadir" | "terlambat" | "izin" | "sakit" | "cuti" | "alpa" | null;
  isLate: boolean;
  lateMinutes: number;
  latitude: number | null;
  longitude: number | null;
};

/** GET /api/attendance/today */
export type LiveToday = {
  date: string;
  isWorkday: boolean;
  hasCheckedIn: boolean;
  hasCheckedOut: boolean;
  attendance: LiveTodayAttendance | null;
};

/**
 * POST /api/attendance/check-in → 201 dan check-out → 200.
 * BE live mengembalikan baris presensi langsung, BUKAN { message, data }.
 * Sudah diverifikasi 26/10/2026.
 */
export type LiveCheckInResult = LiveTodayAttendance;

/** GET /api/attendance/recap */
export type LiveRecap = {
  success: boolean;
  message?: string;
  data: {
    periode: { bulan: number; tahun: number };
    rekap: Array<{
      karyawan_id: number;
      nama?: string | null;
      nik?: string | null;
      hadir: number;
      terlambat: number;
      izin_sakit: number;
      cuti: number;
      alpa: number;
    }>;
    ringkasan?: Record<string, number>;
  };
};

/** GET /api/working-hours → aturan jam kerja saat ini (BE live, camelCase). */
export type LiveWorkingHours = {
  id: number;
  workStart: string; // "08:00:00"
  workEnd: string; // "17:00:00"
  lateToleranceMinutes: number;
  timezone?: string;
};

/** POST /api/working-hours → 200 (respon = aturan baru tersimpan). */
export type LiveWorkingHoursResult = LiveWorkingHours & { message: string };

/** POST /api/leave-permissions → 201 (atau 200 bila semua tanggal dilewati/duplikat). */
export type LiveLeaveResult = {
  message: string;
  data: {
    pengajuan_id: number;
    mulai: string;
    selesai: string;
    jenis: string;
    dibuat: number;
    dilewati: number;
    tanggal_dibuat: string[];
    tanggal_dilewati: string[];
  };
};

/** Lampiran (mis. SKD) pada satu baris pengajuan. */
export type LiveLeaveAttachment = { id: number; url: string; uploaded_at?: string | null };

/** GET /api/leave-permissions → { success, data: [] } — 1 baris per tanggal. */
export type LiveLeaveList = {
  success: boolean;
  data: Array<{
    id?: number;
    pengajuan_id?: number;
    tanggal: string;
    jenis: string;
    alasan: string;
    created_at?: string;
    status?: string;
    reviewer_note?: string | null;
    attachment?: LiveLeaveAttachment | null;
    karyawan_id?: number;
  }>;
};

/** GET /api/leave-quotas?year=… — kuota cuti tahunan (dari kontrak cuti M12). */
export type LiveLeaveQuota = {
  success: boolean;
  data: {
    tahun: number;
    kuota_total: number;
    terpakai: number;
    sisa: number;
    detail_per_jenis: Array<{ jenis: string; kuota: number; terpakai: number }>;
    pengajuan_lain: Record<string, number>;
  };
};

/** GET/PUT /api/profile/contact — kontak darurat. */
export type LiveEmergencyContact = {
  success: boolean;
  data: {
    nama: string | null;
    hubungan: string | null;
    telepon: string | null;
    updated_at?: string | null;
  };
};

/* ================================================================== */
/* Kontrak M12 (Kel. C3) — ditarik lewat proxy FE karena M12 tidak     */
/* mengirim header CORS. Lihat Kontrak_M13_ke_M12.md.                  */
/* ================================================================== */

export type M12Employee = {
  id: number;
  nik: string;
  nama: string;
  jabatan: string;
  divisi: string;
  status_kerja: string;
};

/** GET /api/m12/karyawan-aktif (proxy) */
export type M12EmployeeList = {
  data: M12Employee[];
  /** terisi bila M12 tidak dapat dihubungi; data kosong, bukan error fatal. */
  error?: string;
};

/** POST /api/m14/rekap (proxy) — hasil kirim rekap ke M14. */
export type M14PushResult = {
  sent: boolean;
  message: string;
  detail?: unknown;
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

/** AbsenceRequest + metadata karyawan (nama/divisi) — dipakai daftar approval HR. */
export type AbsenceRequestWithMeta = AbsenceRequest & {
  employeeName: string;
  employeeDivision: string;
};

export type AttendanceHistoryRow = {
  employeeId?: string;
  employeeName?: string;
  tanggal: string; // "YYYY-MM-DD" atau "—" bila slot kosong
  jam_check_in: string | null; // "HH:MM"
  jam_check_out: string | null; // "HH:MM"
  status: AttendanceStatus;
  lokasi: string | null;
};

export type LeaveQuota = {
  total: number;
  used: number;
  remaining: number;
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
  meta?: RecapMeta;
};

export type ApprovedLeave = {
  employeeId: string;
  date: string; // YYYY-MM-DD
};

/* ── ERD M13 v2 (SYSTEM ANALYST) ───────────────────────────────────── */

/** ref M12 — daftar jabatan. Di BE asli datang dari tabel positions. */
export type Position = {
  id: string;
  name: string; // "EMPLOYEE" | "HR" (mock memakai label yang mudah dibaca)
};

/** 1 = Senin … 7 = Minggu (ISO-8601). */
export type WorkDay = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/**
 * working_hours: satu aturan per jabatan per tanggal berlaku.
 * UNIQUE(position_id, effective_from); versi lama ditutup otomatis (effectiveTo).
 */
export type WorkRule = {
  id: string;
  positionId: string;
  positionName: string;
  workStart: string; // "08:00"
  workEnd: string; // "17:00"
  lateToleranceMinutes: number; // 0–15
  workDays: WorkDay[];
  effectiveFrom: string; // YYYY-MM-DD
  effectiveTo: string | null; // null = masih berlaku
  createdAt: string; // ISO
  createdBy: string;
};

export type WorkRuleInput = {
  positionId: string;
  workStart: string;
  workEnd: string;
  lateToleranceMinutes: number;
  workDays: WorkDay[];
  effectiveFrom: string;
};

export type HolidayType = "NATIONAL" | "JOINT_LEAVE" | "CUSTOM";

export type Holiday = {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  type: HolidayType;
  createdBy: string;
};

export type HolidayInput = {
  date: string;
  name: string;
  type: HolidayType;
};

/** Status siklus rekap bulanan (US5: generate → kunci → kirim M14). */
export type RecapMeta = {
  month: string;
  generatedAt: string | null;
  lockedAt: string | null;
  sentAt: string | null;
};

export type RecapExport = {
  id: string;
  month: string;
  sentAt: string;
  sentBy: string;
  rowCount: number;
};

export type ApiErrorBody = {
  code: string;
  message: string;
  field?: string;
};
