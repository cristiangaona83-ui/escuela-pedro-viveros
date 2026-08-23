import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { EnrollmentRecordDocument } from "@/lib/pdf/EnrollmentRecordDocument";
import { getStudent, findActiveEnrollment } from "@/services/students";
import { listStudentGuardiansFull, listStudentGuardiansLimited } from "@/services/guardians";
import { getSessionContext } from "@/features/auth/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getSessionContext();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { student_id } = await request.json();
  if (!student_id) return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });

  const student = await getStudent(student_id);
  if (!student) return NextResponse.json({ error: "Estudiante no encontrado" }, { status: 404 });

  const isInspectoria = session.roles.includes("inspectoria_general");
  const guardians = isInspectoria
    ? await listStudentGuardiansLimited(student_id)
    : await listStudentGuardiansFull(student_id);
  const primary = guardians.find((g) => g.isPrimary) ?? guardians[0] ?? null;
  const emergencyContact = guardians.find((g) => g.isEmergencyContact) ?? null;

  const enrollment = findActiveEnrollment(student) as unknown as {
    enrolled_at?: string;
    courses: {
      level: string;
      letter: string;
      academic_years: { year: number } | null;
      profiles: { full_name: string } | null;
    } | null;
  } | null;

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
      status: student.status,
      courseLabel: enrollment?.courses ? `${enrollment.courses.level} ${enrollment.courses.letter}` : null,
      academicYear: enrollment?.courses?.academic_years?.year ?? null,
      enrolledAt: enrollment?.enrolled_at ?? null,
      guardianName: primary?.guardian.full_name ?? null,
      guardianRelationship: primary?.relationship ?? null,
      guardianPhone: primary?.guardian.phone ?? null,
      guardianEmail: primary?.guardian.email ?? null,
      homeroomTeacher: enrollment?.courses?.profiles?.full_name ?? null,
      emergencyContactName: emergencyContact?.guardian.full_name ?? null,
      emergencyContactPhone: emergencyContact?.guardian.phone ?? null,
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
