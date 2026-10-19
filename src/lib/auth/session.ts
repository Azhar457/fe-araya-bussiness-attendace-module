import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { DEFAULT_ROLE, ROLE_COOKIE, homeFor, isRole } from "@/lib/auth/constants";
import { EMPLOYEES } from "@/mocks/store";
import type { Role, Session } from "@/lib/types";

/** Simulasi session lewat cookie. Di BE asli diganti validasi token. */
export async function getSession(): Promise<Session> {
  const jar = await cookies();
  const raw = jar.get(ROLE_COOKIE)?.value;
  const role: Role = isRole(raw) ? raw : DEFAULT_ROLE;
  const employee = EMPLOYEES.find((e) => e.role === role) ?? EMPLOYEES[0];
  return { id: employee.id, name: employee.name, role };
}

/** Guard route: peran yang tidak berhak dilempar ke halaman miliknya. */
export async function requireRole(role: Role): Promise<Session> {
  const session = await getSession();
  if (session.role !== role) redirect(homeFor(session.role));
  return session;
}
