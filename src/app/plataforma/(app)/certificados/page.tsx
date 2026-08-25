import type { Metadata } from "next";
import { Award } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/utils";
import { listCertificates, listAlumnoRegularCourseFolders } from "@/services/certificates";
import { AlumnoRegularCourseBrowser } from "@/features/certificates/AlumnoRegularCourseBrowser";

export const metadata: Metadata = { title: "Certificados" };

const CERT_LABELS: Record<string, string> = {
  alumno_regular: "Alumno Regular",
  informe_semestral: "Informe Semestral",
  informe_anual: "Informe Anual",
  cierre_anio: "Cierre de Año",
};

export default async function CertificadosPage() {
  const [certificates, { academicYearId, folders }] = await Promise.all([
    listCertificates(),
    listAlumnoRegularCourseFolders(),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Certificados</h1>
      <p className="mt-1 text-sm text-slate-500">Emisión de Certificado de Alumno Regular con folio único y verificación pública.</p>

      <Card className="mt-6">
        <CardBody>
          <h2 className="font-semibold text-slate-900">Certificado de Alumno Regular</h2>
          <p className="mt-1 text-sm text-slate-500">Selecciona el curso del estudiante para generar el certificado.</p>
          <div className="mt-4">
            <AlumnoRegularCourseBrowser folders={folders} academicYearId={academicYearId} />
          </div>
        </CardBody>
      </Card>

      <Card className="mt-6">
        <CardBody>
          <h2 className="mb-4 font-semibold text-slate-900">Certificados emitidos</h2>
          {certificates.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="py-2 pr-4">Folio</th>
                      <th className="py-2 pr-4">Tipo</th>
                      <th className="py-2 pr-4">Estudiante</th>
                      <th className="py-2 pr-4">Emisión</th>
                      <th className="py-2">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {certificates.map((c) => {
                      const cert = c as unknown as {
                        id: string; folio: string; cert_type: string; issued_at: string; status: string;
                        students: { first_names: string; last_names: string } | null;
                      };
                      return (
                        <tr key={cert.id}>
                          <td className="py-2.5 pr-4 font-mono text-xs text-slate-600">{cert.folio}</td>
                          <td className="py-2.5 pr-4 text-slate-600">{CERT_LABELS[cert.cert_type] ?? cert.cert_type}</td>
                          <td className="py-2.5 pr-4 text-slate-800">
                            {cert.students ? `${cert.students.last_names}, ${cert.students.first_names}` : "—"}
                          </td>
                          <td className="py-2.5 pr-4 text-slate-500">{formatDate(cert.issued_at)}</td>
                          <td className="py-2.5">
                            <Badge tone={cert.status === "vigente" ? "success" : "danger"}>{cert.status}</Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState icon={Award} title="Sin certificados emitidos" description="Los certificados generados aparecerán aquí con su folio y estado." />
            )}
        </CardBody>
      </Card>
    </div>
  );
}
