import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/features/auth/LoginForm";
import { SchoolLogo } from "@/components/ui/SchoolLogo";
import { PLATFORM_NAME, SITE } from "@/config/site";

export const metadata: Metadata = {
  title: "Iniciar sesión",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-950 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center text-white">
          <SchoolLogo size={64} />
          <h1 className="mt-4 font-heading text-xl font-medium tracking-tight">{PLATFORM_NAME}</h1>
          <p className="mt-1 text-sm text-brand-200">{SITE.name}</p>
        </div>

        <div className="mt-8 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-100 sm:p-8">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
