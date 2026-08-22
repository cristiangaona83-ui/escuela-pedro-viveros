"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Textarea } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";

type ReviewStatus = "revisada" | "aprobada" | "observada";

export function ReviewPanel({
  planId,
  unit,
  currentComment,
  reviewerId,
}: {
  planId: string;
  unit: string;
  currentComment: string | null;
  reviewerId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<ReviewStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const status = submitter?.value as ReviewStatus | undefined;
    if (!status) return;

    setLoading(status);
    setError(null);
    const form = new FormData(event.currentTarget);
    const supabase = createClient();

    const { error: dbError } = await supabase
      .from("lesson_plans")
      .update({
        status,
        reviewer_id: reviewerId,
        reviewer_comment: String(form.get("reviewer_comment") || "").trim() || null,
      })
      .eq("id", planId);

    if (dbError) {
      setLoading(null);
      setError("No pudimos registrar la revisión.");
      return;
    }

    await supabase.rpc("log_audit", {
      p_action: "revisar_planificacion",
      p_module: "planificaciones",
      p_entity: "lesson_plans",
      p_entity_id: planId,
      p_details: { unit, status },
    });

    setLoading(null);
    router.refresh();
  }

  return (
    <form onSubmit={handleReview} className="space-y-4">
      <FormField label="Comentario de revisión" htmlFor="reviewer_comment" hint="Visible para el docente.">
        <Textarea id="reviewer_comment" name="reviewer_comment" defaultValue={currentComment ?? undefined} />
      </FormField>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" name="status" value="revisada" variant="secondary" size="sm" disabled={loading !== null}>
          <MessageSquare className="h-4 w-4" /> {loading === "revisada" ? "Guardando…" : "Marcar revisada"}
        </Button>
        <Button type="submit" name="status" value="aprobada" size="sm" disabled={loading !== null}>
          {loading === "aprobada" ? "Guardando…" : "Aprobar"}
        </Button>
        <Button
          type="submit"
          name="status"
          value="observada"
          size="sm"
          className="!bg-amber-500 hover:!bg-amber-600"
          disabled={loading !== null}
        >
          {loading === "observada" ? "Guardando…" : "Observar"}
        </Button>
      </div>
    </form>
  );
}
