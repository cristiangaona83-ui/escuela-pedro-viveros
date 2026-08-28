import { Card, CardBody } from "@/components/ui/Card";
import type { LucideIcon } from "lucide-react";

export function IndicatorCard({ icon: Icon, label, value, hint }: { icon: LucideIcon; label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardBody className="px-4 py-4">
        <span className="flex items-center gap-2 text-slate-500">
          <Icon className="h-4 w-4" strokeWidth={1.75} />
          <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
        </span>
        <p className="mt-2 text-xl font-semibold text-slate-900">{value}</p>
        {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
      </CardBody>
    </Card>
  );
}
