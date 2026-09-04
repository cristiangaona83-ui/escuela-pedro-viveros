"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";

export function RestoreCaseButton({ caseId, caseFolio }: { caseId: string; caseFolio: string }) {
  const router = useRouter();
  const showToast = useToast();
  const [loading, setLoading] = useState(false);

  async function handleRestore() {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("restore_case_from_trash", { p_case_id: caseId });
    setLoading(false);
    if (error) {
      showToast("error", error.message || "No pudimos restaurar el expediente.");
      return;
    }
    showToast("success", `Expediente N.º ${caseFolio} restaurado.`);
    router.refresh();
  }

  return (
    <Button type="button" variant="secondary" size="sm" onClick={handleRestore} disabled={loading}>
      <RotateCcw className="h-4 w-4" /> {loading ? "Restaurando…" : "Restaurar"}
    </Button>
  );
}
