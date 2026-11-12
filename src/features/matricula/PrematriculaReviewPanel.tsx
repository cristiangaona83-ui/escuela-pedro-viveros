"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, UserPlus, X, Eye } from "lucide-react";
import { Button, buttonClassName } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import type { PrematriculaStatus } from "@/types/database";

/** Notas de Inspectoría y cambio de estado de una solicitud de pre-matrícula; desde aquí se pasa a la matrícula. */
export function PrematriculaReviewPanel({
  requestId,
  status,
  initialNotes,
}: {
  requestId: string;
  status: PrematriculaStatus;
  initialNotes: string;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function update(next: PrematriculaStatus | null) {
    setBusy(true);
    setMessage(null);
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    const patch: { staff_notes: string | null; status?: PrematriculaStatus; reviewed_by?: string; reviewed_at?: string } = {
      staff_notes: notes.trim() || null,
    };
    if (next) {
      patch.status = next;
      patch.reviewed_by = auth.user?.id;
      patch.reviewed_at = new Date().toISOString();
    }
    const { error } = await supabase.from("prematricula_requests").update(patch).eq("id", requestId);
    setBusy(false);
    if (error) {
      setMessage("No se pudo guardar.");
      return;
    }
    setMessage("Guardado.");
    router.refresh();
  }

  const done = status === "matriculada";

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="staff_notes" className="mb-1.5 block text-sm font-medium text-slate-700">Notas de Inspectoría (internas)</label>
        <Textarea id="staff_notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Documentos pendientes, llamadas realizadas, cupo…" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {!done && (
          <Link href={`/plataforma/matricula/nueva?pre=${requestId}`} className={buttonClassName("primary", "sm")}>
            <UserPlus className="h-4 w-4" /> Matricular
          </Link>
        )}
        {!done && status !== "revisada" && (
          <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => update("revisada")}>
            <Eye className="h-4 w-4" /> Marcar revisada
          </Button>
        )}
        {!done && status !== "aceptada" && (
          <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => update("aceptada")}>
            <Check className="h-4 w-4" /> Aceptar
          </Button>
        )}
        {!done && status !== "rechazada" && (
          <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => update("rechazada")}>
            <X className="h-4 w-4" /> Rechazar
          </Button>
        )}
        {!done && status !== "pendiente" && (
          <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => update("pendiente")}>
            Volver a «por revisar»
          </Button>
        )}
        <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => update(null)}>
          Guardar notas
        </Button>
        {message && <span className="text-xs text-slate-500">{message}</span>}
      </div>
    </div>
  );
}
