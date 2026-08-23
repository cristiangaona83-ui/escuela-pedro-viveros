"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { WeeklyBulletinRow } from "@/types/database";

export function DuplicateBulletinButton({ bulletin }: { bulletin: WeeklyBulletinRow }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDuplicate() {
    setLoading(true);
    const supabase = createClient();
    const { data: authData } = await supabase.auth.getUser();

    const { data: last } = await supabase
      .from("weekly_bulletins")
      .select("number")
      .order("number", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextNumber = (last?.number ?? 0) + 1;

    const { data: inserted, error } = await supabase
      .from("weekly_bulletins")
      .insert({
        number: nextNumber,
        title: bulletin.title,
        week_label: bulletin.week_label,
        publish_date: new Date().toISOString().slice(0, 10),
        content: bulletin.content,
        published: false,
        created_by: authData.user?.id,
      })
      .select("id")
      .single();

    if (error || !inserted) {
      setLoading(false);
      window.alert("No pudimos duplicar el informativo.");
      return;
    }

    await supabase.rpc("log_audit", {
      p_action: "duplicar_informativo",
      p_module: "informativos",
      p_entity: "weekly_bulletins",
      p_entity_id: inserted.id,
      p_details: { source_id: bulletin.id, number: nextNumber },
    });

    setLoading(false);
    router.push(`/plataforma/informativos/${inserted.id}`);
  }

  return (
    <button
      type="button"
      onClick={handleDuplicate}
      disabled={loading}
      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
    >
      <Copy className="h-3.5 w-3.5" /> {loading ? "Duplicando…" : "Duplicar"}
    </button>
  );
}
