"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Save, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select, Textarea } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import { uploadPrivateFile, FileValidationError } from "@/lib/supabase/storage";
import { ViewCaseAttachmentButton } from "@/features/convivencia/ViewCaseAttachmentButton";
import { SUSPENSION_KIND_LABELS, SUSPENSION_REASON_LABELS, type SuspensionKind, type SuspensionReasonType, type SuspensionScope } from "@/lib/attendance/suspensions";
import type { SuspensionCourseOption, SuspensionDetail } from "@/services/class-suspensions";

const REASON_TYPES = Object.keys(SUSPENSION_REASON_LABELS) as SuspensionReasonType[];

/**
 * Alta y edición de suspensiones/días recuperados -- un solo formulario para
 * ambos "kind" (comparten casi todos los campos). Escribe directo con el
 * cliente de navegador (mismo patrón que el resto de Convivencia:
 * CaseAttachmentsPanel/PreventiveActionForm), la seguridad real la aplica
 * RLS (0037_class_suspensions.sql), no este componente.
 */
export function SuspensionForm({
  courses,
  recoveryOptions,
  existing,
}: {
  courses: SuspensionCourseOption[];
  recoveryOptions: { id: string; label: string }[];
  existing?: SuspensionDetail;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [kind, setKind] = useState<SuspensionKind>(existing?.kind ?? "suspension");
  const [scope, setScope] = useState<SuspensionScope>(existing?.scope ?? "escuela");
  const [selectedCourses, setSelectedCourses] = useState<string[]>(existing?.courses.map((c) => c.id) ?? []);
  const [fullDay, setFullDay] = useState(existing?.full_day ?? true);
  const documentPath = existing?.supporting_document_path ?? null;

  const coursesByLevel = useMemo(() => {
    const map = new Map<string, SuspensionCourseOption[]>();
    for (const c of courses) {
      const list = map.get(c.level) ?? [];
      list.push(c);
      map.set(c.level, list);
    }
    return Array.from(map.entries());
  }, [courses]);

  function toggleCourse(id: string) {
    setSelectedCourses((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Sesión no válida.");
      return;
    }

    const suspensionDate = String(form.get("suspension_date") || "");
    const reasonType = (String(form.get("reason_type") || "") || null) as SuspensionReasonType | null;
    const description = String(form.get("description") || "").trim() || null;
    const observation = String(form.get("observation") || "").trim() || null;
    const startTime = String(form.get("start_time") || "") || null;
    const endTime = String(form.get("end_time") || "") || null;
    const recoveryOfId = String(form.get("recovery_of_id") || "") || null;
    const file = form.get("supporting_document") as File | null;

    if (!suspensionDate) {
      setError("Selecciona la fecha.");
      return;
    }
    if (scope === "cursos" && selectedCourses.length === 0) {
      setError("Selecciona al menos un curso para este alcance.");
      return;
    }
    if (kind === "suspension" && !reasonType) {
      setError("Selecciona el tipo/motivo de la suspensión.");
      return;
    }

    setLoading(true);

    // Duplicados: misma fecha + mismo alcance (escuela, o algún curso en
    // común) entre suspensiones activas -- advertencia, no bloqueo.
    if (kind === "suspension") {
      const { data: candidates } = await supabase
        .from("class_suspensions")
        .select("id, scope, reason_type, class_suspension_courses(course_id)")
        .eq("suspension_date", suspensionDate)
        .eq("kind", "suspension")
        .eq("status", "activa")
        .neq("id", existing?.id ?? "00000000-0000-0000-0000-000000000000");
      type Candidate = { id: string; scope: SuspensionScope; reason_type: SuspensionReasonType | null; class_suspension_courses: { course_id: string }[] };
      const conflict = ((candidates ?? []) as unknown as Candidate[]).find((c) => {
        if (c.scope === "escuela" || scope === "escuela") return true;
        return c.class_suspension_courses.some((l) => selectedCourses.includes(l.course_id));
      });
      if (conflict) {
        const proceed = window.confirm(
          `Ya existe una suspensión activa (${SUSPENSION_REASON_LABELS[conflict.reason_type as SuspensionReasonType] ?? conflict.reason_type ?? "—"}) para esta fecha y alcance. ¿Guardar de todos modos?`
        );
        if (!proceed) {
          setLoading(false);
          return;
        }
      }
    }

    const id = existing?.id ?? crypto.randomUUID();

    let finalDocumentPath = documentPath;
    if (file && file.size > 0) {
      try {
        finalDocumentPath = await uploadPrivateFile(`asistencia/suspensiones/${id}`, file, "suspension_document");
      } catch (err) {
        setLoading(false);
        setError(err instanceof FileValidationError ? err.message : "No pudimos subir el documento de respaldo.");
        return;
      }
    }

    const payload = {
      suspension_date: suspensionDate,
      kind,
      scope,
      reason_type: kind === "suspension" ? reasonType : null,
      full_day: kind === "recuperacion" ? true : fullDay,
      start_time: kind === "suspension" && !fullDay ? startTime : null,
      end_time: kind === "suspension" && !fullDay ? endTime : null,
      description,
      observation,
      supporting_document_path: finalDocumentPath,
      recovery_of_id: kind === "recuperacion" ? recoveryOfId : null,
    };

    const { error: writeError } = existing
      ? await supabase.from("class_suspensions").update({ ...payload, updated_by: user.id }).eq("id", id)
      : await supabase.from("class_suspensions").insert({ id, ...payload, created_by: user.id });

    if (writeError) {
      setLoading(false);
      setError("No pudimos guardar el registro.");
      return;
    }

    await supabase.from("class_suspension_courses").delete().eq("suspension_id", id);
    if (scope === "cursos" && selectedCourses.length > 0) {
      await supabase.from("class_suspension_courses").insert(selectedCourses.map((courseId) => ({ suspension_id: id, course_id: courseId })));
    }

    await supabase.rpc("log_audit", {
      p_action: existing ? (kind === "recuperacion" ? "editar_dia_recuperado" : "editar_suspension_clases") : kind === "recuperacion" ? "crear_dia_recuperado" : "crear_suspension_clases",
      p_module: "asistencia",
      p_entity: "class_suspensions",
      p_entity_id: id,
      p_details: { suspension_date: suspensionDate, scope, reason_type: reasonType, course_ids: selectedCourses },
    });

    setLoading(false);
    router.push("/plataforma/asistencia/administracion");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Tipo de registro" htmlFor="kind" required>
        <Select id="kind" value={kind} onChange={(e) => setKind(e.target.value as SuspensionKind)}>
          {(Object.keys(SUSPENSION_KIND_LABELS) as SuspensionKind[]).map((k) => (
            <option key={k} value={k}>
              {SUSPENSION_KIND_LABELS[k]}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label="Fecha" htmlFor="suspension_date" required>
        <Input id="suspension_date" name="suspension_date" type="date" required defaultValue={existing?.suspension_date ?? new Date().toISOString().slice(0, 10)} />
      </FormField>

      {kind === "suspension" && (
        <FormField label="Tipo / motivo" htmlFor="reason_type" required hint="Categoría administrativa, no una clasificación legal.">
          <Select id="reason_type" name="reason_type" required defaultValue={existing?.reason_type ?? ""}>
            <option value="" disabled>
              Selecciona un motivo
            </option>
            {REASON_TYPES.map((t) => (
              <option key={t} value={t}>
                {SUSPENSION_REASON_LABELS[t]}
              </option>
            ))}
          </Select>
        </FormField>
      )}

      {kind === "recuperacion" && recoveryOptions.length > 0 && (
        <FormField label="Asociar a una suspensión anterior" htmlFor="recovery_of_id" hint="Opcional">
          <Select id="recovery_of_id" name="recovery_of_id" defaultValue={existing?.recovery_of_id ?? ""}>
            <option value="">Sin asociar</option>
            {recoveryOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </Select>
        </FormField>
      )}

      <div>
        <p className="mb-1.5 text-sm font-medium text-slate-700">Alcance</p>
        <div className="flex gap-4 text-sm text-slate-700">
          <label className="flex items-center gap-1.5">
            <input type="radio" name="scope_radio" checked={scope === "escuela"} onChange={() => setScope("escuela")} className="h-3.5 w-3.5" />
            Toda la escuela
          </label>
          <label className="flex items-center gap-1.5">
            <input type="radio" name="scope_radio" checked={scope === "cursos"} onChange={() => setScope("cursos")} className="h-3.5 w-3.5" />
            Cursos seleccionados
          </label>
        </div>
      </div>

      {scope === "cursos" && (
        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-700">Curso(s) afectado(s)</p>
          <div className="space-y-2 rounded-lg border border-slate-200 p-3">
            {coursesByLevel.map(([level, list]) => (
              <div key={level}>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{level}</p>
                <div className="mt-1 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                  {list.map((c) => (
                    <label key={c.id} className="flex items-center gap-1.5 text-xs text-slate-600">
                      <input type="checkbox" checked={selectedCourses.includes(c.id)} onChange={() => toggleCourse(c.id)} className="h-3.5 w-3.5 rounded border-slate-300" />
                      {c.level} {c.letter}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {kind === "suspension" && (
        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-700">Jornada</p>
          <div className="flex gap-4 text-sm text-slate-700">
            <label className="flex items-center gap-1.5">
              <input type="radio" name="full_day_radio" checked={fullDay} onChange={() => setFullDay(true)} className="h-3.5 w-3.5" />
              Completa
            </label>
            <label className="flex items-center gap-1.5">
              <input type="radio" name="full_day_radio" checked={!fullDay} onChange={() => setFullDay(false)} className="h-3.5 w-3.5" />
              Parcial
            </label>
          </div>
          {!fullDay && (
            <p className="mt-1 text-xs text-amber-700">
              Una interrupción parcial queda registrada para trazabilidad, pero no se excluye del cálculo de asistencia (no existe hoy una fórmula por jornada/bloque).
            </p>
          )}
        </div>
      )}

      {kind === "suspension" && !fullDay && (
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Hora de inicio" htmlFor="start_time">
            <Input id="start_time" name="start_time" type="time" defaultValue={existing?.start_time ?? ""} />
          </FormField>
          <FormField label="Hora de término" htmlFor="end_time">
            <Input id="end_time" name="end_time" type="time" defaultValue={existing?.end_time ?? ""} />
          </FormField>
        </div>
      )}

      <FormField label="Descripción" htmlFor="description" hint="Opcional">
        <Textarea id="description" name="description" rows={2} defaultValue={existing?.description ?? ""} />
      </FormField>
      <FormField label="Observación" htmlFor="observation" hint="Opcional">
        <Textarea id="observation" name="observation" rows={2} defaultValue={existing?.observation ?? ""} />
      </FormField>

      <FormField label="Documento/resolución de respaldo" htmlFor="supporting_document" hint="Opcional — PDF, DOCX, JPG o PNG, máximo 15 MB.">
        <Input id="supporting_document" name="supporting_document" type="file" accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png" />
      </FormField>
      {documentPath && (
        <div className="text-xs text-slate-500">
          Documento actual: <ViewCaseAttachmentButton storagePath={documentPath} />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      <Button type="submit" disabled={loading}>
        <Save className="h-4 w-4" /> {loading ? "Guardando…" : "Guardar"}
      </Button>
    </form>
  );
}
