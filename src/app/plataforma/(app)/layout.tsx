import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/platform/AppShell";
import { getSessionContext } from "@/features/auth/session";
import { listAcademicYears, getActiveAcademicYear, getCurrentAcademicYear } from "@/services/courses";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function PlatformAppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionContext();
  if (!session) redirect("/plataforma/login");

  const [allYears, working, current] = await Promise.all([listAcademicYears(), getActiveAcademicYear(), getCurrentAcademicYear()]);
  // Del más antiguo al más nuevo (2026 → 2050): se elige hacia adelante.
  const years = allYears
    .slice()
    .sort((a, b) => a.year - b.year)
    .map((y) => ({ id: y.id, year: y.year, current: y.id === current?.id }));

  return (
    <AppShell roles={session.roles} userName={session.profile?.full_name ?? "Usuario"} years={years} selectedYearId={working?.id ?? ""}>
      {children}
    </AppShell>
  );
}
