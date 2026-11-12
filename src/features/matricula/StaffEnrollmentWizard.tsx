"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, FileText, UserRound, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { buttonClassName } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { emptyMatriculaForm, toRegisterPayload, type MatriculaFormData } from "@/lib/matricula";
import { MatriculaForm } from "./MatriculaForm";

interface Done {
  studentId: string;
  folio: string | null;
  created: boolean;
  studentName: string;
}

/** Registro de matrícula en Inspectoría: la ficha en 3 pasos y, al guardar, todo queda registrado en una sola operación. */
export function StaffEnrollmentWizard({
  academicYearId,
  yearLabel,
  courses,
  initial,
  initialCourseId,
  prematriculaId,
}: {
  academicYearId: string;
  yearLabel: string;
  courses: { id: string; label: string }[];
  initial: MatriculaFormData;
  initialCourseId?: string;
  prematriculaId?: string | null;
}) {
  const [done, setDone] = useState<Done | null>(null);
  const [formKey, setFormKey] = useState(0);

  async function handleSubmit(data: MatriculaFormData, courseId: string): Promise<string | null> {
    const supabase = createClient();
    const { data: result, error } = await supabase.rpc("register_student_enrollment", {
      p: toRegisterPayload(data, { academic_year_id: academicYearId, course_id: courseId, prematricula_id: prematriculaId }),
    });
    if (error || !result) {
      console.error("[matricula] error al registrar", error);
      return error?.message?.includes("No autorizado")
        ? "No tienes permiso para registrar matrículas."
        : error?.message || "No se pudo registrar la matrícula. Revisa los datos e inténtalo de nuevo.";
    }
    setDone({
      studentId: result.student_id,
      folio: result.enrollment_number,
      created: result.created_student,
      studentName: `${data.first_names} ${data.paternal_last_name}`.trim(),
    });
    return null;
  }

  if (done) {
    return (
      <Card>
        <CardBody className="space-y-4">
          <div className="flex items-center gap-2 text-emerald-700">
            <CheckCircle2 className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Matrícula registrada</h2>
          </div>
          <p className="text-sm text-slate-700">
            <strong>{done.studentName}</strong> quedó matriculado/a en el año {yearLabel}
            {done.folio ? <> con el folio <strong>{done.folio}</strong></> : null}. {done.created ? "Se creó su ficha de estudiante." : "Se actualizó su ficha de estudiante existente."}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href={`/plataforma/estudiantes/${done.studentId}`} className={buttonClassName("primary", "sm")}>
              <UserRound className="h-4 w-4" /> Ver ficha del estudiante
            </Link>
            <a
              href={`/plataforma/api/matricula/ficha?student_id=${done.studentId}&year=${academicYearId}`}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClassName("secondary", "sm")}
            >
              <FileText className="h-4 w-4" /> Imprimir ficha de matrícula
            </a>
            <button
              type="button"
              onClick={() => {
                setDone(null);
                setFormKey((k) => k + 1);
                window.scrollTo({ top: 0 });
              }}
              className={buttonClassName("secondary", "sm")}
            >
              <UserPlus className="h-4 w-4" /> Matricular a otro estudiante
            </button>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <MatriculaForm
      key={formKey}
      mode="staff"
      yearLabel={yearLabel}
      courses={courses}
      // Al matricular a otro estudiante seguido, la ficha vuelve en blanco (conserva solo quien recibe).
      initial={formKey === 0 ? initial : { ...emptyMatriculaForm(), received_by: initial.received_by }}
      initialCourseId={formKey === 0 ? initialCourseId : ""}
      submitLabel="Matricular"
      onSubmit={handleSubmit}
    />
  );
}
