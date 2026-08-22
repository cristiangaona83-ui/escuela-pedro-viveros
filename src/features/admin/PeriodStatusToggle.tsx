"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Unlock } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { createClient } from "@/lib/supabase/client";

export function PeriodStatusToggle({ periodId, status }: { periodId: string; status: "abierto" | "cerrado" }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const supabase = createClient();
    const { data: authData } = await supabase.auth.getUser();
    const nextStatus = status === "abierto" ? "cerrado" : "abierto";

    await supabase
      .from("academic_periods")
      .update({
        status: nextStatus,
        closed_at: nextStatus === "cerrado" ? new Date().toISOString() : null,
        closed_by: nextStatus === "cerrado" ? authData.user?.id : null,
      })
      .eq("id", periodId);

    if (nextStatus === "cerrado") {
      await supabase.rpc("log_audit", { p_action: "cerrar_periodo", p_module: "academico", p_entity: "academic_periods", p_entity_id: periodId });
    }

    setLoading(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      className="inline-flex items-center gap-1.5 disabled:opacity-50"
    >
      <Badge tone={status === "abierto" ? "success" : "neutral"}>
        {status === "abierto" ? <Unlock className="mr-1 inline h-3 w-3" /> : <Lock className="mr-1 inline h-3 w-3" />}
        {status}
      </Badge>
    </button>
  );
}
