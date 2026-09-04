import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getSessionContext } from "@/features/auth/session";
import { canWrite } from "@/features/auth/can";
import { getInstitutionalProfile } from "@/services/school-config";
import {
  getSeguroEscolarDeclaration,
  resolveStudentForDeclaration,
  listGuardianContacts,
} from "@/services/seguro-escolar";
import { formatFolio } from "@/features/seguro-escolar/utils";
import { getDirectorSignatureDataUri, getInstitutionalStampDataUri } from "@/lib/pdf/institutional-signatures";
import { SeguroEscolarInstitutionalDocument } from "@/lib/pdf/SeguroEscolarInstitutionalDocument";
import { formatDate } from "@/lib/utils";

export const runtime = "nodejs";

const MANAGE_ROLES = ["director", "superadmin", "inspectoria_general"] as const;

/** Sanitiza el nombre sugerido de archivo -- sin acentos/caracteres
 * especiales que puedan romper el header Content-Disposition o el sistema
 * de archivos del usuario. Conserva mayúscula/minúscula original (ej.
 * "Perez", no "PEREZ"). */
function sanitizeFileNamePart(value: string): string {
  return value
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** DD-MM-YYYY a partir de una fecha ISO (YYYY-MM-DD) -- formato pedido para
 * el nombre del archivo descargado, distinto del ISO que usa la base. */
function formatDateForFileName(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${d}-${m}-${y}`;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSessionContext();
  if (!session || !canWrite(session.roles, [...MANAGE_ROLES])) {
    return NextResponse.json({ error: "No tienes permiso para generar este documento" }, { status: 403 });
  }

  const declaration = await getSeguroEscolarDeclaration(id);
  if (!declaration) return NextResponse.json({ error: "Declaración no encontrada" }, { status: 404 });

  const [studentContext, guardianContacts, profile, directorSignatureDataUri, stampDataUri] = await Promise.all([
    resolveStudentForDeclaration(declaration.student_id),
    listGuardianContacts(id),
    getInstitutionalProfile(),
    getDirectorSignatureDataUri(),
    getInstitutionalStampDataUri(),
  ]);

  const folio = formatFolio(declaration.folio_year, declaration.folio_number);
  const studentFullName = [declaration.student_first_names, declaration.student_last_name_paterno, declaration.student_last_name_materno]
    .filter(Boolean)
    .join(" ");
  const address = [
    declaration.residence_street && declaration.residence_number
      ? `${declaration.residence_street} ${declaration.residence_number}`
      : declaration.residence_street || declaration.residence_number,
    declaration.residence_commune,
  ]
    .filter(Boolean)
    .join(", ");
  const latestContact = guardianContacts[0] ?? null;

  const pdfBuffer = await renderToBuffer(
    SeguroEscolarInstitutionalDocument({
      folio,
      issuedAtLabel: `San Antonio, ${formatDate(new Date(), { day: "numeric", month: "long", year: "numeric" })}.`,

      studentFullName: studentFullName || declaration.studentName,
      courseLabel: declaration.course_label,
      birthDateLabel: studentContext?.birthDate ? formatDate(studentContext.birthDate) : null,
      age: declaration.student_age,
      sex: declaration.student_sex,
      address: address || null,
      guardianName: studentContext?.primaryGuardianName ?? null,
      guardianPhone: studentContext?.primaryGuardianPhone ?? null,

      accidentDate: declaration.accident_date,
      accidentHour: declaration.accident_hour,
      accidentMinute: declaration.accident_minute,
      location: declaration.location,
      accidentType: declaration.accident_type,
      activity: declaration.activity,
      circumstance: declaration.circumstance,

      witnessAName: [declaration.witness_a_name, declaration.witness_a_lastname].filter(Boolean).join(" ") || null,
      witnessAId: declaration.witness_a_id,
      witnessBName: [declaration.witness_b_name, declaration.witness_b_lastname].filter(Boolean).join(" ") || null,
      witnessBId: declaration.witness_b_id,

      initialCare: declaration.initial_care,
      careStaffName: declaration.care_staff_name,
      careTime: declaration.care_time,
      careMeasure: declaration.care_measure,

      guardianContact: latestContact
        ? {
            contactName: latestContact.contact_name,
            contactDate: latestContact.contact_date,
            contactTime: latestContact.contact_time,
            contactMethod: latestContact.contact_method,
            staffName: latestContact.staffName,
            result: latestContact.result,
          }
        : null,

      assistanceEstablishment: declaration.assistance_establishment,
      referralDepartureTime: declaration.referral_departure_time,
      referralAccompanyingAdult: declaration.referral_accompanying_adult,
      referralTransportMeans: declaration.referral_transport_means,

      observations: declaration.observations,

      directorName: profile.director,
      directorTitle: profile.directorTitle,
      schoolName: profile.name,
      directorSignatureDataUri,
      stampDataUri,
    })
  );

  const url = new URL(request.url);
  const download = url.searchParams.get("download") === "1";
  const fileName = `Seguro_Escolar_${folio}_${sanitizeFileNamePart(studentFullName || declaration.studentName)}_${formatDateForFileName(declaration.accident_date)}.pdf`;

  await logPdfGeneration(id, folio);

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${fileName}"`,
    },
  });
}

async function logPdfGeneration(declarationId: string, folio: string) {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  await supabase.rpc("log_audit", {
    p_action: "generar_pdf_seguro_escolar",
    p_module: "seguro_escolar",
    p_entity: "seguro_escolar_declarations",
    p_entity_id: declarationId,
    p_details: { folio },
  });
}
