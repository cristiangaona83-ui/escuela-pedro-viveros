"use client";

import { useState, useTransition } from "react";
import { Search, User } from "lucide-react";
import { Input } from "@/components/ui/Field";
import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { createClient } from "@/lib/supabase/client";

export interface StudentSearchResult {
  id: string;
  first_names: string;
  last_names: string;
  run: string;
  course_label: string | null;
}

/** Buscador de estudiante por nombre/apellido/curso -- primer paso para
 * iniciar una Declaración Individual de Accidente Escolar. Trae solo lo
 * necesario para elegir (nombre/curso); el resto de la ficha se resuelve
 * recién al seleccionar, vía resolveStudentForDeclaration(). */
export function StudentSearchPicker({ onSelect }: { onSelect: (studentId: string) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StudentSearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSearch(value: string) {
    setQuery(value);
    if (value.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    startTransition(async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("students")
        .select("id, first_names, last_names, run, enrollments(status, courses(level, letter))")
        .or(`first_names.ilike.%${value}%,last_names.ilike.%${value}%,run.ilike.%${value}%`)
        .eq("active", true)
        .limit(20);
      type Row = { id: string; first_names: string; last_names: string; run: string; enrollments: { status: string; courses: { level: string; letter: string } | null }[] };
      const rows = (data ?? []) as unknown as Row[];
      setResults(
        rows.map((r) => {
          const active = r.enrollments.find((e) => e.status === "activa");
          return {
            id: r.id,
            first_names: r.first_names,
            last_names: r.last_names,
            run: r.run,
            course_label: active?.courses ? `${active.courses.level} ${active.courses.letter}`.trim() : null,
          };
        })
      );
      setSearched(true);
    });
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Buscar por nombre, apellido, RUN o curso…"
          className="pl-9"
          autoFocus
        />
      </div>

      {isPending && <p className="text-sm text-slate-400">Buscando…</p>}

      {!isPending && searched && results.length === 0 && (
        <EmptyState icon={User} title="Sin resultados" description="No encontramos estudiantes con ese criterio." />
      )}

      {results.length > 0 && (
        <Card>
          <CardBody className="p-0">
            <ul className="divide-y divide-slate-100">
              {results.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(s.id)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {s.last_names}, {s.first_names}
                      </p>
                      <p className="text-xs text-slate-400">{s.run}</p>
                    </div>
                    <span className="text-xs font-medium text-slate-500">{s.course_label ?? "Sin matrícula activa"}</span>
                  </button>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
