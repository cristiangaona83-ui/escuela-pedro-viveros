-- Fase 9 (Noticias + Galería): corrige una asimetría real entre Storage y las
-- RLS de las tablas. Las políticas de escritura de "archivos-publicos"
-- definidas en 0005_storage_policies.sql son de bucket completo (cualquier
-- carpeta), con los roles ['director','utp','administrativo','superadmin'].
-- Eso coincide con documents_write_admin (0002_rls.sql) para /documentos,
-- pero NO con news_write_admin / gallery_write_admin, que excluyen
-- 'administrativo'. Resultado: un usuario 'administrativo' podía subir,
-- reemplazar o borrar archivos en archivos-publicos/noticias o /galeria en
-- Storage, aunque nunca pudiera crear ni editar el registro de news/gallery
-- que los referencia -- un archivo huérfano posible, no una fuga de datos.
--
-- Esta migración reemplaza las 3 políticas de bucket completo por 9 políticas
-- específicas por carpeta (documentos/noticias/galeria × insert/update/delete),
-- cada una con exactamente los roles de la tabla correspondiente. La política
-- de lectura ("archivos_publicos_select_all") no se toca: sigue abierta a
-- anon + authenticated en todo el bucket, la lectura pública no cambia.
--
-- No se modifica 0005_storage_policies.sql -- esta es una migración nueva e
-- incremental que reemplaza las políticas en la base de datos en vivo.

drop policy if exists "archivos_publicos_insert_staff" on storage.objects;
drop policy if exists "archivos_publicos_update_staff" on storage.objects;
drop policy if exists "archivos_publicos_delete_staff" on storage.objects;

-- ---------------------------------------------------------------------------
-- /documentos -- mismos roles que documents_write_admin, sin cambios de fondo.
-- ---------------------------------------------------------------------------
drop policy if exists "archivos_publicos_insert_documentos" on storage.objects;
create policy "archivos_publicos_insert_documentos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'archivos-publicos'
  and (storage.foldername(name))[1] = 'documentos'
  and public.has_any_role(array['director', 'utp', 'administrativo', 'superadmin'])
);

drop policy if exists "archivos_publicos_update_documentos" on storage.objects;
create policy "archivos_publicos_update_documentos"
on storage.objects for update
to authenticated
using (
  bucket_id = 'archivos-publicos'
  and (storage.foldername(name))[1] = 'documentos'
  and public.has_any_role(array['director', 'utp', 'administrativo', 'superadmin'])
)
with check (
  bucket_id = 'archivos-publicos'
  and (storage.foldername(name))[1] = 'documentos'
  and public.has_any_role(array['director', 'utp', 'administrativo', 'superadmin'])
);

drop policy if exists "archivos_publicos_delete_documentos" on storage.objects;
create policy "archivos_publicos_delete_documentos"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'archivos-publicos'
  and (storage.foldername(name))[1] = 'documentos'
  and public.has_any_role(array['director', 'utp', 'administrativo', 'superadmin'])
);

-- ---------------------------------------------------------------------------
-- /noticias -- mismos roles que news_write_admin (sin 'administrativo').
-- ---------------------------------------------------------------------------
drop policy if exists "archivos_publicos_insert_noticias" on storage.objects;
create policy "archivos_publicos_insert_noticias"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'archivos-publicos'
  and (storage.foldername(name))[1] = 'noticias'
  and public.has_any_role(array['director', 'utp', 'superadmin'])
);

drop policy if exists "archivos_publicos_update_noticias" on storage.objects;
create policy "archivos_publicos_update_noticias"
on storage.objects for update
to authenticated
using (
  bucket_id = 'archivos-publicos'
  and (storage.foldername(name))[1] = 'noticias'
  and public.has_any_role(array['director', 'utp', 'superadmin'])
)
with check (
  bucket_id = 'archivos-publicos'
  and (storage.foldername(name))[1] = 'noticias'
  and public.has_any_role(array['director', 'utp', 'superadmin'])
);

drop policy if exists "archivos_publicos_delete_noticias" on storage.objects;
create policy "archivos_publicos_delete_noticias"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'archivos-publicos'
  and (storage.foldername(name))[1] = 'noticias'
  and public.has_any_role(array['director', 'utp', 'superadmin'])
);

-- ---------------------------------------------------------------------------
-- /galeria -- mismos roles que gallery_write_admin (sin 'administrativo').
-- ---------------------------------------------------------------------------
drop policy if exists "archivos_publicos_insert_galeria" on storage.objects;
create policy "archivos_publicos_insert_galeria"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'archivos-publicos'
  and (storage.foldername(name))[1] = 'galeria'
  and public.has_any_role(array['director', 'utp', 'superadmin'])
);

drop policy if exists "archivos_publicos_update_galeria" on storage.objects;
create policy "archivos_publicos_update_galeria"
on storage.objects for update
to authenticated
using (
  bucket_id = 'archivos-publicos'
  and (storage.foldername(name))[1] = 'galeria'
  and public.has_any_role(array['director', 'utp', 'superadmin'])
)
with check (
  bucket_id = 'archivos-publicos'
  and (storage.foldername(name))[1] = 'galeria'
  and public.has_any_role(array['director', 'utp', 'superadmin'])
);

drop policy if exists "archivos_publicos_delete_galeria" on storage.objects;
create policy "archivos_publicos_delete_galeria"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'archivos-publicos'
  and (storage.foldername(name))[1] = 'galeria'
  and public.has_any_role(array['director', 'utp', 'superadmin'])
);
