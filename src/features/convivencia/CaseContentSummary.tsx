import { Paperclip, MessageSquare, ClipboardCheck, CalendarClock } from "lucide-react";

/** Contador liviano del contenido del caso -- reutiliza datos ya obtenidos en la página (sin consultas nuevas, sin N+1). */
export function CaseContentSummary({
  documentsCount,
  interviewsCount,
  measuresCount,
  referralsCount,
}: {
  documentsCount: number;
  interviewsCount: number;
  measuresCount: number;
  referralsCount: number;
}) {
  const items = [
    { label: "Documentos", count: documentsCount, icon: Paperclip },
    { label: "Entrevistas", count: interviewsCount, icon: MessageSquare },
    { label: "Medidas", count: measuresCount, icon: ClipboardCheck },
    { label: "Derivaciones", count: referralsCount, icon: CalendarClock },
  ];

  return (
    <div className="flex flex-wrap gap-3">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600">
          <item.icon className="h-3.5 w-3.5 text-slate-400" />
          <span className="font-semibold text-slate-800">{item.count}</span> {item.label}
        </div>
      ))}
    </div>
  );
}
