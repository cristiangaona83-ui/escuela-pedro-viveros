"use client";

import { useState, type FormEvent } from "react";
import { FileDown, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select } from "@/components/ui/Field";
import { requestPdf } from "@/lib/download-pdf";

interface CourseOption {
  id: string;
  level: string;
  letter: string;
}

export function AttendanceReportForm({ courseOptions }: { courseOptions: CourseOption[] }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const result = await requestPdf("/plataforma/api/reportes/asistencia", {
      course_id: String(form.get("course_id") || ""),
      date_from: String(form.get("date_from") || ""),
      date_to: String(form.get("date_to") || ""),
    });
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Error desconocido");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Curso" htmlFor="course_id" required>
        <Select id="course_id" name="course_id" required defaultValue="">
          <option value="" disabled>Selecciona…</option>
          {courseOptions.map((c) => (
            <option key={c.id} value={c.id}>{c.level} {c.letter}</option>
          ))}
        </Select>
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Desde" htmlFor="date_from" required>
          <Input id="date_from" name="date_from" type="date" required />
        </FormField>
        <FormField label="Hasta" htmlFor="date_to" required>
          <Input id="date_to" name="date_to" type="date" required />
        </FormField>
      </div>
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      <Button type="submit" size="sm" disabled={loading}>
        <FileDown className="h-4 w-4" /> {loading ? "Generando…" : "Generar reporte PDF"}
      </Button>
    </form>
  );
}
