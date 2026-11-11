"use client";

import { useMemo, useState } from "react";
import { ArrowUp, ArrowDown, Eye, EyeOff, Plus, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input, Select } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { PARVULARIA_AMBITOS, PARVULARIA_LEVELS } from "@/config/parvularia";
import { groupIndicators, indicatorNumbers } from "@/lib/parvularia";
import type { ParvulariaIndicatorRow, ParvulariaLevel } from "@/types/database";

const NEW_NUCLEUS = "__nuevo__";

/**
 * Administración del catálogo de indicadores del Informe Pedagógico de
 * Prebásica. Los indicadores NUNCA se borran -- se desactivan (así lo ya
 * evaluado se conserva); se puede editar el texto, subir/bajar dentro del
 * núcleo y agregar indicadores o núcleos nuevos. Escribe directo con el
 * cliente de sesión (RLS: Dirección, UTP y Superadmin).
 */
export function IndicatorManager({ initialIndicators }: { initialIndicators: ParvulariaIndicatorRow[] }) {
  const [indicators, setIndicators] = useState(initialIndicators);
  const [level, setLevel] = useState<ParvulariaLevel>("Prekínder");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const [newAmbito, setNewAmbito] = useState<string>(PARVULARIA_AMBITOS[0]);
  const [newNucleo, setNewNucleo] = useState<string>("");
  const [newNucleoName, setNewNucleoName] = useState("");
  const [newText, setNewText] = useState("");

  const ofLevel = useMemo(() => indicators.filter((i) => i.level === level), [indicators, level]);
  const groups = useMemo(() => groupIndicators(ofLevel), [ofLevel]);
  const numbers = useMemo(() => indicatorNumbers(groups, true), [groups]);
  const activeCount = ofLevel.filter((i) => i.active).length;

  const nucleosOfAmbito = useMemo(
    () => groups.find((g) => g.ambito === newAmbito)?.nucleos.map((n) => n.nucleo) ?? [],
    [groups, newAmbito]
  );
  const selectedNucleo = newNucleo && nucleosOfAmbito.includes(newNucleo) ? newNucleo : nucleosOfAmbito[0] ?? NEW_NUCLEUS;

  async function audit(action: string, details: Record<string, unknown>) {
    const supabase = createClient();
    await supabase.rpc("log_audit", { p_action: action, p_module: "informes", p_entity: "parvularia_indicators", p_details: details });
  }

  function patchLocal(id: string, patch: Partial<ParvulariaIndicatorRow>) {
    setIndicators((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  async function run(id: string, task: () => Promise<void>, okText: string) {
    setBusy(id);
    setMessage(null);
    try {
      await task();
      setMessage({ tone: "ok", text: okText });
    } catch (err) {
      console.error("[parvularia/indicadores]", err);
      setMessage({ tone: "error", text: "No se pudo guardar el cambio. Inténtalo de nuevo." });
    } finally {
      setBusy(null);
    }
  }

  function saveText(ind: ParvulariaIndicatorRow) {
    const text = (drafts[ind.id] ?? ind.text).trim();
    if (!text || text === ind.text) return;
    void run(ind.id, async () => {
      const { error } = await createClient().from("parvularia_indicators").update({ text }).eq("id", ind.id);
      if (error) throw error;
      patchLocal(ind.id, { text });
      setDrafts((d) => {
        const next = { ...d };
        delete next[ind.id];
        return next;
      });
      await audit("editar_indicador_parvularia", { level: ind.level, before: ind.text, after: text });
    }, "Indicador actualizado.");
  }

  function toggleActive(ind: ParvulariaIndicatorRow) {
    void run(ind.id, async () => {
      const { error } = await createClient().from("parvularia_indicators").update({ active: !ind.active }).eq("id", ind.id);
      if (error) throw error;
      patchLocal(ind.id, { active: !ind.active });
      await audit(ind.active ? "desactivar_indicador_parvularia" : "activar_indicador_parvularia", { level: ind.level, text: ind.text });
    }, ind.active ? "Indicador desactivado." : "Indicador activado.");
  }

  function move(ind: ParvulariaIndicatorRow, direction: -1 | 1) {
    const siblings = ofLevel
      .filter((i) => i.ambito === ind.ambito && i.nucleo === ind.nucleo)
      .sort((a, b) => a.sort_order - b.sort_order);
    const index = siblings.findIndex((s) => s.id === ind.id);
    const other = siblings[index + direction];
    if (!other) return;
    void run(ind.id, async () => {
      const supabase = createClient();
      const [a, b] = await Promise.all([
        supabase.from("parvularia_indicators").update({ sort_order: other.sort_order }).eq("id", ind.id),
        supabase.from("parvularia_indicators").update({ sort_order: ind.sort_order }).eq("id", other.id),
      ]);
      if (a.error || b.error) throw a.error ?? b.error;
      patchLocal(ind.id, { sort_order: other.sort_order });
      patchLocal(other.id, { sort_order: ind.sort_order });
    }, "Orden actualizado.");
  }

  function addIndicator() {
    const text = newText.trim();
    const nucleo = selectedNucleo === NEW_NUCLEUS ? newNucleoName.trim() : selectedNucleo;
    if (!text || !nucleo) {
      setMessage({ tone: "error", text: "Escribe el indicador y el núcleo al que pertenece." });
      return;
    }
    const inNucleus = ofLevel.filter((i) => i.ambito === newAmbito && i.nucleo === nucleo);
    const inAmbito = ofLevel.filter((i) => i.ambito === newAmbito);
    // En un núcleo existente va al final de ese núcleo; un núcleo nuevo, al final del ámbito (los iniciales van de a 1000).
    const sortOrder =
      inNucleus.length > 0
        ? Math.max(...inNucleus.map((i) => i.sort_order)) + 1
        : (inAmbito.length > 0 ? Math.max(...inAmbito.map((i) => i.sort_order)) : 0) + 1000;

    void run("new", async () => {
      const { data, error } = await createClient()
        .from("parvularia_indicators")
        .insert({ level, ambito: newAmbito, nucleo, text, sort_order: sortOrder, active: true })
        .select("*")
        .single();
      if (error || !data) throw error;
      setIndicators((prev) => [...prev, data as ParvulariaIndicatorRow]);
      setNewText("");
      setNewNucleoName("");
      await audit("agregar_indicador_parvularia", { level, ambito: newAmbito, nucleo, text });
    }, "Indicador agregado al final del núcleo.");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
          {PARVULARIA_LEVELS.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLevel(l)}
              className={cn(
                "rounded-md px-4 py-1.5 text-sm font-medium",
                level === l ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
              )}
            >
              {l}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500">
          {activeCount} indicadores activos · {ofLevel.length - activeCount} desactivados
        </p>
      </div>

      {message && (
        <div
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2 text-xs",
            message.tone === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
          )}
        >
          {message.tone === "ok" ? <Check className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />} {message.text}
        </div>
      )}

      <Card>
        <CardBody className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">Agregar indicador a {level}</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Ámbito</label>
              <Select value={newAmbito} onChange={(e) => setNewAmbito(e.target.value)}>
                {PARVULARIA_AMBITOS.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Núcleo</label>
              <Select value={selectedNucleo} onChange={(e) => setNewNucleo(e.target.value)}>
                {nucleosOfAmbito.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
                <option value={NEW_NUCLEUS}>+ Núcleo nuevo…</option>
              </Select>
            </div>
          </div>
          {selectedNucleo === NEW_NUCLEUS && (
            <Input placeholder="Nombre del núcleo nuevo" value={newNucleoName} onChange={(e) => setNewNucleoName(e.target.value)} />
          )}
          <Input placeholder="Texto del indicador (ej. Reconoce los colores primarios)" value={newText} onChange={(e) => setNewText(e.target.value)} />
          <Button type="button" size="sm" onClick={addIndicator} disabled={busy === "new"}>
            <Plus className="h-4 w-4" /> {busy === "new" ? "Agregando…" : "Agregar indicador"}
          </Button>
        </CardBody>
      </Card>

      {groups.map((group) => (
        <section key={group.ambito}>
          <h2 className="rounded-lg bg-brand-700 px-3 py-2 text-sm font-semibold text-white">ÁMBITO: {group.ambito}</h2>
          <div className="mt-3 space-y-4">
            {group.nucleos.map((nucleo) => (
              <Card key={nucleo.nucleo}>
                <CardBody className="space-y-2">
                  <h3 className="text-sm font-semibold text-brand-800">Núcleo: {nucleo.nucleo}</h3>
                  {nucleo.indicators.map((ind, idx) => {
                    const draft = drafts[ind.id] ?? ind.text;
                    return (
                      <div key={ind.id} className={cn("flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2", !ind.active && "opacity-60")}>
                        <span className="w-7 shrink-0 text-center text-xs text-slate-400">{numbers.get(ind.id) ?? "—"}</span>
                        <Input
                          className="min-w-[240px] flex-1"
                          value={draft}
                          onChange={(e) => setDrafts((d) => ({ ...d, [ind.id]: e.target.value }))}
                          onBlur={() => saveText(ind)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") e.currentTarget.blur();
                          }}
                          disabled={busy === ind.id}
                          aria-label="Texto del indicador"
                        />
                        {!ind.active && <Badge tone="neutral">Desactivado</Badge>}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            title="Subir"
                            disabled={idx === 0 || busy !== null}
                            onClick={() => move(ind, -1)}
                            className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 disabled:opacity-30"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Bajar"
                            disabled={idx === nucleo.indicators.length - 1 || busy !== null}
                            onClick={() => move(ind, 1)}
                            className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 disabled:opacity-30"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={busy !== null}
                            onClick={() => toggleActive(ind)}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                          >
                            {ind.active ? <><EyeOff className="h-3.5 w-3.5" /> Desactivar</> : <><Eye className="h-3.5 w-3.5" /> Activar</>}
                          </button>
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
    </div>
  );
}
