import { request } from "@/lib/api/client";
import type {
  AbsenceRequest,
  ApprovedLeave,
  MonthlySummary,
  Session,
  TodayAttendance,
  WorkSettings,
} from "@/lib/types";
import type { AbsenceInput, WorkSettingsInput } from "@/lib/validation";

/** Semua path di sini = kontrak ASUMSI FE (README bagian Kontrak API). */

export function getSession(): Promise<Session> {
  return request<Session>("/me");
}

export function getWorkSettings(): Promise<WorkSettings> {
  return request<WorkSettings>("/attendance/work-settings");
}

export function updateWorkSettings(input: WorkSettingsInput): Promise<WorkSettings> {
  return request<WorkSettings>("/attendance/work-settings", {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function getToday(): Promise<TodayAttendance> {
  return request<TodayAttendance>("/attendance/today");
}

export function checkIn(): Promise<TodayAttendance> {
  return request<TodayAttendance>("/attendance/check-in", { method: "POST" });
}

export function checkOut(): Promise<TodayAttendance> {
  return request<TodayAttendance>("/attendance/check-out", { method: "POST" });
}

export function listAbsenceRequests(): Promise<AbsenceRequest[]> {
  return request<AbsenceRequest[]>("/attendance/absence-requests");
}

export function createAbsenceRequest(input: AbsenceInput): Promise<AbsenceRequest> {
  return request<AbsenceRequest>("/attendance/absence-requests", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function cancelAbsenceRequest(id: string): Promise<void> {
  return request<void>(`/attendance/absence-requests/${id}`, { method: "DELETE" });
}

export function getMonthlySummary(month: string): Promise<MonthlySummary> {
  return request<MonthlySummary>(`/attendance/monthly-summary?month=${encodeURIComponent(month)}`);
}

/** Kontrak cuti M12 (mock) — dipakai untuk verifikasi M13-US4. */
export function getApprovedLeave(from: string, to: string): Promise<ApprovedLeave[]> {
  return request<ApprovedLeave[]>(`/leave/approved?from=${from}&to=${to}`);
}
