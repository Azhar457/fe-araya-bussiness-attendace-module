import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { getSession } from "@/lib/auth/session";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  return (
    <AppShell role={session.role} userName={session.name}>
      {children}
    </AppShell>
  );
}
