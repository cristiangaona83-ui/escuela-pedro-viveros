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
    <div className="flex flex-col items-center rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
      <div className="relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-50 ring-1 ring-brand-100">
        {hasPhoto ? (
          <Image src={photoSrc} alt={fullName} fill sizes="112px" className="object-cover" />
        ) : (
          <span className="text-2xl font-semibold text-brand-700">{initials ?? defaultInitials(fullName)}</span>
        )}
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-900">{fullName}</h3>
      <p className="mt-1 text-sm font-medium text-brand-700">{role}</p>
    </div>
  );
}
