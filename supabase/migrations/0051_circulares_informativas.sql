-- =============================================================================
-- Circulares Informativas -- sección pública independiente del sitio web
-- =============================================================================
-- Tabla nueva y propia, mismo criterio que 0023 (weekly_bulletins): un tipo
-- de contenido, una tabla. NO se reutiliza `documents` (esa es la
-- infraestructura del repositorio INTERNO de Documentos de la Plataforma,
-- explícitamente fuera de alcance aquí) ni la tabla `weekly_bulletins`
-- (esa es contenido redactado en la plataforma con PDF autogenerado; una
-- circular es, en cambio, un PDF que el establecimiento ya tiene y sube
-- directamente -- mismo modelo de archivo que Documentos, pero con su
-- propia sección pública y su propia administración).
-- =============================================================================

create table public.circulares_informativas (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  document_number text,
  circular_date date not null default current_date,
  description text,
  file_url text not null,
  display_order int not null default 0,
  visible boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_circulares_informativas_updated_at before update on public.circulares_informativas
  for each row execute function public.set_updated_at();

create index idx_circulares_informativas_order on public.circulares_informativas (display_order, circular_date desc);

alter table public.circulares_informativas enable row level security;

-- Público: solo ve las visibles. Personal autenticado: ve todas (incluye
-- ocultas), igual que weekly_bulletins/news/gallery. Escritura: director/
-- utp/superadmin -- mismos roles que weekly_bulletins_write_admin (utp ya
-- administra contenido del sitio web hoy vía Informativos y Documentos).
create policy "circulares_informativas_select_visible_anon" on public.circulares_informativas
  for select to anon using (visible = true);
create policy "circulares_informativas_select_all_staff" on public.circulares_informativas
  for select to authenticated using (true);
create policy "circulares_informativas_write_admin" on public.circulares_informativas
  for all to authenticated using (public.has_any_role(array['director','utp','superadmin']))
  with check (public.has_any_role(array['director','utp','superadmin']));

grant select on public.circulares_informativas to anon;
grant select, insert, update, delete on public.circulares_informativas to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: PDF en el bucket público existente (archivos-publicos/
-- circulares-informativas), mismo patrón por carpeta que 0010/0023. La
-- lectura pública de todo el bucket ya existe (archivos_publicos_select_all,
-- 0005/0010) y no se toca -- solo se agregan las políticas de escritura
-- para esta carpeta nueva, con los mismos roles que circulares_informativas_write_admin.
-- ---------------------------------------------------------------------------
create policy "archivos_publicos_insert_circulares_informativas"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'archivos-publicos'
  and (storage.foldername(name))[1] = 'circulares-informativas'
  and public.has_any_role(array['director', 'utp', 'superadmin'])
);

create policy "archivos_publicos_update_circulares_informativas"
on storage.objects for update
to authenticated
using (
  bucket_id = 'archivos-publicos'
  and (storage.foldername(name))[1] = 'circulares-informativas'
  and public.has_any_role(array['director', 'utp', 'superadmin'])
)
with check (
  bucket_id = 'archivos-publicos'
  and (storage.foldername(name))[1] = 'circulares-informativas'
  and public.has_any_role(array['director', 'utp', 'superadmin'])
);

create policy "archivos_publicos_delete_circulares_informativas"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'archivos-publicos'
  and (storage.foldername(name))[1] = 'circulares-informativas'
  and public.has_any_role(array['director', 'utp', 'superadmin'])
);
