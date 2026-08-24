-- =============================================================================
-- Envío programado por correo de Informativos Semanales: lista permanente y
-- editable de destinatarios, columnas de programación en weekly_bulletins,
-- y un registro de envío por destinatario para evitar duplicados.
--
-- Auditoría previa: weekly_bulletins (0023) no tenía columnas de correo.
-- No existía ninguna tabla de destinatarios en el proyecto -- se crea nueva,
-- restringida a director/utp/superadmin en lectura y escritura (a
-- diferencia de otros módulos de contenido, esta lista es explícitamente
-- privada incluso para el resto del personal, y nunca se expone a `anon`).
-- =============================================================================

create table public.bulletin_recipients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null unique,
  group_name text not null default 'general' check (group_name in ('general', 'direccion_copia')),
  active boolean not null default true,
  is_primary boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_bulletin_recipients_updated_at before update on public.bulletin_recipients
  for each row execute function public.set_updated_at();

alter table public.bulletin_recipients enable row level security;

-- Sin política ni grant para `anon` -- la lista nunca es visible públicamente.
-- Sin política de "select para todo el personal" -- solo director/utp/superadmin
-- pueden ver o administrar esta lista, ni siquiera el resto del personal.
create policy "bulletin_recipients_admin_all" on public.bulletin_recipients
  for all to authenticated using (public.has_any_role(array['director', 'utp', 'superadmin']))
  with check (public.has_any_role(array['director', 'utp', 'superadmin']));

grant select, insert, update, delete on public.bulletin_recipients to authenticated;

-- ---------------------------------------------------------------------------
-- Programación de envío -- columnas nuevas en weekly_bulletins. La RLS de
-- escritura ya existente (weekly_bulletins_write_admin) cubre estas columnas
-- sin cambios, porque RLS en Postgres es por fila, no por columna.
-- ---------------------------------------------------------------------------
alter table public.weekly_bulletins
  add column email_scheduled_at timestamptz,
  add column email_sent_at timestamptz;

-- ---------------------------------------------------------------------------
-- Registro de envío por destinatario -- garantiza que un mismo correo nunca
-- reciba dos veces el mismo informativo (restricción unique), incluso si el
-- cron se ejecuta dos veces por solape o reintento. Solo el cron (con
-- SUPABASE_SERVICE_ROLE_KEY, que omite RLS) escribe aquí; el personal
-- autenticado solo puede leerlo, para ver el resultado del envío -- nunca
-- puede insertar/editar un registro de envío desde el navegador.
-- ---------------------------------------------------------------------------
create table public.bulletin_email_log (
  id uuid primary key default gen_random_uuid(),
  bulletin_id uuid not null references public.weekly_bulletins(id) on delete cascade,
  recipient_email text not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (bulletin_id, recipient_email)
);
create index idx_bulletin_email_log_bulletin on public.bulletin_email_log (bulletin_id);

alter table public.bulletin_email_log enable row level security;

create policy "bulletin_email_log_select_admin" on public.bulletin_email_log
  for select to authenticated using (public.has_any_role(array['director', 'utp', 'superadmin']));

grant select on public.bulletin_email_log to authenticated;

-- ---------------------------------------------------------------------------
-- Carga inicial de destinatarios (30 personas: 26 generales + 4 de
-- Dirección/Copia). Caso Lucero Rivera: se detectó que
-- "lriveraor@educasanantonio.cl" y "lucero.sweet@hotmail.com" probablemente
-- son la misma persona -- se guardan ambos correos, el institucional como
-- principal (is_primary = true) y el personal como alternativo
-- (is_primary = false) para que los envíos masivos usen solo el principal
-- sin eliminar ninguno de los dos.
-- ---------------------------------------------------------------------------
insert into public.bulletin_recipients (full_name, email, group_name, is_primary) values
  ('Evelyn Ivonne Carrasco Oyanedel', 'ecarrascoo@educasanantonio.cl', 'general', true),
  ('Fernanda Camilla Pereira', 'fecamillape@educasanantonio.cl', 'general', true),
  ('Leyla Del Alba Flores Jorquera', 'lfloresj@educasanantonio.cl', 'general', true),
  ('Claudia Hernandez Henriquez', 'chernandezh@educasanantonio.cl', 'general', true),
  ('Maria Cienfuego Marin', 'macienfuegom@educasanantonio.cl', 'general', true),
  ('Angelina Santelice Carreno', 'asantelicec@educasanantonio.cl', 'general', true),
  ('Pamela Alejandra Urtubia Echeverria', 'purtubiae@educasanantonio.cl', 'general', true),
  ('Andres Moya Alvarez', 'amoyaa@educasanantonio.cl', 'general', true),
  ('Daniela Vera Menares', 'dveram@educasanantonio.cl', 'general', true),
  ('Elena Andrea Vidal Quiroz', 'evidalq@educasanantonio.cl', 'general', true),
  ('Claudio Andres Bazan Espinoza', 'cbazane@educasanantonio.cl', 'general', true),
  ('Andrea Bustos Carreno', 'abustosc@educasanantonio.cl', 'general', true),
  ('Carolina Florencia Gomez Duran', 'cgomezd@educasanantonio.cl', 'general', true),
  ('Maria Ortiz Martinez', 'mortizm@educasanantonio.cl', 'general', true),
  ('Jennifer Campos Fuentes', 'jecamposf@educasanantonio.cl', 'general', true),
  ('Cristian Antonio Saavedra Berrueta', 'csaavedrab@educasanantonio.cl', 'general', true),
  ('Sebastian Antonio Vergara Moraga', 'severgaram@educasanantonio.cl', 'general', true),
  ('Marcela Natali Hernandez Donoso', 'mhernandezd@educasanantonio.cl', 'general', true),
  ('Claudia Marcela Galarce Bustos', 'cgalarceb@educasanantonio.cl', 'general', true),
  ('Yesika Morales Lizama', 'yemoralesli@educasanantonio.cl', 'general', true),
  ('Adhara Christine Jimenez Machuca', 'adjimenezm@educasanantonio.cl', 'general', true),
  ('Elizabeth Johana Alvarez Silva', 'elalvarezs@educasanantonio.cl', 'general', true),
  ('Maribel Olivos', 'maribel.olivos2019@umce.cl', 'general', true),
  ('Carmen Paulina Miranda Valdes', 'camirandav@educasanantonio.cl', 'general', true),
  ('Lucero Rivera Ortega', 'lriveraor@educasanantonio.cl', 'general', true),
  ('Lucero Rivera', 'lucero.sweet@hotmail.com', 'general', false),
  ('Carolina Saavedra Rojas', 'casaavedraro@educasanantonio.cl', 'direccion_copia', true),
  ('Elizabeth Acevedo Silva', 'eacevedos@educasanantonio.cl', 'direccion_copia', true),
  ('Carmen Gloria Acuna Tobar', 'cacunat@educasanantonio.cl', 'direccion_copia', true),
  ('Claudia Andrea Espinoza Lopez', 'cespinozal@educasanantonio.cl', 'direccion_copia', true);
