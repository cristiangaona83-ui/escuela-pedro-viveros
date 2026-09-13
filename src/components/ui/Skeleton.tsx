import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

/** Placeholder de carga simple (bloque gris pulsante) -- usar mientras se resuelve una consulta en un Client Component. */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-md bg-slate-200", className)} {...props} />;
}
