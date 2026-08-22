import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { UpdatePasswordForm } from "@/features/auth/UpdatePasswordForm";
import { PLATFORM_NAME } from "@/config/site";

export const metadata: Metadata = {
  title: "Actualizar contraseña",
  robots: { index: false, follow: false },
};

export default function ActualizarClavePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-950 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center text-white">
          <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/10">
            <ShieldCheck className="h-7 w-7" />
          </span>
          <h1 className="mt-4 font-heading text-xl font-medium tracking-tight">Nueva contraseña</h1>
          <p className="mt-1 text-sm text-brand-200">{PLATFORM_NAME}</p>
        </div>
        <div className="mt-8 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-100 sm:p-8">
          <UpdatePasswordForm />
        </div>
      </div>
    </div>
  );
}
