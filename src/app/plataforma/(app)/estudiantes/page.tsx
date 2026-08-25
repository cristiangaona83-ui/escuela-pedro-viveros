import type { Metadata } from "next";
import { UserPlus } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";
import { QuickActionsPanel } from "@/features/students/QuickActionsPanel";
import { StudentCourseBrowser } from "@/features/students/StudentCourseBrowser";
import { listStudentsGroupedByCourse } from "@/services/students";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

export const metadata: Metadata = { title: "Estudiantes" };

const WRITE_ROLES = ["director", "utp", "administrativo", "superadmin"] as const;
const QUICK_ACTIONS_ROLES = ["director", "utp", "superadmin", "inspectoria_general", "convivencia"] as const;

export default async function EstudiantesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const [{ courseFolders, withdrawnStudents }, session] = await Promise.all([
    listStudentsGroupedByCourse(),
    getSessionContext(),
  ]);
  const allowedToWrite = canWrite(session?.roles ?? [], [...WRITE_ROLES]);
  const showQuickActions = canWrite(session?.roles ?? [], [...QUICK_ACTIONS_ROLES]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Estudiantes</h1>
          <p className="mt-1 text-sm text-slate-500">Información privada — nunca visible desde el sitio público.</p>
        </div>
        {allowedToWrite && (
          <LinkButton href="/plataforma/estudiantes/nuevo">
            <UserPlus className="h-4 w-4" /> Nuevo estudiante
          </LinkButton>
        )}
      </div>

      {showQuickActions && (
        <div className="mt-6">
          <QuickActionsPanel />
        </div>
      )}

      <div className="mt-6">
        <StudentCourseBrowser courseFolders={courseFolders} withdrawnStudents={withdrawnStudents} initialQuery={q} />
      </div>
    </div>
  );
}
