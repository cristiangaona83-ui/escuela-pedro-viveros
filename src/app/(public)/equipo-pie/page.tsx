import type { Metadata } from "next";
import { HeartHandshake, Users, MessageCircle, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/public/PageHeader";
import { StaffCard } from "@/components/public/StaffCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card, CardBody } from "@/components/ui/Card";
import { getStaffByArea } from "@/services/public-content";

export const metadata: Metadata = { title: "Equipo PIE" };

const PILLARS = [
  { icon: Users, title: "Trabajo colaborativo", description: "Docentes de aula y profesionales PIE planifican y evalúan de forma conjunta." },
  { icon: HeartHandshake, title: "Apoyo a estudiantes", description: "Acompañamiento personalizado según las necesidades educativas de cada estudiante." },
  { icon: MessageCircle, title: "Orientación a familias", description: "Espacios de comunicación y acompañamiento para apoderados y familias." },
  { icon: ShieldCheck, title: "Confidencialidad", description: "La información individual de cada estudiante se resguarda con estricta reserva." },
];

export default async function EquipoPiePage() {
  const staff = await getStaffByArea("pie");

  return (
    <>
      <PageHeader
        eyebrow="PIE"
        title="Programa de Integración Escolar"
        description="Un equipo multidisciplinario que trabaja junto a los docentes para apoyar la trayectoria educativa de todos nuestros estudiantes."
      />

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((p) => (
            <Card key={p.title}>
              <CardBody>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <p.icon className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <h3 className="mt-3 text-sm font-semibold text-slate-900">{p.title}</h3>
                <p className="mt-1.5 text-sm text-slate-500">{p.description}</p>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-slate-50 py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-slate-900">Coordinación y profesionales</h2>
          <p className="mt-2 text-slate-500">
            Educadoras diferenciales, profesionales asistentes y técnicos que integran el equipo PIE.
          </p>
          <div className="mt-8">
            {staff.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {staff.map((member) => (
                  <StaffCard key={member.id} member={member} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={HeartHandshake}
                title="Equipo PIE en incorporación"
                description="La coordinación PIE y sus profesionales se publicarán aquí a medida que se registren en la plataforma."
              />
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-14 text-center sm:px-6 lg:px-8">
        <p className="text-sm text-slate-500">
          Por resguardo de la privacidad de nuestros estudiantes, esta página no publica diagnósticos ni
          información personal. El seguimiento individual se gestiona de forma confidencial en la plataforma
          pedagógica.
        </p>
      </section>
    </>
  );
}
