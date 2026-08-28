"use client";

/** Línea de evolución simple en SVG (sin librería externa) -- para evolución mensual/semanal. */
export function TrendLineChart({ points, referenceRate }: { points: { label: string; rate: number | null }[]; referenceRate?: number | null }) {
  const withData = points.filter((p) => p.rate !== null);
  if (withData.length === 0) {
    return <p className="text-sm text-slate-400">Sin datos suficientes para graficar la evolución.</p>;
  }

  const width = 600;
  const height = 160;
  const padX = 24;
  const padY = 16;
  const min = Math.min(60, ...withData.map((p) => p.rate!));
  const max = 100;
  const range = Math.max(1, max - min);

  const stepX = points.length > 1 ? (width - padX * 2) / (points.length - 1) : 0;
  const yFor = (rate: number) => height - padY - ((rate - min) / range) * (height - padY * 2);

  const pathPoints = points.map((p, i) => (p.rate === null ? null : { x: padX + i * stepX, y: yFor(p.rate) }));
  const pathD = pathPoints
    .map((pt, i) => (pt ? `${pathPoints.slice(0, i).every((p) => p === null) || i === 0 ? "M" : "L"}${pt.x},${pt.y}` : null))
    .filter(Boolean)
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height + 20}`} width="100%" height={height + 20} role="img" aria-label="Evolución de asistencia">
      {referenceRate !== undefined && referenceRate !== null && (
        <line x1={padX} x2={width - padX} y1={yFor(referenceRate)} y2={yFor(referenceRate)} stroke="#94a3b8" strokeDasharray="4 3" strokeWidth={1} />
      )}
      <path d={pathD} fill="none" stroke="#0f6b4a" strokeWidth={2} />
      {pathPoints.map(
        (pt, i) =>
          pt && (
            <circle key={i} cx={pt.x} cy={pt.y} r={3} fill="#0f6b4a" />
          )
      )}
      {points.map((p, i) => (
        <text key={p.label} x={padX + i * stepX} y={height + 14} fontSize="9" fill="#64748b" textAnchor="middle">
          {p.label.slice(0, 3)}
        </text>
      ))}
    </svg>
  );
}
