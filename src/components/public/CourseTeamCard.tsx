import Image from "next/image";
import { cn } from "@/lib/utils";
import type { CourseTeamMember } from "@/config/course-team";

function initials(fullName: string): string {
  const words = fullName.trim().split(/\s+/);
  const first = words[0]?.[0] ?? "";
  const last = words[words.length - 1]?.[0] ?? "";
  return (first + last).toUpperCase();
}

export function PersonBlock({ member, hasPhoto }: { member: CourseTeamMember; hasPhoto: boolean }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-50 ring-1 ring-brand-100">
        {hasPhoto ? (
          <Image src={member.photoSrc} alt={member.fullName} fill sizes="80px" className="object-cover" />
        ) : (
          <span className="text-lg font-semibold text-brand-700">{member.initials ?? initials(member.fullName)}</span>
        )}
      </div>
      <p className="mt-2 text-sm font-semibold leading-snug text-slate-900">{member.fullName}</p>
      <p className="text-xs font-medium text-brand-700">{member.role}</p>
    </div>
  );
}

/** Tarjeta de un curso: docente de jefatura y, cuando corresponde,
 * asistente de aula — ambos dentro del mismo bloque visual para que quede
 * claro que pertenecen al mismo curso. */
export function CourseTeamCard({
  courseName,
  homeroomTeacher,
  homeroomHasPhoto,
  assistant,
  assistantHasPhoto,
}: {
  courseName: string;
  homeroomTeacher: CourseTeamMember;
  homeroomHasPhoto: boolean;
  assistant?: CourseTeamMember;
  assistantHasPhoto?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-center text-lg font-semibold text-slate-900">{courseName}</h3>
      <div className={cn("mt-5 grid gap-5", assistant ? "grid-cols-2" : "grid-cols-1 place-items-center")}>
        <div>
          <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">Docente de jefatura</p>
          <PersonBlock member={homeroomTeacher} hasPhoto={homeroomHasPhoto} />
        </div>
        {assistant && (
          <div>
            <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">Asistente de Aula</p>
            <PersonBlock member={assistant} hasPhoto={Boolean(assistantHasPhoto)} />
          </div>
        )}
      </div>
    </div>
  );
}

/** Tarjeta de una sola persona, sin curso asociado — mismo diseño visual
 * que cada bloque de persona dentro de CourseTeamCard (usado para
 * Docentes de Asignatura). */
export function StaffMemberCard({ member, hasPhoto }: { member: CourseTeamMember; hasPhoto: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <PersonBlock member={member} hasPhoto={hasPhoto} />
    </div>
  );
}
