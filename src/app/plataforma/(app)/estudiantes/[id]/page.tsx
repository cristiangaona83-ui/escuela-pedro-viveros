import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import { StudentForm } from "@/features/students/StudentForm";
import { WithdrawStudentButton } from "@/features/students/WithdrawStudentButton";
import { EnrollStudentButton } from "@/features/students/EnrollStudentButton";
import { ReactivateStudentButton } from "@/features/students/ReactivateStudentButton";
import { GuardianContactCard } from "@/features/students/GuardianContactCard";
import { getStudent, findActiveEnrollment, getGuardianContact } from "@/services/students";
import { listAcademicYears } from "@/services/courses";
import { getTeachableCourses } from "@/services/academic-scope";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

export const metadata: Metadata = { title: "Ficha del estudiante" };

const WRITE_ROLES = ["director", "utp", "administrativo", "superadmin", "inspectoria_general", "convivencia"] as const;
const MANAGE_ROLES = ["director", "utp", "administrativo", "superadmin", "inspectoria_general", "convivencia"] as const;

export default async function EstudianteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [student, session] = await Promise.all([getStudent(id), getSessionContext()]);
  if (!student) notFound();
  const allowedToWrite = canWrite(session?.roles ?? [], [...WRITE_ROLES]);
  const allowedToManage = canWrite(session?.roles ?? [], [...MANAGE_ROLES]);
  const activeEnrollment = findActiveEnrollment(student);
  const guardian = student.guardian_id ? await getGuardianContact(student.guardian_id) : null;
  const [years, courses] = allowedToManage
    ? await Promise.all([listAcademicYears(), getTeachableCourses()])
    : [[], []];

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">
          {student.last_names}, {student.first_names}
        </h1>
        <Badge tone={student.status === "matriculado" ? "success" : student.status === "retirado" ? "danger" : "neutral"}>
          {student.status}
        </Badge>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        RUN {student.run} · Registrado el {formatDate(student.created_at)}
      </p>

      {allowedToManage && (
        <div className="mt-4 flex flex-wrap gap-2">
          {student.status === "matriculado" && activeEnrollment && (
            <WithdrawStudentButton
              studentId={student.id}
              academicYearId={activeEnrollment.academic_year_id}
              studentName={`${student.first_names} ${student.last_names}`}
            />
          )}
          {student.status !== "retirado" && (
            <EnrollStudentButton studentId={student.id} years={years} courses={courses} />
          )}
          {student.status === "retirado" && (
            <ReactivateStudentButton studentId={student.id} years={years} courses={courses} />
          )}
        </div>
      )}

      <Card className="mt-6">
        <CardBody>
          <StudentForm student={student} canWrite={allowedToWrite} roles={session?.roles ?? []} />
        </CardBody>
      </Card>

      {guardian && (
        <div className="mt-6">
          <GuardianContactCard guardian={guardian} />
        </div>
      )}
    </div>
  );
}
