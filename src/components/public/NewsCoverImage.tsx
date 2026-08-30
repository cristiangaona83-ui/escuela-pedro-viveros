"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";

/**
 * Imagen destacada del DETALLE de una noticia -- a diferencia de la
 * miniatura de NewsCard (que sí puede recortar con object-cover para un
 * grid uniforme), aquí la imagen debe verse completa, sin recorte ni
 * deformación. No se usa `fill` con una caja de aspect-ratio fijo (eso es
 * justamente lo que recortaba insignias/logos en imágenes que no son
 * 16:9): se deja que el navegador calcule el alto real a partir del ancho
 * disponible (`h-auto` sobre el alto/ancho "de referencia" que exige
 * next/image para imágenes remotas, sin dimensiones conocidas) -- así el
 * contenedor crece o se achica según la proporción real de cada imagen.
 * Clic para ampliar en una vista modal (object-contain, cierra con
 * X/Escape/clic afuera) es un extra opcional, sin reemplazar la vista
 * principal ya sin recorte.
 */
export function NewsCoverImage({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-8 block w-full overflow-hidden rounded-xl bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
        aria-label={`Ampliar imagen destacada: ${alt}`}
      >
        {/* width/height son solo una referencia para el cálculo de srcset/placeholder de next/image (no hay dimensiones reales guardadas para una imagen remota) -- `h-auto` hace que el navegador use el alto real de la imagen ya cargada, nunca el de esta referencia. */}
        <Image src={src} alt={alt} width={1200} height={800} sizes="(min-width: 1024px) 768px, 100vw" className="h-auto w-full" priority />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="relative aspect-[4/3] max-h-[85vh] w-full max-w-4xl" onClick={(event) => event.stopPropagation()}>
            <Image src={src} alt={alt} fill className="object-contain" sizes="90vw" />
          </div>
        </div>
      )}
    </>
  );
}
