-- =============================================================================
-- Consolidación definitiva de la Ficha de Matrícula del Estudiante.
--
-- Auditoría previa (resumen): el esquema actual (students/enrollments/
-- guardians/student_guardians) ya cubre identificación básica, matrícula por
-- año, apoderados múltiples con principal/emergencia. Lo que falta y se
-- agrega aquí:
--   - students: identificación ampliada (nacionalidad, país de nacimiento,
--     sexo registral, contacto personal, domicilio) y fecha de ingreso
--     inicial al establecimiento (permanente, no cambia entre matrículas).
--   - enrollments: folio de matrícula (reutiliza next_certificate_folio,
--     sin sequence nueva), procedencia/condición de ingreso (propias de CADA
--     acto de matrícula, no del estudiante), motivo/fecha de retiro y fecha
--     de reincorporación (hoy solo quedaban en audit_logs, nunca en la fila),
--     observaciones de esa matrícula (separadas de students.notes).
--   - guardians: teléfono alternativo y domicilio.
--   - 4 tablas nuevas: student_pickup_authorizations (personas autorizadas
--     para retirar), student_pickup_restrictions (alerta mínima, sin
--     detalle judicial), student_authorizations (autorizaciones
--     administrativas de tipo/código extensible, sin nueva migración por
--     cada tipo futuro), student_enrollment_documents (documentación de
--     matrícula solicitada/entregada/pendiente).
--
-- Deliberadamente NO se hace:
--   - NO se separa last_names en apellido paterno/materno: son datos reales
--     ya cargados como texto combinado; separarlos por SQL sería una
--     adivinanza (apellidos compuestos, "de la", etc.) y arriesgaría
--     corromper datos de estudiantes reales. Se mantiene combinado.
--   - NO se agrega columna "age": se calcula en la aplicación desde
--     birth_date (calculateAge ya existente), tal como pide la instrucción.
--   - NO se fuerza la información PIE/convivencia/salud a esta ficha ni a su
--     PDF: siguen en pie_records/student_support con su RLS actual, sin
--     tocar.
--   - NO se reutiliza la tabla "documents" para documentación de matrícula:
--     es contenido institucional público/general, sin relación a
--     estudiantes — forzarla habría mezclado dos dominios distintos.
--
-- Auditoría: se sigue la convención YA usada en todo el proyecto (llamada
-- explícita a log_audit desde la capa de aplicación tras cada escritura
-- directa vía RLS, visible en StudentForm/GuardianManagerFull), no triggers
-- nuevos — evita introducir un segundo mecanismo de auditoría.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) students — identificación ampliada + fecha de ingreso inicial (permanente)
-- ---------------------------------------------------------------------------
alter table public.students
  add column nationality text,
  add column birth_country text,
  add column sex text check (sex in ('M', 'F')), -- sexo registral (Registro Civil), no identidad de género
  add column personal_phone text,
  add column personal_email text,
  add column address_street text,
  add column address_number text,
  add column address_sector text,
  add column address_commune text,
  add column address_region text,
  add column first_enrollment_date date,
  add column pickup_restriction_flag boolean not null default false,
  add column pickup_restriction_note text;

comment on column public.students.sex is 'Sexo registral administrativo (Registro Civil), no identidad de género. Uso exclusivamente administrativo.';
comment on column public.students.first_enrollment_date is 'Fecha de ingreso inicial al establecimiento — permanente, no cambia entre matrículas anuales (distinto de enrollments.enrolled_at).';
comment on column public.students.pickup_restriction_flag is 'Alerta administrativa mínima: existe una restricción de retiro registrada. El detalle vive fuera de la plataforma (no se modela un sistema jurídico paralelo).';

-- Backfill seguro: fecha de ingreso inicial = la matrícula más antigua ya
-- registrada para cada estudiante. No se inventa un valor — se deriva de
-- datos reales existentes.
update public.students s
set first_enrollment_date = sub.min_date
from (
  select student_id, min(enrolled_at) as min_date
  from public.enrollments
  group by student_id
) sub
where s.id = sub.student_id and s.first_enrollment_date is null;

-- ---------------------------------------------------------------------------
-- 2) enrollments — folio, procedencia/condición de ingreso, retiro/reincorporación, notas
-- ---------------------------------------------------------------------------
alter table public.enrollments
  add column enrollment_number text,
  add column origin_school text,
  add column origin_course text,
  add column admission_condition text,
  add column withdrawal_reason text,
  add column withdrawn_at date,
  add column reactivated_at date,
  add column notes text;

comment on column public.enrollments.enrollment_number is 'Folio de matrícula de ESTA fila (año/acto de matrícula específico) — generado vía next_certificate_folio(''matricula'', año), igual convención que folios de certificados.';
comment on column public.enrollments.notes is 'Observaciones de ESTA matrícula (distinto de students.notes, que es general/permanente). Nunca información de convivencia/PIE/salud — esa vive en sus propias tablas.';

-- Folio único cuando existe (nullable — no todas las filas históricas lo
-- tendrán hasta el backfill de abajo, y se preserva nullable por si alguna
-- vía de inserción futura no pasa por los RPC que lo asignan).
create unique index enrollments_enrollment_number_unique on public.enrollments (enrollment_number) where enrollment_number is not null;

-- Backfill: asigna folio a las matrículas existentes, en orden cronológico
-- por año, reutilizando la misma función de folios que certificados/informes
-- (cert_type = 'matricula'). No se inventan números — se generan de la misma
-- forma que cualquier folio nuevo, solo que retroactivamente.
do $$
declare
  r record;
  v_folio text;
begin
  for r in
    select e.id, ay.year
    from public.enrollments e
    join public.academic_years ay on ay.id = e.academic_year_id
    where e.enrollment_number is null
    order by ay.year, e.enrolled_at, e.created_at
  loop
    v_folio := public.next_certificate_folio('matricula', r.year);
    update public.enrollments set enrollment_number = v_folio where id = r.id;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 3) guardians — teléfono alternativo y domicilio
-- ---------------------------------------------------------------------------
alter table public.guardians
  add column phone_alt text,
  add column address text;

-- guardian_contact_info (0014) — vista sin RUN para inspectoria_general. Se
-- amplía con phone_alt/address (mismo nivel de sensibilidad que phone/email,
-- muy distinto de run) para que Inspectoría también pueda contactar/ubicar
-- al apoderado sin necesitar acceso completo a la tabla. CREATE OR REPLACE
-- VIEW exige mantener las columnas existentes en su mismo orden — las
-- columnas nuevas van al final, nunca intercaladas.
create or replace view public.guardian_contact_info
with (security_invoker = true) as
select id, full_name, phone, email, relationship, phone_alt, address
from public.guardians;

-- Los 3 RPC de apoderados de inspectoria_general (0019) se amplían con
-- phone_alt/address, mismo nivel de sensibilidad que phone/email — nunca run.
-- search_guardians_by_name cambia su RETURNS TABLE (columnas nuevas), lo que
-- CREATE OR REPLACE no permite — hay que eliminarla primero.
drop function if exists public.search_guardians_by_name(text);

create function public.search_guardians_by_name(p_query text)
returns table(id uuid, full_name text, phone text, phone_alt text, email text, address text, relationship text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role('inspectoria_general') then
    raise exception 'No autorizado';
  end if;
  return query
    select g.id, g.full_name, g.phone, g.phone_alt, g.email, g.address, g.relationship
    from public.guardians g
    where g.full_name ilike '%' || p_query || '%'
    order by g.full_name
    limit 20;
end;
$$;
revoke execute on function public.search_guardians_by_name(text) from public;
grant execute on function public.search_guardians_by_name(text) to authenticated;

create or replace function public.create_guardian_contact(
  p_full_name text,
  p_phone text default null,
  p_email text default null,
  p_relationship text default null,
  p_phone_alt text default null,
  p_address text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.has_role('inspectoria_general') then
    raise exception 'No autorizado';
  end if;
  if p_full_name is null or length(trim(p_full_name)) = 0 then
    raise exception 'El nombre del apoderado es obligatorio';
  end if;

  insert into public.guardians (full_name, phone, email, relationship, phone_alt, address)
  values (trim(p_full_name), p_phone, p_email, p_relationship, p_phone_alt, p_address)
  returning id into v_id;

  perform public.log_audit('create_guardian_contact', 'apoderados', 'guardians', v_id::text,
    jsonb_build_object('full_name', p_full_name));

  return v_id;
end;
$$;

create or replace function public.update_guardian_contact(
  p_guardian_id uuid,
  p_full_name text,
  p_phone text default null,
  p_email text default null,
  p_relationship text default null,
  p_phone_alt text default null,
  p_address text default null
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role('inspectoria_general') then
    raise exception 'No autorizado';
  end if;
  if not exists (select 1 from public.guardians where id = p_guardian_id) then
    raise exception 'Apoderado no encontrado';
  end if;
  if p_full_name is null or length(trim(p_full_name)) = 0 then
    raise exception 'El nombre del apoderado es obligatorio';
  end if;

  update public.guardians
     set full_name = trim(p_full_name), phone = p_phone, email = p_email, relationship = p_relationship,
         phone_alt = p_phone_alt, address = p_address
   where id = p_guardian_id;

  perform public.log_audit('update_guardian_contact', 'apoderados', 'guardians', p_guardian_id::text,
    jsonb_build_object('full_name', p_full_name));

  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4) student_pickup_authorizations — personas autorizadas para retirar
-- ---------------------------------------------------------------------------
create table public.student_pickup_authorizations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  full_name text not null,
  relationship text,
  phone text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null
);
create index idx_pickup_authorizations_student on public.student_pickup_authorizations (student_id);
create trigger trg_pickup_authorizations_updated_at before update on public.student_pickup_authorizations
  for each row execute function public.set_updated_at();

alter table public.student_pickup_authorizations enable row level security;

create policy "pickup_authorizations_select_scope" on public.student_pickup_authorizations
  for select to authenticated
  using (public.has_any_role(array['director','utp','administrativo','convivencia','inspectoria_general','superadmin']));

-- Escritura: exactamente los roles pedidos en la especificación (Dirección,
-- UTP, Inspectoría General, Superadmin) — administrativo/convivencia solo
-- leen, no administran esta lista.
create policy "pickup_authorizations_write_scope" on public.student_pickup_authorizations
  for all to authenticated
  using (public.has_any_role(array['director','utp','inspectoria_general','superadmin']))
  with check (public.has_any_role(array['director','utp','inspectoria_general','superadmin']));

grant select, insert, update, delete on public.student_pickup_authorizations to authenticated;

-- ---------------------------------------------------------------------------
-- 5) student_pickup_restrictions — alerta administrativa mínima (sin detalle
--    judicial/confidencial). A lo sumo una fila por estudiante.
-- ---------------------------------------------------------------------------
create table public.student_pickup_restrictions (
  student_id uuid primary key references public.students(id) on delete cascade,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null
);
create trigger trg_pickup_restrictions_updated_at before update on public.student_pickup_restrictions
  for each row execute function public.set_updated_at();

comment on table public.student_pickup_restrictions is 'Presencia de una fila = existe una restricción de retiro registrada. Solo alerta administrativa mínima — el detalle judicial/confidencial NO se modela aquí (no es un sistema jurídico paralelo).';

alter table public.student_pickup_restrictions enable row level security;

-- Acceso deliberadamente más estrecho que el resto de la ficha: ni
-- administrativo ni pie/docente ven esta tabla.
create policy "pickup_restrictions_scope" on public.student_pickup_restrictions
  for all to authenticated
  using (public.has_any_role(array['director','utp','convivencia','inspectoria_general','superadmin']))
  with check (public.has_any_role(array['director','utp','convivencia','inspectoria_general','superadmin']));

grant select, insert, update, delete on public.student_pickup_restrictions to authenticated;

-- ---------------------------------------------------------------------------
-- 6) student_authorizations — autorizaciones administrativas (uso de imagen,
--    salidas pedagógicas, retiro por terceros, futuras). auth_type es texto
--    libre a propósito (catálogo de tipos vive en la aplicación) para poder
--    agregar autorizaciones nuevas sin otra migración. Estado actual por
--    tipo (no historial fila-a-fila) — el historial de cambios ya queda en
--    audit_logs vía log_audit desde la aplicación.
-- ---------------------------------------------------------------------------
create table public.student_authorizations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  auth_type text not null,
  authorized boolean not null,
  authorized_at date not null default current_date,
  observation text,
  guardian_id uuid references public.guardians(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, auth_type)
);
create index idx_student_authorizations_student on public.student_authorizations (student_id);
create trigger trg_student_authorizations_updated_at before update on public.student_authorizations
  for each row execute function public.set_updated_at();

alter table public.student_authorizations enable row level security;

create policy "student_authorizations_select_scope" on public.student_authorizations
  for select to authenticated
  using (public.has_any_role(array['director','utp','administrativo','convivencia','inspectoria_general','superadmin']));
create policy "student_authorizations_write_admin" on public.student_authorizations
  for all to authenticated
  using (public.has_any_role(array['director','utp','administrativo','convivencia','superadmin']))
  with check (public.has_any_role(array['director','utp','administrativo','convivencia','superadmin']));

grant select, insert, update, delete on public.student_authorizations to authenticated;

-- ---------------------------------------------------------------------------
-- 7) student_enrollment_documents — documentación de matrícula (solicitado/
--    entregado/pendiente). doc_type es texto libre por la misma razón que
--    auth_type; status sí es un enum cerrado porque es el flujo operativo
--    real (igual convención que students.status/enrollments.status).
-- ---------------------------------------------------------------------------
create table public.student_enrollment_documents (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  doc_type text not null,
  status text not null default 'pendiente' check (status in ('solicitado','entregado','pendiente')),
  doc_date date,
  observation text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, doc_type)
);
create index idx_enrollment_documents_student on public.student_enrollment_documents (student_id);
create trigger trg_enrollment_documents_updated_at before update on public.student_enrollment_documents
  for each row execute function public.set_updated_at();

alter table public.student_enrollment_documents enable row level security;

create policy "enrollment_documents_select_scope" on public.student_enrollment_documents
  for select to authenticated
  using (public.has_any_role(array['director','utp','administrativo','convivencia','inspectoria_general','superadmin']));
create policy "enrollment_documents_write_admin" on public.student_enrollment_documents
  for all to authenticated
  using (public.has_any_role(array['director','utp','administrativo','convivencia','superadmin']))
  with check (public.has_any_role(array['director','utp','administrativo','convivencia','superadmin']));

grant select, insert, update, delete on public.student_enrollment_documents to authenticated;

-- ---------------------------------------------------------------------------
-- 8) RPC: update_student_identity_extra — identificación/domicilio nuevos.
--    Separado de update_student_fields (0017) a propósito: no se toca la
--    función ya usada en producción, se agrega una nueva para los campos
--    nuevos, con el mismo conjunto de roles RPC-only (inspectoria_general/
--    convivencia). director/utp/administrativo/superadmin siguen editando
--    estos campos por UPDATE directo (students_write_admin ya se los permite,
--    sin cambios).
-- ---------------------------------------------------------------------------
create or replace function public.update_student_identity_extra(
  p_student_id uuid,
  p_nationality text default null,
  p_birth_country text default null,
  p_sex text default null,
  p_personal_phone text default null,
  p_personal_email text default null,
  p_address_street text default null,
  p_address_number text default null,
  p_address_sector text default null,
  p_address_commune text default null,
  p_address_region text default null
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before record;
begin
  if not public.has_any_role(array['director','utp','superadmin','inspectoria_general','convivencia']) then
    raise exception 'No autorizado';
  end if;

  select nationality, birth_country, sex, personal_phone, personal_email,
         address_street, address_number, address_sector, address_commune, address_region
  into v_before
  from public.students where id = p_student_id;
  if not found then
    raise exception 'Estudiante no encontrado';
  end if;

  if p_sex is not null and p_sex not in ('M', 'F') then
    raise exception 'Sexo registral inválido';
  end if;

  update public.students
     set nationality = p_nationality,
         birth_country = p_birth_country,
         sex = p_sex,
         personal_phone = p_personal_phone,
         personal_email = p_personal_email,
         address_street = p_address_street,
         address_number = p_address_number,
         address_sector = p_address_sector,
         address_commune = p_address_commune,
         address_region = p_address_region
   where id = p_student_id;

  perform public.log_audit('update_student_identity_extra', 'estudiantes', 'students', p_student_id::text,
    jsonb_build_object('before', to_jsonb(v_before), 'after', jsonb_build_object(
      'nationality', p_nationality, 'birth_country', p_birth_country, 'sex', p_sex,
      'personal_phone', p_personal_phone, 'personal_email', p_personal_email,
      'address_street', p_address_street, 'address_number', p_address_number,
      'address_sector', p_address_sector, 'address_commune', p_address_commune, 'address_region', p_address_region
    )));

  return true;
end;
$$;
revoke execute on function public.update_student_identity_extra(uuid, text, text, text, text, text, text, text, text, text, text) from public;
grant execute on function public.update_student_identity_extra(uuid, text, text, text, text, text, text, text, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 9) RPC: update_enrollment_details — procedencia/condición de ingreso/notas
--    de una matrícula puntual. Mismo patrón: RPC para inspectoria_general/
--    convivencia (sin UPDATE directo sobre enrollments); director/utp/
--    administrativo/superadmin pueden seguir usando UPDATE directo
--    (enrollments_write_admin), pero también pueden llamar este RPC — mismo
--    criterio que update_student_fields.
-- ---------------------------------------------------------------------------
create or replace function public.update_enrollment_details(
  p_enrollment_id uuid,
  p_origin_school text default null,
  p_origin_course text default null,
  p_admission_condition text default null,
  p_notes text default null
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before record;
begin
  if not public.has_any_role(array['director','utp','administrativo','superadmin','inspectoria_general','convivencia']) then
    raise exception 'No autorizado';
  end if;

  select origin_school, origin_course, admission_condition, notes into v_before
  from public.enrollments where id = p_enrollment_id;
  if not found then
    raise exception 'Matrícula no encontrada';
  end if;

  update public.enrollments
     set origin_school = p_origin_school,
         origin_course = p_origin_course,
         admission_condition = p_admission_condition,
         notes = p_notes
   where id = p_enrollment_id;

  perform public.log_audit('update_enrollment_details', 'estudiantes', 'enrollments', p_enrollment_id::text,
    jsonb_build_object('before', to_jsonb(v_before), 'after', jsonb_build_object(
      'origin_school', p_origin_school, 'origin_course', p_origin_course,
      'admission_condition', p_admission_condition, 'notes', p_notes
    )));

  return true;
end;
$$;
revoke execute on function public.update_enrollment_details(uuid, text, text, text, text) from public;
grant execute on function public.update_enrollment_details(uuid, text, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 10) Ajustes a los RPC de matrícula ya existentes (0014/0017): asignar folio
--     a filas nuevas, y persistir motivo/fecha de retiro y fecha de
--     reincorporación EN LA FILA (antes solo quedaban en audit_logs,
--     ilegibles para cualquier rol salvo director/superadmin).
-- ---------------------------------------------------------------------------
create or replace function public.withdraw_student(
  p_student_id uuid,
  p_academic_year_id uuid,
  p_reason text default null
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_any_role(array['director','utp','administrativo','superadmin','inspectoria_general','convivencia']) then
    raise exception 'No autorizado';
  end if;

  if not exists (select 1 from public.students where id = p_student_id) then
    raise exception 'Estudiante no encontrado';
  end if;

  update public.students
     set status = 'retirado', active = false
   where id = p_student_id;

  update public.enrollments
     set status = 'retirada', withdrawal_reason = p_reason, withdrawn_at = current_date
   where student_id = p_student_id
     and academic_year_id = p_academic_year_id
     and status = 'activa';

  perform public.log_audit('withdraw_student', 'estudiantes', 'students', p_student_id::text,
    jsonb_build_object('academic_year_id', p_academic_year_id, 'reason', p_reason));

  return true;
end;
$$;

create or replace function public.enroll_student(
  p_student_id uuid,
  p_course_id uuid,
  p_academic_year_id uuid
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing record;
  v_year int;
  v_folio text;
begin
  if not public.has_any_role(array['director','utp','superadmin','inspectoria_general','convivencia']) then
    raise exception 'No autorizado';
  end if;

  if not exists (select 1 from public.students where id = p_student_id) then
    raise exception 'Estudiante no encontrado';
  end if;

  if not exists (
    select 1 from public.courses
    where id = p_course_id and academic_year_id = p_academic_year_id
  ) then
    raise exception 'El curso indicado no corresponde a ese año académico';
  end if;

  select id, course_id, status into v_existing
  from public.enrollments
  where student_id = p_student_id and academic_year_id = p_academic_year_id;

  if v_existing.id is not null and v_existing.status = 'activa' and v_existing.course_id = p_course_id then
    raise exception 'El estudiante ya está matriculado en ese curso para ese año';
  end if;

  if v_existing.id is not null then
    update public.enrollments set course_id = p_course_id, status = 'activa'
    where id = v_existing.id;
  else
    select year into v_year from public.academic_years where id = p_academic_year_id;
    v_folio := public.next_certificate_folio('matricula', v_year);
    insert into public.enrollments (student_id, course_id, academic_year_id, status, enrollment_number)
    values (p_student_id, p_course_id, p_academic_year_id, 'activa', v_folio);
  end if;

  update public.students set status = 'matriculado', active = true
  where id = p_student_id and status <> 'matriculado';

  perform public.log_audit('enroll_student', 'estudiantes', 'enrollments', p_student_id::text,
    jsonb_build_object(
      'course_id', p_course_id, 'academic_year_id', p_academic_year_id,
      'previous_course_id', v_existing.course_id, 'previous_status', v_existing.status
    ));

  return true;
end;
$$;

create or replace function public.create_student_with_enrollment(
  p_first_names text,
  p_last_names text,
  p_run text,
  p_birth_date date,
  p_course_id uuid,
  p_academic_year_id uuid
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid;
  v_year int;
  v_folio text;
begin
  if not public.has_any_role(array['director','utp','superadmin','inspectoria_general','convivencia']) then
    raise exception 'No autorizado';
  end if;

  insert into public.students (first_names, last_names, run, birth_date, status, active, first_enrollment_date)
  values (p_first_names, p_last_names, p_run, p_birth_date, 'matriculado', true, current_date)
  returning id into v_student_id;

  select year into v_year from public.academic_years where id = p_academic_year_id;
  v_folio := public.next_certificate_folio('matricula', v_year);

  insert into public.enrollments (student_id, course_id, academic_year_id, status, enrollment_number)
  values (v_student_id, p_course_id, p_academic_year_id, 'activa', v_folio);

  perform public.log_audit('create_student_with_enrollment', 'estudiantes', 'students', v_student_id::text,
    jsonb_build_object(
      'first_names', p_first_names, 'last_names', p_last_names, 'run', p_run,
      'course_id', p_course_id, 'academic_year_id', p_academic_year_id
    ));

  return v_student_id;
end;
$$;

create or replace function public.reactivate_student(
  p_student_id uuid,
  p_course_id uuid,
  p_academic_year_id uuid
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing record;
  v_year int;
  v_folio text;
begin
  if not public.has_any_role(array['director','utp','superadmin','inspectoria_general','convivencia']) then
    raise exception 'No autorizado';
  end if;

  if not exists (select 1 from public.students where id = p_student_id and status = 'retirado') then
    raise exception 'El estudiante no está retirado — usa "Matricular" si es un ingreso o cambio de curso';
  end if;

  if not exists (
    select 1 from public.courses
    where id = p_course_id and academic_year_id = p_academic_year_id
  ) then
    raise exception 'El curso indicado no corresponde a ese año académico';
  end if;

  select id, course_id, status into v_existing
  from public.enrollments
  where student_id = p_student_id and academic_year_id = p_academic_year_id;

  if v_existing.id is not null then
    update public.enrollments
       set course_id = p_course_id, status = 'activa', reactivated_at = current_date
     where id = v_existing.id;
  else
    select year into v_year from public.academic_years where id = p_academic_year_id;
    v_folio := public.next_certificate_folio('matricula', v_year);
    insert into public.enrollments (student_id, course_id, academic_year_id, status, enrollment_number, reactivated_at)
    values (p_student_id, p_course_id, p_academic_year_id, 'activa', v_folio, current_date);
  end if;

  update public.students set status = 'matriculado', active = true where id = p_student_id;

  perform public.log_audit('reactivate_student', 'estudiantes', 'students', p_student_id::text,
    jsonb_build_object('course_id', p_course_id, 'academic_year_id', p_academic_year_id));

  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- 11) delete_student_if_unused (0017) — se agregan las 4 tablas nuevas a la
--     verificación de dependencias, para no dejar registros huérfanos.
-- ---------------------------------------------------------------------------
create or replace function public.delete_student_if_unused(
  p_student_id uuid,
  p_reason text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_any_role(array['director','utp','superadmin','inspectoria_general','convivencia']) then
    raise exception 'No autorizado';
  end if;

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'Debes indicar un motivo para eliminar el registro';
  end if;

  if not exists (select 1 from public.students where id = p_student_id) then
    raise exception 'Estudiante no encontrado';
  end if;

  if exists (select 1 from public.enrollments where student_id = p_student_id)
     or exists (select 1 from public.grades where student_id = p_student_id)
     or exists (select 1 from public.attendance where student_id = p_student_id)
     or exists (select 1 from public.student_support where student_id = p_student_id)
     or exists (select 1 from public.pie_records where student_id = p_student_id)
     or exists (select 1 from public.certificates where student_id = p_student_id)
     or exists (select 1 from public.student_pickup_authorizations where student_id = p_student_id)
     or exists (select 1 from public.student_authorizations where student_id = p_student_id)
     or exists (select 1 from public.student_enrollment_documents where student_id = p_student_id) then
    raise exception 'No se puede eliminar: el estudiante tiene matrícula, notas, asistencia, seguimiento, PIE, certificados u otros registros asociados. Usa "Retirar" en su lugar.';
  end if;

  perform public.log_audit('delete_student_if_unused', 'estudiantes', 'students', p_student_id::text,
    jsonb_build_object('reason', p_reason));

  delete from public.students where id = p_student_id;

  return true;
end;
$$;
