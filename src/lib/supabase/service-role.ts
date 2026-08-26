import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Cliente con privilegios de servicio (SUPABASE_SERVICE_ROLE_KEY) — omite
 * RLS por completo. Uso exclusivo: código de servidor sin sesión de usuario.
 * Caso actual: el cron de envío de correos de Informativos Semanales
 * (src/app/api/cron/send-bulletins/route.ts), que se ejecuta por
 * infraestructura de Vercel, nunca a partir de una petición de un usuario
 * con sesión. `import "server-only"` hace fallar el build si este archivo
 * llegara a importarse desde código de cliente.
 *
 * Nunca reutilizar este cliente para servir peticiones autenticadas de
 * usuarios normales — para eso siempre corresponde el cliente ligado a la
 * sesión (`@/lib/supabase/server`), que sí respeta RLS. La firma del
 * Director, por ejemplo, se resuelve con el cliente de sesión
 * (src/lib/pdf/institutional-signatures.ts) apoyada en las políticas RLS de
 * supabase/migrations/0033_institutional_signatures.sql, precisamente para
 * no depender de service_role en una ruta ya autenticada.
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
