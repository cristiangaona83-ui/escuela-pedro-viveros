"use client";

import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, AlertCircle, Check, Plus, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select, Textarea } from "@/components/ui/Field";
import { cn } from "@/lib/utils";
import {
  ADMISSION_TYPES,
  ENROLLMENT_CHECKLIST,
  IMAGE_AUTH_OPTIONS,
  SUPPORT_OPTIONS,
  TRANSPORT_OPTIONS,
  validateStep,
  type ContactData,
  type MatriculaFormData,
} from "@/lib/matricula";

const STEPS = [
  { n: 1, title: "Matrícula e identificación" },
  { n: 2, title: "Responsables y antecedentes" },
  { n: 3, title: "Constancias y cierre" },
] as const;

function SectionBar({ children }: { children: React.ReactNode }) {
  return <h3 className="rounded-lg bg-brand-50 px-3.5 py-2 text-xs font-semibold uppercase tracking-wide text-brand-800">{children}</h3>;
}

function Check_({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-2 text-sm text-slate-700">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-300" />
      <span>{label}</span>
    </label>
  );
}

function Radios<T extends string>({
  name,
  value,
  options,
  onChange,
}: {
  name: string;
  value: T | "";
  options: readonly { value: T; label: string }[];
  onChange: (v: T | "") => void;
}) {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2">
      {options.map((o) => (
        <label key={o.value} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
          <input
            type="radio"
            name={name}
            checked={value === o.value}
            onClick={() => value === o.value && onChange("")}
            onChange={() => onChange(o.value)}
            className="h-4 w-4 border-slate-300"
          />
          {o.label}
        </label>
      ))}
    </div>
  );
}

/**
 * Ficha de matrícula en 3 pasos, igual a la ficha impresa de Inspectoría
 * General. `staff`: registro en Inspectoría (elige el curso, marca documentos y
 * constancias). `public`: pre-matrícula que completa la familia desde un enlace
 * (elige el nivel al que postula y acepta el aviso de privacidad).
 */
export function MatriculaForm({
  mode,
  yearLabel,
  courses = [],
  levels = [],
  initial,
  initialCourseId = "",
  submitLabel,
  onSubmit,
}: {
  mode: "staff" | "public";
  yearLabel: string;
  courses?: { id: string; label: string }[];
  levels?: string[];
  initial: MatriculaFormData;
  initialCourseId?: string;
  submitLabel: string;
  /** Devuelve un mensaje de error, o null si salió bien (quien la usa muestra el éxito). */
  onSubmit: (data: MatriculaFormData, courseId: string, honeypot: string) => Promise<string | null>;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [data, setData] = useState<MatriculaFormData>(initial);
  const [courseId, setCourseId] = useState(initialCourseId);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const honeypot = useRef("");
  const top = useRef<HTMLDivElement>(null);

  const set = <K extends keyof MatriculaFormData>(key: K, value: MatriculaFormData[K]) => setData((d) => ({ ...d, [key]: value }));
  const setContact = (which: "guardian" | "substitute", key: keyof ContactData, value: string) =>
    setData((d) => ({ ...d, [which]: { ...d[which], [key]: value } }));
  const setPickup = (index: number, key: "full_name" | "relationship" | "phone", value: string) =>
    setData((d) => ({ ...d, pickup: d.pickup.map((p, i) => (i === index ? { ...p, [key]: value } : p)) }));

  function stepErrors(target: 1 | 2 | 3) {
    const e = validateStep(data, target, mode);
    if (target === 1 && mode === "staff" && !courseId) e.course_id = "Elige el curso de ingreso";
    return e;
  }

  function goNext() {
    const e = stepErrors(step);
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    setStep((s) => (s < 3 ? ((s + 1) as 2 | 3) : s));
    top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function goBack() {
    setErrors({});
    setStep((s) => (s > 1 ? ((s - 1) as 1 | 2) : s));
    top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleSubmit() {
    const all = { ...stepErrors(1), ...stepErrors(3) };
    setErrors(all);
    if (Object.keys(all).length > 0) {
      setStep(all.privacy_informed && Object.keys(all).length === 1 ? 3 : 1);
      return;
    }
    setSaving(true);
    setSubmitError(null);
    const message = await onSubmit(data, courseId, honeypot.current);
    setSaving(false);
    if (message) {
      setSubmitError(message);
      top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  const err = (key: string) => errors[key];

  return (
    <div ref={top} className="space-y-6">
      <ol className="flex flex-wrap gap-2">
        {STEPS.map((s) => (
          <li
            key={s.n}
            className={cn(
              "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium",
              step === s.n ? "border-brand-600 bg-brand-600 text-white" : step > s.n ? "border-brand-200 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-500"
            )}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[11px]">{step > s.n ? <Check className="h-3 w-3" /> : s.n}</span>
            {s.title}
          </li>
        ))}
      </ol>

      {submitError && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {submitError}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-5">
          <SectionBar>Datos de matrícula</SectionBar>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FormField label="Año escolar" htmlFor="year">
              <Input id="year" value={yearLabel} readOnly disabled />
            </FormField>
            <FormField label="Fecha" htmlFor="enrolled_at">
              <Input id="enrolled_at" type="date" value={data.enrolled_at} onChange={(e) => set("enrolled_at", e.target.value)} />
            </FormField>
            {mode === "staff" ? (
              <FormField label="Curso de ingreso" htmlFor="course_id" required error={err("course_id")}>
                <Select id="course_id" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                  <option value="">Selecciona…</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </Select>
              </FormField>
            ) : (
              <FormField label="Curso al que postula" htmlFor="level_requested" required error={err("level_requested")}>
                <Select id="level_requested" value={data.level_requested} onChange={(e) => set("level_requested", e.target.value)}>
                  <option value="">Selecciona…</option>
                  {levels.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </Select>
              </FormField>
            )}
            <FormField label="Folio (uso interno)" htmlFor="folio">
              <Input id="folio" value={mode === "staff" ? "Se asigna al guardar" : "—"} readOnly disabled />
            </FormField>
          </div>
          <div>
            <p className="mb-1.5 text-sm font-medium text-slate-700">Tipo de matrícula <span className="text-accent-600">*</span></p>
            <Radios name="admission_type" value={data.admission_type} options={ADMISSION_TYPES.map((t) => ({ value: t, label: t }))} onChange={(v) => set("admission_type", v)} />
            {err("admission_type") && <p className="mt-1 text-xs text-red-600">{err("admission_type")}</p>}
          </div>
          <FormField label="Establecimiento de procedencia (si corresponde)" htmlFor="origin_school">
            <Input id="origin_school" value={data.origin_school} onChange={(e) => set("origin_school", e.target.value)} />
          </FormField>

          <SectionBar>Identificación del estudiante</SectionBar>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Nombres" htmlFor="first_names" required error={err("first_names")}>
              <Input id="first_names" value={data.first_names} onChange={(e) => set("first_names", e.target.value)} />
            </FormField>
            <FormField label="Apellido paterno" htmlFor="paternal_last_name" required error={err("paternal_last_name")}>
              <Input id="paternal_last_name" value={data.paternal_last_name} onChange={(e) => set("paternal_last_name", e.target.value)} />
            </FormField>
            <FormField label="Apellido materno" htmlFor="maternal_last_name">
              <Input id="maternal_last_name" value={data.maternal_last_name} onChange={(e) => set("maternal_last_name", e.target.value)} />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="RUN / RUT" htmlFor="run" required error={err("run")} hint="Con guion, ej. 12345678-5">
              <Input id="run" value={data.run} onChange={(e) => set("run", e.target.value)} inputMode="text" autoComplete="off" />
            </FormField>
            <FormField label="IPE (si corresponde)" htmlFor="ipe">
              <Input id="ipe" value={data.ipe} onChange={(e) => set("ipe", e.target.value)} />
            </FormField>
            <FormField label="Fecha de nacimiento" htmlFor="birth_date" required error={err("birth_date")}>
              <Input id="birth_date" type="date" value={data.birth_date} onChange={(e) => set("birth_date", e.target.value)} />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Nacionalidad" htmlFor="nationality">
              <Input id="nationality" value={data.nationality} onChange={(e) => set("nationality", e.target.value)} />
            </FormField>
            <FormField label="Sexo registral (si consta)" htmlFor="sex">
              <Select id="sex" value={data.sex} onChange={(e) => set("sex", e.target.value as MatriculaFormData["sex"])}>
                <option value="">—</option>
                <option value="F">Femenino</option>
                <option value="M">Masculino</option>
              </Select>
            </FormField>
            <FormField label="Nombre social / preferido" htmlFor="social_name">
              <Input id="social_name" value={data.social_name} onChange={(e) => set("social_name", e.target.value)} />
            </FormField>
          </div>
          <FormField label="Domicilio completo" htmlFor="address_street" required error={err("address_street")}>
            <Input id="address_street" value={data.address_street} onChange={(e) => set("address_street", e.target.value)} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Comuna" htmlFor="address_commune" required error={err("address_commune")}>
              <Input id="address_commune" value={data.address_commune} onChange={(e) => set("address_commune", e.target.value)} />
            </FormField>
            <FormField label="Sector / localidad" htmlFor="address_sector">
              <Input id="address_sector" value={data.address_sector} onChange={(e) => set("address_sector", e.target.value)} />
            </FormField>
          </div>

          <SectionBar>Apoderado/a titular</SectionBar>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Nombre completo" htmlFor="g_name" required error={err("guardian.full_name")}>
              <Input id="g_name" value={data.guardian.full_name} onChange={(e) => setContact("guardian", "full_name", e.target.value)} />
            </FormField>
            <FormField label="RUN / RUT" htmlFor="g_run" required error={err("guardian.run")}>
              <Input id="g_run" value={data.guardian.run} onChange={(e) => setContact("guardian", "run", e.target.value)} autoComplete="off" />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Vínculo con estudiante" htmlFor="g_rel" required error={err("guardian.relationship")}>
              <Input id="g_rel" value={data.guardian.relationship} onChange={(e) => setContact("guardian", "relationship", e.target.value)} placeholder="Madre, padre, abuela…" />
            </FormField>
            <FormField label="Teléfono principal" htmlFor="g_phone" required error={err("guardian.phone")}>
              <Input id="g_phone" type="tel" value={data.guardian.phone} onChange={(e) => setContact("guardian", "phone", e.target.value)} />
            </FormField>
            <FormField label="Teléfono alternativo" htmlFor="g_phone_alt">
              <Input id="g_phone_alt" type="tel" value={data.guardian.phone_alt} onChange={(e) => setContact("guardian", "phone_alt", e.target.value)} />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Correo electrónico" htmlFor="g_email" error={err("guardian.email")}>
              <Input id="g_email" type="email" value={data.guardian.email} onChange={(e) => setContact("guardian", "email", e.target.value)} />
            </FormField>
            <FormField label="Domicilio si es distinto" htmlFor="g_address">
              <Input id="g_address" value={data.guardian.address} onChange={(e) => setContact("guardian", "address", e.target.value)} />
            </FormField>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <p className="text-sm text-slate-500">Solo registre datos necesarios para el funcionamiento y seguridad escolar.</p>

          <SectionBar>Apoderado/a suplente</SectionBar>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Nombre completo" htmlFor="s_name">
              <Input id="s_name" value={data.substitute.full_name} onChange={(e) => setContact("substitute", "full_name", e.target.value)} />
            </FormField>
            <FormField label="RUN / RUT" htmlFor="s_run">
              <Input id="s_run" value={data.substitute.run} onChange={(e) => setContact("substitute", "run", e.target.value)} autoComplete="off" />
            </FormField>
            <FormField label="Vínculo con estudiante" htmlFor="s_rel">
              <Input id="s_rel" value={data.substitute.relationship} onChange={(e) => setContact("substitute", "relationship", e.target.value)} />
            </FormField>
            <FormField label="Teléfono de contacto" htmlFor="s_phone">
              <Input id="s_phone" type="tel" value={data.substitute.phone} onChange={(e) => setContact("substitute", "phone", e.target.value)} />
            </FormField>
          </div>

          <SectionBar>Personas autorizadas para retiro</SectionBar>
          <div className="space-y-3">
            {data.pickup.map((p, i) => (
              <div key={i} className="grid gap-3 sm:grid-cols-3">
                <FormField label="Nombre completo" htmlFor={`p_name_${i}`}>
                  <Input id={`p_name_${i}`} value={p.full_name} onChange={(e) => setPickup(i, "full_name", e.target.value)} />
                </FormField>
                <FormField label="Vínculo" htmlFor={`p_rel_${i}`}>
                  <Input id={`p_rel_${i}`} value={p.relationship} onChange={(e) => setPickup(i, "relationship", e.target.value)} />
                </FormField>
                <FormField label="Teléfono" htmlFor={`p_phone_${i}`}>
                  <Input id={`p_phone_${i}`} type="tel" value={p.phone} onChange={(e) => setPickup(i, "phone", e.target.value)} />
                </FormField>
              </div>
            ))}
            {data.pickup.length < 6 && (
              <button
                type="button"
                onClick={() => set("pickup", [...data.pickup, { full_name: "", relationship: "", phone: "" }])}
                className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline"
              >
                <Plus className="h-3.5 w-3.5" /> Agregar otra persona
              </button>
            )}
          </div>
          <FormField label="Restricciones de retiro formalmente acreditadas (solo lo indispensable)" htmlFor="pickup_restriction">
            <Textarea id="pickup_restriction" rows={2} value={data.pickup_restriction} onChange={(e) => set("pickup_restriction", e.target.value)} />
          </FormField>

          <SectionBar>Contacto de emergencia y bienestar</SectionBar>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Contacto de emergencia (si es diferente)" htmlFor="e_name">
              <Input id="e_name" value={data.emergency.full_name} onChange={(e) => set("emergency", { ...data.emergency, full_name: e.target.value })} />
            </FormField>
            <FormField label="Teléfono" htmlFor="e_phone">
              <Input id="e_phone" type="tel" value={data.emergency.phone} onChange={(e) => set("emergency", { ...data.emergency, phone: e.target.value })} />
            </FormField>
          </div>
          <FormField label="Alertas indispensables para respuesta de emergencia (sin diagnósticos extensos)" htmlFor="emergency_alerts">
            <Textarea id="emergency_alerts" rows={2} value={data.emergency_alerts} onChange={(e) => set("emergency_alerts", e.target.value)} />
          </FormField>
          <div>
            <p className="mb-1.5 text-sm font-medium text-slate-700">¿Requiere coordinación de apoyos escolares?</p>
            <Radios name="support" value={data.support_coordination} options={SUPPORT_OPTIONS} onChange={(v) => set("support_coordination", v)} />
          </div>
          <div>
            <p className="mb-1.5 text-sm font-medium text-slate-700">Forma habitual de traslado</p>
            <Radios name="transport" value={data.transport_mode} options={TRANSPORT_OPTIONS} onChange={(v) => set("transport_mode", v)} />
          </div>

          {mode === "staff" && (
            <>
              <SectionBar>Control de antecedentes</SectionBar>
              <div>
                <p className="mb-2 text-sm font-medium text-slate-700">Documentos recibidos / verificados</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {ENROLLMENT_CHECKLIST.map((d) => (
                    <Check_
                      key={d.code}
                      id={`doc_${d.code}`}
                      label={d.label}
                      checked={Boolean(data.documents[d.code])}
                      onChange={(v) => set("documents", { ...data.documents, [d.code]: v })}
                    />
                  ))}
                </div>
                <p className="mt-2 text-xs text-slate-500">*Según corresponda al caso. La documentación solicitada debe ajustarse a los requisitos legales vigentes.</p>
              </div>
            </>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5">
          <p className="text-sm text-slate-500">Las autorizaciones opcionales son independientes de la matrícula.</p>

          <SectionBar>{mode === "staff" ? "Constancias de información" : "Declaración e información"}</SectionBar>
          <div className="space-y-2">
            <Check_ id="rules" label={mode === "staff" ? "Reglamento interno informado" : "He sido informado/a del Reglamento Interno del establecimiento"} checked={data.rules_informed} onChange={(v) => set("rules_informed", v)} />
            <Check_ id="eval" label={mode === "staff" ? "Reglamento de evaluación informado" : "He sido informado/a del Reglamento de Evaluación"} checked={data.evaluation_rules_informed} onChange={(v) => set("evaluation_rules_informed", v)} />
            <Check_
              id="privacy"
              label={
                mode === "staff"
                  ? "Información de privacidad entregada"
                  : "Acepto el tratamiento de los datos de este formulario con el único fin de gestionar la matrícula y la seguridad escolar *"
              }
              checked={data.privacy_informed}
              onChange={(v) => set("privacy_informed", v)}
            />
            {err("privacy_informed") && <p className="text-xs text-red-600">{err("privacy_informed")}</p>}
          </div>

          <SectionBar>Autorizaciones opcionales</SectionBar>
          <div>
            <p className="mb-1.5 text-sm font-medium text-slate-700">Uso institucional de imágenes del estudiante</p>
            <Radios name="image" value={data.image_authorization} options={IMAGE_AUTH_OPTIONS} onChange={(v) => set("image_authorization", v)} />
            <p className="mt-1.5 text-xs text-slate-500">
              La autorización de imágenes es voluntaria y no condiciona la matrícula. Su alcance y revocación se gestionarán según la política institucional.
            </p>
          </div>
          <div>
            <Check_ id="outings" label="Información sobre actividades y salidas entregada" checked={data.outings_informed} onChange={(v) => set("outings_informed", v)} />
            <p className="mt-1 text-xs text-slate-500">Esta constancia no reemplaza la autorización específica que pueda requerirse para cada salida educativa.</p>
          </div>

          {mode === "staff" && (
            <>
              <SectionBar>Observaciones administrativas</SectionBar>
              <FormField label="Pendientes, documentos por revisar o datos que requieren verificación (no incluir antecedentes sensibles)" htmlFor="notes">
                <Textarea id="notes" rows={3} value={data.notes} onChange={(e) => set("notes", e.target.value)} />
              </FormField>
              <FormField label="Nombre de quien recibe en Inspectoría" htmlFor="received_by">
                <Input id="received_by" value={data.received_by} onChange={(e) => set("received_by", e.target.value)} />
              </FormField>
            </>
          )}

          {mode === "public" && (
            <>
              {/* Campo trampa anti-robots: oculto para las personas. */}
              <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
                <label htmlFor="website">Sitio web</label>
                <input id="website" tabIndex={-1} autoComplete="off" onChange={(e) => (honeypot.current = e.target.value)} />
              </div>
              <p className="rounded-lg bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800">
                Esta pre-matrícula no confirma cupo ni formaliza por sí sola la matrícula: el establecimiento revisará los datos y se comunicará con usted.
              </p>
            </>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <Button type="button" variant="secondary" size="sm" onClick={goBack} disabled={step === 1 || saving}>
          <ArrowLeft className="h-4 w-4" /> Atrás
        </Button>
        {step < 3 ? (
          <Button type="button" size="sm" onClick={goNext}>
            Siguiente <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button type="button" size="sm" onClick={handleSubmit} disabled={saving}>
            <Send className="h-4 w-4" /> {saving ? "Guardando…" : submitLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
