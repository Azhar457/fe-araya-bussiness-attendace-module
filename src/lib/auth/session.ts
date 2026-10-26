import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  EMPLOYEE_COOKIE,
  NAME_COOKIE,
  ROLE_COOKIE,
  homeFor,
} from "@/lib/auth/constants";
import type { LiveSession, Role } from "@/lib/types";

/**
 * Sesi dibaca dari cookie yang diset halaman /masuk.
 * BE live tidak punya `GET /api/me`, jadi nama & peran ikut disimpan di cookie.
 */
export async function getSession(): Promise<LiveSession> {
  const jar = await cookies();
  const employeeId = jar.get(EMPLOYEE_COOKIE)?.value ?? "";
  const role: Role = jar.get(ROLE_COOKIE)?.value === "admin_hr" ? "admin_hr" : "karyawan";
  const name = jar.get(NAME_COOKIE)?.value || `Karyawan #${employeeId || "?"}`;
  return { employeeId, name, role };
}

export async function requireSession(): Promise<LiveSession> {
  const jar = await cookies();
  if (!jar.get(EMPLOYEE_COOKIE)?.value) redirect("/masuk");
  return getSession();
}

export async function requireRole(role: Role): Promise<LiveSession> {
  const session = await requireSession();
  if (session.role !== role) redirect(homeFor(session.role));
  return session;
}
