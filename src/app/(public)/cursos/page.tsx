import type { Metadata } from "next";
import { PageHeader } from "@/components/public/PageHeader";
import { CourseTeamCard, StaffMemberCard } from "@/components/public/CourseTeamCard";
import type { CourseTeamMember } from "@/config/course-team";
import { getPublicCourseTeams, getSubjectTeachersPublic } from "@/services/public-content";
import { resolveStaffPhoto } from "@/lib/staff-photo";

export const metadata: Metadata = { title: "Nuestros Cursos" };

function toMember(fullName: string, role: string, photoUrl: string | null, initials: string | null): { member: CourseTeamMember; hasPhoto: boolean } {
  const { src, hasPhoto } = resolveStaffPhoto(photoUrl);
  return { member: { fullName, role, photoSrc: src, initials: initials ?? undefined }, hasPhoto };
}

export default async function CursosPage() {
  const [courseTeams, subjectTeachers] = await Promise.all([getPublicCourseTeams(), getSubjectTeachersPublic()]);

  return (
    <>
      <PageHeader eyebrow="Docentes y Asistentes" title="Nuestros Cursos" />

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
          {courseTeams.map((course) => {
            const jefe = course.members.find((m) => m.role === "jefe");
            const asistente = course.members.find((m) => m.role === "asistente");
            if (!jefe) return null;

            const homeroom = toMember(jefe.staff_member.full_name, jefe.role_title, jefe.staff_member.photo_url, jefe.staff_member.initials);
            const assistant = asistente
              ? toMember(asistente.staff_member.full_name, asistente.role_title, asistente.staff_member.photo_url, asistente.staff_member.initials)
              : undefined;

            return (
              <CourseTeamCard
                key={course.id}
                courseName={course.course_name}
                homeroomTeacher={homeroom.member}
                homeroomHasPhoto={homeroom.hasPhoto}
                assistant={assistant?.member}
                assistantHasPhoto={assistant?.hasPhoto}
              />
            );
          })}
        </div>
      </section>

      {subjectTeachers.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6 lg:px-8">
          <h2 className="text-center font-heading text-2xl font-medium tracking-tight text-slate-900">Docentes de Asignatura</h2>
          <div className="mx-auto mt-8 grid max-w-2xl grid-cols-1 gap-6 min-[420px]:grid-cols-2">
            {subjectTeachers.map((teacher) => {
              const { member, hasPhoto } = toMember(
                teacher.staff_member.full_name,
                teacher.role_title,
                teacher.staff_member.photo_url,
                teacher.staff_member.initials
              );
              return <StaffMemberCard key={teacher.id} member={member} hasPhoto={hasPhoto} />;
            })}
          </div>
        </section>
      )}
    </>
  );
}
