"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImageOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { deletePublicFile, pathFromPublicUrl } from "@/lib/supabase/storage";

/** Quita la fotografía del registro central de la persona (staff_members) —
 * afecta a TODAS las secciones donde aparece, porque comparten el mismo
 * staff_member_id. Si la foto estaba en Supabase Storage, también se borra
 * el archivo. */
export function RemovePhotoButton({
  staffMemberId,
  photoUrl,
  fullName,
}: {
  staffMemberId: string;
  photoUrl: string | null;
  fullName: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (!photoUrl) return null;
  const currentPhotoUrl = photoUrl;

  async function handleRemove() {
    if (
      !window.confirm(
        `¿Quitar la fotografía de ${fullName}? Se mostrará un avatar con iniciales en todas las secciones donde aparece.`
      )
    )
      return;

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("staff_members").update({ photo_url: null }).eq("id", staffMemberId);

    if (error) {
      setLoading(false);
      window.alert("No pudimos quitar la fotografía.");
      return;
    }

    await supabase.rpc("log_audit", {
      p_action: "quitar_foto_equipo",
      p_module: "equipo-institucional",
      p_entity: "staff_members",
      p_entity_id: staffMemberId,
      p_details: { full_name: fullName },
    });

    if (currentPhotoUrl.startsWith("http")) {
      const path = pathFromPublicUrl(currentPhotoUrl);
      if (path) void deletePublicFile(path);
    }

    setLoading(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleRemove}
      disabled={loading}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
    >
      <ImageOff className="h-3.5 w-3.5" /> Quitar fotografía
    </button>
  );
}
