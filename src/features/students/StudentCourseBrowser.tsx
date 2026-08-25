"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Folder, FolderX, ArrowLeft, Search, Users } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
import type { StudentCourseFolder, StudentWithCourse } from "@/services/students";

const STATUS_TONE = { matriculado: "success", retirado: "danger", egresado: "neutral" } as const;

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function matches(student: StudentWithCourse, query: string): boolean {
  const q = normalize(query.trim());
  if (!q) return true;
  return normalize(`${student.last_names} ${student.first_names} ${student.run}`).includes(q);
}

function StudentTable({ students }: { students: StudentWithCourse[] }) {
  if (students.length === 0) {
    return <EmptyState icon={Users} title="Sin resultados" description="Prueba con otro nombre, apellido o RUN." />;
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-5 py-3">Estudiante</th>
            <th className="px-5 py-3">RUN</th>
            <th className="px-5 py-3">Curso</th>
            <th className="px-5 py-3">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {students.map((s) => (
            <tr key={s.id} className="hover:bg-slate-50">
              <td className="px-5 py-3">
                <Link href={`/plataforma/estudiantes/${s.id}`} className="font-medium text-brand-700 hover:underline">
                  {s.last_names}, {s.first_names}
                </Link>
              </td>
              <td className="px-5 py-3 text-slate-500">{s.run}</td>
              <td className="px-5 py-3 text-slate-500">{s.course_label ?? "Sin matrícula activa"}</td>
              <td className="px-5 py-3">
                <Badge tone={STATUS_TONE[s.status]}>{s.status}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Navegación por carpetas de curso para el módulo Estudiantes. Los cursos y
 * su nómina ya vienen resueltos desde el servidor
 * (listStudentsGroupedByCourse) — igual que en el buscador de Certificado
 * de Alumno Regular, la navegación entre "todos los cursos" / curso
 * abierto / retirados y el filtro de búsqueda son solo estado local, sin
 * llamadas adicionales. Ninguna acción del módulo (ficha, matrícula,
 * apoderados, documentos, historial, retiro/reincorporación) vive aquí:
 * todas siguen exactamente igual dentro de la ficha de cada estudiante.
 */
export function StudentCourseBrowser({
  courseFolders,
  withdrawnStudents,
  initialQuery,
}: {
  courseFolders: StudentCourseFolder[];
  withdrawnStudents: StudentWithCourse[];
  initialQuery?: string;
}) {
  const [selection, setSelection] = useState<string | null>(null); // course id, "__retirados__", o null
  const [query, setQuery] = useState(initialQuery ?? "");

  const allStudents = useMemo(
    () => [...courseFolders.flatMap((f) => f.students), ...withdrawnStudents],
    [courseFolders, withdrawnStudents]
  );

  const selectedFolder = selection && selection !== "__retirados__" ? courseFolders.find((f) => f.id === selection) ?? null : null;
  const showingWithdrawn = selection === "__retirados__";

  const globalMatches = useMemo(() => {
    if (selection || !query.trim()) return [];
    return allStudents.filter((s) => matches(s, query));
  }, [allStudents, selection, query]);

  const scopedMatches = useMemo(() => {
    const source = showingWithdrawn ? withdrawnStudents : selectedFolder?.students ?? [];
    return source.filter((s) => matches(s, query));
  }, [showingWithdrawn, withdrawnStudents, selectedFolder, query]);

  function openFolder(id: string) {
    setSelection(id);
    setQuery("");
  }

  function goBack() {
    setSelection(null);
    setQuery("");
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          id="buscar"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            selectedFolder
              ? `Buscar dentro de ${selectedFolder.courseLabel}…`
              : showingWithdrawn
                ? "Buscar dentro de Estudiantes retirados…"
                : "Buscar estudiante en toda la escuela…"
          }
          className="pl-9"
        />
      </div>

      {selectedFolder || showingWithdrawn ? (
        <div>
          <button
            type="button"
            onClick={goBack}
            className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-800"
          >
            <ArrowLeft className="h-4 w-4" /> Todos los cursos
          </button>

          <h3 className="mb-3 text-sm font-semibold text-slate-900">
            {showingWithdrawn ? "Estudiantes retirados" : selectedFolder!.courseLabel}{" "}
            <span className="font-normal text-slate-400">
              · {(showingWithdrawn ? withdrawnStudents : selectedFolder!.students).length} estudiantes
            </span>
          </h3>

          <StudentTable students={scopedMatches} />
        </div>
      ) : query.trim() ? (
        <div>
          <p className="mb-2 text-xs text-slate-500">{globalMatches.length} resultado(s)</p>
          <StudentTable students={globalMatches} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {courseFolders.map((folder) => (
            <button key={folder.id} type="button" onClick={() => openFolder(folder.id)} className="text-left">
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardBody className="flex flex-col items-center gap-2 py-5 text-center">
                  <Folder className="h-8 w-8 text-brand-600" strokeWidth={1.5} />
                  <span className="text-sm font-semibold text-slate-900">{folder.courseLabel}</span>
                  <span className="text-xs text-slate-500">{folder.students.length} estudiantes</span>
                </CardBody>
              </Card>
            </button>
          ))}

          <button type="button" onClick={() => openFolder("__retirados__")} className="text-left">
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardBody className="flex flex-col items-center gap-2 py-5 text-center">
                <FolderX className="h-8 w-8 text-slate-400" strokeWidth={1.5} />
                <span className="text-sm font-semibold text-slate-900">Estudiantes retirados</span>
                <span className="text-xs text-slate-500">{withdrawnStudents.length} estudiantes</span>
              </CardBody>
            </Card>
          </button>
        </div>
      )}
    </div>
  );
}
