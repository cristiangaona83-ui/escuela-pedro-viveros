import type { LucideIcon } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

export function ModuleStub({
  icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      <Card className="mt-6">
        <CardBody>
          {children ?? (
            <EmptyState
              icon={icon}
              title="Módulo preparado, sin registros aún"
              description="La estructura de datos y permisos ya están listos. El formulario de carga se habilitará en la siguiente etapa."
            />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
