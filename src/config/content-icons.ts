import {
  BookOpen,
  HeartHandshake,
  Users2,
  GraduationCap,
  Award,
  Landmark,
  Target,
  Shield,
  Star,
  School,
  Sparkles,
  Heart,
  type LucideIcon,
} from "lucide-react";

/**
 * Lista corta y predefinida de íconos disponibles para "Destacados de
 * Inicio" (tabla `content_cards`) -- decisión explícita del usuario: sin
 * subida de íconos/imágenes personalizadas, solo elegir de este catálogo.
 * `content_cards.icon` guarda la CLAVE (string), nunca el componente.
 */
export const CONTENT_CARD_ICONS: Record<string, LucideIcon> = {
  BookOpen,
  HeartHandshake,
  Users2,
  GraduationCap,
  Award,
  Landmark,
  Target,
  Shield,
  Star,
  School,
  Sparkles,
  Heart,
};

export const CONTENT_CARD_ICON_OPTIONS = Object.keys(CONTENT_CARD_ICONS);

/** Ícono de respaldo si el valor guardado no está (ya no) en el catálogo. */
export function resolveContentCardIcon(icon: string | null): LucideIcon {
  return (icon && CONTENT_CARD_ICONS[icon]) || Sparkles;
}
