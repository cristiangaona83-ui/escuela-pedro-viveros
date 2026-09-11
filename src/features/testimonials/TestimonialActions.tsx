"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Trash2, RotateCcw } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import type { TestimonialStatus } from "@/types/database";

/** Aprobar/rechazar/eliminar un testimonio -- escritura directa respaldada
 * por RLS (`testimonials_update_admin`/`testimonials_delete_admin`:
 * director/administrativo/superadmin). Aprobar y rechazar quedan
 * registrados (reviewed_by/reviewed_at) para trazabilidad de quién moderó. */
export function TestimonialActions({ id, fullName, status }: { id: string; fullName: string; status: TestimonialStatus }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  async function setStatus(next: TestimonialStatus) {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("testimonials")
      .update({ status: next, reviewed_by: user?.id ?? null, reviewed_at: new Date().toISOString() })
      .eq("id", id);
    setLoading(false);
    if (error) {
      window.alert("No pudimos actualizar el testimonio.");
      return;
    }
    router.refresh();
  }

  async function handleDelete() {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("testimonials").delete().eq("id", id);
    setLoading(false);
    if (error) {
      window.alert("No pudimos eliminar el testimonio.");
      return;
    }
    setConfirmingDelete(false);
    router.refresh();
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {status !== "aprobado" && (
          <Button type="button" size="sm" onClick={() => setStatus("aprobado")} disabled={loading}>
            <Check className="h-4 w-4" /> Aprobar
          </Button>
        )}
        {status !== "rechazado" && (
          <Button type="button" variant="secondary" size="sm" onClick={() => setStatus("rechazado")} disabled={loading}>
            <X className="h-4 w-4" /> Rechazar
          </Button>
        )}
        {status !== "pendiente" && (
          <Button type="button" variant="secondary" size="sm" onClick={() => setStatus("pendiente")} disabled={loading}>
            <RotateCcw className="h-4 w-4" /> Volver a pendiente
          </Button>
        )}
        <button
          type="button"
          onClick={() => setConfirmingDelete(true)}
          disabled={loading}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
          aria-label={`Eliminar testimonio de ${fullName}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <ConfirmDialog
        open={confirmingDelete}
        onClose={() => (!loading ? setConfirmingDelete(false) : undefined)}
        onConfirm={handleDelete}
        title="Eliminar testimonio"
        description={<p>¿Eliminar definitivamente el testimonio de “{fullName}”? Esta acción no se puede deshacer.</p>}
        confirmLabel="Eliminar"
        loading={loading}
      />
    </>
  );
}
