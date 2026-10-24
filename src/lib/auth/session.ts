import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { EMPLOYEE_COOKIE, homeFor } from "@/lib/auth/constants";
import type { LiveSession, Role } from "@/lib/types";

// Peta id cookie → label identitas demo (BE live tidak punya /api/me).
const IDENTITIES: Array<{ id: string; name: string; role: Role }> = [
  { id: "101", name: "Dimas Pratama", role: "karyawan" },
  { id: "102", name: "Sinta Maharani", role: "karyawan" },
  { id: "hr-1", name: "Rani Kusumawati", role: "admin_hr" },
];

export async function getSession(): Promise<LiveSession> {
  const jar = await cookies();
  const id = jar.get(EMPLOYEE_COOKIE)?.value ?? "";
  const found = IDENTITIES.find((item) => item.id === id) ?? { id, name: `Karyawan #${id || "?"}`, role: "karyawan" as Role };
  return { employeeId: found.id, name: found.name, role: found.role };
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
