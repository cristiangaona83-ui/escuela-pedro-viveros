import { Badge } from "@/components/ui/Badge";
import { SEMAFORO_LABEL, SEMAFORO_BADGE_TONE, type SemaforoLevel } from "@/lib/attendance/calc";

export function SemaforoBadge({ level }: { level: SemaforoLevel }) {
  return <Badge tone={SEMAFORO_BADGE_TONE[level]}>{SEMAFORO_LABEL[level]}</Badge>;
}
