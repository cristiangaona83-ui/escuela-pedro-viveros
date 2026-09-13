import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const VALUE_TONES = {
  neutral: "text-slate-900",
  success: "text-emerald-600",
  warning: "text-amber-600",
  danger: "text-red-600",
};

export interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  /** Color del número -- usar warning/danger para llamar la atención sobre algo pendiente. */
  tone?: keyof typeof VALUE_TONES;
  href?: string;
  className?: string;
}

/** Tarjeta de indicador (ícono + etiqueta + número), para grillas de KPIs como el Panel General. */
export function StatCard({ icon: Icon, label, value, tone = "neutral", href, className }: StatCardProps) {
  const content = (
    <div className={cn("flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-5 py-4", href && "transition-colors hover:bg-slate-50", className)}>
      <span className="flex items-center gap-2 text-slate-500">
        <Icon className="h-4 w-4" strokeWidth={1.75} />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </span>
      <span className={cn("text-3xl font-semibold", VALUE_TONES[tone])}>{value}</span>
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}
