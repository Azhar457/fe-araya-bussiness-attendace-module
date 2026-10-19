import { request } from "@/lib/api/client";
import type { Account, Session } from "@/lib/types";

/** Kontrak masuk. Hanya ada di mode mock sampai BE menetapkan SSO/token. */

export function listAccounts(): Promise<Account[]> {
  return request<Account[]>("/accounts");
}

export function login(employeeId: string): Promise<Session> {
  return request<Session>("/session", { method: "POST", body: JSON.stringify({ employeeId }) });
}

export function logout(): Promise<void> {
  return request<void>("/session", { method: "DELETE" });
}
