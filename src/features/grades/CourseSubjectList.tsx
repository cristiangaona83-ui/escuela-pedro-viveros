"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, HelpCircle } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import type { SubjectGradeSummary } from "@/services/grade-overview";

const STATUS_LABEL: Record<SubjectGradeSummary["status"], string> = {
  completo: "Completo",
  pendiente: "Pendiente",
  sin_evaluaciones: "Sin evaluaciones",
};
const STATUS_TONE: Record<SubjectGradeSummary["status"], "success" | "warning" | "neutral"> = {
  completo: "success",
  pendiente: "warning",
  sin_evaluaciones: "neutral",
};
const STATUS_ICON: Record<SubjectGradeSummary["status"], typeof CheckCircle2> = {
  completo: CheckCircle2,
  pendiente: Clock,
  sin_evaluaciones: HelpCircle,
};

export function CourseSubjectList({ courseId, subjects, extraParams }: { courseId: string; subjects: SubjectGradeSummary[]; extraParams: string }) {
  const [showAll, setShowAll] = useState(true);
  const visible = showAll ? subjects : subjects.filter((s) => s.status !== "completo");

  return (
    <div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className={`rounded-full px-3 py-1 text-xs font-medium ${showAll ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-600"}`}
        >
          Ver todas
        </button>
        <button
          type="button"
          onClick={() => setShowAll(false)}
          className={`rounded-full px-3 py-1 text-xs font-medium ${!showAll ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-600"}`}
        >
          Ver pendientes
        </button>
      </div>

      <div className="mt-4">
        {visible.length === 0 ? (
          <EmptyState icon={CheckCircle2} title={showAll ? "Este curso no tiene asignaturas" : "Sin asignaturas pendientes"} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((s) => {
              const Icon = STATUS_ICON[s.status];
              return (
                <Link key={s.subjectId} href={`/plataforma/calificaciones/${courseId}/${s.subjectId}?${extraParams}`}>
                  <Card className="h-full transition-shadow hover:shadow-md">
                    <CardBody className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-900">{s.subjectName}</span>
                        <Badge tone={STATUS_TONE[s.status]}>
                          <Icon className="mr-1 h-3 w-3" /> {STATUS_LABEL[s.status]}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500">
                        {s.evaluationCount} evaluacion{s.evaluationCount === 1 ? "" : "es"}
                        {s.status !== "sin_evaluaciones" && <> · {s.studentsPending} estudiante{s.studentsPending === 1 ? "" : "s"} pendiente{s.studentsPending === 1 ? "" : "s"}</>}
                      </p>
                      <span className="text-[11px] font-medium text-brand-700">Ver calificaciones</span>
                    </CardBody>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
