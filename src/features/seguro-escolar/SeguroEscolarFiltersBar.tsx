"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Select, Input } from "@/components/ui/Field";
import { SEGURO_ESCOLAR_STATUS_LABELS, SEGURO_ESCOLAR_ACCIDENT_TYPE_LABELS } from "@/features/seguro-escolar/labels";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function SeguroEscolarFiltersBar({ courses }: { courses: { id: string; label: string }[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/plataforma/seguro-escolar?${params.toString()}`);
  }

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={searchParams.get("year") ?? String(currentYear)} onChange={(e) => setParam("year", e.target.value)} className="w-auto">
        {years.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </Select>
      <Select value={searchParams.get("month") ?? ""} onChange={(e) => setParam("month", e.target.value)} className="w-auto">
        <option value="">Todos los meses</option>
        {MONTHS.map((m, i) => (
          <option key={m} value={i + 1}>{m}</option>
        ))}
      </Select>
      <Select value={searchParams.get("course") ?? ""} onChange={(e) => setParam("course", e.target.value)} className="w-auto">
        <option value="">Todos los cursos</option>
        {courses.map((c) => (
          <option key={c.id} value={c.id}>{c.label}</option>
        ))}
      </Select>
      <Select value={searchParams.get("status") ?? ""} onChange={(e) => setParam("status", e.target.value)} className="w-auto">
        <option value="">Todos los estados</option>
        {Object.entries(SEGURO_ESCOLAR_STATUS_LABELS).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </Select>
      <Select value={searchParams.get("accident") ?? ""} onChange={(e) => setParam("accident", e.target.value)} className="w-auto">
        <option value="">Trayecto y escuela</option>
        {Object.entries(SEGURO_ESCOLAR_ACCIDENT_TYPE_LABELS).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </Select>
      <Input
        defaultValue={searchParams.get("q") ?? ""}
        onBlur={(e) => setParam("q", e.target.value)}
        placeholder="Buscar por nombre o apellido…"
        className="w-56"
      />
    </div>
  );
}
