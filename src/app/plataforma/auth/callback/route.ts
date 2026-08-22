import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Callback PKCE único para todo enlace de Supabase que vuelva con `?code=`:
 * magic link, recuperación de contraseña, confirmación de correo, etc.
 * Intercambia el código por una sesión real (cookies), y solo entonces
 * redirige — así el middleware reconoce al usuario en la siguiente request.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/plataforma/dashboard";

  // Nunca redirigir a una URL externa: solo rutas propias, empezando con "/".
  const safeNext = next.startsWith("/") ? next : "/plataforma/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }

  const loginUrl = new URL("/plataforma/login", origin);
  loginUrl.searchParams.set("error", "auth_callback_failed");
  return NextResponse.redirect(loginUrl);
}
