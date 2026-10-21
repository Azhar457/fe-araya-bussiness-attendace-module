import { ApiError, request, USE_MOCK } from "@/lib/api/client";
import type {
  AbsenceRequest,
  AbsenceRequestWithMeta,
  ApprovedLeave,
  MonthlySummary,
  Session,
  TodayAttendance,
  WorkSettings,
  AttendanceHistoryRow,
  LeaveQuota,
} from "@/lib/types";
import type { AbsenceInput, WorkSettingsInput } from "@/lib/validation";
import type { GeoCapture } from "@/lib/geo";

/* ------------------------------------------------------------------ */
/* Bentuk wire BE (Neon/Postgres) — field pakai nama snake_case DB.   */
/* ------------------------------------------------------------------ */

interface BeWorkHours {
  jam_masuk: string;
  jam_pulang: string;
  toleransi_keterlambatan: number;
}

interface BeWorkHoursResponse {
  data: BeWorkHours;
}
interface BeCheckInResponse {
  data: {
    tanggal: string;
    jam: string;
    status: "hadir" | "terlambat";
  };
}

interface BeRecapRow {
  karyawan_id: number;
  hadir: number;
  terlambat: number;
  izin_sakit: number;
  cuti: number;
  alpa: number;
}

/* ------------------------------------------------------------------ */
/* Mapper: wire BE → tipe domain FE                                    */
/* ------------------------------------------------------------------ */

function mapWorkSettings(raw: BeWorkHours): WorkSettings {
  return {
    workStart: raw.jam_masuk.length >= 5 ? raw.jam_masuk.slice(0, 5) : raw.jam_masuk,
    workEnd: raw.jam_pulang.length >= 5 ? raw.jam_pulang.slice(0, 5) : raw.jam_pulang,
    lateToleranceMinutes: raw.toleransi_keterlambatan,
    // BE tidak menyimpan timezone & updatedAt — nilai statis sah.
    timezone: "Asia/Jakarta",
    updatedAt: new Date(0).toISOString(),
  };
}

function mapCheckIn(raw: BeCheckInResponse, todayKey: string): TodayAttendance {
  const d = raw.data;
  return {
    date: todayKey,
    checkInAt: `${d.tanggal}T${d.jam}:00+07:00`,
    checkOutAt: null,
    status: d.status,
    isLate: d.status === "terlambat",
    lateMinutes: 0,
  };
}

function mapRecapRows(rows: BeRecapRow[], monthKey: string): MonthlySummary {
  return {
    month: monthKey,
    hasData: rows.length > 0,
    rows: rows.map((r) => ({
      employeeId: String(r.karyawan_id),
      name: String(r.karyawan_id),
      division: "",
      present: r.hadir,
      late: r.terlambat,
      izin: 0,
      sakit: 0,
      cuti: r.cuti,
      alpa: r.alpa,
      totalWorkDays: r.hadir + r.terlambat + r.izin_sakit + r.cuti + r.alpa,
    })),
  };
}

/* ------------------------------------------------------------------ */
/* Endpoint API — path sesuai kontrak BE (swagger.json)                */
/* ------------------------------------------------------------------ */

export function getSession(): Promise<Session> {
  return request<Session>("/me");
}

/** GET /api/working-hours — mock mengembalikan bentuk FE, BE mengembalikan {data: bentuk DB}. */
export function getWorkSettings(): Promise<WorkSettings> {
  return request<Partial<WorkSettings> & { data?: BeWorkHours }>("/api/working-hours").then((res) =>
    res.data ? mapWorkSettings(res.data) : (res as WorkSettings),
  );
}

/** POST /api/working-hours */
export function updateWorkSettings(input: WorkSettingsInput): Promise<WorkSettings> {
  return request<{ message: string }>(
    "/api/working-hours",
    {
      method: "POST",
      body: JSON.stringify({
        jam_masuk: `${input.workStart}:00`,
        jam_pulang: `${input.workEnd}:00`,
        toleransi_keterlambatan: input.lateToleranceMinutes,
      }),
    },
  ).then(
    () =>
      ({
        workStart: input.workStart,
        workEnd: input.workEnd,
        lateToleranceMinutes: input.lateToleranceMinutes,
        timezone: "Asia/Jakarta",
        updatedAt: new Date().toISOString(),
      }) as WorkSettings,
  );
}

interface BeTodayResponse {
  sudah_absen: boolean;
  data: {
    id: number;
    tanggal: string;
    jam_check_in: string | null;
    jam_check_out: string | null;
    status: string;
  } | null;
}

/** GET /api/attendance/today — mock mengembalikan bentuk FE langsung; BE {sudah_absen, data}. */
export function getToday(): Promise<TodayAttendance> {
  const dateKey = new Date().toISOString().split("T")[0];
  return request<BeTodayResponse | TodayAttendance>("/api/attendance/today").then((res) => {
    if (!("sudah_absen" in res)) return res as TodayAttendance;
    if (!res.data) {
      return { date: dateKey, checkInAt: null, checkOutAt: null, status: null, isLate: false, lateMinutes: 0 };
    }
    const d = res.data;
    return {
      date: d.tanggal,
      checkInAt: d.jam_check_in ? `${d.tanggal}T${d.jam_check_in}:00+07:00` : null,
      checkOutAt: d.jam_check_out ? `${d.tanggal}T${d.jam_check_out}:00+07:00` : null,
      status: d.status as TodayAttendance["status"],
      isLate: d.status === "terlambat",
      lateMinutes: 0,
    };
  });
}

/** POST /api/attendance/check-in — kirim karyawan_id (dari cookie sesi) + geolokasi. */
export function checkIn(geo?: GeoCapture): Promise<TodayAttendance> {
  const dateKey = new Date().toISOString().split("T")[0];
  const employeeId = readEmployeeIdFromBody();
  return request<BeCheckInResponse | TodayAttendance>(
    "/api/attendance/check-in",
    {
      method: "POST",
      body: JSON.stringify({ karyawan_id: employeeId }),
      geo,
    },
  ).then((body) => ("data" in body ? mapCheckIn(body, dateKey) : (body as TodayAttendance)));
}

/** POST /api/attendance/check-out — kirim geolokasi; karyawan_id dari header X-Employee-Id. */
export function checkOut(geo?: GeoCapture): Promise<TodayAttendance> {
  const dateKey = new Date().toISOString().split("T")[0];
  return request<{ message: string; jam_check_out: string } | TodayAttendance>(
    "/api/attendance/check-out",
    {
      method: "POST",
      body: "{}",
      geo,
    },
  ).then((res) =>
    "jam_check_out" in res
      ? {
          date: dateKey,
          checkInAt: null,
          checkOutAt: `${dateKey}T${res.jam_check_out}:00+07:00`,
          status: "hadir" as const,
          isLate: false,
          lateMinutes: 0,
        }
      : (res as TodayAttendance),
  );
}

/** Baca karyawan_id numerik dari cookie sesi (mock: emp-N → N; BE: angka langsung). */
function readEmployeeIdFromBody(): number {
  if (typeof document === "undefined") return 0;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith("araya_employee="));
  const raw = match ? match.split("=").slice(1).join("=") : "";
  const numeric = raw.replace(/\D/g, "");
  return numeric ? parseInt(numeric, 10) : 0;
}

/** POST /api/leave-permissions — mock terima bentuk FE (rentang tanggal utuh);
    BE asli memakai bentuk {tanggal, jenis, alasan} (kontrak M13-US3). */
export function createAbsenceRequest(input: AbsenceInput): Promise<AbsenceRequest> {
  const body = USE_MOCK
    ? { type: input.type, startDate: input.startDate, endDate: input.endDate, reason: input.reason }
    : { karyawan_id: null, tanggal: input.startDate, jenis: input.type, alasan: input.reason };
  return request<{ message: string }>(
    "/api/leave-permissions",
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  ).then(
    () =>
      ({
        id: crypto.randomUUID(),
        employeeId: "",
        type: input.type,
        startDate: input.startDate,
        endDate: input.endDate,
        reason: input.reason,
        status: "pending" as const,
        createdAt: new Date().toISOString(),
      }) as AbsenceRequest,
  );
}

/** GET /api/attendance/absence-requests — mock ada; BE belum → tetap [] di mode BE. */
export function listAbsenceRequests(): Promise<AbsenceRequest[]> {
  if (USE_MOCK) return request<AbsenceRequest[]>("/api/attendance/absence-requests");
  return Promise.resolve([]);
}

/** DELETE /api/attendance/absence-requests/:id — mock ada; BE belum → 404 di mode BE. */
export function cancelAbsenceRequest(id: string): Promise<void> {
  if (USE_MOCK) {
    return request<void>(`/api/attendance/absence-requests/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  }
  return Promise.reject(
    new ApiError(404, "NOT_FOUND", "Pembatalan izin belum tersedia di BE."),
  );
}

/** GET /api/attendance/recap?bulan=&tahun= — mock memakai /attendance/monthly-summary?month=YYYY-MM. */
export function getMonthlySummary(month: string): Promise<MonthlySummary> {
  if (USE_MOCK) {
    return request<MonthlySummary>(
      `/api/attendance/monthly-summary?month=${encodeURIComponent(month)}`,
    );
  }
  const [tahun, bulan] = month.split("-");
  return request<{ success: boolean; data: BeRecapRow[] }>(
    `/api/attendance/recap?bulan=${encodeURIComponent(bulan)}&tahun=${encodeURIComponent(tahun)}`,
  ).then((body) => mapRecapRows(body.data ?? [], month));
}

/** GET /api/leave/approved — mock ada; BE belum → []. */
export function getApprovedLeave(from: string, to: string): Promise<ApprovedLeave[]> {
  if (USE_MOCK) {
    return request<ApprovedLeave[]>(
      `/api/leave/approved?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    );
  }
  return Promise.resolve([]);
}

/** GET /api/attendance/history — 5 presensi terakhir (endpoint baru; belum di BE). */
export function getAttendanceHistory(): Promise<AttendanceHistoryRow[]> {
  return request<AttendanceHistoryRow[]>("/api/attendance/history");
}

/** GET /api/leave/quota — sisa kuota cuti tahunan (endpoint baru; mock hanya). */
export function getLeaveQuota(): Promise<LeaveQuota> {
  return request<LeaveQuota>("/api/leave/quota");
}

/** GET /api/approvals?status=pending — daftar pengajuan untuk HR (mock; endpoint BE belum ada). */
export function listPendingApprovals(status: "pending" | "approved" | "rejected" | "all" = "pending") {
  return request<AbsenceRequestWithMeta[]>(`/api/approvals?status=${status}`);
}

/** PATCH /api/approvals/:id — setujui / tolak pengajuan (mock; endpoint BE belum ada). */
export function decideApproval(id: string, decision: "approved" | "rejected") {
  return request<AbsenceRequest>(`/api/approvals/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ decision }),
  });
}
