"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FolderPlus, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

/** Convierte una situación (registro simple) en Caso de Convivencia: crea
 * el caso con folio correlativo, copia los estudiantes vinculados, enlaza
 * la situación al caso y registra el evento inicial de la línea de
 * tiempo. Solo disponible para director/convivencia/superadmin (RLS de
 * convivencia_cases no admite insert de inspectoria_general). */
export function ConvertToCaseButton({
  situationId,
  caseTypeId,
  caseTypeLabel,
  occurredOn,
}: {
  situationId: string;
  caseTypeId: string;
  caseTypeLabel: string;
  occurredOn: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConvert() {
    if (!window.confirm("¿Convertir esta situación en Caso de Convivencia?")) return;
    setLoading(true);
    setError(null);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      setError("Sesión no válida.");
      return;
    }

    const { data: year } = await supabase.from("academic_years").select("id, year").eq("active", true).maybeSingle();
    if (!year) {
      setLoading(false);
      setError("No hay un año académico vigente configurado.");
      return;
    }

    const { data: folio, error: folioError } = await supabase.rpc("next_convivencia_folio", { p_year: year.year });
    if (folioError || !folio) {
      setLoading(false);
      setError("No se pudo generar el folio del caso.");
      return;
    }

    const { data: newCase, error: caseError } = await supabase
      .from("convivencia_cases")
      .insert({
        folio,
        academic_year_id: year.id,
        case_type_id: caseTypeId,
        title: `${caseTypeLabel} — ${occurredOn}`,
        responsible_id: user.id,
        created_by: user.id,
      })
      .select("id")
      .single();
    if (caseError || !newCase) {
      setLoading(false);
      setError("No pudimos crear el caso.");
      return;
    }

    const { data: situationStudents } = await supabase
      .from("convivencia_situation_students")
      .select("student_id, role")
      .eq("situation_id", situationId);

    if (situationStudents && situationStudents.length > 0) {
      await supabase
        .from("convivencia_case_students")
        .insert(situationStudents.map((s) => ({ case_id: newCase.id, student_id: s.student_id, role: s.role })));
    }

    await supabase.from("convivencia_situations").update({ case_id: newCase.id }).eq("id", situationId);

    await supabase.from("convivencia_events").insert({
      case_id: newCase.id,
      event_type: "caso_creado",
      observation: "Caso creado a partir de una situación registrada.",
      created_by: user.id,
    });

    await supabase.rpc("log_audit", {
      p_action: "crear_caso",
      p_module: "convivencia",
      p_entity: "convivencia_cases",
      p_entity_id: newCase.id,
      p_details: { folio, origin_situation_id: situationId },
    });

    setLoading(false);
    router.push(`/plataforma/convivencia/casos/${newCase.id}`);
  }

  return (
    <div>
      <Button type="button" onClick={handleConvert} disabled={loading} variant="accent">
        <FolderPlus className="h-4 w-4" /> {loading ? "Convirtiendo…" : "Convertir en Caso"}
      </Button>
      {error && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-red-600">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
        </p>
      )}
    </div>
  );
}
