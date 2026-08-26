import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Cliente con privilegios de servicio (SUPABASE_SERVICE_ROLE_KEY) — omite
 * RLS por completo. Uso exclusivo: código de servidor sin sesión de usuario
 * o que necesita leer un recurso institucional (no ligado a un usuario)
 * fuera del alcance de RLS. Casos actuales: el cron de envío de correos de
 * Informativos Semanales (src/app/api/cron/send-bulletins/route.ts) y la
 * descarga server-side de la firma del Director desde el bucket privado de
 * Storage (src/lib/pdf/director-signature.ts) para incrustarla en los PDF
 * institucionales. `import "server-only"` hace fallar el build si este
 * archivo llegara a importarse desde código de cliente.
 *
 * Nunca reutilizar este cliente para servir datos de usuarios normales
 * dependientes de su identidad/permisos — para eso siempre corresponde el
 * cliente ligado a la sesión (`@/lib/supabase/server`), que sí respeta RLS.
 */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  }
  return createSupabaseClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
