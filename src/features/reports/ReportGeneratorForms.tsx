"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FileDown, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Select } from "@/components/ui/Field";
import { requestPdf } from "@/lib/download-pdf";
import type { AcademicPeriodRow, AcademicYearRow } from "@/types/database";

interface StudentOption {
  id: string;
  first_names: string;
  last_names: string;
  run: string;
}

function StudentSelect({ students }: { students: StudentOption[] }) {
  return (
    <Select id="student_id" name="student_id" required defaultValue="">
      <option value="" disabled>Selecciona…</option>
      {students.map((s) => (
        <option key={s.id} value={s.id}>{s.last_names}, {s.first_names} — {s.run}</option>
      ))}
    </Select>
  );
}

export function SemestralReportForm({
  students,
  periods,
}: {
  students: StudentOption[];
  periods: (AcademicPeriodRow & { academic_years: { year: number } | null })[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const result = await requestPdf("/plataforma/api/informes/semestral", {
      student_id: String(form.get("student_id") || ""),
      period_id: String(form.get("period_id") || ""),
    });
    setLoading(false);
    if (!result.ok) { setError(result.error ?? "Error desconocido"); return; }
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Estudiante" htmlFor="student_id" required>
        <StudentSelect students={students} />
      </FormField>
      <FormField label="Período" htmlFor="period_id" required>
        <Select id="period_id" name="period_id" required defaultValue="">
          <option value="" disabled>Selecciona…</option>
          {periods.map((p) => (
            <option key={p.id} value={p.id}>{p.academic_years?.year} · {p.name}</option>
          ))}
        </Select>
      </FormField>
      {error && <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700"><AlertCircle className="h-4 w-4 shrink-0" /> {error}</div>}
      <Button type="submit" size="sm" disabled={loading}><FileDown className="h-4 w-4" /> {loading ? "Generando…" : "Generar informe semestral"}</Button>
    </form>
  );
}

export function AnnualReportForm({
  students,
  academicYears,
  variant,
}: {
  students: StudentOption[];
  academicYears: AcademicYearRow[];
  variant: "anual" | "cierre-anio";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const result = await requestPdf(`/plataforma/api/informes/${variant}`, {
      student_id: String(form.get("student_id") || ""),
      academic_year_id: String(form.get("academic_year_id") || ""),
    });
    setLoading(false);
    if (!result.ok) { setError(result.error ?? "Error desconocido"); return; }
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Estudiante" htmlFor="student_id" required>
        <StudentSelect students={students} />
      </FormField>
      <FormField label="Año académico" htmlFor="academic_year_id" required>
        <Select id="academic_year_id" name="academic_year_id" required defaultValue="">
          <option value="" disabled>Selecciona…</option>
          {academicYears.map((y) => (
            <option key={y.id} value={y.id}>{y.year}</option>
          ))}
        </Select>
      </FormField>
      {error && <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700"><AlertCircle className="h-4 w-4 shrink-0" /> {error}</div>}
      <Button type="submit" size="sm" disabled={loading}>
        <FileDown className="h-4 w-4" /> {loading ? "Generando…" : variant === "anual" ? "Generar informe anual" : "Generar informe de cierre de año"}
      </Button>
    </form>
  );
}
