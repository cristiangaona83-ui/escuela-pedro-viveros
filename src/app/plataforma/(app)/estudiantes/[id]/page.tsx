import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FileWarning, HeartHandshake, Activity, History as HistoryIcon } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/utils";
import { StudentForm } from "@/features/students/StudentForm";
import { WithdrawStudentButton } from "@/features/students/WithdrawStudentButton";
import { EnrollStudentButton } from "@/features/students/EnrollStudentButton";
import { ReactivateStudentButton } from "@/features/students/ReactivateStudentButton";
import { GuardianManagerFull } from "@/features/students/GuardianManagerFull";
import { GuardianManagerLimited } from "@/features/students/GuardianManagerLimited";
import { FichaMatriculaActions } from "@/features/students/FichaMatriculaActions";
import { StudentTabsNav, type StudentTab } from "@/features/students/StudentTabsNav";
import { getStudent, findActiveEnrollment } from "@/services/students";
import { listStudentGuardiansFull, listStudentGuardiansLimited } from "@/services/guardians";
import {
  listAttendanceForStudent,
  listSupportForStudent,
  listPieRecordsForStudent,
  listAuditHistoryForStudent,
  listEnrollmentHistory,
} from "@/services/student-record";
import { listAcademicYears } from "@/services/courses";
import { getTeachableCourses } from "@/services/academic-scope";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

export const metadata: Metadata = { title: "Ficha del estudiante" };

const WRITE_ROLES = ["director", "utp", "administrativo", "superadmin", "inspectoria_general", "convivencia"] as const;
const MANAGE_ROLES = ["director", "utp", "administrativo", "superadmin", "inspectoria_general", "convivencia"] as const;
const GUARDIAN_FULL_ROLES = ["director", "utp", "administrativo", "convivencia", "superadmin"] as const;

const TABS: StudentTab[] = [
  { key: "matricula", label: "Matrícula" },
  { key: "apoderados", label: "Apoderados" },
  { key: "asistencia", label: "Asistencia" },
  { key: "apoyos", label: "Apoyos" },
  { key: "pie", label: "PIE" },
  { key: "documentos", label: "Documentos" },
  { key: "historial", label: "Historial" },
];

const ATTENDANCE_LABEL: Record<string, string> = { presente: "Presente", ausente: "Ausente", atraso: "Atraso", retiro: "Retiro" };
const SUPPORT_STATUS_LABEL: Record<string, string> = { en_seguimiento: "En seguimiento", resuelto: "Resuelto", derivado: "Derivado" };
const PIE_STATUS_LABEL: Record<string, string> = { activo: "Activo", egresado: "Egresado", en_evaluacion: "En evaluación" };

export default async function EstudianteDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab: tabParam } = await searchParams;
  const tab = TABS.some((t) => t.key === tabParam) ? tabParam! : "matricula";

  const [student, session] = await Promise.all([getStudent(id), getSessionContext()]);
  if (!student) notFound();

  const roles = session?.roles ?? [];
  const allowedToWrite = canWrite(roles, [...WRITE_ROLES]);
  const allowedToManage = canWrite(roles, [...MANAGE_ROLES]);
  const canManageGuardiansFull = canWrite(roles, [...GUARDIAN_FULL_ROLES]);
  const isInspectoria = roles.includes("inspectoria_general");
  const activeEnrollment = findActiveEnrollment(student) as unknown as {
    academic_year_id: string;
    enrolled_at: string;
    courses: { level: string; letter: string; academic_years: { year: number } | null } | null;
  } | null;

  const [years, courses] = allowedToManage ? await Promise.all([listAcademicYears(), getTeachableCourses()]) : [[], []];

  // Los apoderados se consultan siempre (no solo en su pestaña): el
  // encabezado formal de arriba los muestra en todas las pestañas.
  const guardiansFull = canManageGuardiansFull ? await listStudentGuardiansFull(student.id) : null;
  const guardiansLimited = !canManageGuardiansFull && isInspectoria ? await listStudentGuardiansLimited(student.id) : null;
  const primaryGuardian = guardiansFull?.find((g) => g.isPrimary) ?? guardiansLimited?.find((g) => g.isPrimary) ?? null;
  const emergencyContact = guardiansFull?.find((g) => g.isEmergencyContact) ?? guardiansLimited?.find((g) => g.isEmergencyContact) ?? null;

  const attendance = tab === "asistencia" ? await listAttendanceForStudent(student.id) : null;
  const support = tab === "apoyos" ? await listSupportForStudent(student.id) : null;
  const pieRecords = tab === "pie" ? await listPieRecordsForStudent(student.id) : null;
  const history = tab === "historial" ? await listAuditHistoryForStudent(student.id) : null;
  const enrollmentHistory = tab === "historial" ? await listEnrollmentHistory(student.id) : null;

  const courseLabel = activeEnrollment?.courses ? `${activeEnrollment.courses.level} ${activeEnrollment.courses.letter}` : null;

  return (
    <div className="mx-auto max-w-3xl">
      {/* Ficha de Matrícula — encabezado formal, siempre visible */}
      <Card>
        <CardBody>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Ficha de Matrícula</p>
              <h1 className="mt-1 text-2xl font-semibold text-slate-900">
                {student.last_names}, {student.first_names}
              </h1>
              <p className="mt-1 text-sm text-slate-500">RUN {student.run}</p>
            </div>
            <Badge tone={student.status === "matriculado" ? "success" : student.status === "retirado" ? "danger" : "neutral"}>
              {student.status}
            </Badge>
          </div>

          <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <div className="flex justify-between gap-4 sm:block">
              <dt className="text-slate-500">Fecha de nacimiento</dt>
              <dd className="text-slate-800">{student.birth_date ? formatDate(student.birth_date) : "—"}</dd>
            </div>
            <div className="flex justify-between gap-4 sm:block">
              <dt className="text-slate-500">Curso</dt>
              <dd className="text-slate-800">{courseLabel ?? "Sin matrícula activa"}</dd>
            </div>
            <div className="flex justify-between gap-4 sm:block">
              <dt className="text-slate-500">Año académico</dt>
              <dd className="text-slate-800">{activeEnrollment?.courses?.academic_years?.year ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4 sm:block">
              <dt className="text-slate-500">Fecha de matrícula</dt>
              <dd className="text-slate-800">{activeEnrollment?.enrolled_at ? formatDate(activeEnrollment.enrolled_at) : "—"}</dd>
            </div>
          </dl>

          <div className="mt-4 border-t border-slate-100 pt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Apoderado/a principal</p>
            <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <div className="flex justify-between gap-4 sm:block">
                <dt className="text-slate-500">Nombre</dt>
                <dd className="text-slate-800">{primaryGuardian?.guardian.full_name ?? "Sin apoderado registrado"}</dd>
              </div>
              <div className="flex justify-between gap-4 sm:block">
                <dt className="text-slate-500">Vínculo</dt>
                <dd className="text-slate-800">{primaryGuardian?.relationship ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-4 sm:block">
                <dt className="text-slate-500">Teléfono</dt>
                <dd className="text-slate-800">{primaryGuardian?.guardian.phone ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-4 sm:block">
                <dt className="text-slate-500">Correo</dt>
                <dd className="text-slate-800">{primaryGuardian?.guardian.email ?? "—"}</dd>
              </div>
            </dl>
          </div>

          <div className="mt-4 border-t border-slate-100 pt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Contacto de emergencia</p>
            <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <div className="flex justify-between gap-4 sm:block">
                <dt className="text-slate-500">Nombre</dt>
                <dd className="text-slate-800">{emergencyContact?.guardian.full_name ?? "No registrado"}</dd>
              </div>
              <div className="flex justify-between gap-4 sm:block">
                <dt className="text-slate-500">Teléfono</dt>
                <dd className="text-slate-800">{emergencyContact?.guardian.phone ?? "—"}</dd>
              </div>
            </dl>
          </div>

          <div className="mt-4 border-t border-slate-100 pt-4">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Observaciones</p>
            <p className="text-sm text-slate-700">{student.notes || "Sin observaciones."}</p>
          </div>

          <div className="mt-4">
            <FichaMatriculaActions studentId={student.id} />
          </div>
        </CardBody>
      </Card>

      <StudentTabsNav studentId={student.id} tabs={TABS} active={tab} />

      <div className="mt-6">
        {tab === "matricula" && (
          <div className="space-y-4">
            {allowedToManage && (
              <div className="flex flex-wrap gap-2">
                {student.status === "matriculado" && activeEnrollment && (
                  <WithdrawStudentButton
                    studentId={student.id}
                    academicYearId={activeEnrollment.academic_year_id}
                    studentName={`${student.first_names} ${student.last_names}`}
                  />
                )}
                {student.status !== "retirado" && <EnrollStudentButton studentId={student.id} years={years} courses={courses} />}
                {student.status === "retirado" && <ReactivateStudentButton studentId={student.id} years={years} courses={courses} />}
              </div>
            )}
            <Card>
              <CardBody>
                <StudentForm student={student} canWrite={allowedToWrite} roles={roles} />
              </CardBody>
            </Card>
          </div>
        )}

        {tab === "apoderados" && (
          <>
            {guardiansFull && <GuardianManagerFull studentId={student.id} guardians={guardiansFull} />}
            {guardiansLimited && <GuardianManagerLimited studentId={student.id} guardians={guardiansLimited} />}
            {!guardiansFull && !guardiansLimited && (
              <EmptyState icon={FileWarning} title="Sin acceso" description="Tu rol puede consultar la ficha, pero no administra apoderados." />
            )}
          </>
        )}

        {tab === "asistencia" && (
          <Card>
            <CardBody>
              {attendance && attendance.length > 0 ? (
                <ul className="divide-y divide-slate-100">
                  {attendance.map((a) => {
                    const c = (a as unknown as { courses: { level: string; letter: string } | null }).courses;
                    return (
                      <li key={a.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                        <div>
                          <span className="text-slate-800">{formatDate(a.date)}</span>
                          {c && <span className="ml-2 text-slate-400">{c.level} {c.letter}</span>}
                          {a.observation && <p className="text-xs text-slate-500">{a.observation}</p>}
                        </div>
                        <Badge tone={a.status === "presente" ? "success" : a.status === "ausente" ? "danger" : "warning"}>
                          {ATTENDANCE_LABEL[a.status] ?? a.status}
                        </Badge>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <EmptyState icon={Activity} title="Sin registros de asistencia" description="No hay asistencia registrada para este estudiante." />
              )}
            </CardBody>
          </Card>
        )}

        {tab === "apoyos" && (
          <Card>
            <CardBody>
              {support && support.length > 0 ? (
                <ul className="divide-y divide-slate-100">
                  {support.map((s) => {
                    const subject = (s as unknown as { subjects: { name: string } | null }).subjects;
                    const responsible = (s as unknown as { profiles: { full_name: string } | null }).profiles;
                    return (
                      <li key={s.id} className="py-3 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-slate-800">{formatDate(s.event_date)}{subject ? ` · ${subject.name}` : ""}</span>
                          <Badge tone={s.status === "resuelto" ? "success" : s.status === "derivado" ? "warning" : "neutral"}>
                            {SUPPORT_STATUS_LABEL[s.status] ?? s.status}
                          </Badge>
                        </div>
                        {s.difficulty && <p className="mt-1 text-xs text-slate-500">Dificultad: {s.difficulty}</p>}
                        {s.action && <p className="text-xs text-slate-500">Acción: {s.action}</p>}
                        {responsible && <p className="text-xs text-slate-400">Responsable: {responsible.full_name}</p>}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <EmptyState icon={Activity} title="Sin seguimiento pedagógico" description="No hay apoyos registrados para este estudiante." />
              )}
            </CardBody>
          </Card>
        )}

        {tab === "pie" && (
          <Card>
            <CardBody>
              {pieRecords && pieRecords.length > 0 ? (
                <ul className="divide-y divide-slate-100">
                  {pieRecords.map((r) => {
                    const coordinator = (r as unknown as { coordinator: { full_name: string } | null }).coordinator;
                    const professional = (r as unknown as { professional: { full_name: string } | null }).professional;
                    return (
                      <li key={r.id} className="py-3 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-slate-800">{r.support_type || "Sin tipo de apoyo"}</span>
                          <Badge tone={r.status === "activo" ? "success" : r.status === "egresado" ? "neutral" : "warning"}>
                            {PIE_STATUS_LABEL[r.status] ?? r.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500">
                          {professional?.full_name ? `Profesional: ${professional.full_name}` : "Sin profesional asignado"}
                          {coordinator?.full_name ? ` · Coordinadora: ${coordinator.full_name}` : ""}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <EmptyState icon={HeartHandshake} title="Sin registros PIE" description="No hay registros del Programa de Integración Escolar para este estudiante, o tu rol no tiene acceso." />
              )}
            </CardBody>
          </Card>
        )}

        {tab === "documentos" && (
          <Card>
            <CardBody>
              <EmptyState
                icon={FileWarning}
                title="Documentos por estudiante no disponible todavía"
                description='El esquema actual (tabla "documents") solo guarda documentos institucionales generales (PEI, reglamentos, circulares) — no tiene una relación con estudiantes individuales. Adjuntar documentos a la ficha de un estudiante (matrícula, informes, autorizaciones) requeriría una tabla nueva, que no se agregó aquí para no inventar sin tu confirmación.'
              />
            </CardBody>
          </Card>
        )}

        {tab === "historial" && (
          <div className="space-y-4">
            <Card>
              <CardBody>
                <h2 className="mb-2 font-semibold text-slate-900">Historial de matrículas</h2>
                {enrollmentHistory && enrollmentHistory.length > 0 ? (
                  <ul className="divide-y divide-slate-100">
                    {enrollmentHistory.map((e) => {
                      const c = (e as unknown as { courses: { level: string; letter: string; academic_years: { year: number } | null } | null }).courses;
                      return (
                        <li key={e.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                          <span className="text-slate-700">
                            {c ? `${c.level} ${c.letter}` : "—"} {c?.academic_years ? `· ${c.academic_years.year}` : ""}
                          </span>
                          <Badge tone={e.status === "activa" ? "success" : "neutral"}>{e.status}</Badge>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">Sin matrículas registradas.</p>
                )}
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <h2 className="mb-2 font-semibold text-slate-900">Bitácora de cambios</h2>
                {history && history.length > 0 ? (
                  <ul className="divide-y divide-slate-100">
                    {history.map((h) => {
                      const user = (h as unknown as { profiles: { full_name: string } | null }).profiles;
                      return (
                        <li key={h.id} className="py-2 text-sm">
                          <p className="text-slate-800">{h.action} <span className="text-slate-400">· {h.module}</span></p>
                          <p className="text-xs text-slate-400">{formatDate(h.created_at)}{user ? ` · ${user.full_name}` : ""}</p>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <EmptyState icon={HistoryIcon} title="Sin registros" description="No hay bitácora visible para tu rol, o no hay cambios registrados." />
                )}
              </CardBody>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
