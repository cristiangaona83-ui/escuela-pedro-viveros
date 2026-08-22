"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FileDown, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Select } from "@/components/ui/Field";
import { requestPdf } from "@/lib/download-pdf";
import type { AcademicYearRow } from "@/types/database";

interface StudentOption {
  id: string;
  first_names: string;
  last_names: string;
  run: string;
}

export function CertificateGenerator({
  students,
  academicYears,
}: {
  students: StudentOption[];
  academicYears: AcademicYearRow[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);

    const result = await requestPdf("/plataforma/api/certificados/alumno-regular", {
      student_id: String(form.get("student_id") || ""),
      academic_year_id: String(form.get("academic_year_id") || ""),
    });

    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Error desconocido");
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Estudiante" htmlFor="student_id" required>
        <Select id="student_id" name="student_id" required defaultValue="">
          <option value="" disabled>Selecciona…</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>{s.last_names}, {s.first_names} — {s.run}</option>
          ))}
        </Select>
      </FormField>
      <FormField label="Año académico" htmlFor="academic_year_id" required>
        <Select id="academic_year_id" name="academic_year_id" required defaultValue="">
          <option value="" disabled>Selecciona…</option>
          {academicYears.map((y) => (
            <option key={y.id} value={y.id}>{y.year}</option>
          ))}
        </Select>
      </FormField>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      <Button type="submit" disabled={loading}>
        <FileDown className="h-4 w-4" /> {loading ? "Generando…" : "Generar Certificado de Alumno Regular"}
      </Button>
    </form>
  );
}
