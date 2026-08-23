"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { UserRound, Star, Pencil, Unlink, Search, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { FormField, Input } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import type { StudentGuardianLimited } from "@/services/guardians";

interface SearchResult {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  relationship: string | null;
}

export function GuardianManagerLimited({ studentId, guardians }: { studentId: string; guardians: StudentGuardianLimited[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);

  async function setPrimary(guardianId: string) {
    setBusy(true);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("set_primary_guardian", { p_student_id: studentId, p_guardian_id: guardianId });
    setBusy(false);
    if (rpcError) { window.alert(rpcError.message || "No pudimos cambiar el apoderado principal."); return; }
    router.refresh();
  }

  async function unlink(guardianId: string, isPrimary: boolean, name: string) {
    if (isPrimary) {
      window.alert("No puedes quitar al apoderado principal — marca a otro como principal primero.");
      return;
    }
    if (!window.confirm(`¿Quitar el vínculo con ${name}?`)) return;
    setBusy(true);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("unlink_guardian_from_student", { p_student_id: studentId, p_guardian_id: guardianId });
    setBusy(false);
    if (rpcError) { window.alert(rpcError.message || "No pudimos quitar el vínculo."); return; }
    router.refresh();
  }

  async function handleSearch() {
    if (!query.trim()) return;
    setSearching(true);
    setError(null);
    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc("search_guardians_by_name", { p_query: query.trim() });
    setSearching(false);
    if (rpcError) { setError("No pudimos buscar apoderados."); return; }
    setResults(data ?? []);
  }

  async function linkExisting(guardianId: string, relationship: string) {
    setBusy(true);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("link_guardian_to_student", {
      p_student_id: studentId,
      p_guardian_id: guardianId,
      p_relationship: relationship || undefined,
    });
    setBusy(false);
    if (rpcError) { setError(rpcError.message || "No pudimos vincular al apoderado."); return; }
    setShowAdd(false);
    setResults(null);
    setQuery("");
    router.refresh();
  }

  async function handleCreateNew(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const full_name = String(form.get("full_name") || "").trim();
    const phone = String(form.get("phone") || "").trim() || undefined;
    const email = String(form.get("email") || "").trim() || undefined;
    const relationship = String(form.get("relationship") || "").trim() || undefined;
    if (!full_name) return;

    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { data: guardianId, error: createError } = await supabase.rpc("create_guardian_contact", {
      p_full_name: full_name,
      p_phone: phone,
      p_email: email,
      p_relationship: relationship,
    });
    if (createError || !guardianId) {
      setBusy(false);
      setError(createError?.message || "No pudimos crear el apoderado.");
      return;
    }
    const { error: linkError } = await supabase.rpc("link_guardian_to_student", {
      p_student_id: studentId,
      p_guardian_id: guardianId,
      p_relationship: relationship,
    });
    setBusy(false);
    if (linkError) { setError(linkError.message || "El apoderado se creó, pero no pudimos vincularlo."); return; }
    setShowAdd(false);
    setResults(null);
    setQuery("");
    router.refresh();
  }

  async function handleEditSave(event: FormEvent<HTMLFormElement>, guardianId: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const full_name = String(form.get("full_name") || "").trim();
    const phone = String(form.get("phone") || "").trim() || undefined;
    const email = String(form.get("email") || "").trim() || undefined;
    const relationship = String(form.get("relationship") || "").trim() || undefined;
    setBusy(true);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("update_guardian_contact", {
      p_guardian_id: guardianId,
      p_full_name: full_name,
      p_phone: phone,
      p_email: email,
      p_relationship: relationship,
    });
    setBusy(false);
    if (rpcError) { window.alert(rpcError.message || "No pudimos guardar los cambios."); return; }
    setEditingId(null);
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
            Agregar
          </Button>
        </div>
        <p className="mt-1 text-xs text-slate-400">Sin RUN — acceso acotado a nombre, teléfono, correo y vínculo.</p>

        {guardians.length === 0 && !showAdd && <p className="mt-3 text-sm text-slate-500">Sin apoderados registrados.</p>}

        <ul className="mt-3 divide-y divide-slate-100">
          {guardians.map((g) => (
            <li key={g.linkId} className="py-3">
              {editingId === g.guardian.id ? (
                <form onSubmit={(e) => handleEditSave(e, g.guardian.id)} className="space-y-2 rounded-lg border border-slate-200 p-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input name="full_name" defaultValue={g.guardian.full_name} placeholder="Nombre completo" required />
                    <Input name="phone" defaultValue={g.guardian.phone ?? ""} placeholder="Teléfono" />
                    <Input name="email" defaultValue={g.guardian.email ?? ""} placeholder="Correo" type="email" />
                    <Input name="relationship" defaultValue={g.relationship ?? ""} placeholder="Vínculo" />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setEditingId(null)} disabled={busy}>Cancelar</Button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
                      {g.guardian.full_name}
                      {g.isPrimary && <Badge tone="brand">Principal</Badge>}
                      {g.isEmergencyContact && <Badge tone="warning">Emergencia</Badge>}
                    </p>
                    <p className="text-xs text-slate-500">
                      {g.relationship || "Vínculo no indicado"} · {g.guardian.phone || "sin teléfono"} · {g.guardian.email || "sin correo"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {!g.isPrimary && (
                      <button type="button" onClick={() => setPrimary(g.guardian.id)} disabled={busy}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-brand-700"
                        aria-label="Marcar como principal">
                        <Star className="h-4 w-4" />
                      </button>
                    )}
                    <button type="button" onClick={() => setEditingId(g.guardian.id)} disabled={busy}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      aria-label="Editar apoderado">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => unlink(g.guardian.id, g.isPrimary, g.guardian.full_name)} disabled={busy}
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
          <div className="mt-3 space-y-3 rounded-lg border border-slate-200 p-3">
            <div>
              <div className="flex items-end gap-2">
                <FormField label="Buscar apoderado existente por nombre" htmlFor="guardian_query">
                  <Input id="guardian_query" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nombre…" />
                </FormField>
                <Button type="button" size="sm" onClick={handleSearch} disabled={searching}>
                  <Search className="h-4 w-4" /> Buscar
                </Button>
              </div>
              {results && (
                <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {results.length === 0 ? (
                    <li className="p-2 text-xs text-slate-500">Sin coincidencias — puedes crear uno nuevo abajo.</li>
                  ) : (
                    results.map((r) => (
                      <li key={r.id} className="flex items-center justify-between gap-2 p-2 text-sm">
                        <span>{r.full_name} <span className="text-slate-400">· {r.phone || "sin teléfono"}</span></span>
                        <Button type="button" size="sm" variant="secondary" onClick={() => linkExisting(r.id, r.relationship ?? "")} disabled={busy}>
                          Vincular
                        </Button>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>

            <div className="border-t border-slate-100 pt-3">
              <p className="mb-2 text-xs font-medium text-slate-600">O crea uno nuevo</p>
              <form onSubmit={handleCreateNew} className="space-y-2">
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input name="full_name" placeholder="Nombre completo" required />
                  <Input name="phone" placeholder="Teléfono" />
                  <Input name="email" placeholder="Correo" type="email" />
                  <Input name="relationship" placeholder="Vínculo" />
                </div>
                <Button type="submit" size="sm" disabled={busy}>{busy ? "Guardando…" : "Crear y vincular"}</Button>
              </form>
            </div>

            {error && <p className="flex items-center gap-1.5 text-xs text-red-700"><AlertCircle className="h-3.5 w-3.5" />{error}</p>}
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowAdd(false)}>Cerrar</Button>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
