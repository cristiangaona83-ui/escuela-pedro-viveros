"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserX, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

export function WithdrawStudentButton({
  studentId,
  academicYearId,
  studentName,
}: {
  studentId: string;
  academicYearId: string;
  studentName: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleWithdraw() {
    if (!window.confirm(`¿Registrar el retiro de ${studentName}? Esta acción cambia su estado a "retirado" y cierra su matrícula 2026.`)) return;
    const reason = window.prompt("Motivo del retiro (opcional, queda solo en la bitácora):") ?? undefined;

    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("withdraw_student", {
      p_student_id: studentId,
      p_academic_year_id: academicYearId,
      p_reason: reason || undefined,
    });

    setLoading(false);
    if (rpcError) {
      setError(rpcError.message || "No pudimos registrar el retiro.");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={handleWithdraw}
        disabled={loading}
        className="border-red-200 text-red-700 hover:border-red-300 hover:bg-red-50"
      >
        <UserX className="h-4 w-4" /> {loading ? "Registrando…" : "Registrar retiro"}
      </Button>
      {error && (
        <div className="mt-2 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}
    </div>
  );
}
