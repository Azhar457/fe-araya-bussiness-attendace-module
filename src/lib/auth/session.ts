import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { EMPLOYEE_COOKIE, homeFor } from "@/lib/auth/constants";
import { EMPLOYEES } from "@/mocks/store";
import type { Role, Session } from "@/lib/types";

/** Sesi dibaca dari cookie akun. Di BE asli diganti validasi token/SSO. */
export async function getSession(): Promise<Session> {
  const jar = await cookies();
  const id = jar.get(EMPLOYEE_COOKIE)?.value;
  // Fallback EMPLOYEES[0] hanya untuk route mock yang diuji tanpa sesi; halaman
  // tetap dijaga requireSession.
  const employee = EMPLOYEES.find((item) => item.id === id) ?? EMPLOYEES[0];
  return { id: employee.id, name: employee.name, role: employee.role };
}

/** Guard halaman: belum masuk → halaman masuk. */
export async function requireSession(): Promise<Session> {
  const jar = await cookies();
  if (!jar.get(EMPLOYEE_COOKIE)?.value) redirect("/masuk");
  return getSession();
}

/** Guard route: peran yang tidak berhak dilempar ke halaman miliknya. */
export async function requireRole(role: Role): Promise<Session> {
  const session = await requireSession();
  if (session.role !== role) redirect(homeFor(session.role));
  return session;
}
