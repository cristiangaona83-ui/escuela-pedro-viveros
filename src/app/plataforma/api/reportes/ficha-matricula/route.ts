import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { EnrollmentRecordDocument } from "@/lib/pdf/EnrollmentRecordDocument";
import { getStudent, findActiveEnrollment } from "@/services/students";
import { listStudentGuardiansFull, listStudentGuardiansLimited } from "@/services/guardians";
import { listPickupAuthorizations, listStudentAuthorizations } from "@/services/student-record";
import { authorizationLabel } from "@/config/student-authorizations";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

export const runtime = "nodejs";

// Mismo alcance que la Ficha Integral en pantalla (page.tsx MANAGE_ROLES) —
// el PDF incluye domicilio, apoderados y personas autorizadas para retirar,
// más sensible que lo que ven docentes/PIE vía teaches_student.
const ALLOWED_ROLES = ["director", "utp", "administrativo", "superadmin", "inspectoria_general", "convivencia"] as const;

export async function POST(request: Request) {
  const session = await getSessionContext();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!canWrite(session.roles, [...ALLOWED_ROLES])) {
    return NextResponse.json({ error: "No tienes permiso para emitir esta ficha" }, { status: 403 });
  }

  const { student_id } = await request.json();
  if (!student_id) return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });

  const student = await getStudent(student_id);
  if (!student) return NextResponse.json({ error: "Estudiante no encontrado" }, { status: 404 });

  const isInspectoria = session.roles.includes("inspectoria_general");
  const [guardians, pickupAuthorizations, authorizations] = await Promise.all([
    isInspectoria ? listStudentGuardiansLimited(student_id) : listStudentGuardiansFull(student_id),
    listPickupAuthorizations(student_id),
    listStudentAuthorizations(student_id),
  ]);
  const primary = guardians.find((g) => g.isPrimary) ?? guardians[0] ?? null;
  const emergencyContact = guardians.find((g) => g.isEmergencyContact) ?? null;

  const enrollment = findActiveEnrollment(student);

  const addressParts = [student.address_street, student.address_number].filter(Boolean).join(" ");
  const addressLine = [addressParts, student.address_sector, student.address_commune, student.address_region]
    .filter(Boolean)
    .join(", ") || null;

  const supabase = await createClient();
  await supabase.rpc("log_audit", {
    p_action: "generar_ficha_matricula",
    p_module: "estudiantes",
    p_entity: "students",
    p_entity_id: student_id,
  });

  const buffer = await renderToBuffer(
    EnrollmentRecordDocument({
      fullName: `${student.first_names} ${student.last_names}`,
      run: student.run,
      birthDate: student.birth_date,
      nationality: student.nationality,
      addressLine,
      status: student.status,
      enrollmentNumber: enrollment?.enrollment_number ?? null,
      courseLabel: enrollment?.courses ? `${enrollment.courses.level} ${enrollment.courses.letter}` : null,
      academicYear: enrollment?.courses?.academic_years?.year ?? null,
      enrolledAt: enrollment?.enrolled_at ?? null,
      firstEnrollmentDate: student.first_enrollment_date,
      originSchool: enrollment?.origin_school ?? null,
      guardianName: primary?.guardian.full_name ?? null,
      guardianRelationship: primary?.relationship ?? null,
      guardianPhone: primary?.guardian.phone ?? null,
      guardianEmail: primary?.guardian.email ?? null,
      guardianAddress: primary?.guardian.address ?? null,
      homeroomTeacher: enrollment?.courses?.profiles?.full_name ?? null,
      emergencyContactName: emergencyContact?.guardian.full_name ?? null,
      emergencyContactPhone: emergencyContact?.guardian.phone ?? null,
      emergencyContactRelationship: emergencyContact?.relationship ?? null,
      pickupAuthorizations: pickupAuthorizations.map((p) => ({
        fullName: p.full_name,
        relationship: p.relationship,
        phone: p.phone,
      })),
      authorizations: authorizations.map((a) => ({ label: authorizationLabel(a.auth_type), authorized: a.authorized })),
      enrollmentNotes: enrollment?.notes ?? null,
      notes: student.notes,
      issuedAt: new Date().toISOString(),
    })
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="ficha-matricula-${student_id}.pdf"`,
    },
  });
}
