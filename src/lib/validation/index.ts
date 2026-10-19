import { timeToMinutes } from "@/lib/format";

/** Validasi dipakai bersama oleh form (klien) dan route handler mock (server). */

export type FieldErrors<T> = Partial<Record<keyof T, string>>;

export type WorkSettingsInput = {
  workStart: string;
  workEnd: string;
  lateToleranceMinutes: number;
};

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function validateWorkSettings(input: Partial<WorkSettingsInput>): FieldErrors<WorkSettingsInput> {
  const errors: FieldErrors<WorkSettingsInput> = {};

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
  }

  if (
    !errors.workStart &&
    !errors.workEnd &&
    input.workStart &&
    input.workEnd &&
    timeToMinutes(input.workEnd) <= timeToMinutes(input.workStart)
  ) {
    errors.workEnd = "Jam pulang harus setelah jam masuk.";
  }

  return errors;
}

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

  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  if (!input.startDate) errors.startDate = "Tanggal mulai wajib diisi.";
  else if (!dateRe.test(input.startDate)) errors.startDate = "Tanggal mulai tidak valid.";

  if (!input.endDate) errors.endDate = "Tanggal selesai wajib diisi.";
  else if (!dateRe.test(input.endDate)) errors.endDate = "Tanggal selesai tidak valid.";

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
