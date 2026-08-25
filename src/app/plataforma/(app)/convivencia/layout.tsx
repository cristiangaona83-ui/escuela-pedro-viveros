import { redirect } from "next/navigation";
import { getSessionContext } from "@/features/auth/session";
import { ConvivenciaNav } from "@/features/convivencia/ConvivenciaNav";

const MODULE_ROLES = ["director", "superadmin", "convivencia", "inspectoria_general"] as const;

export default async function ConvivenciaLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionContext();
  if (!session || !session.roles.some((r) => MODULE_ROLES.includes(r as (typeof MODULE_ROLES)[number]))) {
    redirect("/plataforma/dashboard");
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Convivencia Educativa</h1>
      </div>
      <div className="mt-4">
        <ConvivenciaNav />
      </div>
      <div className="mt-6">{children}</div>
    </div>
  );
}
