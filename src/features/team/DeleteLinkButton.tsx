"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const TABLES = {
  membership: "staff_section_memberships",
  subject_teacher: "subject_teachers",
  course_role: "course_team_members",
  course_team: "course_teams",
} as const;

/** Elimina solo el vínculo (aparición en una sección/curso) — el registro
 * central de la persona en staff_members no se toca, así que si aparece en
 * otra sección sigue intacta ahí. */
export function DeleteLinkButton({
  table,
  id,
  label,
  auditModule,
  confirmMessage,
  redirectTo,
}: {
  table: keyof typeof TABLES;
  id: string;
  label: string;
  auditModule: string;
  confirmMessage: string;
  /** Si se pasa, navega ahí tras eliminar (útil cuando el botón está en la
   * propia página del registro que se elimina). Si no, solo refresca. */
  redirectTo?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!window.confirm(confirmMessage)) return;
    setLoading(true);
    const supabase = createClient();
    const tableName = TABLES[table];
    const { error } = await supabase.from(tableName).delete().eq("id", id);
    if (error) {
      setLoading(false);
      window.alert("No pudimos completar la acción.");
      return;
    }
    await supabase.rpc("log_audit", {
      p_action: "eliminar_equipo",
      p_module: auditModule,
      p_entity: tableName,
      p_entity_id: id,
      p_details: { label },
    });
    setLoading(false);
    if (redirectTo) {
      router.push(redirectTo);
    }
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
      aria-label={`Eliminar ${label}`}
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
