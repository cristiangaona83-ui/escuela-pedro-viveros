-- =============================================================================
-- Módulo Convivencia Educativa — FASE 1: esquema + RLS + storage.
-- Solo estructura, sin UI (eso es FASE 2). No destructiva: no altera ni
-- borra ninguna tabla existente, solo agrega tablas nuevas con prefijo
-- convivencia_ y una carpeta nueva en el bucket privado archivos-internos.
--
-- Reutiliza (no se duplica nada):
--   - students, courses, academic_years, profiles, guardians -- identidad y
--     matrícula real, igual criterio que Estudiantes/Certificados/Cursos.
--   - documents -- para asociar un protocolo a un documento institucional
--     real ya subido (p. ej. Reglamento Interno), cuando exista esa fila.
--   - has_role()/has_any_role() (0001), set_updated_at() (0001), log_audit()
--     (0002) -- FASE 2 llamará log_audit() desde cada acción, igual patrón
--     que noticias/galería/equipo institucional.
--   - Patrón de folio de certificates/certificate_sequences +
--     next_certificate_folio() (0001) -- se replica exactamente igual para
--     convivencia_case_sequences / next_convivencia_folio().
--   - Patrón de carpeta privada por módulo en archivos-internos (0005) --
--     se agrega la carpeta 'convivencia' con el mismo mecanismo.
--
-- student_support (Seguimiento Pedagógico) y classroom_observations
-- (Acompañamiento al Aula) se revisaron y NO alcanzan para esto: no tienen
-- folio, múltiples estudiantes por registro, línea de tiempo, entrevistas,
-- medidas, derivaciones, protocolos ni adjuntos -- por eso se crean tablas
-- nuevas en vez de forzarlas ahí. No se modifica ninguna de las dos.
--
-- =============================================================================
-- ACCESO POR ROL (revisión 2 -- reemplaza el diseño anterior de este mismo
-- archivo, todavía no ejecutado)
-- =============================================================================
-- Acceso completo (lectura + escritura; nunca DELETE en convivencia_cases,
-- ver punto "no borrado" más abajo): director, superadmin, convivencia.
-- Deliberadamente NO se usa is_academic_management() (incluye 'utp') --
-- el pedido es explícito: sin utp, sin pie, sin docente, sin administrativo,
-- sin anon. Ninguno de esos roles aparece en ninguna política de este
-- archivo; si se necesita acceso docente en el futuro, es una decisión
-- explícita aparte, nunca algo que se herede de este esquema.
--
-- inspectoria_general: acceso OPERACIONAL Y ACOTADO, nunca lectura completa
-- del expediente. Postgres no puede aplicar aquí seguridad a nivel de
-- COLUMNA por rol de aplicación: 'convivencia' e 'inspectoria_general' son
-- el mismo rol de base de datos (authenticated) -- la única forma robusta
-- de ocultarle un campo sensible es sacarlo a otra tabla con su propia
-- política de fila, no confiar en que la UI no lo pida. Por eso:
--   - convivencia_cases.conclusion se saca a convivencia_case_closures,
--     tabla aparte, sin ninguna política para inspectoria_general (ni
--     lectura). Así "ver folio/estudiantes/curso/estado/responsable" y
--     "nunca ver la conclusión/nota de cierre" conviven en la misma fila
--     de forma real, no solo por convención de la UI.
--   - El acceso a un caso (y a todo lo que cuelga de él) para
--     inspectoria_general NUNCA es automático por rol: requiere una
--     ASIGNACIÓN explícita en convivencia_case_assignments, que solo
--     director/convivencia/superadmin pueden crear. "Participación en el
--     registro" (haber creado una situación) da visibilidad de ESA
--     situación puntual sin necesidad de asignación formal al caso.
--   - Dentro de un caso asignado, inspectoria_general puede: registrar
--     situaciones (siempre, incluso sin caso/asignación -- suele ser quien
--     levanta el registro inicial), ver/registrar hechos de la línea de
--     tiempo, ver/registrar entrevistas operativas, ver/registrar
--     comunicaciones con apoderados, y ver/registrar SUS PROPIOS
--     seguimientos asignados (responsible_id = su propio usuario, no los
--     de otros profesionales de convivencia).
--   - Sin acceso alguno (ni lectura) a: convivencia_measures (medidas
--     propias de Convivencia), convivencia_referrals (derivaciones
--     sensibles), convivencia_case_protocols (gestión de protocolos),
--     convivencia_attachments (adjuntos confidenciales),
--     convivencia_preventive_actions/_preventive_action_courses,
--     convivencia_management_plan, y los catálogos convivencia_case_types/
--     convivencia_protocols. Tampoco puede abrir, cerrar ni editar un caso
--     (convivencia_cases insert/update siguen sin inspectoria_general).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0) Folio de caso -- mismo patrón que certificate_sequences / folio.
-- ---------------------------------------------------------------------------
create table public.convivencia_case_sequences (
  year int primary key,
  last_number int not null default 0
);

create or replace function public.next_convivencia_folio(p_year int)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_number int;
begin
  insert into public.convivencia_case_sequences (year, last_number)
  values (p_year, 1)
  on conflict (year)
  do update set last_number = public.convivencia_case_sequences.last_number + 1
  returning last_number into v_number;

  return 'CONV-' || p_year::text || '-' || lpad(v_number::text, 6, '0');
end;
$$;

-- ---------------------------------------------------------------------------
-- 1) Catálogos administrables -- tipos de situación y protocolos oficiales.
--    Sin acceso para inspectoria_general (ver nota de roles arriba).
-- ---------------------------------------------------------------------------
create table public.convivencia_case_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null,
  order_index int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- No se registran protocolos aquí: "no inventar procedimientos legales" --
-- el establecimiento los carga en FASE 2 con los nombres reales de su
-- Reglamento Interno vigente.
create table public.convivencia_protocols (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  reference_document_id uuid references public.documents(id) on delete set null,
  order_index int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 2) Registro de situación -- el "registro simple" (punto 4 del pedido).
--    case_id queda null hasta que (si corresponde) se convierte en Caso.
--    reported_by es la base de la visibilidad de inspectoria_general para
--    situaciones que todavía no son parte de un caso asignado.
-- ---------------------------------------------------------------------------
create table public.convivencia_situations (
  id uuid primary key default gen_random_uuid(),
  case_id uuid, -- FK a convivencia_cases agregada más abajo (con alter table) porque esa tabla todavía no existe en este punto del script
  occurred_on date not null,
  occurred_time time,
  location text,
  case_type_id uuid not null references public.convivencia_case_types(id) on delete restrict,
  description text not null,
  people_present text,
  witnesses text,
  background text,
  immediate_action text,
  needs_followup boolean not null default false,
  needs_protocol boolean not null default false,
  observations text,
  reported_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.convivencia_situation_students (
  id uuid primary key default gen_random_uuid(),
  situation_id uuid not null references public.convivencia_situations(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  role text not null check (role in ('involucrado','afectado','testigo','otro')),
  unique (situation_id, student_id)
);

-- ---------------------------------------------------------------------------
-- 3) Caso de Convivencia (punto 6). Sin columna de conclusión: vive en
--    convivencia_case_closures (tabla aparte, ver sección 4) para poder
--    ocultársela por completo a inspectoria_general incluso en casos
--    donde sí puede ver el resto de la fila.
-- ---------------------------------------------------------------------------
create table public.convivencia_cases (
  id uuid primary key default gen_random_uuid(),
  folio text not null unique,
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  case_type_id uuid not null references public.convivencia_case_types(id) on delete restrict,
  title text not null,
  status text not null default 'abierto'
    check (status in ('abierto','en_evaluacion','protocolo_activo','en_seguimiento','pendiente_antecedentes','cerrado')),
  priority text not null default 'media' check (priority in ('baja','media','alta')),
  responsible_id uuid not null references public.profiles(id) on delete restrict,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ahora que convivencia_cases existe, agrega la FK que convivencia_situations
-- dejó pendiente arriba (evita el problema de referencia circular al crear
-- las tablas en orden).
alter table public.convivencia_situations
  add constraint convivencia_situations_case_id_fkey
  foreign key (case_id) references public.convivencia_cases(id) on delete set null;

-- ---------------------------------------------------------------------------
-- 4) Conclusión del caso -- separada de convivencia_cases a propósito (ver
--    sección 3). Nunca visible para inspectoria_general, ni siquiera en un
--    caso donde tiene asignación operativa.
-- ---------------------------------------------------------------------------
create table public.convivencia_case_closures (
  case_id uuid primary key references public.convivencia_cases(id) on delete cascade,
  conclusion text not null,
  closed_by uuid not null references public.profiles(id) on delete restrict,
  closed_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 5) Asignación operativa de caso -- la base de todo el acceso acotado de
--    inspectoria_general (punto 20 del pedido: "por asignación de caso").
--    Solo director/convivencia/superadmin pueden crear una asignación.
-- ---------------------------------------------------------------------------
create table public.convivencia_case_assignments (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.convivencia_cases(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid not null references public.profiles(id) on delete restrict,
  assigned_at timestamptz not null default now(),
  unique (case_id, profile_id)
);

-- Security definer: evita re-evaluar RLS de convivencia_case_assignments
-- (y por lo tanto recursión) al usarse dentro de las políticas de las
-- demás tablas de convivencia. Mismo patrón que teaches_student()/
-- teaches_course() en 0002_rls.sql.
create or replace function public.convivencia_case_assigned(p_case_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.convivencia_case_assignments
    where case_id = p_case_id and profile_id = auth.uid()
  );
$$;

create table public.convivencia_case_students (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.convivencia_cases(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  role text not null check (role in ('involucrado','afectado','testigo','otro')),
  unique (case_id, student_id)
);

-- ---------------------------------------------------------------------------
-- 6) Línea de tiempo del caso (punto 8).
-- ---------------------------------------------------------------------------
create table public.convivencia_events (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.convivencia_cases(id) on delete cascade,
  event_date date not null default current_date,
  event_time time,
  event_type text not null
    check (event_type in ('caso_creado','entrevista','contacto_apoderado','seguimiento','medida','acuerdo','derivacion','protocolo','caso_cerrado','otro')),
  observation text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 7) Entrevistas (punto 9).
-- ---------------------------------------------------------------------------
create table public.convivencia_interviews (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.convivencia_cases(id) on delete cascade,
  interview_date date not null default current_date,
  interview_time time,
  participant_type text not null check (participant_type in ('estudiante','apoderado','funcionario','otro')),
  participant_student_id uuid references public.students(id) on delete set null,
  participant_guardian_id uuid references public.guardians(id) on delete set null,
  participant_other text,
  reason text,
  summary text,
  agreements text,
  commitments text,
  followup_date date,
  responsible_id uuid not null references public.profiles(id) on delete restrict,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 8) Medidas y acuerdos (punto 10) -- sin acceso para inspectoria_general.
-- ---------------------------------------------------------------------------
create table public.convivencia_measures (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.convivencia_cases(id) on delete cascade,
  description text not null,
  responsible_id uuid not null references public.profiles(id) on delete restrict,
  start_date date not null default current_date,
  review_date date,
  status text not null default 'pendiente'
    check (status in ('pendiente','en_curso','cumplido','no_cumplido','requiere_revision')),
  result text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 9) Derivaciones (punto 11) -- sin acceso para inspectoria_general.
-- ---------------------------------------------------------------------------
create table public.convivencia_referrals (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.convivencia_cases(id) on delete cascade,
  referral_date date not null default current_date,
  referral_type text not null check (referral_type in ('interna','externa')),
  institution text not null,
  reason text not null,
  responsible_id uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'pendiente' check (status in ('pendiente','en_proceso','respondida','cerrada')),
  followup text,
  response_received text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 10) Contacto con apoderados (punto 12) -- reutiliza guardians existente.
-- ---------------------------------------------------------------------------
create table public.convivencia_communications (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.convivencia_cases(id) on delete cascade,
  comm_date date not null default current_date,
  comm_type text not null check (comm_type in ('llamada','correo','entrevista','citacion','otro')),
  guardian_id uuid not null references public.guardians(id) on delete restrict,
  staff_id uuid not null references public.profiles(id) on delete restrict,
  reason text,
  result text,
  agreements text,
  next_action text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 11) Seguimientos programables (punto 13). Los estados "vencido"/"para
--     hoy"/"próximo" del dashboard se calculan en la consulta comparando
--     next_date con la fecha actual -- no son un valor almacenado.
--     Para inspectoria_general, "asignado" = responsible_id = su usuario.
-- ---------------------------------------------------------------------------
create table public.convivencia_followups (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.convivencia_cases(id) on delete cascade,
  followup_date date not null default current_date,
  responsible_id uuid not null references public.profiles(id) on delete restrict,
  objective text,
  result text,
  next_date date,
  status text not null default 'pendiente' check (status in ('pendiente','realizado','cancelado')),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 12) Protocolo activado en un caso (punto 7) -- sin acceso para
--     inspectoria_general (administración de protocolos excluida).
-- ---------------------------------------------------------------------------
create table public.convivencia_case_protocols (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.convivencia_cases(id) on delete cascade,
  protocol_id uuid not null references public.convivencia_protocols(id) on delete restrict,
  activated_at date not null default current_date,
  responsible_id uuid not null references public.profiles(id) on delete restrict,
  stage text,
  actions_done text,
  actions_pending text,
  deadline date,
  closed_at date,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 13) Acciones preventivas y formativas (punto 14) -- no atadas a un caso.
--     Sin acceso para inspectoria_general.
-- ---------------------------------------------------------------------------
create table public.convivencia_preventive_actions (
  id uuid primary key default gen_random_uuid(),
  activity text not null,
  objective text,
  responsible_id uuid not null references public.profiles(id) on delete restrict,
  action_date date not null default current_date,
  participants text,
  evidence text,
  evaluation text,
  result text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.convivencia_preventive_action_courses (
  id uuid primary key default gen_random_uuid(),
  preventive_action_id uuid not null references public.convivencia_preventive_actions(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  unique (preventive_action_id, course_id)
);

-- ---------------------------------------------------------------------------
-- 14) Plan de Gestión de Convivencia Educativa (punto 15) -- por año. Sin
--     acceso para inspectoria_general.
-- ---------------------------------------------------------------------------
create table public.convivencia_management_plan (
  id uuid primary key default gen_random_uuid(),
  academic_year_id uuid not null references public.academic_years(id) on delete restrict,
  action text not null,
  objective text,
  indicator text,
  responsible_id uuid not null references public.profiles(id) on delete restrict,
  start_date date,
  end_date date,
  status text not null default 'planificada' check (status in ('planificada','en_ejecucion','finalizada','reprogramada')),
  evidence text,
  progress_percent int not null default 0 check (progress_percent between 0 and 100),
  observations text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 15) Adjuntos (punto 22) -- solo metadatos; el archivo real vive en
--     archivos-internos/convivencia/ (bucket privado, URLs firmadas). Debe
--     colgar de al menos un padre real (nunca huérfano). Sin acceso para
--     inspectoria_general -- "documentos/adjuntos confidenciales".
-- ---------------------------------------------------------------------------
create table public.convivencia_attachments (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references public.convivencia_cases(id) on delete cascade,
  situation_id uuid references public.convivencia_situations(id) on delete cascade,
  interview_id uuid references public.convivencia_interviews(id) on delete cascade,
  preventive_action_id uuid references public.convivencia_preventive_actions(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  description text,
  uploaded_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint convivencia_attachments_has_parent
    check (num_nonnulls(case_id, situation_id, interview_id, preventive_action_id) >= 1)
);

-- ---------------------------------------------------------------------------
-- 16) updated_at automático (reutiliza public.set_updated_at() de 0001).
-- ---------------------------------------------------------------------------
create trigger trg_convivencia_situations_updated_at before update on public.convivencia_situations
  for each row execute function public.set_updated_at();
create trigger trg_convivencia_cases_updated_at before update on public.convivencia_cases
  for each row execute function public.set_updated_at();
create trigger trg_convivencia_interviews_updated_at before update on public.convivencia_interviews
  for each row execute function public.set_updated_at();
create trigger trg_convivencia_measures_updated_at before update on public.convivencia_measures
  for each row execute function public.set_updated_at();
create trigger trg_convivencia_referrals_updated_at before update on public.convivencia_referrals
  for each row execute function public.set_updated_at();
create trigger trg_convivencia_followups_updated_at before update on public.convivencia_followups
  for each row execute function public.set_updated_at();
create trigger trg_convivencia_case_protocols_updated_at before update on public.convivencia_case_protocols
  for each row execute function public.set_updated_at();
create trigger trg_convivencia_preventive_actions_updated_at before update on public.convivencia_preventive_actions
  for each row execute function public.set_updated_at();
create trigger trg_convivencia_management_plan_updated_at before update on public.convivencia_management_plan
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 17) Índices.
-- ---------------------------------------------------------------------------
create index idx_convivencia_cases_status on public.convivencia_cases(status);
create index idx_convivencia_cases_academic_year on public.convivencia_cases(academic_year_id);
create index idx_convivencia_cases_type on public.convivencia_cases(case_type_id);
create index idx_convivencia_case_assignments_case on public.convivencia_case_assignments(case_id);
create index idx_convivencia_case_assignments_profile on public.convivencia_case_assignments(profile_id);
create index idx_convivencia_case_students_case on public.convivencia_case_students(case_id);
create index idx_convivencia_case_students_student on public.convivencia_case_students(student_id);
create index idx_convivencia_situations_case on public.convivencia_situations(case_id);
create index idx_convivencia_situations_occurred on public.convivencia_situations(occurred_on);
create index idx_convivencia_situations_reported_by on public.convivencia_situations(reported_by);
create index idx_convivencia_situation_students_situation on public.convivencia_situation_students(situation_id);
create index idx_convivencia_situation_students_student on public.convivencia_situation_students(student_id);
create index idx_convivencia_events_case on public.convivencia_events(case_id, event_date);
create index idx_convivencia_interviews_case on public.convivencia_interviews(case_id);
create index idx_convivencia_interviews_responsible on public.convivencia_interviews(responsible_id);
create index idx_convivencia_measures_case on public.convivencia_measures(case_id);
create index idx_convivencia_measures_status on public.convivencia_measures(status);
create index idx_convivencia_referrals_case on public.convivencia_referrals(case_id);
create index idx_convivencia_communications_case on public.convivencia_communications(case_id);
create index idx_convivencia_followups_case on public.convivencia_followups(case_id);
create index idx_convivencia_followups_responsible on public.convivencia_followups(responsible_id);
create index idx_convivencia_followups_next_date on public.convivencia_followups(next_date) where status = 'pendiente';
create index idx_convivencia_case_protocols_case on public.convivencia_case_protocols(case_id);
create index idx_convivencia_preventive_actions_date on public.convivencia_preventive_actions(action_date);
create index idx_convivencia_management_plan_year on public.convivencia_management_plan(academic_year_id);
create index idx_convivencia_attachments_case on public.convivencia_attachments(case_id);

-- ---------------------------------------------------------------------------
-- 18) RLS -- privado por defecto. Sin política = sin acceso, igual que el
--     resto del esquema. anon nunca aparece en ninguna política ni grant
--     de esta migración; tampoco utp/pie/docente/administrativo.
-- ---------------------------------------------------------------------------
alter table public.convivencia_case_sequences enable row level security;
alter table public.convivencia_case_types enable row level security;
alter table public.convivencia_protocols enable row level security;
alter table public.convivencia_situations enable row level security;
alter table public.convivencia_situation_students enable row level security;
alter table public.convivencia_cases enable row level security;
alter table public.convivencia_case_closures enable row level security;
alter table public.convivencia_case_assignments enable row level security;
alter table public.convivencia_case_students enable row level security;
alter table public.convivencia_events enable row level security;
alter table public.convivencia_interviews enable row level security;
alter table public.convivencia_measures enable row level security;
alter table public.convivencia_referrals enable row level security;
alter table public.convivencia_communications enable row level security;
alter table public.convivencia_followups enable row level security;
alter table public.convivencia_case_protocols enable row level security;
alter table public.convivencia_preventive_actions enable row level security;
alter table public.convivencia_preventive_action_courses enable row level security;
alter table public.convivencia_management_plan enable row level security;
alter table public.convivencia_attachments enable row level security;

-- convivencia_case_sequences: sin políticas -> solo accesible vía
-- next_convivencia_folio() (security definer), mismo patrón exacto que
-- certificate_sequences (0002_rls.sql).

-- Catálogos: solo director/convivencia/superadmin (ni siquiera lectura
-- para inspectoria_general -- "administración de protocolos"/catálogos
-- quedan explícitamente fuera de su alcance).
create policy "convivencia_case_types_select" on public.convivencia_case_types
  for select to authenticated
  using (public.has_any_role(array['director','superadmin','convivencia']));
create policy "convivencia_case_types_write" on public.convivencia_case_types
  for all to authenticated
  using (public.has_any_role(array['director','superadmin','convivencia']))
  with check (public.has_any_role(array['director','superadmin','convivencia']));

create policy "convivencia_protocols_select" on public.convivencia_protocols
  for select to authenticated
  using (public.has_any_role(array['director','superadmin','convivencia']));
create policy "convivencia_protocols_write" on public.convivencia_protocols
  for all to authenticated
  using (public.has_any_role(array['director','superadmin','convivencia']))
  with check (public.has_any_role(array['director','superadmin','convivencia']));

-- Casos: información básica (folio/tipo/estado/prioridad/responsable/
-- fechas) visible para inspectoria_general SOLO en casos donde tiene
-- asignación explícita. Sin insert/update -- no puede abrir ni cerrar
-- casos. Sin política de DELETE para nadie -- no se puede eliminar un
-- caso vía API, solo "Cerrado" vía UPDATE de status (punto 23).
create policy "convivencia_cases_select" on public.convivencia_cases
  for select to authenticated
  using (
    public.has_any_role(array['director','superadmin','convivencia'])
    or (public.has_role('inspectoria_general') and public.convivencia_case_assigned(id))
  );
create policy "convivencia_cases_insert" on public.convivencia_cases
  for insert to authenticated
  with check (public.has_any_role(array['director','superadmin','convivencia']));
create policy "convivencia_cases_update" on public.convivencia_cases
  for update to authenticated
  using (public.has_any_role(array['director','superadmin','convivencia']))
  with check (public.has_any_role(array['director','superadmin','convivencia']));

-- Conclusión del caso: NUNCA para inspectoria_general, ni en casos
-- asignados -- por eso vive en tabla aparte (ver sección 4).
create policy "convivencia_case_closures_select" on public.convivencia_case_closures
  for select to authenticated
  using (public.has_any_role(array['director','superadmin','convivencia']));
create policy "convivencia_case_closures_write" on public.convivencia_case_closures
  for all to authenticated
  using (public.has_any_role(array['director','superadmin','convivencia']))
  with check (public.has_any_role(array['director','superadmin','convivencia']));

-- Asignaciones: inspectoria_general ve las suyas (para saber en qué casos
-- tiene acceso operativo); solo director/convivencia/superadmin asignan.
create policy "convivencia_case_assignments_select" on public.convivencia_case_assignments
  for select to authenticated
  using (
    public.has_any_role(array['director','superadmin','convivencia'])
    or (public.has_role('inspectoria_general') and profile_id = auth.uid())
  );
create policy "convivencia_case_assignments_write" on public.convivencia_case_assignments
  for all to authenticated
  using (public.has_any_role(array['director','superadmin','convivencia']))
  with check (public.has_any_role(array['director','superadmin','convivencia']));

-- Estudiantes del caso: inspectoria_general solo lee (en casos
-- asignados) -- decidir quién está involucrado en un caso no es algo que
-- edite por su cuenta.
create policy "convivencia_case_students_select" on public.convivencia_case_students
  for select to authenticated
  using (
    public.has_any_role(array['director','superadmin','convivencia'])
    or (public.has_role('inspectoria_general') and public.convivencia_case_assigned(case_id))
  );
create policy "convivencia_case_students_write" on public.convivencia_case_students
  for all to authenticated
  using (public.has_any_role(array['director','superadmin','convivencia']))
  with check (public.has_any_role(array['director','superadmin','convivencia']));

-- Situaciones: inspectoria_general SIEMPRE puede registrar una situación
-- nueva (suele ser quien levanta el registro inicial, todavía sin caso).
-- Puede ver/editar las que ella misma reportó, más las que ya son parte
-- de un caso donde tiene asignación.
create policy "convivencia_situations_select" on public.convivencia_situations
  for select to authenticated
  using (
    public.has_any_role(array['director','superadmin','convivencia'])
    or (
      public.has_role('inspectoria_general')
      and (reported_by = auth.uid() or (case_id is not null and public.convivencia_case_assigned(case_id)))
    )
  );
create policy "convivencia_situations_insert" on public.convivencia_situations
  for insert to authenticated
  with check (public.has_any_role(array['director','superadmin','convivencia','inspectoria_general']));
create policy "convivencia_situations_update" on public.convivencia_situations
  for update to authenticated
  using (
    public.has_any_role(array['director','superadmin','convivencia'])
    or (public.has_role('inspectoria_general') and reported_by = auth.uid())
  )
  with check (
    public.has_any_role(array['director','superadmin','convivencia'])
    or (public.has_role('inspectoria_general') and reported_by = auth.uid())
  );
create policy "convivencia_situations_delete" on public.convivencia_situations
  for delete to authenticated
  using (public.has_any_role(array['director','superadmin','convivencia']));

create policy "convivencia_situation_students_select" on public.convivencia_situation_students
  for select to authenticated
  using (
    public.has_any_role(array['director','superadmin','convivencia'])
    or (
      public.has_role('inspectoria_general')
      and exists (
        select 1 from public.convivencia_situations s
        where s.id = situation_id
          and (s.reported_by = auth.uid() or (s.case_id is not null and public.convivencia_case_assigned(s.case_id)))
      )
    )
  );
create policy "convivencia_situation_students_write" on public.convivencia_situation_students
  for all to authenticated
  using (
    public.has_any_role(array['director','superadmin','convivencia'])
    or (
      public.has_role('inspectoria_general')
      and exists (select 1 from public.convivencia_situations s where s.id = situation_id and s.reported_by = auth.uid())
    )
  )
  with check (
    public.has_any_role(array['director','superadmin','convivencia'])
    or (
      public.has_role('inspectoria_general')
      and exists (select 1 from public.convivencia_situations s where s.id = situation_id and s.reported_by = auth.uid())
    )
  );

-- Línea de tiempo: inspectoria_general ve/agrega hechos solo en casos
-- asignados; sin editar/borrar entradas ya creadas.
create policy "convivencia_events_select" on public.convivencia_events
  for select to authenticated
  using (
    public.has_any_role(array['director','superadmin','convivencia'])
    or (public.has_role('inspectoria_general') and public.convivencia_case_assigned(case_id))
  );
create policy "convivencia_events_insert" on public.convivencia_events
  for insert to authenticated
  with check (
    public.has_any_role(array['director','superadmin','convivencia'])
    or (public.has_role('inspectoria_general') and public.convivencia_case_assigned(case_id))
  );
create policy "convivencia_events_update" on public.convivencia_events
  for update to authenticated
  using (public.has_any_role(array['director','superadmin','convivencia']))
  with check (public.has_any_role(array['director','superadmin','convivencia']));
create policy "convivencia_events_delete" on public.convivencia_events
  for delete to authenticated
  using (public.has_any_role(array['director','superadmin','convivencia']));

-- Entrevistas: "operativas cuando corresponda" = casos con asignación
-- explícita. Puede editar las que ella misma conduce (responsible_id).
create policy "convivencia_interviews_select" on public.convivencia_interviews
  for select to authenticated
  using (
    public.has_any_role(array['director','superadmin','convivencia'])
    or (public.has_role('inspectoria_general') and public.convivencia_case_assigned(case_id))
  );
create policy "convivencia_interviews_insert" on public.convivencia_interviews
  for insert to authenticated
  with check (
    public.has_any_role(array['director','superadmin','convivencia'])
    or (public.has_role('inspectoria_general') and public.convivencia_case_assigned(case_id))
  );
create policy "convivencia_interviews_update" on public.convivencia_interviews
  for update to authenticated
  using (
    public.has_any_role(array['director','superadmin','convivencia'])
    or (public.has_role('inspectoria_general') and responsible_id = auth.uid())
  )
  with check (
    public.has_any_role(array['director','superadmin','convivencia'])
    or (public.has_role('inspectoria_general') and responsible_id = auth.uid())
  );
create policy "convivencia_interviews_delete" on public.convivencia_interviews
  for delete to authenticated
  using (public.has_any_role(array['director','superadmin','convivencia']));

-- Medidas y derivaciones: SIN acceso alguno para inspectoria_general.
create policy "convivencia_measures_all" on public.convivencia_measures
  for all to authenticated
  using (public.has_any_role(array['director','superadmin','convivencia']))
  with check (public.has_any_role(array['director','superadmin','convivencia']));

create policy "convivencia_referrals_all" on public.convivencia_referrals
  for all to authenticated
  using (public.has_any_role(array['director','superadmin','convivencia']))
  with check (public.has_any_role(array['director','superadmin','convivencia']));

-- Comunicaciones con apoderados: mismo patrón que entrevistas (caso
-- asignado para ver/crear, dueño del registro para editar).
create policy "convivencia_communications_select" on public.convivencia_communications
  for select to authenticated
  using (
    public.has_any_role(array['director','superadmin','convivencia'])
    or (public.has_role('inspectoria_general') and public.convivencia_case_assigned(case_id))
  );
create policy "convivencia_communications_insert" on public.convivencia_communications
  for insert to authenticated
  with check (
    public.has_any_role(array['director','superadmin','convivencia'])
    or (public.has_role('inspectoria_general') and public.convivencia_case_assigned(case_id))
  );
create policy "convivencia_communications_update" on public.convivencia_communications
  for update to authenticated
  using (
    public.has_any_role(array['director','superadmin','convivencia'])
    or (public.has_role('inspectoria_general') and staff_id = auth.uid())
  )
  with check (
    public.has_any_role(array['director','superadmin','convivencia'])
    or (public.has_role('inspectoria_general') and staff_id = auth.uid())
  );
create policy "convivencia_communications_delete" on public.convivencia_communications
  for delete to authenticated
  using (public.has_any_role(array['director','superadmin','convivencia']));

-- Seguimientos: "que tenga asignados" = responsible_id = su propio
-- usuario, no todos los seguimientos del caso.
create policy "convivencia_followups_select" on public.convivencia_followups
  for select to authenticated
  using (
    public.has_any_role(array['director','superadmin','convivencia'])
    or (public.has_role('inspectoria_general') and responsible_id = auth.uid())
  );
create policy "convivencia_followups_insert" on public.convivencia_followups
  for insert to authenticated
  with check (
    public.has_any_role(array['director','superadmin','convivencia'])
    or (public.has_role('inspectoria_general') and responsible_id = auth.uid())
  );
create policy "convivencia_followups_update" on public.convivencia_followups
  for update to authenticated
  using (
    public.has_any_role(array['director','superadmin','convivencia'])
    or (public.has_role('inspectoria_general') and responsible_id = auth.uid())
  )
  with check (
    public.has_any_role(array['director','superadmin','convivencia'])
    or (public.has_role('inspectoria_general') and responsible_id = auth.uid())
  );
create policy "convivencia_followups_delete" on public.convivencia_followups
  for delete to authenticated
  using (public.has_any_role(array['director','superadmin','convivencia']));

-- Protocolo de caso, acciones preventivas, plan de gestión: SIN acceso
-- alguno para inspectoria_general.
create policy "convivencia_case_protocols_all" on public.convivencia_case_protocols
  for all to authenticated
  using (public.has_any_role(array['director','superadmin','convivencia']))
  with check (public.has_any_role(array['director','superadmin','convivencia']));

create policy "convivencia_preventive_actions_all" on public.convivencia_preventive_actions
  for all to authenticated
  using (public.has_any_role(array['director','superadmin','convivencia']))
  with check (public.has_any_role(array['director','superadmin','convivencia']));

create policy "convivencia_preventive_action_courses_all" on public.convivencia_preventive_action_courses
  for all to authenticated
  using (public.has_any_role(array['director','superadmin','convivencia']))
  with check (public.has_any_role(array['director','superadmin','convivencia']));

create policy "convivencia_management_plan_all" on public.convivencia_management_plan
  for all to authenticated
  using (public.has_any_role(array['director','superadmin','convivencia']))
  with check (public.has_any_role(array['director','superadmin','convivencia']));

-- Adjuntos: SIN acceso alguno para inspectoria_general -- "documentos/
-- adjuntos confidenciales" queda explícitamente fuera de su alcance.
create policy "convivencia_attachments_all" on public.convivencia_attachments
  for all to authenticated
  using (public.has_any_role(array['director','superadmin','convivencia']))
  with check (public.has_any_role(array['director','superadmin','convivencia']));

-- ---------------------------------------------------------------------------
-- 19) Grants -- nunca a anon. Se otorgan a nivel de rol de base de datos
--     (authenticated) igual que en el resto del esquema; el acceso real
--     por rol de aplicación lo definen las políticas de RLS de arriba,
--     no estos grants. convivencia_cases sin grant de delete.
-- ---------------------------------------------------------------------------
grant select, insert, update on public.convivencia_cases to authenticated;
grant select, insert, update, delete on public.convivencia_case_closures to authenticated;
grant select, insert, update, delete on public.convivencia_case_assignments to authenticated;
grant select, insert, update, delete on public.convivencia_case_types to authenticated;
grant select, insert, update, delete on public.convivencia_protocols to authenticated;
grant select, insert, update, delete on public.convivencia_situations to authenticated;
grant select, insert, update, delete on public.convivencia_situation_students to authenticated;
grant select, insert, update, delete on public.convivencia_case_students to authenticated;
grant select, insert, update, delete on public.convivencia_events to authenticated;
grant select, insert, update, delete on public.convivencia_interviews to authenticated;
grant select, insert, update, delete on public.convivencia_measures to authenticated;
grant select, insert, update, delete on public.convivencia_referrals to authenticated;
grant select, insert, update, delete on public.convivencia_communications to authenticated;
grant select, insert, update, delete on public.convivencia_followups to authenticated;
grant select, insert, update, delete on public.convivencia_case_protocols to authenticated;
grant select, insert, update, delete on public.convivencia_preventive_actions to authenticated;
grant select, insert, update, delete on public.convivencia_preventive_action_courses to authenticated;
grant select, insert, update, delete on public.convivencia_management_plan to authenticated;
grant select, insert, update, delete on public.convivencia_attachments to authenticated;
grant execute on function public.next_convivencia_folio(int) to authenticated;
grant execute on function public.convivencia_case_assigned(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 20) Storage -- carpeta nueva archivos-internos/convivencia/ (bucket
--     privado, sin lectura pública ni anónima). Mismo patrón de
--     storage.foldername(name)[1] que 0005/0010/0025. Las URLs se firman
--     bajo demanda (getSignedUrl, ya existente en lib/supabase/storage.ts)
--     -- nunca una URL pública fija. Sin acceso para inspectoria_general,
--     igual que la tabla convivencia_attachments que referencian estos
--     archivos.
-- ---------------------------------------------------------------------------
create policy "archivos_internos_convivencia_select"
on storage.objects for select
to authenticated
using (
  bucket_id = 'archivos-internos'
  and (storage.foldername(name))[1] = 'convivencia'
  and public.has_any_role(array['director', 'superadmin', 'convivencia'])
);

create policy "archivos_internos_convivencia_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'archivos-internos'
  and (storage.foldername(name))[1] = 'convivencia'
  and public.has_any_role(array['director', 'superadmin', 'convivencia'])
);

create policy "archivos_internos_convivencia_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'archivos-internos'
  and (storage.foldername(name))[1] = 'convivencia'
  and public.has_any_role(array['director', 'superadmin', 'convivencia'])
)
with check (
  bucket_id = 'archivos-internos'
  and (storage.foldername(name))[1] = 'convivencia'
  and public.has_any_role(array['director', 'superadmin', 'convivencia'])
);

create policy "archivos_internos_convivencia_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'archivos-internos'
  and (storage.foldername(name))[1] = 'convivencia'
  and public.has_any_role(array['director', 'superadmin', 'convivencia'])
);

-- ---------------------------------------------------------------------------
-- 21) Siembra -- catálogo inicial de tipos de situación (punto 5, lista
--     entregada literalmente en el pedido). convivencia_protocols queda
--     vacía a propósito (ver comentario en la sección 1).
-- ---------------------------------------------------------------------------
insert into public.convivencia_case_types (code, label, order_index) values
  ('conflicto_estudiantes', 'Conflicto entre estudiantes', 0),
  ('agresion_fisica', 'Agresión física', 1),
  ('agresion_verbal', 'Agresión verbal', 2),
  ('acoso_escolar', 'Acoso escolar', 3),
  ('ciberacoso', 'Ciberacoso', 4),
  ('discriminacion', 'Discriminación', 5),
  ('incumplimiento_normas', 'Incumplimiento de normas', 6),
  ('situacion_aula', 'Situación de aula', 7),
  ('situacion_recreo', 'Situación en recreo', 8),
  ('situacion_fuera_establecimiento', 'Situación fuera del establecimiento vinculada a convivencia', 9),
  ('situacion_adulto_estudiante', 'Situación entre adulto y estudiante', 10),
  ('situacion_entre_adultos', 'Situación entre adultos de la comunidad', 11),
  ('otro', 'Otro', 12);
