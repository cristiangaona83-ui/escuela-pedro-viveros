"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { UserRound, Star, Siren, Pencil, Unlink, Plus, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { FormField, Input } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import type { StudentGuardianFull } from "@/services/guardians";

function GuardianEditForm({ guardianId, onDone, onCancel, initial }: {
  guardianId: string;
  onDone: () => void;
  onCancel: () => void;
  initial: {
    full_name: string;
    run: string | null;
    phone: string | null;
    phone_alt: string | null;
    email: string | null;
    address: string | null;
    relationship: string | null;
  };
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      full_name: String(form.get("full_name") || "").trim(),
      run: String(form.get("run") || "").trim() || null,
      phone: String(form.get("phone") || "").trim() || null,
      phone_alt: String(form.get("phone_alt") || "").trim() || null,
      email: String(form.get("email") || "").trim() || null,
      address: String(form.get("address") || "").trim() || null,
      relationship: String(form.get("relationship") || "").trim() || null,
    };
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: dbError } = await supabase.from("guardians").update(payload).eq("id", guardianId);
    setLoading(false);
    if (dbError) {
      setError(dbError.code === "23505" ? "Ya existe otro apoderado con ese RUN." : "No pudimos guardar los cambios.");
      return;
    }
    await supabase.rpc("log_audit", {
      p_action: "editar_apoderado",
      p_module: "apoderados",
      p_entity: "guardians",
      p_entity_id: guardianId,
      p_details: payload,
    });
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 space-y-2 rounded-lg border border-slate-200 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <Input name="full_name" defaultValue={initial.full_name} placeholder="Nombre completo" required />
        <Input name="run" defaultValue={initial.run ?? ""} placeholder="RUN (opcional)" />
        <Input name="phone" defaultValue={initial.phone ?? ""} placeholder="Teléfono" />
        <Input name="phone_alt" defaultValue={initial.phone_alt ?? ""} placeholder="Teléfono alternativo" />
        <Input name="email" defaultValue={initial.email ?? ""} placeholder="Correo" type="email" />
        <Input name="relationship" defaultValue={initial.relationship ?? ""} placeholder="Vínculo (madre, padre, tutor…)" />
        <Input name="address" defaultValue={initial.address ?? ""} placeholder="Domicilio" className="sm:col-span-2" />
      </div>
      {error && <p className="flex items-center gap-1.5 text-xs text-red-700"><AlertCircle className="h-3.5 w-3.5" />{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={loading}>{loading ? "Guardando…" : "Guardar"}</Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={loading}>Cancelar</Button>
      </div>
    </form>
  );
}

export function GuardianManagerFull({ studentId, guardians }: { studentId: string; guardians: StudentGuardianFull[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  async function setPrimary(guardianId: string) {
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("set_primary_guardian", { p_student_id: studentId, p_guardian_id: guardianId });
    setBusy(false);
    if (error) { window.alert("No pudimos cambiar el apoderado principal."); return; }
    router.refresh();
  }

  async function toggleEmergency(linkId: string, current: boolean) {
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("student_guardians").update({ is_emergency_contact: !current }).eq("id", linkId);
    setBusy(false);
    if (error) { window.alert("No pudimos actualizar el contacto de emergencia."); return; }
    await supabase.rpc("log_audit", {
      p_action: current ? "quitar_contacto_emergencia" : "marcar_contacto_emergencia",
      p_module: "apoderados",
      p_entity: "student_guardians",
      p_entity_id: linkId,
    });
    router.refresh();
  }

  async function unlink(linkId: string, isPrimary: boolean, name: string) {
    if (isPrimary) {
      window.alert("No puedes quitar al apoderado principal — marca a otro como principal primero.");
      return;
    }
    if (!window.confirm(`¿Quitar el vínculo con ${name}? El registro del apoderado no se elimina, solo se desvincula de este estudiante.`)) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("student_guardians").delete().eq("id", linkId);
    setBusy(false);
    if (error) { window.alert("No pudimos quitar el vínculo."); return; }
    await supabase.rpc("log_audit", {
      p_action: "desvincular_apoderado",
      p_module: "apoderados",
      p_entity: "student_guardians",
      p_entity_id: linkId,
      p_details: { student_id: studentId, name },
    });
    router.refresh();
  }

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const full_name = String(form.get("full_name") || "").trim();
    const run = String(form.get("run") || "").trim() || null;
    const phone = String(form.get("phone") || "").trim() || null;
    const phone_alt = String(form.get("phone_alt") || "").trim() || null;
    const email = String(form.get("email") || "").trim() || null;
    const address = String(form.get("address") || "").trim() || null;
    const relationship = String(form.get("relationship") || "").trim() || null;
    const makePrimary = form.get("is_primary") === "on";
    if (!full_name) return;

    setBusy(true);
    setAddError(null);
    const supabase = createClient();

    let guardianId: string;
    if (run) {
      const { data: existing } = await supabase.from("guardians").select("id").eq("run", run).maybeSingle();
      if (existing) {
        guardianId = existing.id;
      } else {
        const { data: created, error: createError } = await supabase
          .from("guardians")
          .insert({ full_name, run, phone, phone_alt, email, address, relationship })
          .select("id")
          .single();
        if (createError) {
          setBusy(false);
          setAddError(createError.code === "23505" ? "Ya existe otro apoderado con ese RUN." : "No pudimos crear el apoderado.");
          return;
        }
        guardianId = created.id;
      }
    } else {
      const { data: created, error: createError } = await supabase
        .from("guardians")
        .insert({ full_name, phone, phone_alt, email, address, relationship })
        .select("id")
        .single();
      if (createError) {
        setBusy(false);
        setAddError("No pudimos crear el apoderado.");
        return;
      }
      guardianId = created.id;
    }

    const { error: linkError } = await supabase
      .from("student_guardians")
      .upsert({ student_id: studentId, guardian_id: guardianId, relationship }, { onConflict: "student_id,guardian_id" });
    if (linkError) {
      setBusy(false);
      setAddError("El apoderado existe, pero no pudimos vincularlo a este estudiante.");
      return;
    }

    if (makePrimary) {
      await supabase.rpc("set_primary_guardian", { p_student_id: studentId, p_guardian_id: guardianId });
    }

    await supabase.rpc("log_audit", {
      p_action: "agregar_apoderado",
      p_module: "apoderados",
      p_entity: "students",
      p_entity_id: studentId,
      p_details: { guardian_id: guardianId, full_name, is_primary: makePrimary },
    });

    setBusy(false);
    setShowAdd(false);
    router.refresh();
  }

  return (
    <Card>
      <CardBody>
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold text-slate-900">
            <UserRound className="h-4 w-4 text-slate-400" /> Apoderados y contactos
          </h2>
          <Button type="button" variant="ghost" size="sm" onClick={() => setShowAdd((v) => !v)} disabled={busy}>
            <Plus className="h-4 w-4" /> Agregar
          </Button>
        </div>

        {guardians.length === 0 && !showAdd && <p className="mt-3 text-sm text-slate-500">Sin apoderados registrados.</p>}

        <ul className="mt-3 divide-y divide-slate-100">
          {guardians.map((g) => (
            <li key={g.linkId} className="py-3">
              {editingId === g.guardian.id ? (
                <GuardianEditForm
                  guardianId={g.guardian.id}
                  initial={g.guardian}
                  onDone={() => { setEditingId(null); router.refresh(); }}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
                      {g.guardian.full_name}
                      {g.isPrimary && <Badge tone="brand">Principal</Badge>}
                      {g.isEmergencyContact && <Badge tone="warning">Emergencia</Badge>}
                    </p>
                    <p className="text-xs text-slate-500">
                      {g.relationship || "Vínculo no indicado"} · {g.guardian.phone || "sin teléfono"}
                      {g.guardian.phone_alt && ` (alt. ${g.guardian.phone_alt})`} · {g.guardian.email || "sin correo"}
                      {g.guardian.run && ` · RUN ${g.guardian.run}`}
                    </p>
                    {g.guardian.address && <p className="text-xs text-slate-400">{g.guardian.address}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    {!g.isPrimary && (
                      <button type="button" onClick={() => setPrimary(g.guardian.id)} disabled={busy}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-brand-700"
                        aria-label="Marcar como principal">
                        <Star className="h-4 w-4" />
                      </button>
                    )}
                    <button type="button" onClick={() => toggleEmergency(g.linkId, g.isEmergencyContact)} disabled={busy}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-amber-700"
                      aria-label="Marcar como contacto de emergencia">
                      <Siren className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => setEditingId(g.guardian.id)} disabled={busy}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      aria-label="Editar apoderado">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => unlink(g.linkId, g.isPrimary, g.guardian.full_name)} disabled={busy}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-700"
                      aria-label="Quitar vínculo">
                      <Unlink className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>

        {showAdd && (
          <form onSubmit={handleAdd} className="mt-3 space-y-2 rounded-lg border border-slate-200 p-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <FormField label="Nombre completo" htmlFor="add_full_name" required>
                <Input id="add_full_name" name="full_name" required />
              </FormField>
              <FormField label="RUN" htmlFor="add_run" hint="Opcional — si coincide con uno existente, se reutiliza en vez de duplicar">
                <Input id="add_run" name="run" />
              </FormField>
              <FormField label="Teléfono" htmlFor="add_phone">
                <Input id="add_phone" name="phone" />
              </FormField>
              <FormField label="Teléfono alternativo" htmlFor="add_phone_alt">
                <Input id="add_phone_alt" name="phone_alt" />
              </FormField>
              <FormField label="Correo" htmlFor="add_email">
                <Input id="add_email" name="email" type="email" />
              </FormField>
              <FormField label="Vínculo" htmlFor="add_relationship" hint="Madre, padre, tutor/a, etc.">
                <Input id="add_relationship" name="relationship" />
              </FormField>
              <FormField label="Domicilio" htmlFor="add_address">
                <Input id="add_address" name="address" />
              </FormField>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" name="is_primary" className="h-4 w-4 rounded border-slate-300" />
              Marcar como apoderado principal
            </label>
            {addError && <p className="flex items-center gap-1.5 text-xs text-red-700"><AlertCircle className="h-3.5 w-3.5" />{addError}</p>}
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={busy}>{busy ? "Guardando…" : "Agregar apoderado"}</Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowAdd(false)} disabled={busy}>Cancelar</Button>
            </div>
          </form>
        )}
      </CardBody>
    </Card>
  );
}
