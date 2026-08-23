"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { publishBulletin } from "./publish-bulletin";

export function PublishBulletinButton({ bulletinId, title }: { bulletinId: string; title: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handlePublish() {
    if (!window.confirm(`¿Publicar "${title}"? Se generará su PDF y quedará visible en el sitio público.`)) return;
    setLoading(true);
    const result = await publishBulletin(bulletinId);
    setLoading(false);
    if (!result.ok) {
      window.alert(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handlePublish}
      disabled={loading}
      className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
    >
      <Send className="h-3.5 w-3.5" /> {loading ? "Publicando…" : "Publicar"}
    </button>
  );
}
