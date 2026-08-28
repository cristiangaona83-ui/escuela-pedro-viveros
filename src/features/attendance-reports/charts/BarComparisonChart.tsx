"use client";

import { SEMAFORO_BADGE_TONE, type SemaforoLevel } from "@/lib/attendance/calc";

const TONE_FILL: Record<string, string> = {
  success: "#16a34a",
  warning: "#d97706",
  danger: "#dc2626",
  neutral: "#94a3b8",
};

/** Barras horizontales simples en SVG -- sin librería de gráficos (no hay ninguna instalada en el proyecto y el pedido explícito es no agregar una dependencia pesada). */
export function BarComparisonChart({
  items,
}: {
  items: { label: string; rate: number | null; semaforo: SemaforoLevel; href?: string }[];
}) {
  if (items.length === 0) return null;
  const barHeight = 22;
  const gap = 10;
  const height = items.length * (barHeight + gap);

  return (
    <svg viewBox={`0 0 320 ${height}`} width="100%" height={height} role="img" aria-label="Asistencia por curso">
      {items.map((item, i) => {
        const y = i * (barHeight + gap);
        const width = item.rate === null ? 0 : Math.max(2, (item.rate / 100) * 200);
        const content = (
          <g key={item.label}>
            <text x={0} y={y + barHeight / 2 + 4} fontSize="11" fill="#334155">
              {item.label}
            </text>
            <rect x={90} y={y} width={200} height={barHeight} rx={4} fill="#f1f5f9" />
            <rect x={90} y={y} width={width} height={barHeight} rx={4} fill={TONE_FILL[SEMAFORO_BADGE_TONE[item.semaforo]]} />
            <text x={296} y={y + barHeight / 2 + 4} fontSize="11" fill="#334155" textAnchor="end">
              {item.rate === null ? "—" : `${item.rate}%`}
            </text>
          </g>
        );
        return content;
      })}
    </svg>
  );
}
