import Image from "next/image";
import { cn } from "@/lib/utils";

export function SchoolLogo({ size = 44, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn("relative shrink-0 overflow-hidden rounded-xl ring-1 ring-black/5", className)}
      style={{ width: size, height: size }}
    >
      <Image src="/images/logo-escuela.jpg" alt="Escudo de la Escuela Profesor Pedro Viveros Ormeño" fill sizes={`${size}px`} className="object-cover" priority />
    </span>
  );
}
