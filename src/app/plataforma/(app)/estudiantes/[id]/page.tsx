import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FileWarning, HeartHandshake, Activity, History as HistoryIcon, Award, GraduationCap, UserRound, CalendarCheck, FileText, UserCog, Printer } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate, calculateAge } from "@/lib/utils";
import { StudentForm } from "@/features/students/StudentForm";
import { StudentIdentityForm } from "@/features/students/StudentIdentityForm";
import { EnrollmentDetailsForm } from "@/features/students/EnrollmentDetailsForm";
import { PickupAuthorizationsManager } from "@/features/students/PickupAuthorizationsManager";
import { PickupRestrictionManager } from "@/features/students/PickupRestrictionManager";
import { StudentAuthorizationsManager } from "@/features/students/StudentAuthorizationsManager";
import { EnrollmentDocumentsManager } from "@/features/students/EnrollmentDocumentsManager";
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
  listCertificatesForStudent,
  listPickupAuthorizations,
  getPickupRestriction,
  listStudentAuthorizations,
  listEnrollmentDocuments,
  summarizeAttendance,
} from "@/services/student-record";
import { listTeacherAssignments } from "@/services/teacher-assignments";
import { listAcademicYears } from "@/services/courses";
import { getTeachableCourses } from "@/services/academic-scope";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

export const metadata: Metadata = { title: "Ficha de Matrícula" };

const WRITE_ROLES = ["director", "utp", "administrativo", "superadmin", "inspectoria_general", "convivencia"] as const;
const MANAGE_ROLES = ["director", "utp", "administrativo", "superadmin", "inspectoria_general", "convivencia"] as const;
const GUARDIAN_FULL_ROLES = ["director", "utp", "administrativo", "convivencia", "superadmin"] as const;
const PIE_ACCESS_ROLES = ["pie", "director", "utp", "superadmin"] as const; // igual que pie_records_select_scope
const PICKUP_AUTH_READ_ROLES = ["director", "utp", "administrativo", "convivencia", "inspectoria_general", "superadmin"] as const;
const PICKUP_AUTH_WRITE_ROLES = ["director", "utp", "inspectoria_general", "superadmin"] as const;
const PICKUP_RESTRICTION_ROLES = ["director", "utp", "convivencia", "inspectoria_general", "superadmin"] as const;
const AUTHORIZATIONS_READ_ROLES = ["director", "utp", "administrativo", "convivencia", "inspectoria_general", "superadmin"] as const;
const AUTHORIZATIONS_WRITE_ROLES = ["director", "utp", "administrativo", "convivencia", "superadmin"] as const;

const TABS: StudentTab[] = [
  { key: "resumen", label: "Resumen" },
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
const CERT_TYPE_LABEL: Record<string, string> = {
  alumno_regular: "Alumno regular",
  informe_semestral: "Informe semestral",
  informe_anual: "Informe anual",
  cierre_anio: "Cierre de año",
};

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3.5 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-800">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export default async function EstudianteDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab: tabParam } = await searchParams;
  const tab = TABS.some((t) => t.key === tabParam) ? tabParam! : "resumen";

  const [student, session] = await Promise.all([getStudent(id), getSessionContext()]);
  if (!student) notFound();

  const roles = session?.roles ?? [];
  const allowedToWrite = canWrite(roles, [...WRITE_ROLES]);
  const allowedToManage = canWrite(roles, [...MANAGE_ROLES]);
  const canManageGuardiansFull = canWrite(roles, [...GUARDIAN_FULL_ROLES]);
  const isInspectoria = roles.includes("inspectoria_general");
  const hasPieAccess = canWrite(roles, [...PIE_ACCESS_ROLES]);
  const activeEnrollment = findActiveEnrollment(student);

  const [years, courses] = allowedToManage ? await Promise.all([listAcademicYears(), getTeachableCourses()]) : [[], []];

  // Los apoderados y PIE se consultan siempre: el encabezado los muestra en
  // todas las pestañas. El resto solo se pide para la pestaña activa (o para
  // el Resumen, que necesita una versión condensada de cada sección).
  const guardiansFull = canManageGuardiansFull ? await listStudentGuardiansFull(student.id) : null;
  const guardiansLimited = !canManageGuardiansFull && isInspectoria ? await listStudentGuardiansLimited(student.id) : null;
  const primaryGuardian = guardiansFull?.find((g) => g.isPrimary) ?? guardiansLimited?.find((g) => g.isPrimary) ?? null;
  const emergencyContact = guardiansFull?.find((g) => g.isEmergencyContact) ?? guardiansLimited?.find((g) => g.isEmergencyContact) ?? null;
  const otherGuardiansCount = (guardiansFull?.length ?? guardiansLimited?.length ?? 0) - (primaryGuardian ? 1 : 0);

  const pieRecords = hasPieAccess ? await listPieRecordsForStudent(student.id) : null;
  const pieActive = pieRecords?.some((r) => r.status === "activo") ?? false;

  const needsAttendance = tab === "resumen" || tab === "asistencia";
  const attendance = needsAttendance ? await listAttendanceForStudent(student.id) : null;
  const attendanceSummary = attendance ? summarizeAttendance(attendance) : null;

  const needsSupport = tab === "resumen" || tab === "apoyos";
  const support = needsSupport ? await listSupportForStudent(student.id) : null;

  const needsCertificates = tab === "resumen" || tab === "documentos";
  const certificates = needsCertificates ? await listCertificatesForStudent(student.id) : null;

  const courseAssignments = tab === "resumen" && activeEnrollment
    ? await listTeacherAssignments({ courseId: activeEnrollment.course_id })
    : null;

  const history = tab === "historial" ? await listAuditHistoryForStudent(student.id) : null;
  const enrollmentHistory = tab === "historial" || tab === "matricula" ? await listEnrollmentHistory(student.id) : null;

  // Bloques administrativos nuevos (consolidación de la Ficha de Matrícula) —
  // se consultan solo cuando el rol tiene acceso real (defensa en profundidad
  // además de RLS) y solo para las pestañas donde se muestran.
  const canReadPickupAuth = canWrite(roles, [...PICKUP_AUTH_READ_ROLES]);
  const canWritePickupAuth = canWrite(roles, [...PICKUP_AUTH_WRITE_ROLES]);
  const canManagePickupRestriction = canWrite(roles, [...PICKUP_RESTRICTION_ROLES]);
  const canReadAuthorizations = canWrite(roles, [...AUTHORIZATIONS_READ_ROLES]);
  const canWriteAuthorizations = canWrite(roles, [...AUTHORIZATIONS_WRITE_ROLES]);
  const needsMatriculaExtras = tab === "matricula" || tab === "resumen";

  const pickupAuthorizations = canReadPickupAuth && needsMatriculaExtras ? await listPickupAuthorizations(student.id) : null;
  const pickupRestriction = canManagePickupRestriction && needsMatriculaExtras ? await getPickupRestriction(student.id) : null;
  const studentAuthorizations = canReadAuthorizations && tab === "matricula" ? await listStudentAuthorizations(student.id) : null;
  const enrollmentDocuments = canReadAuthorizations && tab === "matricula" ? await listEnrollmentDocuments(student.id) : null;

  const courseLabel = activeEnrollment?.courses ? `${activeEnrollment.courses.level} ${activeEnrollment.courses.letter}` : null;
  const academicYear = activeEnrollment?.courses?.academic_years?.year ?? null;
  const homeroomTeacher = activeEnrollment?.courses?.profiles?.full_name ?? null;
  const age = calculateAge(student.birth_date);

  // Indicador de completitud — solo campos administrativos esenciales, no se
  // almacena: se calcula en cada carga a partir de lo ya consultado.
  const completenessChecks: { label: string; ok: boolean }[] = [
    { label: "Identificación (RUN, fecha de nacimiento)", ok: Boolean(student.run && student.birth_date) },
    { label: "Matrícula vigente", ok: Boolean(activeEnrollment) },
    { label: "Domicilio", ok: Boolean(student.address_street && student.address_commune) },
    { label: "Apoderado/a principal", ok: Boolean(primaryGuardian) },
    { label: "Teléfono de contacto", ok: Boolean(primaryGuardian?.guardian.phone || student.personal_phone) },
    { label: "Contacto de emergencia", ok: Boolean(emergencyContact) },
    { label: "Profesor/a jefe", ok: Boolean(homeroomTeacher) },
  ];
  const missingCount = completenessChecks.filter((c) => !c.ok).length;
  const isComplete = missingCount === 0;

  return (
    <div className="mx-auto max-w-4xl">
      {/* Ficha de Matrícula — encabezado formal, siempre visible */}
      <Card>
        <CardBody>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-50 text-lg font-semibold text-brand-700">
                {student.first_names[0]}{student.last_names[0]}
              </span>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Ficha de Matrícula</p>
                <h1 className="mt-0.5 text-2xl font-semibold text-slate-900">
                  {student.last_names}, {student.first_names}
                </h1>
                <p className="mt-0.5 text-sm text-slate-500">RUN {student.run}</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <Badge tone={student.status === "matriculado" ? "success" : student.status === "retirado" ? "danger" : "neutral"}>
                {student.status}
              </Badge>
              {hasPieAccess && pieActive && <Badge tone="accent">PIE</Badge>}
              <Badge tone={isComplete ? "success" : "warning"}>
                {isComplete ? "Ficha completa" : `Información pendiente (${missingCount})`}
              </Badge>
              {canManagePickupRestriction && pickupRestriction && <Badge tone="danger">Restricción de retiro</Badge>}
            </div>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Sin foto registrada — el esquema actual no tiene un campo de fotografía para estudiantes.
          </p>
          {!isComplete && (
            <p className="mt-1 text-xs text-amber-700">
              Falta: {completenessChecks.filter((c) => !c.ok).map((c) => c.label).join(" · ")}
            </p>
          )}

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <StatCard label="Fecha de nacimiento" value={student.birth_date ? formatDate(student.birth_date) : "—"} hint={age !== null ? `${age} años` : undefined} />
            <StatCard label="Curso" value={courseLabel ?? "Sin matrícula activa"} />
            <StatCard label="Año académico" value={academicYear ? String(academicYear) : "—"} />
            <StatCard label="Fecha de matrícula" value={activeEnrollment?.enrolled_at ? formatDate(activeEnrollment.enrolled_at) : "—"} />
            <StatCard label="Profesor/a jefe" value={homeroomTeacher ?? "Sin asignar"} />
            <StatCard label="Apoderado/a principal" value={primaryGuardian?.guardian.full_name ?? "Sin registrar"} hint={primaryGuardian?.relationship ?? undefined} />
            <StatCard label="Contacto de emergencia" value={emergencyContact?.guardian.full_name ?? "Sin registrar"} hint={emergencyContact?.guardian.phone ?? undefined} />
            <StatCard label="Otros apoderados vinculados" value={String(Math.max(otherGuardiansCount, 0))} />
          </div>

          {allowedToManage && (
            <div className="mt-4">
              <FichaMatriculaActions studentId={student.id} />
            </div>
          )}
        </CardBody>
      </Card>

      {/* Acciones rápidas */}
      {allowedToManage && (
        <Card className="mt-4">
          <CardBody>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Acciones rápidas</p>
            <div className="flex flex-wrap gap-2">
              <Link href={`/plataforma/estudiantes/${student.id}?tab=matricula`} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                <GraduationCap className="h-3.5 w-3.5" /> Editar ficha
              </Link>
              <Link href={`/plataforma/estudiantes/${student.id}?tab=apoderados`} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                <UserRound className="h-3.5 w-3.5" /> Gestionar apoderados
              </Link>
              <Link href={`/plataforma/estudiantes/${student.id}?tab=asistencia`} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                <CalendarCheck className="h-3.5 w-3.5" /> Ver asistencia
              </Link>
              {canReadPickupAuth && (
                <Link href={`/plataforma/estudiantes/${student.id}?tab=matricula`} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                  <UserRound className="h-3.5 w-3.5" /> Gestionar autorizados para retiro
                </Link>
              )}
              {student.status === "matriculado" && activeEnrollment && (
                <WithdrawStudentButton
                  studentId={student.id}
                  academicYearId={activeEnrollment.academic_year_id}
                  studentName={`${student.first_names} ${student.last_names}`}
                />
              )}
              {student.status !== "retirado" && <EnrollStudentButton studentId={student.id} years={years} courses={courses} label="Matricular / cambiar curso" />}
              {student.status === "retirado" && <ReactivateStudentButton studentId={student.id} years={years} courses={courses} />}
            </div>
          </CardBody>
        </Card>
      )}

      <StudentTabsNav studentId={student.id} tabs={TABS} active={tab} />

      <div className="mt-6">
        {tab === "resumen" && (
          <div className="space-y-4">
            <Card>
              <CardBody>
                <h2 className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
                  <UserCog className="h-4 w-4 text-slate-400" /> Información académica
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-slate-500">Profesor/a jefe</p>
                    <p className="text-sm text-slate-800">{homeroomTeacher ?? "Sin asignar"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Asignaturas del curso</p>
                    {courseAssignments && courseAssignments.length > 0 ? (
                      <ul className="text-sm text-slate-700">
                        {courseAssignments.map((a) => (
                          <li key={a.id}>{a.subjects?.name} — {a.profiles?.full_name ?? "sin docente"}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-slate-500">Sin carga docente registrada para este curso.</p>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <div className="flex items-center justify-between">
                  <h2 className="flex items-center gap-2 font-semibold text-slate-900">
                    <CalendarCheck className="h-4 w-4 text-slate-400" /> Asistencia
                  </h2>
                  <Link href={`/plataforma/estudiantes/${student.id}?tab=asistencia`} className="text-xs font-medium text-brand-700 hover:underline">Ver detalle</Link>
                </div>
                {attendanceSummary && attendanceSummary.total > 0 ? (
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <StatCard label="% Asistencia" value={attendanceSummary.attendanceRate !== null ? `${attendanceSummary.attendanceRate}%` : "—"} />
                    <StatCard label="Presentes" value={String(attendanceSummary.presente)} />
                    <StatCard label="Ausentes" value={String(attendanceSummary.ausente)} />
                    <StatCard label="Atrasos" value={String(attendanceSummary.atraso)} />
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">Sin registros de asistencia todavía.</p>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <div className="flex items-center justify-between">
                  <h2 className="flex items-center gap-2 font-semibold text-slate-900">
                    <Activity className="h-4 w-4 text-slate-400" /> Apoyos pedagógicos
                  </h2>
                  <Link href={`/plataforma/estudiantes/${student.id}?tab=apoyos`} className="text-xs font-medium text-brand-700 hover:underline">Ver detalle</Link>
                </div>
                {support && support.length > 0 ? (
                  <p className="mt-2 text-sm text-slate-700">
                    {support.length} registro(s) — el más reciente: {formatDate(support[0].event_date)}
                    {support[0].status && ` · ${SUPPORT_STATUS_LABEL[support[0].status] ?? support[0].status}`}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">Sin seguimiento pedagógico registrado.</p>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <div className="flex items-center justify-between">
                  <h2 className="flex items-center gap-2 font-semibold text-slate-900">
                    <HeartHandshake className="h-4 w-4 text-slate-400" /> PIE
                  </h2>
                  {hasPieAccess && (
                    <Link href={`/plataforma/estudiantes/${student.id}?tab=pie`} className="text-xs font-medium text-brand-700 hover:underline">Ver detalle</Link>
                  )}
                </div>
                {!hasPieAccess ? (
                  <p className="mt-2 text-sm text-slate-500">Esta sección no está disponible para tu rol.</p>
                ) : pieRecords && pieRecords.length > 0 ? (
                  <p className="mt-2 text-sm text-slate-700">{pieRecords.length} registro(s) — estado más reciente: {PIE_STATUS_LABEL[pieRecords[0].status] ?? pieRecords[0].status}</p>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">Sin registros PIE.</p>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <div className="flex items-center justify-between">
                  <h2 className="flex items-center gap-2 font-semibold text-slate-900">
                    <Award className="h-4 w-4 text-slate-400" /> Certificados
                  </h2>
                  <Link href={`/plataforma/estudiantes/${student.id}?tab=documentos`} className="text-xs font-medium text-brand-700 hover:underline">Ver detalle</Link>
                </div>
                {certificates && certificates.length > 0 ? (
                  <p className="mt-2 text-sm text-slate-700">{certificates.length} certificado(s) emitido(s).</p>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">Sin certificados emitidos, o tu rol no tiene acceso.</p>
                )}
              </CardBody>
            </Card>
          </div>
        )}

        {tab === "matricula" && (
          <div className="space-y-4">
            <Card>
              <CardBody>
                <h2 className="mb-3 font-semibold text-slate-900">Identificación</h2>
                <StudentForm student={student} canWrite={allowedToWrite} roles={roles} />
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <h2 className="mb-3 font-semibold text-slate-900">Nacionalidad, contacto y domicilio</h2>
                <StudentIdentityForm student={student} canWrite={allowedToWrite} roles={roles} />
              </CardBody>
            </Card>

            {activeEnrollment && (
              <Card>
                <CardBody>
                  <h2 className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
                    <GraduationCap className="h-4 w-4 text-slate-400" /> Datos de esta matrícula
                    {activeEnrollment.enrollment_number && (
                      <span className="text-xs font-normal text-slate-400">Folio {activeEnrollment.enrollment_number}</span>
                    )}
                  </h2>
                  <EnrollmentDetailsForm
                    enrollmentId={activeEnrollment.id}
                    originSchool={activeEnrollment.origin_school}
                    originCourse={activeEnrollment.origin_course}
                    admissionCondition={activeEnrollment.admission_condition}
                    notes={activeEnrollment.notes}
                    canWrite={allowedToWrite}
                    roles={roles}
                  />
                </CardBody>
              </Card>
            )}

            <Card>
              <CardBody>
                <h2 className="mb-2 flex items-center gap-2 font-semibold text-slate-900">
                  <GraduationCap className="h-4 w-4 text-slate-400" /> Historial de matrículas
                </h2>
                {enrollmentHistory && enrollmentHistory.length > 0 ? (
                  <ul className="divide-y divide-slate-100">
                    {enrollmentHistory.map((e) => {
                      const c = (e as unknown as { courses: { level: string; letter: string; academic_years: { year: number } | null } | null }).courses;
                      return (
                        <li key={e.id} className="py-2 text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-slate-700">
                              {c ? `${c.level} ${c.letter}` : "—"} {c?.academic_years ? `· ${c.academic_years.year}` : ""}
                              {e.enrolled_at && <span className="ml-2 text-slate-400">{formatDate(e.enrolled_at)}</span>}
                              {e.enrollment_number && <span className="ml-2 text-slate-400">· Folio {e.enrollment_number}</span>}
                            </span>
                            <Badge tone={e.status === "activa" ? "success" : "neutral"}>{e.status}</Badge>
                          </div>
                          {(e.withdrawal_reason || e.withdrawn_at) && (
                            <p className="mt-0.5 text-xs text-slate-500">
                              Retiro{e.withdrawn_at ? ` (${formatDate(e.withdrawn_at)})` : ""}: {e.withdrawal_reason || "sin motivo registrado"}
                            </p>
                          )}
                          {e.reactivated_at && <p className="mt-0.5 text-xs text-slate-500">Reincorporación: {formatDate(e.reactivated_at)}</p>}
                          {e.notes && <p className="mt-0.5 text-xs text-slate-400">{e.notes}</p>}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">Sin matrículas registradas.</p>
                )}
              </CardBody>
            </Card>

            {canManagePickupRestriction && (
              <PickupRestrictionManager
                studentId={student.id}
                note={pickupRestriction?.note ?? null}
                canWrite={canManagePickupRestriction}
              />
            )}

            {canReadPickupAuth && (
              <PickupAuthorizationsManager
                studentId={student.id}
                authorizations={pickupAuthorizations ?? []}
                canWrite={canWritePickupAuth}
              />
            )}

            {canReadAuthorizations && (
              <StudentAuthorizationsManager
                studentId={student.id}
                authorizations={studentAuthorizations ?? []}
                canWrite={canWriteAuthorizations}
              />
            )}

            {canReadAuthorizations && (
              <EnrollmentDocumentsManager
                studentId={student.id}
                documents={enrollmentDocuments ?? []}
                canWrite={canWriteAuthorizations}
              />
            )}
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
          <div className="space-y-4">
            {attendanceSummary && attendanceSummary.total > 0 && (
              <Card>
                <CardBody>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    <StatCard label="% Asistencia" value={attendanceSummary.attendanceRate !== null ? `${attendanceSummary.attendanceRate}%` : "—"} />
                    <StatCard label="Presentes" value={String(attendanceSummary.presente)} />
                    <StatCard label="Ausentes" value={String(attendanceSummary.ausente)} />
                    <StatCard label="Atrasos" value={String(attendanceSummary.atraso)} />
                    <StatCard label="Retiros" value={String(attendanceSummary.retiro)} />
                  </div>
                </CardBody>
              </Card>
            )}
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
          </div>
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
                        {s.follow_up && <p className="text-xs text-slate-500">Seguimiento: {s.follow_up}</p>}
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
              {!hasPieAccess ? (
                <EmptyState icon={HeartHandshake} title="Sección no disponible" description="Tu rol no tiene acceso a la información PIE de los estudiantes." />
              ) : pieRecords && pieRecords.length > 0 ? (
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
                <EmptyState icon={HeartHandshake} title="Sin registros PIE" description="No hay registros del Programa de Integración Escolar para este estudiante." />
              )}
            </CardBody>
          </Card>
        )}

        {tab === "documentos" && (
          <div className="space-y-4">
            <Card>
              <CardBody>
                <h2 className="mb-2 flex items-center gap-2 font-semibold text-slate-900">
                  <Award className="h-4 w-4 text-slate-400" /> Certificados emitidos
                </h2>
                {certificates && certificates.length > 0 ? (
                  <ul className="divide-y divide-slate-100">
                    {certificates.map((c) => (
                      <li key={c.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                        <div>
                          <p className="text-slate-800">{CERT_TYPE_LABEL[c.cert_type] ?? c.cert_type}</p>
                          <p className="text-xs text-slate-500">Folio {c.folio} · {formatDate(c.issued_at)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge tone={c.status === "vigente" ? "success" : "neutral"}>{c.status}</Badge>
                          <Link
                            href={`/verificar?code=${c.verification_code}`}
                            target="_blank"
                            className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline"
                          >
                            <Printer className="h-3.5 w-3.5" /> Abrir
                          </Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">Sin certificados emitidos, o tu rol no tiene acceso a este listado.</p>
                )}
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <EmptyState
                  icon={FileText}
                  title="Documentos por estudiante no disponible todavía"
                  description='El esquema actual (tabla "documents") solo guarda documentos institucionales generales (PEI, reglamentos, circulares) — no tiene una relación con estudiantes individuales. Adjuntar documentos a la ficha de un estudiante (informes, autorizaciones) requeriría una tabla nueva, que no se agregó aquí sin tu confirmación.'
                />
              </CardBody>
            </Card>
          </div>
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
