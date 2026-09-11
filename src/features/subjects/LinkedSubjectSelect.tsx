"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** Vincula esta asignatura a una asignatura troncal (ej. Taller 1 -> Lenguaje)
 * -- guarda apenas se cambia, sin formulario aparte. Ver 0053_subjects_linked_subject.sql:
 * su nota sigue apareciendo como fila propia en el informe académico, pero
 * queda fuera del promedio general mientras el vínculo esté seteado. */
export function LinkedSubjectSelect({
  subjectId,
  linkedSubjectId,
  options,
}: {
  subjectId: string;
  linkedSubjectId: string | null;
  options: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleChange(value: string) {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("subjects")
      .update({ linked_subject_id: value || null })
      .eq("id", subjectId);
    setLoading(false);
    if (error) {
      window.alert("No pudimos actualizar el vínculo.");
      return;
    }
    router.refresh();
  }

  return (
    <select
      value={linkedSubjectId ?? ""}
      onChange={(e) => handleChange(e.target.value)}
      disabled={loading}
      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 disabled:opacity-50"
    >
      <option value="">Sin vincular</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ))}
    </select>
  );
}
