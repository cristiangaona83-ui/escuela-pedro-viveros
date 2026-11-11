"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Eye, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button, buttonClassName } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { PARVULARIA_SCALE } from "@/config/parvularia";
import { evaluationKey, groupIndicators, indicatorNumbers, type ParvulariaValues } from "@/lib/parvularia";
import type { ParvulariaIndicatorRow, ParvulariaValue } from "@/types/database";

const TONE: Record<ParvulariaValue, string> = {
  L: "border-emerald-500 bg-emerald-500 text-white",
  ML: "border-amber-500 bg-amber-500 text-white",
  PL: "border-rose-500 bg-rose-500 text-white",
  NO: "border-slate-500 bg-slate-500 text-white",
};

function ScaleButtons({ label, value, onChange }: { label: string; value: ParvulariaValue | undefined; onChange: (v: ParvulariaValue | undefined) => void }) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label={label}>
      <span className="w-9 shrink-0 text-[10px] font-medium uppercase text-slate-400">{label}</span>
      {PARVULARIA_SCALE.map((s) => (
        <button
          key={s.value}
          type="button"
          title={s.label}
          aria-pressed={value === s.value}
          onClick={() => onChange(value === s.value ? undefined : s.value)}
          className={cn(
            "h-7 min-w-8 rounded-md border px-1.5 text-xs font-semibold transition-colors",
            value === s.value ? TONE[s.value] : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50"
          )}
        >
          {s.short}
        </button>
      ))}
    </div>
  );
}

/**
 * Registro del Informe Pedagógico de un niño(a) de Prekínder/Kínder: una
 * evaluación conceptual (L, ML, PL, N/O) por indicador y semestre, más las
 * observaciones y la fecha de entrega. Tocar de nuevo el valor marcado lo
 * borra. Escribe directo a Supabase con el cliente de sesión (RLS: dirección,
 * UTP y la educadora del curso).
 */
export function ParvulariaEvaluationForm({
  studentId,
  academicYearId,
  indicators,
  initialValues,
  initialObservations,
  initialDeliveryDate,
}: {
  studentId: string;
  academicYearId: string;
  indicators: ParvulariaIndicatorRow[];
  initialValues: ParvulariaValues;
  initialObservations: string;
  initialDeliveryDate: string;
}) {
  const router = useRouter();
  const groups = useMemo(() => groupIndicators(indicators), [indicators]);
  const numbers = useMemo(() => indicatorNumbers(groups), [groups]);
  const total = indicators.length;

  const [saved, setSaved] = useState<ParvulariaValues>(initialValues);
  const [values, setValues] = useState<ParvulariaValues>(initialValues);
  const [observations, setObservations] = useState(initialObservations);
  const [deliveryDate, setDeliveryDate] = useState(initialDeliveryDate);
  const [savedNotes, setSavedNotes] = useState({ observations: initialObservations, deliveryDate: initialDeliveryDate });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const keys = useMemo(() => new Set([...Object.keys(saved), ...Object.keys(values)]), [saved, values]);
  const dirty =
    [...keys].some((k) => saved[k] !== values[k]) || observations !== savedNotes.observations || deliveryDate !== savedNotes.deliveryDate;

  const filled = (semester: 1 | 2) => indicators.filter((i) => values[evaluationKey(i.id, semester)]).length;

  function setValue(indicatorId: string, semester: 1 | 2, value: ParvulariaValue | undefined) {
    setMessage(null);
    setValues((prev) => {
      const next = { ...prev };
      const key = evaluationKey(indicatorId, semester);
      if (value) next[key] = value;
      else delete next[key];
      return next;
    });
  }

  /** Marca como Logrado los indicadores aún vacíos de un núcleo en un semestre. */
  function fillEmptyWithL(list: ParvulariaIndicatorRow[], semester: 1 | 2) {
    setMessage(null);
    setValues((prev) => {
      const next = { ...prev };
      for (const ind of list) {
        const key = evaluationKey(ind.id, semester);
        if (!next[key]) next[key] = "L";
      }
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id ?? null;

    const upserts: { student_id: string; academic_year_id: string; indicator_id: string; semester: 1 | 2; value: ParvulariaValue; updated_by: string | null }[] = [];
    const removals: { 1: string[]; 2: string[] } = { 1: [], 2: [] };
    for (const ind of indicators) {
      for (const semester of [1, 2] as const) {
        const key = evaluationKey(ind.id, semester);
        if (values[key] === saved[key]) continue;
        if (values[key]) {
          upserts.push({ student_id: studentId, academic_year_id: academicYearId, indicator_id: ind.id, semester, value: values[key], updated_by: userId });
        } else {
          removals[semester].push(ind.id);
        }
      }
    }

    try {
      if (upserts.length > 0) {
        const { error } = await supabase.from("parvularia_evaluations").upsert(upserts, { onConflict: "student_id,academic_year_id,indicator_id,semester" });
        if (error) throw error;
      }
      for (const semester of [1, 2] as const) {
        if (removals[semester].length === 0) continue;
        const { error } = await supabase
          .from("parvularia_evaluations")
          .delete()
          .eq("student_id", studentId)
          .eq("academic_year_id", academicYearId)
          .eq("semester", semester)
          .in("indicator_id", removals[semester]);
        if (error) throw error;
      }
      if (observations !== savedNotes.observations || deliveryDate !== savedNotes.deliveryDate) {
        const { error } = await supabase.from("parvularia_report_notes").upsert(
          {
            student_id: studentId,
            academic_year_id: academicYearId,
            observations: observations.trim() || null,
            delivery_date: deliveryDate || null,
            updated_by: userId,
          },
          { onConflict: "student_id,academic_year_id" }
        );
        if (error) throw error;
      }
      await supabase.rpc("log_audit", {
        p_action: "registrar_informe_parvularia",
        p_module: "informes",
        p_entity: "parvularia_evaluations",
        p_entity_id: studentId,
        p_details: { cambios: upserts.length + removals[1].length + removals[2].length },
      });
      setSaved(values);
      setSavedNotes({ observations, deliveryDate });
      setMessage({ tone: "ok", text: "Informe guardado." });
      router.refresh();
    } catch (err) {
      console.error("[parvularia] error al guardar", err);
      setMessage({ tone: "error", text: "No se pudo guardar. Revisa tu conexión e inténtalo de nuevo." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 pb-24">
      <Card>
        <CardBody className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-600">
          {PARVULARIA_SCALE.map((s) => (
            <span key={s.value} className="inline-flex items-center gap-1.5">
              <span className={cn("inline-flex h-5 min-w-7 items-center justify-center rounded px-1 text-[11px] font-semibold", TONE[s.value])}>{s.short}</span>
              {s.label}
            </span>
          ))}
          <span className="text-slate-400">Toca de nuevo un valor para borrarlo.</span>
        </CardBody>
      </Card>

      {groups.map((group) => (
        <section key={group.ambito}>
          <h2 className="rounded-lg bg-brand-700 px-3 py-2 text-sm font-semibold text-white">ÁMBITO: {group.ambito}</h2>
          <div className="mt-3 space-y-4">
            {group.nucleos.map((nucleo) => (
              <Card key={nucleo.nucleo}>
                <CardBody className="space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
                    <h3 className="text-sm font-semibold text-brand-800">Núcleo: {nucleo.nucleo}</h3>
                    <div className="flex gap-2">
                      {([1, 2] as const).map((semester) => (
                        <button
                          key={semester}
                          type="button"
                          onClick={() => fillEmptyWithL(nucleo.indicators, semester)}
                          className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-500 hover:bg-slate-50"
                        >
                          Vacíos del {semester}° sem. → L
                        </button>
                      ))}
                    </div>
                  </div>
                  {nucleo.indicators.map((ind) => {
                    return (
                      <div key={ind.id} className="flex flex-col gap-2 border-t border-slate-100 py-2 lg:flex-row lg:items-center lg:justify-between">
                        <p className="text-sm text-slate-700 lg:max-w-[46%]">
                          <span className="mr-1.5 text-xs text-slate-400">{numbers.get(ind.id)}.</span>
                          {ind.text}
                        </p>
                        <div className="flex flex-wrap gap-x-5 gap-y-1.5">
                          <ScaleButtons label="1° Sem" value={values[evaluationKey(ind.id, 1)]} onChange={(v) => setValue(ind.id, 1, v)} />
                          <ScaleButtons label="2° Sem" value={values[evaluationKey(ind.id, 2)]} onChange={(v) => setValue(ind.id, 2, v)} />
                        </div>
                      </div>
                    );
                  })}
                </CardBody>
              </Card>
            ))}
          </div>
        </section>
      ))}

      <Card>
        <CardBody className="space-y-4">
          <div>
            <label htmlFor="observations" className="mb-1 block text-sm font-medium text-slate-700">Observaciones</label>
            <Textarea id="observations" rows={5} value={observations} onChange={(e) => { setObservations(e.target.value); setMessage(null); }} placeholder="Observaciones generales para la familia…" />
          </div>
          <div className="w-56">
            <label htmlFor="delivery_date" className="mb-1 block text-sm font-medium text-slate-700">Fecha de entrega del informe</label>
            <Input id="delivery_date" type="date" value={deliveryDate} onChange={(e) => { setDeliveryDate(e.target.value); setMessage(null); }} />
          </div>
        </CardBody>
      </Card>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:left-64">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            1° Semestre: <strong>{filled(1)}/{total}</strong> · 2° Semestre: <strong>{filled(2)}/{total}</strong>
            {dirty && <span className="ml-2 font-medium text-amber-600">· Cambios sin guardar</span>}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {message && (
              <span className={cn("inline-flex items-center gap-1 text-xs", message.tone === "ok" ? "text-emerald-700" : "text-red-700")}>
                {message.tone === "ok" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />} {message.text}
              </span>
            )}
            <a
              href={`/plataforma/api/informes/parvularia?student_id=${studentId}&year=${academicYearId}`}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClassName("secondary", "sm")}
              title={dirty ? "Guarda antes de ver el PDF para que incluya los últimos cambios" : "Ver el informe en PDF"}
            >
              <Eye className="h-4 w-4" /> Ver PDF
            </a>
            <Button type="button" size="sm" onClick={handleSave} disabled={saving || !dirty}>
              <Save className="h-4 w-4" /> {saving ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
