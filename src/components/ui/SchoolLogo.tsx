import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * El logo se usa en 6 lugares con tamaños visuales distintos (36-64px) --
 * en vez de pedirle al optimizador un ancho exacto por cada uno (más
 * variantes cacheadas de un mismo archivo), se redondea el *hint* de
 * `sizes` a como máximo 2 buckets fijos. El tamaño realmente renderizado
 * (`size`, el `<span>` contenedor) no cambia -- esto no altera nada visual,
 * solo hace explícito cuántas variantes puede llegar a generar el
 * optimizador para este archivo.
 */
function optimizerSizeHint(size: number): 48 | 64 {
  return size <= 48 ? 48 : 64;
}

export function SchoolLogo({
  size = 44,
  className,
  priority = true,
}: {
  size?: number;
  className?: string;
  /** Solo debe ir en `true` cuando el logo está visible sin scroll al cargar la página (ej. Header, Sidebar, páginas de acceso). Footer, al estar siempre fuera del viewport inicial, no debe competir por prioridad de carga con el verdadero elemento LCP de la página. */
  priority?: boolean;
}) {
  return (
    <span
      className={cn("relative shrink-0 overflow-hidden rounded-xl ring-1 ring-black/5", className)}
      style={{ width: size, height: size }}
    >
      <Image
        src="/images/logo-escuela-renovado.png"
        alt="Logo Escuela Profesor Pedro Viveros Ormeño"
        fill
        sizes={`${optimizerSizeHint(size)}px`}
        className="object-contain"
        priority={priority}
      />
    </span>
  );
}
