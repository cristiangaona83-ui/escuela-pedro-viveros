-- Administración desde la Plataforma de: Equipo Directivo, Equipo PIE, Cursos
-- (docente de jefatura + asistente de aula + docentes de asignatura) y
-- Asistentes de la Educación.
--
-- Regla de arquitectura: UNA PERSONA = UN REGISTRO EN staff_members = UNA
-- FOTOGRAFÍA. Ninguna persona se duplica aunque aparezca en varias
-- secciones públicas -- el cargo/orden/visibilidad de cada aparición vive
-- en una tabla de "membresía" aparte, referenciando siempre el mismo
-- staff_member_id:
--   - Directivo / PIE / Asistentes de la Educación -> staff_section_memberships
--     (una fila por persona y sección; una persona puede tener una fila en
--     'directivo' y otra en 'pie' sin duplicar su registro base ni su foto).
--   - Cursos (jefe / asistente de aula / docente de asignatura) ->
--     course_team_members / subject_teachers, que ya referenciaban
--     staff_member_id desde el diseño anterior de esta misma migración.
-- Al cambiar photo_url en staff_members (Plataforma -> Equipo institucional)
-- el cambio se refleja automáticamente en TODAS las secciones donde esa
-- persona aparece, porque todas leen el mismo registro.
--
-- Caso real detectado en los datos actuales: Carmen Gloria Acuña Tobar
-- aparece hoy en directive-team.ts (Equipo Directivo) y en pie-team.ts
-- (Equipo PIE) con el mismo cargo "Coordinadora PIE". Queda sembrada como
-- UN solo registro en staff_members con DOS filas en
-- staff_section_memberships (una por sección). Se revisó el resto de
-- directive-team.ts / pie-team.ts / course-team.ts / support-staff.ts
-- cruzando los 32 nombres completos entre sí: no hay ningún otro caso de la
-- misma persona repetida entre secciones.
--
-- No tabla académica: public.courses (matrícula/academic_years) no se toca
-- -- sigue fuera de alcance. course_teams/course_team_members/
-- subject_teachers son tablas nuevas, chicas y desacopladas del sistema
-- académico, igual que ya lo era course-team.ts en el sitio estático.
--
-- No destructiva sobre datos reales: staff_members existe desde
-- 0001_schema.sql pero ningún flujo en producción llega a insertar filas
-- ahí todavía (getStaffByArea/getPublicCourses existen pero no se llaman
-- desde ninguna página pública) -- por eso es seguro reemplazar sus
-- columnas de "sección" (area/role_title/order_index/active, que asumían
-- una persona = una sola aparición) por el modelo de membresías, sin
-- perder ninguna fila real.
--
-- photo_url sigue siendo el único campo de fotografía por persona
-- (prioridad Supabase Storage -> foto local actual -> iniciales, resuelta
-- en la app según si el valor es una URL http(s) o una ruta local
-- /images/...): se deja sembrado con la ruta local actual para no perder
-- ninguna foto ya publicada mientras se sube el reemplazo a Storage.

-- ---------------------------------------------------------------------------
-- 1) staff_members pasa a ser el registro CENTRAL de persona. Se quitan las
--    columnas que asumían una sola aparición pública (area/role_title/
--    order_index/active) -- ahora viven en staff_section_memberships /
--    course_team_members / subject_teachers. Se agrega initials (iniciales
--    del avatar, ya no depende de cálculo automático).
-- ---------------------------------------------------------------------------
drop policy if exists "staff_select_public_active" on public.staff_members;
drop policy if exists "staff_write_admin" on public.staff_members;

alter table public.staff_members drop column if exists role_title;
alter table public.staff_members drop column if exists area;
alter table public.staff_members drop column if exists order_index;
alter table public.staff_members drop column if exists active;
alter table public.staff_members add column if not exists initials text;

comment on table public.staff_members is
  'Registro central de personas del equipo institucional. Una persona = una fila = una fotografía (photo_url). Dónde y con qué cargo aparece cada persona en el sitio público vive en staff_section_memberships (Directivo/PIE/Asistentes) y en course_team_members/subject_teachers (Cursos) -- nunca se duplica esta fila por aparecer en más de una sección.';
comment on column public.staff_members.initials is
  'Iniciales explícitas para el avatar cuando no hay foto (override del cálculo automático nombre+apellido).';

-- Directorio de personas: sin datos sensibles (nombre/foto/bio), lectura
-- abierta. La visibilidad pública real de CADA aparición la controla la
-- tabla de membresía/curso correspondiente (active = true ahí).
create policy "staff_members_select_all" on public.staff_members
  for select to anon, authenticated using (true);
create policy "staff_members_write_admin" on public.staff_members
  for all to authenticated using (public.has_any_role(array['director','utp','superadmin']))
  with check (public.has_any_role(array['director','utp','superadmin']));

-- ---------------------------------------------------------------------------
-- 2) staff_section_memberships: aparición de una persona en Equipo
--    Directivo / Equipo PIE / Asistentes de la Educación. Una persona puede
--    tener como máximo una fila por sección (unique), pero puede tener
--    filas en varias secciones a la vez sin duplicar staff_members.
-- ---------------------------------------------------------------------------
create table public.staff_section_memberships (
  id uuid primary key default gen_random_uuid(),
  staff_member_id uuid not null references public.staff_members(id) on delete cascade,
  section text not null check (section in ('directivo','pie','asistente')),
  role_title text not null,
  category text,
  order_index int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (staff_member_id, section)
);

comment on column public.staff_section_memberships.category is
  'Solo aplica cuando section=''asistente'': salud_bienestar | auxiliares_servicios | apoyo_educativo | apoyo_administrativo.';

create index idx_staff_section_memberships_section on public.staff_section_memberships(section, order_index);

alter table public.staff_section_memberships enable row level security;

create policy "staff_section_memberships_select_public_active" on public.staff_section_memberships
  for select to anon using (active = true);
create policy "staff_section_memberships_select_all_staff" on public.staff_section_memberships
  for select to authenticated using (true);
create policy "staff_section_memberships_write_admin" on public.staff_section_memberships
  for all to authenticated using (public.has_any_role(array['director','utp','superadmin']))
  with check (public.has_any_role(array['director','utp','superadmin']));

grant select on public.staff_section_memberships to anon;
grant select, insert, update, delete on public.staff_section_memberships to authenticated;

-- ---------------------------------------------------------------------------
-- 3) Cursos: course_teams (el "curso" mostrado en la página pública) +
--    course_team_members (jefe/asistente de aula -- referencia
--    staff_member_id, con su cargo propio de ese rol) + subject_teachers
--    (docentes de asignatura, lista global, también por staff_member_id).
-- ---------------------------------------------------------------------------
create table public.course_teams (
  id uuid primary key default gen_random_uuid(),
  course_name text not null,
  order_index int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.course_team_members (
  id uuid primary key default gen_random_uuid(),
  course_team_id uuid not null references public.course_teams(id) on delete cascade,
  staff_member_id uuid not null references public.staff_members(id) on delete cascade,
  role text not null check (role in ('jefe','asistente')),
  role_title text not null,
  order_index int not null default 0,
  created_at timestamptz not null default now(),
  unique (course_team_id, role)
);

create table public.subject_teachers (
  id uuid primary key default gen_random_uuid(),
  staff_member_id uuid not null references public.staff_members(id) on delete cascade,
  role_title text not null,
  order_index int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_course_team_members_course on public.course_team_members(course_team_id);
create index idx_course_team_members_staff on public.course_team_members(staff_member_id);
create index idx_subject_teachers_active on public.subject_teachers(active);

alter table public.course_teams enable row level security;
alter table public.course_team_members enable row level security;
alter table public.subject_teachers enable row level security;

create policy "course_teams_select_public_active" on public.course_teams
  for select to anon, authenticated using (active = true);
create policy "course_teams_write_admin" on public.course_teams
  for all to authenticated using (public.has_any_role(array['director','utp','superadmin']))
  with check (public.has_any_role(array['director','utp','superadmin']));

-- Sin columna "active" propia: la visibilidad pública real la filtra la app
-- uniendo con course_teams.active (igual patrón que getPublicCourses() ya
-- usa hoy). No expone datos sensibles (solo ids + rol + cargo).
create policy "course_team_members_select_all" on public.course_team_members
  for select to anon, authenticated using (true);
create policy "course_team_members_write_admin" on public.course_team_members
  for all to authenticated using (public.has_any_role(array['director','utp','superadmin']))
  with check (public.has_any_role(array['director','utp','superadmin']));

create policy "subject_teachers_select_public_active" on public.subject_teachers
  for select to anon, authenticated using (active = true);
create policy "subject_teachers_write_admin" on public.subject_teachers
  for all to authenticated using (public.has_any_role(array['director','utp','superadmin']))
  with check (public.has_any_role(array['director','utp','superadmin']));

grant select on public.course_teams to anon;
grant select on public.course_team_members to anon;
grant select on public.subject_teachers to anon;
grant select, insert, update, delete on public.course_teams to authenticated;
grant select, insert, update, delete on public.course_team_members to authenticated;
grant select, insert, update, delete on public.subject_teachers to authenticated;

-- ---------------------------------------------------------------------------
-- 4) Storage: carpeta nueva archivos-publicos/equipo (fotos institucionales),
--    mismos roles de escritura que staff_members_write_admin. Mismo patrón
--    que 0010_archivos_publicos_folder_scope.sql. La lectura ya es pública
--    para todo el bucket (archivos_publicos_select_all, 0005), no se toca.
-- ---------------------------------------------------------------------------
create policy "archivos_publicos_insert_equipo"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'archivos-publicos'
  and (storage.foldername(name))[1] = 'equipo'
  and public.has_any_role(array['director', 'utp', 'superadmin'])
);

create policy "archivos_publicos_update_equipo"
on storage.objects for update
to authenticated
using (
  bucket_id = 'archivos-publicos'
  and (storage.foldername(name))[1] = 'equipo'
  and public.has_any_role(array['director', 'utp', 'superadmin'])
)
with check (
  bucket_id = 'archivos-publicos'
  and (storage.foldername(name))[1] = 'equipo'
  and public.has_any_role(array['director', 'utp', 'superadmin'])
);

create policy "archivos_publicos_delete_equipo"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'archivos-publicos'
  and (storage.foldername(name))[1] = 'equipo'
  and public.has_any_role(array['director', 'utp', 'superadmin'])
);

-- ---------------------------------------------------------------------------
-- 5) Siembra: copia exacta del contenido hoy hardcodeado en
--    src/config/directive-team.ts, pie-team.ts, course-team.ts y
--    support-staff.ts, para que nada desaparezca del sitio público al
--    activar la administración desde la Plataforma. photo_url = ruta local
--    actual (sigue funcionando vía lib/staff-photo.ts::photoExists hasta
--    que se reemplace por una foto subida a Storage). Cada persona se
--    inserta en staff_members UNA sola vez.
-- ---------------------------------------------------------------------------

-- Carmen Gloria Acuña Tobar: única persona repetida entre secciones -> un
-- solo registro de persona, dos membresías (Directivo y PIE).
with p as (
  insert into public.staff_members (full_name, photo_url) values
    ('Carmen Gloria Acuña Tobar', '/images/staff/carmen-acuna.jpg')
  returning id
)
insert into public.staff_section_memberships (staff_member_id, section, role_title, order_index)
select id, 'directivo', 'Coordinadora PIE', 4 from p
union all
select id, 'pie', 'Coordinadora PIE', 0 from p;

-- Equipo Directivo -- resto (orden 0..3, Carmen Acuña ya sembrada arriba con orden 4)
with p as (
  insert into public.staff_members (full_name, photo_url) values ('Cristian Fernando Gaona Villena', '/images/staff/cristian-gaona.png') returning id
)
insert into public.staff_section_memberships (staff_member_id, section, role_title, order_index)
select id, 'directivo', 'Director', 0 from p;

with p as (
  insert into public.staff_members (full_name, photo_url) values ('Carolina del Carmen Saavedra Rojas', '/images/staff/carolina-saavedra.jpg') returning id
)
insert into public.staff_section_memberships (staff_member_id, section, role_title, order_index)
select id, 'directivo', 'Jefa de UTP', 1 from p;

with p as (
  insert into public.staff_members (full_name, photo_url) values ('Elizabeth del Pilar Acevedo Silva', '/images/staff/elizabeth-acevedo.jpg') returning id
)
insert into public.staff_section_memberships (staff_member_id, section, role_title, order_index)
select id, 'directivo', 'Inspectora General', 2 from p;

with p as (
  insert into public.staff_members (full_name, photo_url) values ('Claudia Andrea Espinoza López', '/images/staff/claudia-espinoza.jpg') returning id
)
insert into public.staff_section_memberships (staff_member_id, section, role_title, order_index)
select id, 'directivo', 'Coordinadora de Convivencia Educativa', 3 from p;

-- Equipo PIE -- resto (orden 1..7, Carmen Acuña ya sembrada arriba con orden 0)
with p as (
  insert into public.staff_members (full_name, photo_url) values ('Katherine Soledad Carrión Henríquez', '/images/staff/katherine-carrion.jpg') returning id
)
insert into public.staff_section_memberships (staff_member_id, section, role_title, order_index)
select id, 'pie', 'Psicopedagoga', 1 from p;

with p as (
  insert into public.staff_members (full_name, photo_url) values ('Marcela Natali Hernández Donoso', '/images/staff/marcela-hernandez.jpg') returning id
)
insert into public.staff_section_memberships (staff_member_id, section, role_title, order_index)
select id, 'pie', 'Psicopedagoga', 2 from p;

with p as (
  insert into public.staff_members (full_name, photo_url) values ('Yesika Krupskaia Morales Lizama', '/images/staff/yesika-morales.jpg') returning id
)
insert into public.staff_section_memberships (staff_member_id, section, role_title, order_index)
select id, 'pie', 'Educadora Diferencial', 3 from p;

with p as (
  insert into public.staff_members (full_name, photo_url) values ('Elizabeth Johana Álvarez Silva', '/images/staff/elizabeth-alvarez.jpg') returning id
)
insert into public.staff_section_memberships (staff_member_id, section, role_title, order_index)
select id, 'pie', 'Educadora Diferencial', 4 from p;

with p as (
  insert into public.staff_members (full_name, photo_url) values ('Cristian Antonio Saavedra Berrueta', '/images/staff/cristian-saavedra.jpg') returning id
)
insert into public.staff_section_memberships (staff_member_id, section, role_title, order_index)
select id, 'pie', 'Psicólogo', 5 from p;

with p as (
  insert into public.staff_members (full_name, photo_url) values ('Daniela Lilliana Vera Menares', '/images/staff/daniela-vera.jpg') returning id
)
insert into public.staff_section_memberships (staff_member_id, section, role_title, order_index)
select id, 'pie', 'Fonoaudióloga', 6 from p;

with p as (
  insert into public.staff_members (full_name, photo_url) values ('Adhara Christine Jiménez Machuca', '/images/staff/adhara-jimenez.jpg') returning id
)
insert into public.staff_section_memberships (staff_member_id, section, role_title, order_index)
select id, 'pie', 'Técnico en Educación Especial', 7 from p;

-- Asistentes de la Educación -- "apoyo_educativo" y "apoyo_administrativo"
-- quedan sin filas: hoy no tienen integrantes confirmados (igual que
-- STATIC_STAFF en support-staff.ts).
with p as (
  insert into public.staff_members (full_name, photo_url, initials) values ('Andrea Lorena Bustos Carreño', '/images/staff/andrea-bustos.jpg', 'AB') returning id
)
insert into public.staff_section_memberships (staff_member_id, section, role_title, category, order_index)
select id, 'asistente', 'Técnico en Enfermería de Nivel Superior (TENS)', 'salud_bienestar', 0 from p;

with p as (
  insert into public.staff_members (full_name, photo_url, initials) values ('Claudio Andrés Bazán Espinoza', '/images/staff/claudio-bazan.jpg', 'CB') returning id
)
insert into public.staff_section_memberships (staff_member_id, section, role_title, category, order_index)
select id, 'asistente', 'Auxiliar de Servicios', 'auxiliares_servicios', 1 from p;

with p as (
  insert into public.staff_members (full_name, photo_url, initials) values ('Elena Andrea Vidal Quiroz', '/images/staff/elena-vidal.jpg', 'EV') returning id
)
insert into public.staff_section_memberships (staff_member_id, section, role_title, category, order_index)
select id, 'asistente', 'Auxiliar de Servicios', 'auxiliares_servicios', 2 from p;

-- Cursos: 10 cursos, cada uno con docente de jefatura y, en 4 casos,
-- asistente de aula. Ninguna de estas 14 personas se repite en Directivo,
-- PIE o Asistentes (se revisó cruzando los 32 nombres completos).
with ct as (
  insert into public.course_teams (course_name, order_index) values ('Prekínder', 0) returning id
), jefe as (
  insert into public.staff_members (full_name, photo_url) values ('Claudia Marcela Galarce Bustos', '/images/staff/claudia-galarce.jpg') returning id
), asist as (
  insert into public.staff_members (full_name, photo_url) values ('María Patricia Ortiz Martínez', '/images/staff/maria-ortiz.jpg') returning id
)
insert into public.course_team_members (course_team_id, staff_member_id, role, role_title, order_index)
select ct.id, jefe.id, 'jefe', 'Educadora de Párvulos', 0 from ct, jefe
union all
select ct.id, asist.id, 'asistente', 'Asistente de Aula', 0 from ct, asist;

with ct as (
  insert into public.course_teams (course_name, order_index) values ('Kínder', 1) returning id
), jefe as (
  insert into public.staff_members (full_name, photo_url) values ('Lucero del Carmen Rivera Ortega', '/images/staff/lucero-rivera.jpg') returning id
), asist as (
  insert into public.staff_members (full_name, photo_url) values ('Fernanda Camilla Pereira', '/images/staff/fernanda-pereira.jpg') returning id
)
insert into public.course_team_members (course_team_id, staff_member_id, role, role_title, order_index)
select ct.id, jefe.id, 'jefe', 'Educadora de Párvulos', 0 from ct, jefe
union all
select ct.id, asist.id, 'asistente', 'Asistente de Aula', 0 from ct, asist;

with ct as (
  insert into public.course_teams (course_name, order_index) values ('1° Básico', 2) returning id
), jefe as (
  insert into public.staff_members (full_name, photo_url) values ('Leyla del Alba Flores Jorquera', '/images/staff/leyla-flores.jpg') returning id
), asist as (
  insert into public.staff_members (full_name, photo_url) values ('Jennifer Campos Fuentes', '/images/staff/jennifer-campos.jpg') returning id
)
insert into public.course_team_members (course_team_id, staff_member_id, role, role_title, order_index)
select ct.id, jefe.id, 'jefe', 'Profesora Jefe', 0 from ct, jefe
union all
select ct.id, asist.id, 'asistente', 'Asistente de Aula', 0 from ct, asist;

with ct as (
  insert into public.course_teams (course_name, order_index) values ('2° Básico', 3) returning id
), jefe as (
  insert into public.staff_members (full_name, photo_url) values ('Carmen Paulina Miranda Valdés', '/images/staff/carmen-miranda.jpg') returning id
), asist as (
  insert into public.staff_members (full_name, photo_url) values ('Carolina Gómez Durán', '/images/staff/carolina-gomez.jpg') returning id
)
insert into public.course_team_members (course_team_id, staff_member_id, role, role_title, order_index)
select ct.id, jefe.id, 'jefe', 'Profesora Jefe', 0 from ct, jefe
union all
select ct.id, asist.id, 'asistente', 'Asistente de Aula', 0 from ct, asist;

with ct as (
  insert into public.course_teams (course_name, order_index) values ('3° Básico', 4) returning id
), jefe as (
  insert into public.staff_members (full_name, photo_url) values ('María Soledad Cienfuegos Marín', '/images/staff/maria-cienfuegos.jpg') returning id
)
insert into public.course_team_members (course_team_id, staff_member_id, role, role_title, order_index)
select ct.id, jefe.id, 'jefe', 'Profesora Jefe', 0 from ct, jefe;

with ct as (
  insert into public.course_teams (course_name, order_index) values ('4° Básico', 5) returning id
), jefe as (
  insert into public.staff_members (full_name, photo_url) values ('Claudia Hernández Henríquez', '/images/staff/claudia-hernandez.jpg') returning id
)
insert into public.course_team_members (course_team_id, staff_member_id, role, role_title, order_index)
select ct.id, jefe.id, 'jefe', 'Profesora Jefe', 0 from ct, jefe;

with ct as (
  insert into public.course_teams (course_name, order_index) values ('5° Básico', 6) returning id
), jefe as (
  insert into public.staff_members (full_name, photo_url) values ('Maribel Consuelo Olivos Plaza', '/images/staff/maribel-olivos.jpg') returning id
)
insert into public.course_team_members (course_team_id, staff_member_id, role, role_title, order_index)
select ct.id, jefe.id, 'jefe', 'Profesora Jefe', 0 from ct, jefe;

with ct as (
  insert into public.course_teams (course_name, order_index) values ('6° Básico', 7) returning id
), jefe as (
  insert into public.staff_members (full_name, photo_url) values ('Pamela Alejandra Urtubia Echeverría', '/images/staff/pamela-urtubia.jpg') returning id
)
insert into public.course_team_members (course_team_id, staff_member_id, role, role_title, order_index)
select ct.id, jefe.id, 'jefe', 'Profesora Jefe', 0 from ct, jefe;

with ct as (
  insert into public.course_teams (course_name, order_index) values ('7° Básico', 8) returning id
), jefe as (
  insert into public.staff_members (full_name, photo_url) values ('Evelyn Ivonne Carrasco Oyanedel', '/images/staff/evelyn-carrasco.jpg') returning id
)
insert into public.course_team_members (course_team_id, staff_member_id, role, role_title, order_index)
select ct.id, jefe.id, 'jefe', 'Profesora Jefe', 0 from ct, jefe;

with ct as (
  insert into public.course_teams (course_name, order_index) values ('8° Básico', 9) returning id
), jefe as (
  insert into public.staff_members (full_name, photo_url) values ('Sebastián Antonio Vergara Moraga', '/images/staff/sebastian-vergara.jpg') returning id
)
insert into public.course_team_members (course_team_id, staff_member_id, role, role_title, order_index)
select ct.id, jefe.id, 'jefe', 'Profesor Jefe', 0 from ct, jefe;

-- Docentes de Asignatura (lista global, no atada a un curso)
with st as (
  insert into public.staff_members (full_name, photo_url, initials) values ('Andrés Eduardo Moya Álvarez', '/images/staff/andres-moya.jpg', 'AM') returning id
)
insert into public.subject_teachers (staff_member_id, role_title, order_index)
select id, 'Profesor de Educación Física', 0 from st;

with st as (
  insert into public.staff_members (full_name, photo_url, initials) values ('Angelina Ester Santelice Carreño', '/images/staff/angelina-santelice.jpg', 'AS') returning id
)
insert into public.subject_teachers (staff_member_id, role_title, order_index)
select id, 'Docente de Asignatura', 1 from st;
