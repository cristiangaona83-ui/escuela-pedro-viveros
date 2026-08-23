import Link from "next/link";
import { UserPlus, Search, ClipboardList, CalendarCheck, Info } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";

export function QuickActionsPanel() {
  const actions = [
    { label: "Nuevo estudiante", href: "/plataforma/estudiantes/nuevo-rapido", icon: UserPlus },
    { label: "Buscar estudiante", href: "#buscar", icon: Search },
    { label: "Listados por curso", href: "/plataforma/estudiantes/listados", icon: ClipboardList },
    { label: "Asistencia", href: "/plataforma/asistencia", icon: CalendarCheck },
  ];

  return (
    <Card>
      <CardBody>
        <h2 className="font-semibold text-slate-900">Acciones rápidas</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {actions.map((a) => (
            <Link
              key={a.label}
              href={a.href}
              className="flex flex-col items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-3 text-center text-xs font-medium text-slate-600 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-800"
            >
              <a.icon className="h-4 w-4" />
              {a.label}
            </Link>
          ))}
        </div>
        <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-400">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Matricular, cambiar de curso, retirar, reactivar y ver el contacto del apoderado están disponibles desde la ficha de cada estudiante (busca al estudiante y entra a su ficha).
        </p>
      </CardBody>
    </Card>
  );
}
