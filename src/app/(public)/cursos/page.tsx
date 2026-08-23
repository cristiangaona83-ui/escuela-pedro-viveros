import type { Metadata } from "next";
import { PageHeader } from "@/components/public/PageHeader";
import { CourseTeamCard, StaffMemberCard } from "@/components/public/CourseTeamCard";
import { COURSE_TEAM, SUBJECT_TEACHERS } from "@/config/course-team";
import { photoExists } from "@/lib/staff-photo";

export const metadata: Metadata = { title: "Nuestros Cursos" };

export default function CursosPage() {
  return (
    <>
      <PageHeader eyebrow="Cursos" title="Nuestros Cursos" />

      <section className="mx-auto max-w-4xl px-4 pt-14 sm:px-6 lg:px-8">
        <p className="text-justify text-[15px] leading-relaxed text-slate-600 sm:text-base">
          Desde Prekínder hasta 8° Básico, cada curso de nuestra escuela cuenta con un docente de jefatura que
          acompaña el proceso educativo y formativo de sus estudiantes. En los niveles que corresponde, este
          trabajo se fortalece con el apoyo de asistentes de aula, favoreciendo el acompañamiento integral y la
          atención de las necesidades de los niños y niñas.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {COURSE_TEAM.map((course) => (
            <CourseTeamCard
              key={course.courseName}
              courseName={course.courseName}
              homeroomTeacher={course.homeroomTeacher}
              homeroomHasPhoto={photoExists(course.homeroomTeacher.photoSrc)}
              assistant={course.assistant}
              assistantHasPhoto={course.assistant ? photoExists(course.assistant.photoSrc) : undefined}
            />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6 lg:px-8">
        <h2 className="text-center font-heading text-2xl font-medium tracking-tight text-slate-900">Docentes de Asignatura</h2>
        <div className="mx-auto mt-8 grid max-w-2xl grid-cols-1 gap-6 min-[420px]:grid-cols-2">
          {SUBJECT_TEACHERS.map((teacher) => (
            <StaffMemberCard key={teacher.fullName} member={teacher} hasPhoto={photoExists(teacher.photoSrc)} />
          ))}
        </div>
      </section>
    </>
  );
}
