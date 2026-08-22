"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Save, AlertCircle, CheckCircle2, Lock } from "lucide-react";
import { Select, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { createClient } from "@/lib/supabase/client";
import type { CourseOption } from "@/services/academic-scope";

type AttendanceStatus = "presente" | "ausente" | "atraso" | "retiro";

const STATUS_OPTIONS: { value: AttendanceStatus; label: string; tone: "success" | "danger" | "warning" | "neutral" }[] = [
  { value: "presente", label: "Presente", tone: "success" },
  { value: "ausente", label: "Ausente", tone: "danger" },
  { value: "atraso", label: "Atraso", tone: "warning" },
  { value: "retiro", label: "Retiro", tone: "neutral" },
];

interface StudentLite {
  id: string;
  first_names: string;
  last_names: string;
}
interface RowState {
  status: AttendanceStatus;
  observation: string;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function AttendanceGrid({ courses, canWrite }: { courses: CourseOption[]; canWrite: boolean }) {
  const [courseId, setCourseId] = useState("");
  const [date, setDate] = useState(todayISO());
  const [students, setStudents] = useState<StudentLite[]>([]);
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const loadData = useCallback(async () => {
    if (!courseId || !date) return;
    setLoading(true);
    setError(null);
    setSavedMessage(null);
    const supabase = createClient();

    const [{ data: enrollments }, { data: existing }] = await Promise.all([
      supabase
        .from("enrollments")
        .select("students(id, first_names, last_names)")
        .eq("course_id", courseId)
        .eq("status", "activa"),
      supabase.from("attendance").select("student_id, status, observation").eq("course_id", courseId).eq("date", date),
    ]);

    const studentList = (enrollments ?? [])
      .map((e) => (e as unknown as { students: StudentLite | null }).students)
      .filter((s): s is StudentLite => Boolean(s))
      .sort((a, b) => a.last_names.localeCompare(b.last_names));
    setStudents(studentList);

    const existingByStudent = new Map((existing ?? []).map((r) => [r.student_id, r]));
    const initialRows: Record<string, RowState> = {};
    for (const s of studentList) {
      const found = existingByStudent.get(s.id);
      initialRows[s.id] = {
        status: (found?.status as AttendanceStatus) ?? "presente",
        observation: found?.observation ?? "",
      };
    }
    setRows(initialRows);
    setDirty(false);
    setLoading(false);
  }, [courseId, date]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga de datos al cambiar de curso/fecha
    loadData();
  }, [loadData]);

  function updateRow(studentId: string, patch: Partial<RowState>) {
    setRows((prev) => ({ ...prev, [studentId]: { ...prev[studentId], ...patch } }));
    setDirty(true);
    setSavedMessage(null);
  }

  async function handleSave() {
    if (!courseId || !date || students.length === 0) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { data: authData } = await supabase.auth.getUser();

    const payload = students.map((s) => ({
      student_id: s.id,
      course_id: courseId,
      date,
      status: rows[s.id]?.status ?? "presente",
      observation: rows[s.id]?.observation || null,
      recorded_by: authData.user?.id ?? null,
    }));

    const { error: dbError } = await supabase.from("attendance").upsert(payload, { onConflict: "student_id,date" });

    if (dbError) {
      setSaving(false);
      setError("No pudimos guardar la asistencia.");
      return;
    }

    // Auditoría resumida por operación de guardado (no una fila por alumno).
    await supabase.rpc("log_audit", {
      p_action: "attendance_bulk_update",
      p_module: "asistencia",
      p_entity: "attendance",
      p_details: { course_id: courseId, date, affected_count: payload.length },
    });

    setSaving(false);
    setDirty(false);
    setSavedMessage(`Asistencia guardada para ${payload.length} estudiante${payload.length === 1 ? "" : "s"}.`);
  }

  const summary = useMemo(() => {
    const counts: Record<AttendanceStatus, number> = { presente: 0, ausente: 0, atraso: 0, retiro: 0 };
    for (const s of students) {
      const status = rows[s.id]?.status ?? "presente";
      counts[status] += 1;
    }
    return counts;
  }, [students, rows]);

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Curso</label>
          <Select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
            <option value="">Selecciona…</option>
            {courses.map((c) => (
              <option key={c.course_id} value={c.course_id}>{c.course_label}</option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Fecha</label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={todayISO()} />
        </div>
        {canWrite && (
          <div className="flex items-end">
            <Button type="button" onClick={handleSave} disabled={saving || loading || students.length === 0 || !dirty} className="w-full">
              <Save className="h-4 w-4" /> {saving ? "Guardando…" : "Guardar asistencia"}
            </Button>
          </div>
        )}
      </div>

      {!canWrite && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-600">
          <Lock className="h-4 w-4 shrink-0" /> Solo lectura: tu rol puede consultar la asistencia, pero no registrarla.
        </div>
      )}
      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      {savedMessage && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> {savedMessage}
        </div>
      )}

      <div className="mt-6">
        {!courseId ? (
          <p className="text-sm text-slate-500">Selecciona un curso y una fecha para ver el registro de asistencia.</p>
        ) : loading ? (
          <p className="text-sm text-slate-500">Cargando…</p>
        ) : students.length === 0 ? (
          <EmptyState icon={AlertCircle} title="Sin estudiantes matriculados" description="Este curso todavía no tiene matrículas activas." />
        ) : (
          <>
            <div className="mb-3 flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((opt) => (
                <Badge key={opt.value} tone={opt.tone}>{opt.label}: {summary[opt.value]}</Badge>
              ))}
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="sticky left-0 bg-slate-50 px-4 py-3">Estudiante</th>
                    <th className="px-3 py-3">Estado</th>
                    <th className="px-3 py-3">Observación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((s) => (
                    <tr key={s.id}>
                      <td className="sticky left-0 whitespace-nowrap bg-white px-4 py-2 font-medium text-slate-800">
                        {s.last_names}, {s.first_names}
                      </td>
                      <td className="px-3 py-2">
                        <Select
                          value={rows[s.id]?.status ?? "presente"}
                          onChange={(e) => updateRow(s.id, { status: e.target.value as AttendanceStatus })}
                          disabled={!canWrite}
                          className="w-36"
                        >
                          {STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </Select>
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          value={rows[s.id]?.observation ?? ""}
                          onChange={(e) => updateRow(s.id, { observation: e.target.value })}
                          disabled={!canWrite}
                          placeholder="Opcional"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {canWrite && (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
                <CheckCircle2 className="h-3.5 w-3.5" /> Marca la asistencia de todo el curso y presiona &ldquo;Guardar asistencia&rdquo;.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
