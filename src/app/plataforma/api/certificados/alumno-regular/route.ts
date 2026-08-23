import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { CertificateAlumnoRegular } from "@/lib/pdf/CertificateAlumnoRegular";
import { getCertificateSignature } from "@/services/school-config";
import { listStudentGuardiansFull } from "@/services/guardians";
import { SITE } from "@/config/site";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";

export const runtime = "nodejs";

const ALLOWED_ROLES = ["director", "utp", "administrativo", "superadmin"] as const;

export async function POST(request: Request) {
  const session = await getSessionContext();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!canWrite(session.roles, [...ALLOWED_ROLES])) {
    return NextResponse.json({ error: "No tienes permiso para emitir este certificado" }, { status: 403 });
  }
  const supabase = await createClient();

  const { student_id, academic_year_id } = await request.json();
  if (!student_id || !academic_year_id) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  const [{ data: student }, { data: enrollment }, { data: year }] = await Promise.all([
    supabase.from("students").select("first_names, last_names, run").eq("id", student_id).maybeSingle(),
    supabase
      .from("enrollments")
      .select("courses(level, letter)")
      .eq("student_id", student_id)
      .eq("academic_year_id", academic_year_id)
      .maybeSingle(),
    supabase.from("academic_years").select("year").eq("id", academic_year_id).maybeSingle(),
  ]);

  if (!student || !year) return NextResponse.json({ error: "Estudiante o año no encontrado" }, { status: 404 });

  const course = (enrollment as unknown as { courses: { level: string; letter: string } | null } | null)?.courses;
  const courseLabel = course ? `${course.level} ${course.letter}` : "Sin matrícula activa";

  const { data: folio, error: folioError } = await supabase.rpc("next_certificate_folio", {
    p_cert_type: "alumno_regular",
    p_year: year.year,
  });
  if (folioError || !folio) {
    console.error("[certificados/alumno-regular] next_certificate_folio error", {
      code: folioError?.code, message: folioError?.message, details: folioError?.details, hint: folioError?.hint,
    });
    return NextResponse.json({ error: "No se pudo generar el folio" }, { status: 500 });
  }

  const { data: certificate, error: insertError } = await supabase
    .from("certificates")
    .insert({
      folio,
      cert_type: "alumno_regular",
      student_id,
      academic_year_id,
      issued_by: session.userId,
      payload: { studentName: `${student.first_names} ${student.last_names}`, courseLabel, year: year.year },
    })
    .select("*")
    .single();

  if (insertError || !certificate) {
    console.error("[certificados/alumno-regular] certificates insert error", {
      code: insertError?.code, message: insertError?.message, details: insertError?.details, hint: insertError?.hint,
      student_id, academic_year_id, folio,
    });
    const friendly = insertError?.code === "23505" ? "Ya existe un certificado con ese folio. Vuelve a intentarlo." : "No se pudo registrar el certificado";
    return NextResponse.json({ error: friendly }, { status: 500 });
  }

  const { error: auditError } = await supabase.rpc("log_audit", {
    p_action: "emitir_certificado",
    p_module: "certificados",
    p_entity: "certificates",
    p_entity_id: certificate.id,
    p_details: { folio, cert_type: "alumno_regular", student_id },
  });
  if (auditError) {
    console.error("[certificados/alumno-regular] log_audit error (certificado ya registrado, no se interrumpe la emisión)", {
      code: auditError.code, message: auditError.message,
    });
  }

  const [signature, guardians] = await Promise.all([
    getCertificateSignature(),
    listStudentGuardiansFull(student_id),
  ]);
  const primaryGuardian = guardians.find((g) => g.isPrimary) ?? guardians[0] ?? null;
  // En producción el QR siempre debe apuntar al dominio institucional
  // definitivo (nunca a una URL de preview de Vercel u otro host temporal,
  // ya que el certificado impreso puede circular por años). En desarrollo
  // local se usa el origin real de la petición para poder probar sin DNS.
  const baseUrl = process.env.NODE_ENV === "production" ? SITE.domains.public : new URL(request.url).origin;
  const verifyUrl = `${baseUrl}/verificar?code=${certificate.verification_code}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 200 });

  const buffer = await renderToBuffer(
    CertificateAlumnoRegular({
      folio,
      studentName: `${student.first_names} ${student.last_names}`,
      studentRun: student.run,
      courseLabel,
      year: year.year,
      issuedAt: certificate.issued_at,
      signatureName: signature.name,
      signatureTitle: signature.title,
      qrDataUrl,
      verificationCode: certificate.verification_code,
      guardianName: primaryGuardian?.guardian.full_name ?? null,
    })
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="certificado-alumno-regular-${folio}.pdf"`,
    },
  });
}
