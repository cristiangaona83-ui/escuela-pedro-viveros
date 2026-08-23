-- =============================================================================
-- Módulo "Informativos Semanales": redacción y publicación de boletines
-- institucionales desde la Plataforma Pedagógica, con generación automática
-- de PDF al publicar.
--
-- Tabla nueva y propia, siguiendo el mismo patrón que news/gallery/documents
-- (un tipo de contenido, una tabla) -- no se reutiliza `documents` porque ese
-- modelo es de archivos subidos por el usuario (un solo file_url, sin
-- numeración correlativa ni contenido redactado en la plataforma), mientras
-- que un informativo es contenido redactado aquí, con número correlativo y
-- PDF generado automáticamente al publicar.
-- =============================================================================

create table public.weekly_bulletins (
  id uuid primary key default gen_random_uuid(),
  number int not null unique,
  title text not null,
  week_label text not null,
  publish_date date not null default current_date,
  content jsonb not null default '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb,
  pdf_url text,
  published boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_weekly_bulletins_updated_at before update on public.weekly_bulletins
  for each row execute function public.set_updated_at();

create index idx_weekly_bulletins_number on public.weekly_bulletins (number desc);

alter table public.weekly_bulletins enable row level security;

-- Público: solo ve los publicados. Personal autenticado: ve todos (incluye
-- borradores), igual que news/gallery. Escritura: solo director/utp/
-- superadmin -- deliberadamente sin 'administrativo' (a diferencia de
-- documents_write_admin), porque el usuario pidió explícitamente no ampliar
-- permisos de otros módulos al gestionar informativos.
create policy "weekly_bulletins_select_published_anon" on public.weekly_bulletins
  for select to anon using (published = true);
create policy "weekly_bulletins_select_all_staff" on public.weekly_bulletins
  for select to authenticated using (true);
create policy "weekly_bulletins_write_admin" on public.weekly_bulletins
  for all to authenticated using (public.has_any_role(array['director','utp','superadmin']))
  with check (public.has_any_role(array['director','utp','superadmin']));

grant select on public.weekly_bulletins to anon;
grant select, insert, update, delete on public.weekly_bulletins to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: el PDF institucional se guarda en el bucket público existente
-- (archivos-publicos/informativos), mismo patrón por carpeta que 0010 para
-- documentos/noticias/galeria. La lectura pública de todo el bucket ya existe
-- (archivos_publicos_select_all, 0005/0010) y no se toca -- solo se agregan
-- las políticas de escritura para esta carpeta nueva, con los mismos roles
-- que weekly_bulletins_write_admin.
-- ---------------------------------------------------------------------------
create policy "archivos_publicos_insert_informativos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'archivos-publicos'
  and (storage.foldername(name))[1] = 'informativos'
  and public.has_any_role(array['director', 'utp', 'superadmin'])
);

create policy "archivos_publicos_update_informativos"
on storage.objects for update
to authenticated
using (
  bucket_id = 'archivos-publicos'
  and (storage.foldername(name))[1] = 'informativos'
  and public.has_any_role(array['director', 'utp', 'superadmin'])
)
with check (
  bucket_id = 'archivos-publicos'
  and (storage.foldername(name))[1] = 'informativos'
  and public.has_any_role(array['director', 'utp', 'superadmin'])
);

create policy "archivos_publicos_delete_informativos"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'archivos-publicos'
  and (storage.foldername(name))[1] = 'informativos'
  and public.has_any_role(array['director', 'utp', 'superadmin'])
);
