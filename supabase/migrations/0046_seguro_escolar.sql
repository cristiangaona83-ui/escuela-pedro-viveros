-- =============================================================================
-- Seguro Escolar Digital -- Declaración Individual de Accidente Escolar
-- (Formulario 0374-3, Instituto de Seguridad Laboral)
-- =============================================================================
-- Módulo nuevo y autocontenido -- no existía nada de Seguro Escolar antes.
-- Reutiliza (sin duplicar): students/enrollments para el accidentado y su
-- curso, student_guardians para el apoderado, institutional_signatures +
-- school_config('institutional_stamp') para firma/timbre del Director
-- (ya resueltos en producción vía src/lib/pdf/institutional-signatures.ts),
-- profiles para responsables/funcionarios, y el mismo patrón de correlativo
-- anual atómico que next_convivencia_folio (0026): INSERT ... ON CONFLICT
-- ... DO UPDATE ... RETURNING, sin carrera posible entre dos declaraciones
-- del mismo año.
--
-- El día de la semana del accidente NO se guarda -- se calcula en la
-- aplicación a partir de accident_date (evita un dato derivado que pudiera
-- desincronizarse). La Sección A "FISCAL O MUNICIPAL / PARTICULAR" tampoco
-- es una columna: para este establecimiento (municipal) el valor es
-- constante y se imprime siempre como código 1, sin necesidad de
-- persistirlo por declaración.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Correlativo anual (reinicia cada año calendario, como exige el propio
--    formulario: "numeración correlativa anual ... desde el 1 de Enero al
--    31 de Diciembre de cada año").
-- ---------------------------------------------------------------------------
create table public.seguro_escolar_sequences (
  year int primary key,
  last_number int not null default 0
);

alter table public.seguro_escolar_sequences enable row level security;
-- Sin políticas de acceso directo: solo la función de abajo (security
-- definer) la toca. Ningún rol necesita leerla ni escribirla directamente.

create or replace function public.next_seguro_escolar_folio(p_year int)
returns int
language plpgsql security definer set search_path = public as $$
declare
  v_number int;
begin
  insert into public.seguro_escolar_sequences (year, last_number)
  values (p_year, 1)
  on conflict (year) do update set last_number = public.seguro_escolar_sequences.last_number + 1
  returning last_number into v_number;

  return v_number;
end;
$$;

revoke execute on function public.next_seguro_escolar_folio(int) from public;
grant execute on function public.next_seguro_escolar_folio(int) to authenticated;

-- ---------------------------------------------------------------------------
-- 2) Declaración -- espejo de las secciones A/B/C/D del formulario oficial.
--    B se congela como snapshot editable al momento de crear la
--    declaración (nombre/sexo/año nacimiento/edad/domicilio): así el PDF
--    impreso siempre refleja lo declarado ese día, sin que un cambio
--    posterior en la ficha del estudiante altere una declaración ya
--    emitida, y sin escribir nunca de vuelta en `students` (punto 4 del
--    pedido: "No alterar automáticamente la ficha del estudiante").
-- ---------------------------------------------------------------------------
create table public.seguro_escolar_declarations (
  id uuid primary key default gen_random_uuid(),
  folio_year int not null,
  folio_number int not null,

  student_id uuid not null references public.students(id) on delete restrict,

  -- Sección A
  registration_date date not null default current_date,
  course_label text not null,
  course_id uuid references public.courses(id) on delete set null,
  schedule text,

  -- Sección B (snapshot editable, ver comentario arriba)
  student_last_name_paterno text,
  student_last_name_materno text,
  student_first_names text not null,
  student_sex text check (student_sex in ('M', 'F')),
  student_birth_year int,
  student_age int,
  residence_street text,
  residence_number text,
  residence_population text,
  residence_commune text,
  residence_city text,
  residence_commune_code text,

  -- Sección C
  accident_date date not null,
  accident_hour smallint check (accident_hour between 0 and 23),
  accident_minute smallint check (accident_minute between 0 and 59),
  accident_type text not null check (accident_type in ('trayecto', 'escuela')),
  circumstance text not null,
  witness_a_name text,
  witness_a_lastname text,
  witness_a_id text,
  witness_b_name text,
  witness_b_lastname text,
  witness_b_id text,

  -- Sección D -- "Para ser llenado por Establecimiento Asistencial". modo
  -- 'blank' = se imprime en blanco (comportamiento por defecto); modo
  -- 'transcribed' = ya se transcribieron los antecedentes devueltos
  -- (siempre junto con el documento escaneado como respaldo, vía
  -- seguro_escolar_attachments).
  section_d_mode text not null default 'blank' check (section_d_mode in ('blank', 'transcribed')),
  assistance_establishment text,
  health_service_code text,
  establishment_code text,
  medical_diagnosis text,
  body_part_affected text,
  hospitalization boolean,
  hospitalization_days int,
  incapacity boolean,
  incapacity_days int,
  incapacity_type text check (incapacity_type in ('leve', 'temporal', 'invalidez_parcial', 'invalidez_total', 'gran_invalidez', 'muerte')),
  case_closure_cause text check (case_closure_cause in ('alta_medica', 'invalidez', 'abandono_tratamiento', 'muerte')),
  case_closure_date date,

  status text not null default 'borrador'
    check (status in ('borrador', 'emitido', 'entregado', 'en_seguimiento', 'cerrado', 'anulado')),
  annulled_reason text,
  annulled_by uuid references public.profiles(id) on delete set null,
  annulled_at timestamptz,

  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (folio_year, folio_number)
);

create index idx_seguro_escolar_declarations_student on public.seguro_escolar_declarations(student_id);
create index idx_seguro_escolar_declarations_status on public.seguro_escolar_declarations(status);
create index idx_seguro_escolar_declarations_accident_date on public.seguro_escolar_declarations(accident_date);
create index idx_seguro_escolar_declarations_folio on public.seguro_escolar_declarations(folio_year, folio_number);

create trigger trg_seguro_escolar_declarations_updated_at before update on public.seguro_escolar_declarations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3) Documentos adjuntos (seguro firmado escaneado, documento de atención,
--    certificado, documento del centro asistencial, respaldo de
--    seguimiento, otro).
-- ---------------------------------------------------------------------------
create table public.seguro_escolar_attachments (
  id uuid primary key default gen_random_uuid(),
  declaration_id uuid not null references public.seguro_escolar_declarations(id) on delete cascade,
  document_type text not null
    check (document_type in ('seguro_firmado', 'documento_atencion', 'certificado', 'documento_centro_asistencial', 'respaldo_seguimiento', 'otro')),
  storage_path text not null,
  file_name text not null,
  description text,
  uploaded_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index idx_seguro_escolar_attachments_declaration on public.seguro_escolar_attachments(declaration_id);

-- ---------------------------------------------------------------------------
-- 4) Comunicación con apoderado -- gestión interna, nunca forma parte del
--    PDF oficial 0374-3.
-- ---------------------------------------------------------------------------
create table public.seguro_escolar_guardian_contacts (
  id uuid primary key default gen_random_uuid(),
  declaration_id uuid not null references public.seguro_escolar_declarations(id) on delete cascade,
  contact_name text not null,
  contact_date date not null,
  contact_time time,
  contact_method text not null,
  staff_member_id uuid references public.profiles(id) on delete set null,
  result text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index idx_seguro_escolar_guardian_contacts_declaration on public.seguro_escolar_guardian_contacts(declaration_id);

-- ---------------------------------------------------------------------------
-- 5) Seguimiento del accidente -- expediente interno, separado del
--    formulario oficial.
-- ---------------------------------------------------------------------------
create table public.seguro_escolar_followups (
  id uuid primary key default gen_random_uuid(),
  declaration_id uuid not null references public.seguro_escolar_declarations(id) on delete cascade,
  followup_date date not null default current_date,
  responsible_id uuid references public.profiles(id) on delete set null,
  information_received text,
  reincorporation_date date,
  observation text,
  status text not null default 'pendiente' check (status in ('pendiente', 'realizado', 'cancelado')),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index idx_seguro_escolar_followups_declaration on public.seguro_escolar_followups(declaration_id);

-- ---------------------------------------------------------------------------
-- 6) RLS -- Administración: director/superadmin/inspectoria_general
--    (ningún rol TENS/enfermería existe hoy en public.roles -- se audita
--    en el reporte, no se inventa un rol nuevo). Docentes no tienen
--    ninguna política aquí -- sin acceso, ni de lectura. Sin política de
--    DELETE en ninguna tabla a propósito: una declaración se anula
--    (status='anulado'), nunca se borra (punto 31 del pedido).
-- ---------------------------------------------------------------------------
alter table public.seguro_escolar_declarations enable row level security;
alter table public.seguro_escolar_attachments enable row level security;
alter table public.seguro_escolar_guardian_contacts enable row level security;
alter table public.seguro_escolar_followups enable row level security;

create policy "seguro_escolar_declarations_select" on public.seguro_escolar_declarations
  for select to authenticated
  using (public.has_any_role(array['director', 'superadmin', 'inspectoria_general']));
create policy "seguro_escolar_declarations_insert" on public.seguro_escolar_declarations
  for insert to authenticated
  with check (public.has_any_role(array['director', 'superadmin', 'inspectoria_general']) and created_by = auth.uid());
create policy "seguro_escolar_declarations_update" on public.seguro_escolar_declarations
  for update to authenticated
  using (public.has_any_role(array['director', 'superadmin', 'inspectoria_general']))
  with check (public.has_any_role(array['director', 'superadmin', 'inspectoria_general']));

create policy "seguro_escolar_attachments_select" on public.seguro_escolar_attachments
  for select to authenticated
  using (public.has_any_role(array['director', 'superadmin', 'inspectoria_general']));
create policy "seguro_escolar_attachments_insert" on public.seguro_escolar_attachments
  for insert to authenticated
  with check (public.has_any_role(array['director', 'superadmin', 'inspectoria_general']) and uploaded_by = auth.uid());
create policy "seguro_escolar_attachments_delete" on public.seguro_escolar_attachments
  for delete to authenticated
  using (public.has_any_role(array['director', 'superadmin', 'inspectoria_general']));

create policy "seguro_escolar_guardian_contacts_select" on public.seguro_escolar_guardian_contacts
  for select to authenticated
  using (public.has_any_role(array['director', 'superadmin', 'inspectoria_general']));
create policy "seguro_escolar_guardian_contacts_insert" on public.seguro_escolar_guardian_contacts
  for insert to authenticated
  with check (public.has_any_role(array['director', 'superadmin', 'inspectoria_general']) and created_by = auth.uid());

create policy "seguro_escolar_followups_select" on public.seguro_escolar_followups
  for select to authenticated
  using (public.has_any_role(array['director', 'superadmin', 'inspectoria_general']));
create policy "seguro_escolar_followups_insert" on public.seguro_escolar_followups
  for insert to authenticated
  with check (public.has_any_role(array['director', 'superadmin', 'inspectoria_general']) and created_by = auth.uid());
create policy "seguro_escolar_followups_update" on public.seguro_escolar_followups
  for update to authenticated
  using (public.has_any_role(array['director', 'superadmin', 'inspectoria_general']))
  with check (public.has_any_role(array['director', 'superadmin', 'inspectoria_general']));

grant select, insert, update on public.seguro_escolar_declarations to authenticated;
grant select, insert, delete on public.seguro_escolar_attachments to authenticated;
grant select, insert on public.seguro_escolar_guardian_contacts to authenticated;
grant select, insert, update on public.seguro_escolar_followups to authenticated;

-- ---------------------------------------------------------------------------
-- 7) Storage -- carpeta nueva archivos-internos/seguro-escolar/{declarationId}/,
--    mismo patrón que archivos-internos/convivencia/ y
--    archivos-internos/asistencia/suspensiones/ (0037): privado, nunca
--    public/, mismos 3 roles.
-- ---------------------------------------------------------------------------
create policy "archivos_internos_seguro_escolar_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'archivos-internos'
    and (storage.foldername(name))[1] = 'seguro-escolar'
    and public.has_any_role(array['director', 'superadmin', 'inspectoria_general'])
  );
create policy "archivos_internos_seguro_escolar_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'archivos-internos'
    and (storage.foldername(name))[1] = 'seguro-escolar'
    and public.has_any_role(array['director', 'superadmin', 'inspectoria_general'])
  );
create policy "archivos_internos_seguro_escolar_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'archivos-internos'
    and (storage.foldername(name))[1] = 'seguro-escolar'
    and public.has_any_role(array['director', 'superadmin', 'inspectoria_general'])
  );
