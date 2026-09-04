"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";

/** Archiva una situación registrada por error -- nunca se borra (mismo criterio que los casos): queda fuera de las vistas activas, pero se conserva. */
export function ArchiveSituationButton({ situationId }: { situationId: string }) {
  const router = useRouter();
  const showToast = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("convivencia_situations").update({ status: "archivado" }).eq("id", situationId);
    setLoading(false);
    if (error) {
      showToast("error", "No pudimos archivar la situación.");
      return;
    }
    await supabase.rpc("log_audit", {
      p_action: "archivar_situacion",
      p_module: "convivencia",
      p_entity: "convivencia_situations",
      p_entity_id: situationId,
    });
    setOpen(false);
    showToast("success", "Situación archivada.");
    router.refresh();
  }

  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Archive className="h-4 w-4" /> Archivar
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => (!loading ? setOpen(false) : undefined)}
        onConfirm={handleConfirm}
        title="Archivar situación"
        description="¿Archivar esta situación? Dejará de aparecer en los listados activos, pero se conserva íntegramente."
        confirmLabel="Archivar"
        loading={loading}
      />
    </>
  );
}
