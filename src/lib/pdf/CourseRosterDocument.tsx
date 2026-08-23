import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Document, Page, View, Text, Image } from "@react-pdf/renderer";
import { pdfStyles } from "./styles";
import { SITE } from "@/config/site";
import { formatDate } from "@/lib/utils";
import type { CourseRosterStudent } from "@/services/course-roster";

const STATUS_LABEL: Record<CourseRosterStudent["enrollment_status"], string> = {
  activa: "Matriculado",
  retirada: "Retirado",
  trasladada: "Trasladado",
};

function getLogoDataUri() {
  try {
    const logoPath = join(process.cwd(), "public", "images", "logo-escuela.jpg");
    return `data:image/jpeg;base64,${readFileSync(logoPath).toString("base64")}`;
  } catch {
    return null;
  }
}

export function CourseRosterDocument({
  courseLabel,
  academicYear,
  students,
  issuedAt,
}: {
  courseLabel: string;
  academicYear: number;
  students: CourseRosterStudent[];
  issuedAt: string;
}) {
  const logoDataUri = getLogoDataUri();

  return (
    <Document title={`Listado de estudiantes - ${courseLabel} ${academicYear}`}>
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.headerRow}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            {logoDataUri ? (
              // eslint-disable-next-line jsx-a11y/alt-text -- Image de @react-pdf/renderer, no es <img> HTML
              <Image src={logoDataUri} style={{ width: 44, height: 44, borderRadius: 8 }} />
            ) : (
              <View style={pdfStyles.logoBox}>
                <Text style={pdfStyles.logoText}>PV</Text>
              </View>
            )}
            <View style={{ marginLeft: 8 }}>
              <Text style={pdfStyles.schoolName}>{SITE.name}</Text>
              <Text style={pdfStyles.schoolAddress}>{SITE.address.full}</Text>
            </View>
          </View>
        </View>

        <Text style={pdfStyles.title}>LISTADO DE ESTUDIANTES</Text>
        <Text style={{ fontSize: 10, textAlign: "center", marginTop: -14, marginBottom: 16, color: "#5c6b66" }}>
          {courseLabel} · Año {academicYear} · Emitido el {formatDate(issuedAt)} · Total: {students.length} estudiantes
        </Text>

        <View style={pdfStyles.table}>
          <View style={pdfStyles.tableRowHeader}>
            <Text style={[pdfStyles.th, { flex: 0.4, textAlign: "center" }]}>N°</Text>
            <Text style={[pdfStyles.th, { flex: 2.4 }]}>Nombre completo</Text>
            <Text style={[pdfStyles.th, { flex: 1 }]}>RUN</Text>
            <Text style={[pdfStyles.th, { flex: 1 }]}>Fecha de nacimiento</Text>
            <Text style={[pdfStyles.th, { flex: 1, textAlign: "center" }]}>Estado</Text>
          </View>
          {students.map((s, i) => (
            <View style={pdfStyles.tableRow} key={s.id}>
              <Text style={[pdfStyles.tdCenter, { flex: 0.4 }]}>{i + 1}</Text>
              <Text style={[pdfStyles.td, { flex: 2.4 }]}>{s.last_names}, {s.first_names}</Text>
              <Text style={[pdfStyles.td, { flex: 1 }]}>{s.run}</Text>
              <Text style={[pdfStyles.td, { flex: 1 }]}>{s.birth_date ? formatDate(s.birth_date) : "—"}</Text>
              <Text style={[pdfStyles.tdCenter, { flex: 1 }]}>{STATUS_LABEL[s.enrollment_status]}</Text>
            </View>
          ))}
        </View>

        <Text style={pdfStyles.disclaimer}>
          Documento de uso interno del establecimiento — no constituye un certificado oficial.
        </Text>
      </Page>
    </Document>
  );
}
