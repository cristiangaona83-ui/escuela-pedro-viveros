"use client";

import { useMemo, useState } from "react";
import { Folder, ArrowLeft, Search, FileDown, AlertCircle, Users } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
import { requestPdf } from "@/lib/download-pdf";
import type { AlumnoRegularCourseFolder } from "@/services/certificates";

type Student = AlumnoRegularCourseFolder["students"][number];

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function matches(student: Student, query: string): boolean {
  const q = normalize(query.trim());
  if (!q) return true;
  return normalize(`${student.last_names} ${student.first_names}`).includes(q);
}

function GenerateButton({ student, academicYearId }: { student: Student; academicYearId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    const result = await requestPdf("/plataforma/api/certificados/alumno-regular", {
      student_id: student.id,
      academic_year_id: academicYearId,
    });
    setLoading(false);
    if (!result.ok) setError(result.error ?? "Error desconocido");
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-800 disabled:opacity-50"
      >
        <FileDown className="h-3.5 w-3.5" /> {loading ? "Generando…" : "Generar Certificado"}
      </button>
      {error && (
        <p className="flex items-center gap-1 text-[11px] text-red-600">
          <AlertCircle className="h-3 w-3 shrink-0" /> {error}
        </p>
      )}
    </div>
  );
}

/**
 * Selección de estudiante por curso (carpetas) para el Certificado de
 * Alumno Regular. Todos los cursos y sus nóminas ya vienen resueltos desde
 * el servidor (listAlumnoRegularCourseFolders) — la navegación entre
 * "todos los cursos" / curso abierto y el filtro de búsqueda son solo
 * estado local, sin llamadas adicionales.
 */
export function AlumnoRegularCourseBrowser({
  folders,
  academicYearId,
}: {
  folders: AlumnoRegularCourseFolder[];
  academicYearId: string | null;
}) {
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const selectedCourse = folders.find((f) => f.id === selectedCourseId) ?? null;

  // Sin curso seleccionado: el buscador filtra a TODOS los estudiantes
  // (búsqueda global), mostrando su curso junto al nombre.
  const globalMatches = useMemo(() => {
    if (selectedCourse || !query.trim()) return [];
    const results: { student: Student; courseLabel: string }[] = [];
    for (const folder of folders) {
      for (const student of folder.students) {
        if (matches(student, query)) results.push({ student, courseLabel: folder.courseLabel });
      }
    }
    return results;
  }, [folders, selectedCourse, query]);

  const courseMatches = useMemo(() => {
    if (!selectedCourse) return [];
    return selectedCourse.students.filter((s) => matches(s, query));
  }, [selectedCourse, query]);

  if (!academicYearId) {
    return (
      <EmptyState
        icon={Folder}
        title="Sin año académico activo"
        description="Activa un año académico en Administración para poder emitir certificados por curso."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={selectedCourse ? `Buscar en ${selectedCourse.courseLabel}…` : "Buscar estudiante en todos los cursos…"}
          className="pl-9"
        />
      </div>

      {selectedCourse ? (
        <div>
          <button
            type="button"
            onClick={() => {
              setSelectedCourseId(null);
              setQuery("");
            }}
            className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-800"
          >
            <ArrowLeft className="h-4 w-4" /> Todos los cursos
          </button>

          <h3 className="mb-2 text-sm font-semibold text-slate-900">
            {selectedCourse.courseLabel} <span className="font-normal text-slate-400">· {selectedCourse.students.length} estudiantes</span>
          </h3>

          {courseMatches.length > 0 ? (
            <ul className="divide-y divide-slate-100">
              {courseMatches.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {s.last_names}, {s.first_names}
                    </p>
                    <p className="text-xs text-slate-500">{s.run}</p>
                  </div>
                  <GenerateButton student={s} academicYearId={academicYearId} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={Users}
              title={selectedCourse.students.length === 0 ? "Sin estudiantes con matrícula vigente" : "Sin resultados"}
              description={selectedCourse.students.length === 0 ? undefined : "Prueba con otro nombre o apellido."}
            />
          )}
        </div>
      ) : query.trim() ? (
        <div>
          <p className="mb-2 text-xs text-slate-500">{globalMatches.length} resultado(s)</p>
          {globalMatches.length > 0 ? (
            <ul className="divide-y divide-slate-100">
              {globalMatches.map(({ student, courseLabel }) => (
                <li key={student.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {student.last_names}, {student.first_names}
                    </p>
                    <p className="text-xs text-slate-500">
                      {courseLabel} · {student.run}
                    </p>
                  </div>
                  <GenerateButton student={student} academicYearId={academicYearId} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={Users} title="Sin resultados" description="Prueba con otro nombre o apellido." />
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
          {folders.map((folder) => (
            <button
              key={folder.id}
              type="button"
              onClick={() => setSelectedCourseId(folder.id)}
              className="text-left"
            >
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardBody className="flex flex-col items-center gap-2 py-5 text-center">
                  <Folder className="h-8 w-8 text-brand-600" strokeWidth={1.5} />
                  <span className="text-sm font-semibold text-slate-900">{folder.courseLabel}</span>
                  <span className="text-xs text-slate-500">{folder.students.length} estudiantes</span>
                </CardBody>
              </Card>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
