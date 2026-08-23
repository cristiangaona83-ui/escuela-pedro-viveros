import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { UserCog } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { SetHomeroomTeacherForm } from "@/features/courses/SetHomeroomTeacherForm";
import { listCourses, listTeachers } from "@/services/courses";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

export const metadata: Metadata = { title: "Jefaturas" };

const ALLOWED_ROLES = ["director", "utp", "superadmin"] as const;

interface CourseWithRelations {
  id: string;
  level: string;
  letter: string;
  homeroom_teacher_id: string | null;
  academic_years: { year: number } | null;
  profiles: { full_name: string } | null;
}

export default async function JefaturasPage() {
  const session = await getSessionContext();
  if (!canWrite(session?.roles ?? [], [...ALLOWED_ROLES])) redirect("/plataforma/cursos");

  const [courses, teacherRows] = await Promise.all([listCourses(), listTeachers()]);

  const teachers = (teacherRows as unknown as { profiles: { id: string; full_name: string } | null }[])
    .map((r) => r.profiles)
    .filter((t): t is { id: string; full_name: string } => Boolean(t))
    .sort((a, b) => a.full_name.localeCompare(b.full_name, "es"));

  const rows = courses as unknown as CourseWithRelations[];

  return (
    <div>
      <div className="flex items-center gap-2">
        <UserCog className="h-6 w-6 text-brand-700" />
        <h1 className="text-2xl font-semibold text-slate-900">Jefaturas</h1>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Profesor/a jefe de cada curso. Solo afecta a <code>courses.homeroom_teacher_id</code> — no toca asignaturas ni <code>teacher_assignments</code>.
      </p>

      <Card className="mt-6">
        <CardBody>
          <ul className="divide-y divide-slate-100">
            {rows.map((c) => {
              const label = `${c.level} ${c.letter}`;
              return (
                <li key={c.id} className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {label} <span className="font-normal text-slate-400">· {c.academic_years?.year ?? "—"}</span>
                      </p>
                      <p className="text-xs text-slate-500">{c.profiles?.full_name ?? "Sin jefatura asignada"}</p>
                    </div>
                    <SetHomeroomTeacherForm
                      courseId={c.id}
                      courseLabel={`${label} (${c.academic_years?.year ?? ""})`}
                      currentTeacherId={c.homeroom_teacher_id}
                      teachers={teachers}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
