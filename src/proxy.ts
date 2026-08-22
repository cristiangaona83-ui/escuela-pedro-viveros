import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PLATFORM_HOST_PREFIX = "plataforma.";
const PUBLIC_PLATFORM_PATHS = [
  "/plataforma/login",
  "/plataforma/recuperar",
  "/plataforma/restablecer-clave",
  "/plataforma/auth/callback",
];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Una sesión de Supabase Auth válida no basta: si Administración desactivó
  // el perfil (profiles.active = false), el acceso a la plataforma debe
  // bloquearse igual que si nunca hubiera iniciado sesión. No se elimina la
  // cuenta de Auth, solo se le niega el acceso y se cierra la sesión activa.
  let isActiveUser = false;
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("active").eq("id", user.id).maybeSingle();
    isActiveUser = profile?.active === true;
  }

  const hostname = request.headers.get("host") || "";
  const isPlatformHost = hostname.startsWith(PLATFORM_HOST_PREFIX);
  const url = request.nextUrl;

  // En el dominio plataforma.*, servir el árbol /plataforma en la raíz.
  if (isPlatformHost && !url.pathname.startsWith("/plataforma") && !url.pathname.startsWith("/_next") && !url.pathname.startsWith("/api")) {
    if (url.pathname === "/") {
      // La raíz del subdominio no tiene página propia -- "/plataforma" tampoco
      // existe como ruta, así que reescribir ahí daría 404. En vez de eso,
      // redirige según sesión; la petición vuelve a pasar por este middleware
      // con el pathname ya resuelto (/plataforma/login o /plataforma/dashboard)
      // y de ahí en adelante aplica la misma protección de siempre.
      const target = url.clone();
      target.pathname = user && isActiveUser ? "/plataforma/dashboard" : "/plataforma/login";
      return NextResponse.redirect(target);
    }
    const rewritten = url.clone();
    rewritten.pathname = `/plataforma${url.pathname}`;
    return NextResponse.rewrite(rewritten);
  }

  // Proteger todas las rutas /plataforma/* salvo login, recuperación de clave
  // y el callback de auth (que todavía no tiene sesión cuando llega el `code`).
  const isPlatformRoute = url.pathname.startsWith("/plataforma");
  const isPublicPlatformPath = PUBLIC_PLATFORM_PATHS.some((p) => url.pathname.startsWith(p));

  if (isPlatformRoute && !isPublicPlatformPath && !url.pathname.startsWith("/plataforma/api")) {
    if (!user || !isActiveUser) {
      if (user && !isActiveUser) {
        await supabase.auth.signOut();
      }
      const loginUrl = url.clone();
      loginUrl.pathname = "/plataforma/login";
      loginUrl.searchParams.set("next", url.pathname);
      if (user && !isActiveUser) loginUrl.searchParams.set("error", "account_disabled");
      return NextResponse.redirect(loginUrl);
    }
  }

  if (url.pathname === "/plataforma/login" && user && isActiveUser) {
    const dashboardUrl = url.clone();
    dashboardUrl.pathname = "/plataforma/dashboard";
    return NextResponse.redirect(dashboardUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
