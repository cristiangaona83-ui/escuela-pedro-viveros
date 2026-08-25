import Image from "next/image";

function defaultInitials(fullName: string): string {
  const words = fullName.trim().split(/\s+/);
  const first = words[0]?.[0] ?? "";
  const last = words[words.length - 1]?.[0] ?? "";
  return (first + last).toUpperCase();
}

/** Tarjeta institucional de una persona (fotografía + nombre + cargo),
 * reutilizada por Equipo Directivo, Equipo PIE y Asistentes de la
 * Educación. `hasPhoto` se determina en el servidor (existencia real del
 * archivo en public/) — mientras no exista, se muestra un avatar con
 * iniciales. Apenas se coloque el archivo en photoSrc y se despliegue de
 * nuevo, la fotografía real aparece sin tocar este componente.
 * `initials` es opcional: por defecto se calcula como primera letra del
 * primer y último nombre (fallback razonable); se puede pasar
 * explícitamente cuando esa aproximación no coincide con las iniciales
 * reales de la persona (p. ej. nombre + apellido paterno). */
export function StaffPhotoCard({
  fullName,
  role,
  photoSrc,
  hasPhoto,
  initials,
}: {
  fullName: string;
  role: string;
  photoSrc: string;
  hasPhoto: boolean;
  initials?: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white text-center shadow-sm">
      <div className="relative aspect-[4/5] w-full bg-brand-50">
        {hasPhoto ? (
          <Image
            src={photoSrc}
            alt={fullName}
            fill
            sizes="(min-width: 1280px) 22vw, (min-width: 1024px) 28vw, (min-width: 640px) 45vw, 90vw"
            className="object-cover object-top"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-4xl font-semibold text-brand-700">{initials ?? defaultInitials(fullName)}</span>
          </div>
        )}
      </div>
      <div className="px-4 py-4">
        <h3 className="text-base font-semibold text-slate-900">{fullName}</h3>
        <p className="mt-1 text-sm font-medium text-brand-700">{role}</p>
      </div>
    </div>
  );
}
