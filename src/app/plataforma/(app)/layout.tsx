import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/platform/AppShell";
import { getSessionContext } from "@/features/auth/session";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function PlatformAppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionContext();
  if (!session) redirect("/plataforma/login");

  return (
    <AppShell roles={session.roles} userName={session.profile?.full_name ?? "Usuario"}>
      {children}
    </AppShell>
  );
}
