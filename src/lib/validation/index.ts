import { wibNow } from "@/lib/format";
import type { HolidayInput, WorkDay, WorkRuleInput } from "@/lib/types";

/** Validasi dipakai bersama oleh form (klien) dan route handler mock (server). */

export type FieldErrors<T> = Partial<Record<keyof T, string>>;

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** ERD v2: toleransi menit bulat 0–15. */
export const TOLERANCE_MAX = 15;

export function validateWorkRule(input: Partial<WorkRuleInput>): FieldErrors<WorkRuleInput> {
  const errors: FieldErrors<WorkRuleInput> = {};

  if (!input.positionId) errors.positionId = "Pilih jabatan.";

  if (!input.workStart) errors.workStart = "Jam masuk wajib diisi.";
  else if (!TIME_RE.test(input.workStart)) errors.workStart = "Format jam harus HH:MM, misalnya 08:00.";

  if (!input.workEnd) errors.workEnd = "Jam pulang wajib diisi.";
  else if (!TIME_RE.test(input.workEnd)) errors.workEnd = "Format jam harus HH:MM, misalnya 17:00.";

  const tolerance = input.lateToleranceMinutes;
  if (tolerance === undefined || tolerance === null || Number.isNaN(tolerance)) {
    errors.lateToleranceMinutes = "Toleransi wajib diisi.";
  } else if (!Number.isInteger(tolerance)) {
    errors.lateToleranceMinutes = "Toleransi harus bilangan bulat, misalnya 15.";
  } else if (tolerance < 0) {
    errors.lateToleranceMinutes = "Toleransi tidak boleh negatif.";
  } else if (tolerance > TOLERANCE_MAX) {
    errors.lateToleranceMinutes = `Toleransi maksimal ${TOLERANCE_MAX} menit.`;
  }

  if (!input.workDays || input.workDays.length === 0) {
    errors.workDays = "Pilih minimal satu hari kerja.";
  }

  if (!input.effectiveFrom) errors.effectiveFrom = "Tanggal berlaku wajib diisi.";
  else if (!DATE_RE.test(input.effectiveFrom)) errors.effectiveFrom = "Tanggal berlaku tidak valid.";
  else if (input.effectiveFrom < wibNow().dateKey) {
    errors.effectiveFrom = "Tanggal berlaku tidak boleh masa lalu.";
  }

  if (
    !errors.workStart &&
    !errors.workEnd &&
    input.workStart &&
    input.workEnd &&
    input.workEnd <= input.workStart
  ) {
    errors.workEnd = "Jam pulang harus setelah jam masuk.";
  }

  return errors;
}

export function validateHoliday(input: Partial<HolidayInput>): FieldErrors<HolidayInput> {
  const errors: FieldErrors<HolidayInput> = {};

  if (!input.date) errors.date = "Tanggal wajib diisi.";
  else if (!DATE_RE.test(input.date)) errors.date = "Tanggal tidak valid.";

  if (!input.name?.trim()) errors.name = "Nama hari libur wajib diisi.";

  if (input.type !== "NATIONAL" && input.type !== "JOINT_LEAVE" && input.type !== "CUSTOM") {
    errors.type = "Pilih jenis hari libur.";
  }

  return errors;
}

export const WORK_DAY_OPTIONS: { value: WorkDay; label: string; short: string }[] = [
  { value: 1, label: "Senin", short: "Sen" },
  { value: 2, label: "Selasa", short: "Sel" },
  { value: 3, label: "Rabu", short: "Rab" },
  { value: 4, label: "Kamis", short: "Kam" },
  { value: 5, label: "Jumat", short: "Jum" },
  { value: 6, label: "Sabtu", short: "Sab" },
  { value: 7, label: "Minggu", short: "Min" },
];

export const REASON_MAX = 500;

export type AbsenceInput = {
  type: "izin" | "sakit";
  startDate: string;
  endDate: string;
  reason: string;
};

export function validateAbsence(input: Partial<AbsenceInput>): FieldErrors<AbsenceInput> {
  const errors: FieldErrors<AbsenceInput> = {};

  if (input.type !== "izin" && input.type !== "sakit") errors.type = "Pilih jenis pengajuan.";

  if (!input.startDate) errors.startDate = "Tanggal mulai wajib diisi.";
  else if (!DATE_RE.test(input.startDate)) errors.startDate = "Tanggal mulai tidak valid.";

  if (!input.endDate) errors.endDate = "Tanggal selesai wajib diisi.";
  else if (!DATE_RE.test(input.endDate)) errors.endDate = "Tanggal selesai tidak valid.";

  if (
    !errors.startDate &&
    !errors.endDate &&
    input.startDate &&
    input.endDate &&
    input.endDate < input.startDate
  ) {
    errors.endDate = "Tanggal selesai tidak boleh sebelum tanggal mulai.";
  }

  const reason = input.reason?.trim() ?? "";
  if (!reason) errors.reason = "Alasan wajib diisi.";
  else if (reason.length > REASON_MAX) errors.reason = `Alasan maksimal ${REASON_MAX} karakter.`;

  return errors;
}
