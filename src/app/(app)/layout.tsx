import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { requireSession } from "@/lib/auth/session";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await requireSession();
  return (
    <AppShell role={session.role} userName={session.name}>
      {children}
    </AppShell>
  );
}
