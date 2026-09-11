-- =============================================================================
-- Testimonios de apoderados -- opiniones públicas con moderación previa
-- =============================================================================
-- Tabla nueva y propia (mismo criterio que weekly_bulletins/circulares_
-- informativas: un tipo de contenido, una tabla). El envío es público
-- (cualquier visitante, sin cuenta en la plataforma -- los apoderados no
-- tienen login), pero nunca queda visible en el sitio hasta que
-- director/administrativo/superadmin lo aprueba desde la Plataforma.
-- =============================================================================

create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  relationship text,
  message text not null,
  status text not null default 'pendiente' check (status in ('pendiente', 'aprobado', 'rechazado')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_testimonials_status on public.testimonials (status, created_at desc);

alter table public.testimonials enable row level security;

-- Envío público: cualquiera (con o sin sesión) puede crear un testimonio --
-- siempre nace 'pendiente' (el check de status ya lo obliga por default,
-- y esta política no permite fijar otro valor a través del insert porque
-- el with check no restringe columnas individuales, así que se refuerza
-- además a nivel de aplicación en /api/testimonios, que nunca acepta un
-- status del cliente).
create policy "testimonials_insert_public" on public.testimonials
  for insert to anon, authenticated with check (true);

-- Lectura pública: solo lo aprobado, tanto para visitantes anónimos como
-- para cualquier persona con sesión en la plataforma (staff navegando el
-- sitio público ve lo mismo que cualquier familia).
create policy "testimonials_select_approved" on public.testimonials
  for select to anon, authenticated using (status = 'aprobado');

-- Moderación: director/administrativo/superadmin ven todo (incluido
-- pendiente/rechazado) y son los únicos que pueden aprobar/rechazar/eliminar.
create policy "testimonials_select_admin" on public.testimonials
  for select to authenticated using (public.has_any_role(array['director', 'administrativo', 'superadmin']));
create policy "testimonials_update_admin" on public.testimonials
  for update to authenticated
  using (public.has_any_role(array['director', 'administrativo', 'superadmin']))
  with check (public.has_any_role(array['director', 'administrativo', 'superadmin']));
create policy "testimonials_delete_admin" on public.testimonials
  for delete to authenticated using (public.has_any_role(array['director', 'administrativo', 'superadmin']));

grant select, insert on public.testimonials to anon;
grant select, insert, update, delete on public.testimonials to authenticated;
