"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { Input, Select, Label } from "@/components/ui/Field";
import type { StudentName } from "@/services/convivencia";

export interface SelectedStudent {
  student_id: string;
  role: string;
}

const ROLE_OPTIONS = [
  { value: "involucrado", label: "Involucrado" },
  { value: "afectado", label: "Afectado" },
  { value: "testigo", label: "Testigo" },
  { value: "otro", label: "Otro" },
];

/** Selector de uno o varios estudiantes con rol (involucrado/afectado/
 * testigo/otro), reutilizado por Registrar situación y por agregar
 * estudiantes a un caso. Los estudiantes disponibles vienen resueltos
 * desde el servidor (misma nómina de matrícula vigente ya usada en
 * Certificados/Estudiantes) -- este componente solo filtra y arma la
 * selección en memoria. */
export function StudentMultiPicker({
  students,
  value,
  onChange,
}: {
  students: StudentName[];
  value: SelectedStudent[];
  onChange: (next: SelectedStudent[]) => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return students
      .filter((s) => !value.some((v) => v.student_id === s.id))
      .filter((s) => `${s.last_names} ${s.first_names} ${s.run}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [students, query, value]);

  function addStudent(id: string) {
    onChange([...value, { student_id: id, role: "involucrado" }]);
    setQuery("");
  }

  function removeStudent(id: string) {
    onChange(value.filter((v) => v.student_id !== id));
  }

  function updateRole(id: string, role: string) {
    onChange(value.map((v) => (v.student_id === id ? { ...v, role } : v)));
  }

  return (
    <div>
      <Label htmlFor="student-search">
        Estudiante(s) <span className="text-accent-600">*</span>
      </Label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          id="student-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre, apellido o RUN…"
          className="pl-9"
        />
      </div>
      {filtered.length > 0 && (
        <div className="mt-1 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          {filtered.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => addStudent(s.id)}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
            >
              {s.last_names}, {s.first_names} <span className="text-slate-400">— {s.run}</span>
            </button>
          ))}
        </div>
      )}

      {value.length > 0 && (
        <ul className="mt-3 space-y-2">
          {value.map((v) => {
            const student = students.find((s) => s.id === v.student_id);
            return (
              <li key={v.student_id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                <span className="flex-1 truncate text-sm text-slate-800">
                  {student ? `${student.last_names}, ${student.first_names}` : v.student_id}
                </span>
                <Select value={v.role} onChange={(e) => updateRole(v.student_id, e.target.value)} className="w-40">
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </Select>
                <button
                  type="button"
                  onClick={() => removeStudent(v.student_id)}
                  className="text-slate-400 hover:text-red-600"
                  aria-label="Quitar"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
