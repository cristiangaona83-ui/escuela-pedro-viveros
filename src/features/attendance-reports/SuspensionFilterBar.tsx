"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/Field";
import { SUSPENSION_KIND_LABELS, SUSPENSION_REASON_LABELS, type SuspensionKind, type SuspensionReasonType } from "@/lib/attendance/suspensions";

/** Filtros de curso y tipo para el calendario administrativo -- el filtro de período/mes lo cubre PeriodFilterBar (ya soporta mes/semestre/año/rango). Controlado por la URL, igual criterio que el resto de reportes de asistencia. Los cursos vienen ya acotados por getTeachableCourses() (docente solo ve los suyos). */
export function SuspensionFilterBar({
  courses,
  courseId,
  kind,
  reasonType,
}: {
  courses: { course_id: string; course_label: string }[];
  courseId: string;
  kind: string;
  reasonType: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="w-52">
        <label className="mb-1 block text-xs font-medium text-slate-500">Curso</label>
        <Select value={courseId} onChange={(e) => updateParam("courseId", e.target.value)}>
          <option value="">Todos</option>
          {courses.map((c) => (
            <option key={c.course_id} value={c.course_id}>
              {c.course_label}
            </option>
          ))}
        </Select>
      </div>
      <div className="w-48">
        <label className="mb-1 block text-xs font-medium text-slate-500">Tipo de registro</label>
        <Select value={kind} onChange={(e) => updateParam("kind", e.target.value)}>
          <option value="">Todos</option>
          {(Object.keys(SUSPENSION_KIND_LABELS) as SuspensionKind[]).map((k) => (
            <option key={k} value={k}>
              {SUSPENSION_KIND_LABELS[k]}
            </option>
          ))}
        </Select>
      </div>
      <div className="w-56">
        <label className="mb-1 block text-xs font-medium text-slate-500">Motivo</label>
        <Select value={reasonType} onChange={(e) => updateParam("reasonType", e.target.value)}>
          <option value="">Todos</option>
          {(Object.keys(SUSPENSION_REASON_LABELS) as SuspensionReasonType[]).map((t) => (
            <option key={t} value={t}>
              {SUSPENSION_REASON_LABELS[t]}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
