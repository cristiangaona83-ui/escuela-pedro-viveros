"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ShieldCheck, ShieldX, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Field";
import { formatDate } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { VerifyCertificateResult } from "@/types/database";

const CERT_LABELS: Record<string, string> = {
  alumno_regular: "Certificado de Alumno Regular",
  informe_semestral: "Informe de Calificaciones Semestral",
  informe_anual: "Informe Anual de Calificaciones",
  cierre_anio: "Informe de Cierre de Año",
};

/**
 * El código real (verification_code) son siempre 32 caracteres hexadecimales
 * en minúscula, sin espacios ni saltos de línea. Al copiarlo desde el PDF,
 * un salto de línea automático de word-wrap -- invisible al ver el documento
 * -- puede quedar como un espacio o "\n" real en el texto copiado. Como
 * ningún whitespace es parte válida del código, es seguro eliminarlo por
 * completo (en cualquier posición, no solo en los bordes) sin reducir la
 * entropía ni el formato del código real.
 */
function normalizeCode(value: string): string {
  // \s cubre espacios/tabs/saltos de línea; el resto son separadores de
  // ancho cero y BOM (U+200B a U+200D, U+FEFF) que un lector de PDF podría
  // insertar al copiar texto en el punto donde el párrafo se ajustó de línea.
  return value.replace(/[\s\u200B-\u200D\uFEFF]/g, "").toLowerCase();
}

export function VerifyForm({ initialCode }: { initialCode?: string }) {
  const [code, setCode] = useState(initialCode ?? "");
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [result, setResult] = useState<VerifyCertificateResult | null>(null);

  async function runVerification(value: string) {
    setStatus("loading");
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("verify_certificate", { p_code: normalizeCode(value) });
      if (error) throw error;
      setResult(data?.[0] ?? null);
    } catch {
      setResult(null);
    } finally {
      setStatus("done");
    }
  }

  useEffect(() => {
    // Escanear el QR de un certificado (/verificar?code=...) verifica de
    // inmediato, sin obligar a pegar el código a mano.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- verificación automática al montar con el código de la URL
    if (initialCode) void runVerification(initialCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al montar, con el código que trae la URL
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runVerification(code);
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="code">Código de verificación</Label>
          <Input
            id="code"
            name="code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Escanea el código QR o escribe el código impreso en el documento"
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={status === "loading"}>
          <Search className="h-4 w-4" />
          {status === "loading" ? "Verificando…" : "Verificar"}
        </Button>
      </form>

      {status === "done" && (
        <div className="mt-6">
          {result?.valid ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-2 text-emerald-800">
                <ShieldCheck className="h-5 w-5" />
                <p className="font-semibold">Documento válido</p>
              </div>
              <dl className="mt-3 space-y-1 text-sm text-emerald-900">
                <div className="flex justify-between"><dt>Folio</dt><dd className="font-medium">{result.folio}</dd></div>
                <div className="flex justify-between"><dt>Tipo</dt><dd className="font-medium">{CERT_LABELS[result.cert_type] ?? result.cert_type}</dd></div>
                <div className="flex justify-between"><dt>Estudiante</dt><dd className="font-medium">{result.student_name}</dd></div>
                <div className="flex justify-between"><dt>Fecha de emisión</dt><dd className="font-medium">{formatDate(result.issued_at)}</dd></div>
                <div className="flex justify-between"><dt>Establecimiento</dt><dd className="font-medium">{result.institution}</dd></div>
              </dl>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
              <ShieldX className="h-5 w-5" />
              <p className="text-sm font-medium">No se encontró un documento válido con ese código.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
