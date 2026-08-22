-- =============================================================================
-- Escuela Profesor Pedro Viveros Ormeño — Esquema inicial
-- Ejecutar en orden: 0001_schema.sql -> 0002_rls.sql -> (opcional) seed/demo.sql
-- =============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Utilidad: updated_at automático
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Perfiles (1:1 con auth.users) y roles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  avatar_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code in
    ('director','utp','docente','pie','convivencia','administrativo','superadmin')),
  name text not null
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, role_id)
);

-- Función helper: roles del usuario autenticado actual
create or replace function public.current_user_roles()
returns setof text
language sql stable security definer set search_path = public as $$
  select r.code from public.user_roles ur
  join public.roles r on r.id = ur.role_id
  where ur.user_id = auth.uid();
$$;

create or replace function public.has_role(role_code text)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid() and r.code = role_code
  );
$$;

create or replace function public.has_any_role(role_codes text[])
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid() and r.code = any(role_codes)
  );
$$;

-- Roles con visión de gestión académica amplia (lectura global)
create or replace function public.is_academic_management()
returns boolean language sql stable as $$
  select public.has_any_role(array['director','utp','superadmin']);
$$;

-- ---------------------------------------------------------------------------
-- Años académicos, cursos, asignaturas, asignaciones docentes
-- ---------------------------------------------------------------------------
create table public.academic_years (
  id uuid primary key default gen_random_uuid(),
  year int not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  level text not null,           -- ej: "5° Básico", "Prekínder"
  letter text not null default '',
  homeroom_teacher_id uuid references public.profiles(id) on delete set null,
  description text,
  photo_url text,
  public_visible boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (academic_year_id, level, letter)
);

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  active boolean not null default true
);

create table public.teacher_assignments (
  id uuid primary key default gen_random_uuid(),
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (course_id, subject_id, teacher_id)
);

-- ---------------------------------------------------------------------------
-- Apoderados, estudiantes, matrículas
-- ---------------------------------------------------------------------------
create table public.guardians (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  run text,
  phone text,
  email text,
  relationship text,
  created_at timestamptz not null default now()
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  first_names text not null,
  last_names text not null,
  run text not null unique,
  birth_date date,
  guardian_id uuid references public.guardians(id) on delete set null,
  status text not null default 'matriculado'
    check (status in ('matriculado','retirado','egresado')),
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_students_updated_at before update on public.students
  for each row execute function public.set_updated_at();

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  status text not null default 'activa' check (status in ('activa','retirada','trasladada')),
  enrolled_at date not null default current_date,
  created_at timestamptz not null default now(),
  unique (student_id, academic_year_id)
);

-- ---------------------------------------------------------------------------
-- Períodos académicos, evaluaciones, calificaciones
-- ---------------------------------------------------------------------------
create table public.academic_periods (
  id uuid primary key default gen_random_uuid(),
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  name text not null,
  order_index int not null default 1,
  status text not null default 'abierto' check (status in ('abierto','cerrado')),
  start_date date,
  end_date date,
  closed_at timestamptz,
  closed_by uuid references public.profiles(id) on delete set null,
  unique (academic_year_id, order_index)
);

create table public.evaluations (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  period_id uuid not null references public.academic_periods(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete set null,
  name text not null,
  eval_type text not null default 'sumativa',
  weight numeric(5,2) not null default 1,
  eval_date date,
  description text,
  status text not null default 'planificada'
    check (status in ('planificada','aplicada','cerrada')),
  created_at timestamptz not null default now()
);

create table public.grades (
  id uuid primary key default gen_random_uuid(),
  evaluation_id uuid not null references public.evaluations(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  score numeric(3,1),
  observation text,
  entered_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (evaluation_id, student_id)
);
create trigger trg_grades_updated_at before update on public.grades
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Asistencia
-- ---------------------------------------------------------------------------
create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  date date not null,
  status text not null check (status in ('presente','ausente','atraso','retiro')),
  observation text,
  recorded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (student_id, date)
);

-- ---------------------------------------------------------------------------
-- Objetivos de aprendizaje y planificaciones
-- ---------------------------------------------------------------------------
create table public.learning_objectives (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  level text not null,
  code text not null,
  description text not null,
  active boolean not null default true,
  unique (subject_id, level, code)
);

create table public.lesson_plans (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  unit text not null,
  objective text,
  activities text,
  evaluation_desc text,
  resources text,
  plan_date date,
  status text not null default 'borrador'
    check (status in ('borrador','enviada','revisada','aprobada','observada')),
  reviewer_id uuid references public.profiles(id) on delete set null,
  reviewer_comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_lesson_plans_updated_at before update on public.lesson_plans
  for each row execute function public.set_updated_at();

create table public.lesson_plan_objectives (
  lesson_plan_id uuid not null references public.lesson_plans(id) on delete cascade,
  learning_objective_id uuid not null references public.learning_objectives(id) on delete cascade,
  primary key (lesson_plan_id, learning_objective_id)
);

-- ---------------------------------------------------------------------------
-- Seguimiento pedagógico, PIE, acompañamiento docente
-- ---------------------------------------------------------------------------
create table public.student_support (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  difficulty text,
  strength text,
  action text,
  responsible_id uuid references public.profiles(id) on delete set null,
  status text not null default 'en_seguimiento'
    check (status in ('en_seguimiento','resuelto','derivado')),
  follow_up text,
  event_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table public.pie_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  coordinator_id uuid references public.profiles(id) on delete set null,
  professional_id uuid references public.profiles(id) on delete set null,
  support_type text,
  diagnosis text,
  actions text,
  status text not null default 'activo' check (status in ('activo','egresado','en_evaluacion')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_pie_records_updated_at before update on public.pie_records
  for each row execute function public.set_updated_at();

create table public.classroom_observations (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  observer_id uuid not null references public.profiles(id) on delete set null,
  course_id uuid not null references public.courses(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  obs_date date not null default current_date,
  focus text,
  strengths text,
  opportunities text,
  agreements text,
  follow_up text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Certificados y folios
-- ---------------------------------------------------------------------------
create table public.certificate_sequences (
  cert_type text not null,
  year int not null,
  last_number int not null default 0,
  primary key (cert_type, year)
);

create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  folio text not null unique,
  cert_type text not null
    check (cert_type in ('alumno_regular','informe_semestral','informe_anual','cierre_anio')),
  student_id uuid not null references public.students(id) on delete restrict,
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  issued_by uuid references public.profiles(id) on delete set null,
  issued_at timestamptz not null default now(),
  status text not null default 'vigente' check (status in ('vigente','anulado')),
  verification_code text not null unique default replace(gen_random_uuid()::text, '-', ''),
  payload jsonb not null default '{}'::jsonb
);

create or replace function public.next_certificate_folio(p_cert_type text, p_year int)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_number int;
  v_prefix text := 'PVO';
begin
  insert into public.certificate_sequences (cert_type, year, last_number)
  values (p_cert_type, p_year, 1)
  on conflict (cert_type, year)
  do update set last_number = public.certificate_sequences.last_number + 1
  returning last_number into v_number;

  return v_prefix || '-' || p_year::text || '-' || lpad(v_number::text, 6, '0');
end;
$$;

-- ---------------------------------------------------------------------------
-- Contenido público: noticias, galería, documentos, eventos, equipo
-- ---------------------------------------------------------------------------
create table public.staff_members (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  full_name text not null,
  role_title text not null,
  area text not null check (area in ('directivo','pie','docente','convivencia','administrativo')),
  photo_url text,
  bio text,
  order_index int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.news (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  category text not null default 'General',
  summary text not null,
  content text not null,
  cover_image_url text,
  gallery_urls text[] not null default '{}',
  published boolean not null default false,
  published_at timestamptz,
  author_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_news_updated_at before update on public.news
  for each row execute function public.set_updated_at();

create table public.gallery (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null,
  image_url text not null,
  event_date date,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null,
  year int,
  description text,
  file_url text not null,
  is_public boolean not null default true,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  event_type text not null default 'general',
  start_at timestamptz not null,
  end_at timestamptz,
  course_id uuid references public.courses(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text,
  subject text,
  message text not null,
  handled boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Configuración institucional (clave/valor) y auditoría
-- ---------------------------------------------------------------------------
create table public.school_config (
  key text primary key,
  value jsonb not null,
  is_public boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);
create trigger trg_school_config_updated_at before update on public.school_config
  for each row execute function public.set_updated_at();

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  module text not null,
  entity text,
  entity_id text,
  details jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Índices
-- ---------------------------------------------------------------------------
create index idx_students_run on public.students (run);
create index idx_enrollments_course on public.enrollments (course_id, academic_year_id);
create index idx_grades_student on public.grades (student_id);
create index idx_evaluations_course_subject_period on public.evaluations (course_id, subject_id, period_id);
create index idx_attendance_course_date on public.attendance (course_id, date);
create index idx_news_published on public.news (published, published_at desc);
create index idx_gallery_category on public.gallery (category);
create index idx_documents_category_year on public.documents (category, year desc);
create index idx_audit_logs_created on public.audit_logs (created_at desc);
create index idx_certificates_student on public.certificates (student_id);
create index idx_teacher_assignments_teacher on public.teacher_assignments (teacher_id);

-- ---------------------------------------------------------------------------
-- Datos base (roles y asignaturas comunes, no institucionales)
-- ---------------------------------------------------------------------------
insert into public.roles (code, name) values
  ('director', 'Director'),
  ('utp', 'Jefatura UTP'),
  ('docente', 'Docente'),
  ('pie', 'Equipo PIE'),
  ('convivencia', 'Convivencia Escolar'),
  ('administrativo', 'Administrativo'),
  ('superadmin', 'Superadministrador');

insert into public.subjects (code, name) values
  ('LEN', 'Lenguaje y Comunicación'),
  ('MAT', 'Matemática'),
  ('CNAT', 'Ciencias Naturales'),
  ('HIST', 'Historia, Geografía y Ciencias Sociales'),
  ('EDFI', 'Educación Física y Salud'),
  ('ING', 'Inglés'),
  ('ARTV', 'Artes Visuales'),
  ('MUS', 'Música'),
  ('TECN', 'Tecnología'),
  ('ORIENT', 'Orientación');

insert into public.school_config (key, value, is_public) values
  ('institution', jsonb_build_object(
    'name', 'Escuela Profesor Pedro Viveros Ormeño',
    'director', 'Cristian Gaona',
    'address', 'Los Copihues 1033, Tejas Verdes, Llolleo, San Antonio, Región de Valparaíso, Chile'
  ), true),
  ('grading_scale', jsonb_build_object(
    'scaleMin', 1.0, 'scaleMax', 7.0, 'approvalMinimum', 4.0,
    'decimalPlaces', 1, 'roundingRule', 'half_up'
  ), false),
  ('certificate_signature', jsonb_build_object(
    'name', 'Cristian Gaona', 'title', 'Director'
  ), false);
