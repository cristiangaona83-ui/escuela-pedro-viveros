-- =============================================================================
-- Políticas de Supabase Storage — dos buckets, separación pública/privada.
-- Ejecutar después de 0001-0004 Y de crear ambos buckets en el panel de
-- Supabase (Storage → New bucket):
--   - "archivos-publicos"  (Public bucket: ON)  — PEI/reglamentos públicos,
--     noticias, galería. Todo lo que ya se sirve hoy en el sitio público.
--   - "archivos-internos"  (Public bucket: OFF) — documentos pedagógicos,
--     planificaciones, PIE, acompañamiento, reportes, certificados y
--     cualquier otro archivo que nunca debe tener una URL pública fija.
--
-- Estas políticas viven en storage.objects, un mecanismo separado de las
-- políticas de public.* ya definidas en 0002_rls.sql — reutilizan las mismas
-- funciones has_role()/has_any_role() (security definer, ya con EXECUTE
-- otorgado a authenticated en 0004_grants.sql).
--
-- Importante: que "archivos-publicos" sea un bucket público solo controla la
-- LECTURA anónima. Sin las políticas de abajo, cualquier usuario autenticado
-- (o incluso anon, según la config del bucket) podría subir/reemplazar/borrar
-- archivos ahí — por eso INSERT/UPDATE/DELETE quedan siempre restringidos por
-- rol en ambos buckets, público o no.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- archivos-publicos: lectura abierta, escritura solo para roles de gestión
-- de contenido (mismos roles que hoy administran documents/news/gallery).
-- ---------------------------------------------------------------------------
create policy "archivos_publicos_select_all"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'archivos-publicos');

create policy "archivos_publicos_insert_staff"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'archivos-publicos'
  and public.has_any_role(array['director', 'utp', 'administrativo', 'superadmin'])
);

create policy "archivos_publicos_update_staff"
on storage.objects for update
to authenticated
using (
  bucket_id = 'archivos-publicos'
  and public.has_any_role(array['director', 'utp', 'administrativo', 'superadmin'])
)
with check (
  bucket_id = 'archivos-publicos'
  and public.has_any_role(array['director', 'utp', 'administrativo', 'superadmin'])
);

create policy "archivos_publicos_delete_staff"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'archivos-publicos'
  and public.has_any_role(array['director', 'utp', 'administrativo', 'superadmin'])
);

-- ---------------------------------------------------------------------------
-- archivos-internos: nunca lectura anónima. Las políticas se definen por
-- carpeta (storage.foldername(name)[1]) para que cada módulo tenga su propio
-- alcance de roles, igual que ya ocurre con sus tablas en public.*.
--
-- Carpeta "documentos" (Documentos internos, documents.is_public = false):
-- mismo alcance que la tabla — todo el staff autenticado puede leer
-- (necesario para firmar URLs de descarga), solo los roles de gestión
-- pueden escribir.
-- ---------------------------------------------------------------------------
create policy "archivos_internos_documentos_select"
on storage.objects for select
to authenticated
using (
  bucket_id = 'archivos-internos'
  and (storage.foldername(name))[1] = 'documentos'
);

create policy "archivos_internos_documentos_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'archivos-internos'
  and (storage.foldername(name))[1] = 'documentos'
  and public.has_any_role(array['director', 'utp', 'administrativo', 'superadmin'])
);

create policy "archivos_internos_documentos_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'archivos-internos'
  and (storage.foldername(name))[1] = 'documentos'
  and public.has_any_role(array['director', 'utp', 'administrativo', 'superadmin'])
)
with check (
  bucket_id = 'archivos-internos'
  and (storage.foldername(name))[1] = 'documentos'
  and public.has_any_role(array['director', 'utp', 'administrativo', 'superadmin'])
);

create policy "archivos_internos_documentos_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'archivos-internos'
  and (storage.foldername(name))[1] = 'documentos'
  and public.has_any_role(array['director', 'utp', 'administrativo', 'superadmin'])
);

-- Las carpetas de módulos futuros dentro de archivos-internos (pie,
-- planificaciones, acompanamiento, reportes, certificados...) se agregan con
-- sus propias políticas, con el rol que corresponda, en la migración del
-- módulo respectivo — no se anticipan aquí sin necesidad real.
