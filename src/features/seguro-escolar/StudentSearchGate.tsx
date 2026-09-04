"use client";

import { useRouter } from "next/navigation";
import { StudentSearchPicker } from "@/features/seguro-escolar/StudentSearchPicker";

/** Envuelve el buscador para redirigir a la misma ruta con ?studentId=,
 * donde el servidor resuelve el contexto real del estudiante (curso vía
 * matrícula vigente, apoderado, domicilio) antes de mostrar el formulario. */
export function StudentSearchGate() {
  const router = useRouter();
  return <StudentSearchPicker onSelect={(id) => router.push(`/plataforma/seguro-escolar/nueva?studentId=${id}`)} />;
}
