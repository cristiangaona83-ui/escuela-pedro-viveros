"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { KeyRound, AlertCircle, CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";

type RecoveryStatus = "checking" | "ready" | "invalid" | "success";

export function UpdatePasswordForm() {
  const router = useRouter();
  const [status, setStatus] = useState<RecoveryStatus>("checking");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    // El enlace de recuperación deja el token en el fragmento (#...) de la URL;
    // el cliente de Supabase lo detecta al cargar y dispara PASSWORD_RECOVERY.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setStatus("ready");
    });

    // Red de seguridad por si el evento ya se disparó antes de suscribirnos.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setStatus((current) => (current === "checking" ? (session ? "ready" : "invalid") : current));
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") || "");
    const confirm = String(form.get("confirm") || "");

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setLoading(false);
      setError("No pudimos actualizar tu contraseña. Inténtalo nuevamente o solicita un nuevo enlace.");
      return;
    }

    // Cierra la sesión de recuperación: el usuario inicia sesión de nuevo ya con la clave nueva.
    await supabase.auth.signOut();
    setLoading(false);
    setStatus("success");

    setTimeout(() => {
      router.replace("/plataforma/login");
    }, 2000);
  }

  if (status === "checking") {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p className="text-sm">Verificando tu enlace de recuperación…</p>
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="space-y-4 text-center">
        <div className="flex items-center justify-center gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          Este enlace no es válido o ya expiró.
        </div>
        <Link
          href="/plataforma/recuperar"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-800"
        >
          Solicitar un nuevo enlace
        </Link>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <CheckCircle2 className="h-8 w-8 text-emerald-600" />
        <p className="text-sm font-medium text-slate-800">Contraseña actualizada correctamente.</p>
        <p className="text-sm text-slate-500">Redirigiendo al inicio de sesión…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <FormField label="Nueva contraseña" htmlFor="password" required hint="Mínimo 8 caracteres.">
        <Input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" autoFocus />
      </FormField>
      <FormField label="Confirmar nueva contraseña" htmlFor="confirm" required>
        <Input id="confirm" name="confirm" type="password" required minLength={8} autoComplete="new-password" />
      </FormField>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        <KeyRound className="h-4 w-4" />
        {loading ? "Cambiando…" : "Cambiar contraseña"}
      </Button>
    </form>
  );
}
