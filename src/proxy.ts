import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PLATFORM_HOST_PREFIX = "plataforma.";
const PUBLIC_PLATFORM_PATHS = ["/plataforma/login", "/plataforma/recuperar", "/plataforma/restablecer-clave"];

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

  const hostname = request.headers.get("host") || "";
  const isPlatformHost = hostname.startsWith(PLATFORM_HOST_PREFIX);
  const url = request.nextUrl;

  // En el dominio plataforma.*, servir el árbol /plataforma en la raíz.
  if (isPlatformHost && !url.pathname.startsWith("/plataforma") && !url.pathname.startsWith("/_next") && !url.pathname.startsWith("/api")) {
    const rewritten = url.clone();
    rewritten.pathname = `/plataforma${url.pathname === "/" ? "" : url.pathname}`;
    return NextResponse.rewrite(rewritten);
  }

  // Proteger todas las rutas /plataforma/* salvo login / recuperación de clave.
  const isPlatformRoute = url.pathname.startsWith("/plataforma");
  const isPublicPlatformPath = PUBLIC_PLATFORM_PATHS.some((p) => url.pathname.startsWith(p));

  if (isPlatformRoute && !isPublicPlatformPath && !url.pathname.startsWith("/plataforma/api")) {
    if (!user) {
      const loginUrl = url.clone();
      loginUrl.pathname = "/plataforma/login";
      loginUrl.searchParams.set("next", url.pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (url.pathname === "/plataforma/login" && user) {
    const dashboardUrl = url.clone();
    dashboardUrl.pathname = "/plataforma/dashboard";
    return NextResponse.redirect(dashboardUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
