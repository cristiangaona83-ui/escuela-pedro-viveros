"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Send, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Input } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { createClient } from "@/lib/supabase/client";
import { zonedTimeToUtc, formatScheduleLabel, todayInSantiago, DEFAULT_SCHEDULE_TIME } from "@/lib/bulletin-schedule";

function localDateTimeInputs(isoValue: string): { date: string; time: string } {
  const date = new Date(isoValue);
  const dateStr = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(date);
  const timeStr = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Santiago", hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
  return { date: dateStr, time: timeStr };
}

export function EmailScheduleCard({
  bulletinId,
  bulletinNumber,
  emailScheduledAt,
  emailSentAt,
  activeRecipientCount,
  sentSummary,
}: {
  bulletinId: string;
  bulletinNumber: number;
  emailScheduledAt: string | null;
  emailSentAt: string | null;
  activeRecipientCount: number;
  sentSummary?: { sent: number; failed: number } | null;
}) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [date, setDate] = useState(() => (emailScheduledAt ? localDateTimeInputs(emailScheduledAt).date : todayInSantiago()));
  const [time, setTime] = useState(() => (emailScheduledAt ? localDateTimeInputs(emailScheduledAt).time : DEFAULT_SCHEDULE_TIME));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setError(null);
    if (!date || !time) {
      setError("Selecciona fecha y hora.");
      return;
    }
    const scheduledUtc = zonedTimeToUtc(date, time);
    if (scheduledUtc.getTime() < Date.now() - 60_000) {
      setError("La fecha y hora deben ser en el futuro.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: dbError } = await supabase
      .from("weekly_bulletins")
      .update({ email_scheduled_at: scheduledUtc.toISOString() })
      .eq("id", bulletinId);

    if (dbError) {
      setLoading(false);
      setError("No pudimos guardar la programación.");
      return;
    }

    await supabase.rpc("log_audit", {
      p_action: "programar_envio_informativo",
      p_module: "informativos",
      p_entity: "weekly_bulletins",
      p_entity_id: bulletinId,
      p_details: { number: bulletinNumber, scheduled_at: scheduledUtc.toISOString() },
    });

    setLoading(false);
    setFormOpen(false);
    router.refresh();
  }

  async function handleCancel() {
    if (!window.confirm("¿Cancelar la programación de envío por correo?")) return;
    setLoading(true);
    const supabase = createClient();
    const { error: dbError } = await supabase.from("weekly_bulletins").update({ email_scheduled_at: null }).eq("id", bulletinId);

    if (dbError) {
      setLoading(false);
      window.alert("No pudimos cancelar la programación.");
      return;
    }

    await supabase.rpc("log_audit", {
      p_action: "cancelar_envio_informativo",
      p_module: "informativos",
      p_entity: "weekly_bulletins",
      p_entity_id: bulletinId,
      p_details: { number: bulletinNumber },
    });

    setLoading(false);
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <div className="flex items-center gap-2">
        <Mail className="h-4 w-4 text-brand-700" />
        <h3 className="font-medium text-slate-900">Envío por correo</h3>
      </div>

      <div className="mt-2">
        {emailSentAt ? (
          <div className="space-y-1">
            <Badge tone="success">Enviado: {formatScheduleLabel(emailSentAt)}</Badge>
            {sentSummary && (
              <p className="text-xs text-slate-500">
                {sentSummary.sent} enviados correctamente{sentSummary.failed > 0 && `, ${sentSummary.failed} fallaron`}.
              </p>
            )}
          </div>
        ) : emailScheduledAt ? (
          <Badge tone="brand">Programado para: {formatScheduleLabel(emailScheduledAt)}</Badge>
        ) : (
          <Badge tone="neutral">Correo no programado</Badge>
        )}
      </div>

      {!emailSentAt && !formOpen && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={() => setFormOpen(true)}>
            <Send className="h-4 w-4" /> {emailScheduledAt ? "Editar fecha/hora" : "Programar envío por correo"}
          </Button>
          {emailScheduledAt && (
            <Button type="button" size="sm" variant="ghost" disabled={loading} onClick={handleCancel}>
              <X className="h-4 w-4" /> Cancelar programación
            </Button>
          )}
        </div>
      )}

      {!emailSentAt && formOpen && (
        <div className="mt-3 space-y-3 rounded-lg bg-slate-50 p-3">
          <p className="text-sm text-slate-600">
            Destinatarios: <span className="font-semibold text-slate-900">{activeRecipientCount}</span> (activos, correo principal)
          </p>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Fecha" htmlFor="schedule_date" required>
              <Input id="schedule_date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </FormField>
            <FormField label="Hora (America/Santiago)" htmlFor="schedule_time" required>
              <Input id="schedule_time" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
            </FormField>
          </div>
          {date && time && (
            <p className="text-xs text-slate-500">
              Se enviará: <span className="font-medium text-slate-700">{formatScheduleLabel(zonedTimeToUtc(date, time).toISOString())}</span>
            </p>
          )}
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}
          <div className="flex gap-2">
            <Button type="button" size="sm" disabled={loading} onClick={handleConfirm}>
              {loading ? "Guardando…" : "Confirmar programación"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
