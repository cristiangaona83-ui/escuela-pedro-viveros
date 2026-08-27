"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, ArrowDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function ReorderGalleryButtons({
  id,
  orderIndex,
  prev,
  next,
}: {
  id: string;
  orderIndex: number;
  prev: { id: string; orderIndex: number } | null;
  next: { id: string; orderIndex: number } | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function move(target: { id: string; orderIndex: number } | null) {
    if (!target) return;
    setLoading(true);
    const supabase = createClient();
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase.from("gallery").update({ order_index: target.orderIndex }).eq("id", id),
      supabase.from("gallery").update({ order_index: orderIndex }).eq("id", target.id),
    ]);
    setLoading(false);
    if (e1 || e2) { window.alert("No pudimos reordenar."); return; }
    router.refresh();
  }

  return (
    <div className="flex items-center">
      <button type="button" disabled={loading || !prev} onClick={() => move(prev)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30" aria-label="Subir">
        <ArrowUp className="h-4 w-4" />
      </button>
      <button type="button" disabled={loading || !next} onClick={() => move(next)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30" aria-label="Bajar">
        <ArrowDown className="h-4 w-4" />
      </button>
    </div>
  );
}
