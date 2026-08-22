# Escuela Profesor Pedro Viveros Ormeño — Ecosistema digital

Sitio institucional público + Plataforma Pedagógica privada, en un solo repositorio Next.js
con Supabase como backend.

## 1. Stack utilizado

- **Frontend:** Next.js 16 (App Router) + React 19 + TypeScript, Tailwind CSS v4.
- **Iconografía:** lucide-react.
- **Backend:** Supabase (Auth, Postgres, Row Level Security, Storage).
- **PDF:** @react-pdf/renderer (certificados e informes), `qrcode` (verificación).
- **Despliegue:** GitHub + Vercel.

## 2. Estructura creada

```
src/
  app/
    (public)/            Sitio público (usa Header/Footer)
    plataforma/
      (auth)/             login, recuperar, restablecer-clave (sin sidebar)
      (app)/               dashboard, estudiantes, cursos, calificaciones, etc. (con sidebar, protegido)
      api/                 Route handlers que generan PDFs (certificados, informes)
    verificar/            Verificación pública de certificados (noindex)
    sitemap.ts, robots.ts, icon.tsx
  components/
    public/    ui/    platform/
  features/               Lógica y formularios por dominio (auth, students, courses, grades, ...)
  services/                Acceso a datos (Server Components) por módulo
  lib/
    supabase/             clientes browser/server, pdf/ (plantillas PDF)
  config/                  site.ts, navigation.ts, grading.ts, institutional-content.ts
  types/database.ts        Tipos de la base de datos (a reemplazar por los generados)
  middleware → src/proxy.ts  Enrutamiento por subdominio + protección de /plataforma
supabase/
  migrations/0001_schema.sql, 0002_rls.sql, 0003_verification.sql
  seed/demo.sql            Datos DEMO opcionales, claramente marcados
```

La arquitectura separa **UI**, **lógica de dominio** (`features/`), **acceso a datos**
(`services/`) y **tipos** (`types/`), como pide el punto 52.

## 3. Módulos funcionales en esta entrega

Se incorporó el escudo oficial (`public/images/logo-escuela.jpg`) en el header, footer y login,
la fotografía real de la fachada (`public/images/fachada-escuela.png`) en el Hero, y el PEI, el
Reglamento Interno y el Reglamento de Evaluación reales en Documentos Institucionales
(`public/documents/`).

**Sitio público:** Inicio, Nuestra Escuela, Proyecto Educativo, Equipo Directivo, Equipo PIE,
Cursos, Noticias (+detalle), Galería (filtros + lightbox), Documentos, Contacto (formulario +
mapa), `/verificar` (verificación pública de folios). SEO: sitemap, robots, metadata,
datos estructurados, favicon dinámico.

**Plataforma privada:**
- Login, recuperar/actualizar contraseña (Supabase Auth).
- Roles (director, utp, docente, pie, convivencia, administrativo, superadmin) con RLS real
  en la base de datos, no solo en el frontend.
- Panel Principal con accesos según rol.
- Cursos, Estudiantes, Asignaturas, Evaluaciones.
- **Calificaciones**: libro de notas por curso/asignatura/período con cálculo de promedio
  ponderado, escala y redondeo configurables, bloqueo por período cerrado.
- **Certificado de Alumno Regular**: folio automático (`PVO-AAAA-000001`), código de
  verificación, QR, PDF descargable, registro en bitácora.
- **Informe de Calificaciones Semestral** y **Anual**, e **Informe de Cierre de Año**
  (con aviso de que no reemplaza el certificado oficial MINEDUC).
- Administración: usuarios y roles, años académicos y períodos (abrir/cerrar), configuración
  de escala de notas y firma para certificados.

## 4. Preparado arquitectónicamente para la segunda etapa

Tablas, RLS y una vista de lectura ya existen para: Asistencia, Planificaciones y Objetivos
de Aprendizaje, PIE, Seguimiento Pedagógico, Acompañamiento al Aula, Documentos internos,
Calendario, Reportes exportables y Bitácora de auditoría. Falta construir los formularios de
carga completos sobre esa misma base — no hay que rediseñar nada.

## 5. Qué crear/configurar en Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. En **SQL Editor**, ejecuta en orden:
   - `supabase/migrations/0001_schema.sql`
   - `supabase/migrations/0002_rls.sql`
   - `supabase/migrations/0003_verification.sql`
   - (Opcional, solo en un proyecto de pruebas) `supabase/seed/demo.sql`
   - (Opcional) `supabase/seed/institutional_documents.sql`: registra en la tabla
     `documents` el PEI, el Reglamento Interno y el Reglamento de Evaluación reales que ya
     están publicados como archivos estáticos en `public/documents/`. Ejecútalo si quieres
     administrar esos documentos desde Administración en vez de editarlos como código; si lo
     haces, quita el arreglo `STATIC_INSTITUTIONAL_DOCUMENTS` de
     `src/config/institutional-documents.ts` para no duplicarlos en la página pública.
3. En **Authentication → Providers**, deja habilitado Email/Password.
4. En **Storage**, crea un bucket (ej. `documentos`) si vas a subir PDFs y fotografías; el
   módulo de Documentos ya acepta cualquier URL pública, incluida la de Storage.

## 6. Variables de entorno

Copia `.env.example` a `.env.local` y complétalas con **Settings → API** de tu proyecto Supabase:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

En Vercel, agrega las mismas dos variables en **Project Settings → Environment Variables**.
Nunca subas `.env.local` a GitHub (ya está en `.gitignore`).

## 7. Crear el primer usuario administrador

1. En el panel de Supabase → **Authentication → Users → Add user**, crea la cuenta del
   director con correo y contraseña (esto crea automáticamente su fila en `profiles`).
2. En **SQL Editor**, asígnale el rol de Director y Superadministrador:

```sql
insert into public.user_roles (user_id, role_id)
select u.id, r.id
from auth.users u, public.roles r
where u.email = 'correo-del-director@ejemplo.cl'
  and r.code in ('director', 'superadmin');
```

También puedes asignar roles desde **Administración → Usuarios y roles** dentro de la
plataforma, una vez que tengas un usuario con rol Director o Superadministrador.

## 8. Cómo acceder a la plataforma

- En producción: `https://plataforma.escuelapedroviveros.cl`
- En desarrollo local: `http://localhost:3000/plataforma/login`

## 9. Ejecutar localmente

```bash
npm install
npm run dev
```

Abre `http://localhost:3000`. El sitio público funciona sin Supabase configurado (muestra
estados vacíos); para probar login, calificaciones y certificados necesitas un proyecto
Supabase real con las migraciones aplicadas.

## 10. Publicar en Vercel

1. Sube el repositorio a GitHub (`git push`).
2. En [vercel.com](https://vercel.com) → **New Project**, importa el repositorio.
3. Agrega las variables de entorno del punto 6.
4. Deploy. Vercel detecta Next.js automáticamente.

## 11. Conectar los dos dominios

Esta app sirve ambos sitios desde el mismo despliegue: `src/proxy.ts` detecta el hostname y,
si empieza con `plataforma.`, sirve el árbol `/plataforma` en la raíz; cualquier otro dominio
ve el sitio público.

1. En el proyecto de Vercel → **Settings → Domains**, agrega:
   - `www.escuelapedroviveros.cl` (sitio público)
   - `plataforma.escuelapedroviveros.cl` (plataforma)
2. Sigue las instrucciones de Vercel para apuntar los registros DNS del dominio
   `escuelapedroviveros.cl` (CNAME/A según corresponda) desde tu proveedor de dominio.
3. No se requiere ningún cambio de código adicional: ambos dominios funcionan contra el mismo
   despliegue.

## 12. Verificación

`npm run build` y `npx eslint .` se ejecutaron sin errores sobre el estado final de este
repositorio (46 rutas generadas correctamente, TypeScript y ESLint limpios).

## Seguridad — puntos clave

- Row Level Security activo en todas las tablas sensibles; los roles se validan en la base de
  datos, no solo ocultando botones en el frontend.
- Los datos de estudiantes nunca se exponen en rutas públicas, sitemap ni metadatos.
- `/plataforma/*` lleva `robots: noindex`.
- El folio y código de verificación de certificados se generan en el servidor
  (`next_certificate_folio`, `security definer`); la verificación pública solo expone datos
  mínimos (`verify_certificate`).
- No se usa la Service Role Key en la aplicación: el primer usuario se crea desde el panel de
  Supabase, no mediante una API con privilegios elevados.
