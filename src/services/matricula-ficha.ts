import { createClient } from "@/lib/supabase/server";
import { getStudent } from "@/services/students";
import { listStudentGuardiansFull, listStudentGuardiansLimited } from "@/services/guardians";
import { getPickupRestriction, listEnrollmentDocuments, listPickupAuthorizations, listStudentAuthorizations } from "@/services/student-record";
import { emptyContact, emptyMatriculaForm, mergeMatriculaForm, type ContactData, type MatriculaFormData } from "@/lib/matricula";
import type { EnrollmentRow } from "@/types/database";

export interface MatriculaFichaData {
  form: MatriculaFormData;
  yearLabel: string;
  courseLabel: string;
  folio: string;
}

/** La ficha en blanco para imprimir (no lleva ningún dato). */
export function blankFichaData(yearLabel = ""): MatriculaFichaData {
  return { form: { ...emptyMatriculaForm(), enrolled_at: "", nationality: "" }, yearLabel, courseLabel: "", folio: "" };
}

/** "Pérez Soto" -> paterno/materno; con más de dos palabras no se adivina: todo queda en el paterno. */
function splitLastNames(lastNames: string): { paternal: string; maternal: string } {
  const parts = lastNames.trim().split(/\s+/);
  return parts.length === 2 ? { paternal: parts[0], maternal: parts[1] } : { paternal: lastNames.trim(), maternal: "" };
}

/**
 * Ficha de matrícula de un estudiante en un año, con lo registrado en la plataforma.
 * `limited`: Inspectoría General no ve el RUN de los apoderados (mismo criterio del resto del módulo).
 */
export async function getMatriculaFichaData(studentId: string, academicYearId: string, limited: boolean): Promise<MatriculaFichaData | null> {
  const student = await getStudent(studentId);
  if (!student) return null;

  const supabase = await createClient();
  const [{ data: enrollmentRow }, guardians, pickup, restriction, authorizations, documents] = await Promise.all([
    supabase
      .from("enrollments")
      .select("*, courses(level, letter), academic_years(year)")
      .eq("student_id", studentId)
      .eq("academic_year_id", academicYearId)
      .maybeSingle(),
    limited ? listStudentGuardiansLimited(studentId) : listStudentGuardiansFull(studentId),
    listPickupAuthorizations(studentId),
    getPickupRestriction(studentId),
    listStudentAuthorizations(studentId),
    listEnrollmentDocuments(studentId),
  ]);
  if (!enrollmentRow) return null;
  const enrollment = enrollmentRow as unknown as EnrollmentRow & { courses: { level: string; letter: string } | null; academic_years: { year: number } | null };

  const toContact = (g: (typeof guardians)[number] | undefined): ContactData => {
    if (!g) return emptyContact();
    const guardian = g.guardian as { full_name: string; run?: string | null; phone: string | null; phone_alt: string | null; email: string | null; address: string | null };
    return {
      full_name: guardian.full_name,
      run: guardian.run ?? "",
      relationship: g.relationship ?? "",
      phone: guardian.phone ?? "",
      phone_alt: guardian.phone_alt ?? "",
      email: guardian.email ?? "",
      address: guardian.address ?? "",
    };
  };
  const primary = guardians.find((g) => g.isPrimary) ?? guardians.find((g) => !g.isSubstitute && !g.isEmergencyContact);
  const substitute = guardians.find((g) => g.isSubstitute);
  const emergency = guardians.find((g) => g.isEmergencyContact && !g.isPrimary && !g.isSubstitute);
  const names = splitLastNames(student.last_names);
  const image = authorizations.find((a) => a.auth_type === "uso_imagen");
  const delivered = new Set(documents.filter((d) => d.status === "entregado").map((d) => d.doc_type));

  const form: MatriculaFormData = mergeMatriculaForm({
    enrolled_at: enrollment.enrolled_at,
    admission_type: (["Nueva", "Continuidad", "Traslado"].includes(enrollment.admission_condition ?? "") ? enrollment.admission_condition : "") as MatriculaFormData["admission_type"],
    origin_school: enrollment.origin_school ?? "",
    first_names: student.first_names,
    paternal_last_name: names.paternal,
    maternal_last_name: names.maternal,
    run: student.run,
    ipe: student.ipe ?? "",
    birth_date: student.birth_date ?? "",
    nationality: student.nationality ?? "",
    sex: student.sex ?? "",
    social_name: student.social_name ?? "",
    address_street: [student.address_street, student.address_number].filter(Boolean).join(" "),
    address_commune: student.address_commune ?? "",
    address_sector: student.address_sector ?? "",
    guardian: toContact(primary),
    substitute: toContact(substitute),
    emergency: { full_name: emergency?.guardian.full_name ?? "", phone: emergency?.guardian.phone ?? "" },
    pickup: pickup.map((p) => ({ full_name: p.full_name, relationship: p.relationship ?? "", phone: p.phone ?? "" })),
    pickup_restriction: restriction?.note ?? "",
    emergency_alerts: enrollment.emergency_alerts ?? "",
    support_coordination: enrollment.support_coordination ?? "",
    transport_mode: enrollment.transport_mode ?? "",
    documents: Object.fromEntries([...delivered].map((code) => [code, true])),
    rules_informed: enrollment.rules_informed,
    evaluation_rules_informed: enrollment.evaluation_rules_informed,
    privacy_informed: enrollment.privacy_informed,
    outings_informed: enrollment.outings_informed,
    image_authorization: image ? (image.authorized ? "autorizo" : "no_autorizo") : "",
    notes: enrollment.notes ?? "",
    received_by: enrollment.received_by ?? "",
  });

  return {
    form,
    yearLabel: String(enrollment.academic_years?.year ?? ""),
    courseLabel: enrollment.courses ? `${enrollment.courses.level} ${enrollment.courses.letter}`.trim() : "",
    folio: enrollment.enrollment_number ?? "",
  };
}
