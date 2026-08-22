import type { Metadata } from "next";
import { VerifyForm } from "@/components/public/VerifyForm";
import { SITE } from "@/config/site";

export const metadata: Metadata = {
  title: "Verificar certificado",
  robots: { index: false, follow: false },
};

export default async function VerificarPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-brand-950 px-4 py-16">
      <div className="w-full max-w-md">
        <div className="text-center text-white">
          <h1 className="font-heading text-2xl font-medium tracking-tight">Verificación de certificados</h1>
          <p className="mt-2 text-sm text-brand-200">{SITE.name}</p>
        </div>
        <div className="mt-8 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <VerifyForm initialCode={code} />
        </div>
      </div>
    </div>
  );
}
