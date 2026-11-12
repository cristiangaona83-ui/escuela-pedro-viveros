-- =============================================================================
-- Matrícula en Inspectoría General + Pre-matrícula en línea
-- =============================================================================
-- 1) Datos de la ficha de matrícula que hoy no tienen dónde guardarse:
--      students      -> ipe, nombre social
--      enrollments   -> alertas de emergencia, apoyos escolares, forma de traslado,
--                       constancias de información, quién recibe en Inspectoría
--      student_guardians -> apoderado suplente
-- 2) register_student_enrollment(): registra TODA la ficha en un solo paso y en una
--    transacción (estudiante, apoderados, personas autorizadas a retirar, matrícula con
--    su folio, documentos recibidos y autorizaciones). Si el RUN ya existe, usa y
--    completa al estudiante (continuidad / reincorporación) en vez de duplicarlo.
-- 3) Pre-matrícula: campañas con un enlace público (una por año) y las solicitudes que
--    completan las familias; Inspectoría las revisa y las convierte en matrícula.
--
-- Ejecutar después de 0001-0058. No borra ni cambia datos existentes.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Columnas nuevas
-- ---------------------------------------------------------------------------
alter table public.students
  add column if not exists ipe text,
  add column if not exists social_name text;

alter table public.enrollments
  add column if not exists emergency_alerts text,
  add column if not exists support_coordination text check (support_coordination in ('si', 'no', 'verificar')),
  add column if not exists transport_mode text check (transport_mode in ('familia_a_pie', 'transporte_escolar', 'publico', 'otro')),
  add column if not exists rules_informed boolean not null default false,
  add column if not exists evaluation_rules_informed boolean not null default false,
  add column if not exists privacy_informed boolean not null default false,
  add column if not exists outings_informed boolean not null default false,
  add column if not exists received_by text;

alter table public.student_guardians
  add column if not exists is_substitute boolean not null default false;

-- ---------------------------------------------------------------------------
-- 2) Apoderado / contacto: crea o actualiza (uso interno de register_student_enrollment)
-- ---------------------------------------------------------------------------
-- p_kind: 'primary' (titular), 'substitute' (suplente) o 'emergency' (contacto de emergencia).
-- Si el estudiante ya tiene un apoderado con ese papel, se actualiza; si no, se crea.
-- Solo se pisan los datos que vienen con valor.
create or replace function public._matricula_upsert_guardian(p_student_id uuid, p_data jsonb, p_kind text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guardian_id uuid;
  v_name text := nullif(trim(coalesce(p_data->>'full_name', '')), '');
  v_run text := nullif(upper(regexp_replace(coalesce(p_data->>'run', ''), '[.\s]', '', 'g')), '');
  v_rel text := nullif(trim(coalesce(p_data->>'relationship', '')), '');
  v_phone text := nullif(trim(coalesce(p_data->>'phone', '')), '');
  v_phone_alt text := nullif(trim(coalesce(p_data->>'phone_alt', '')), '');
  v_email text := nullif(trim(coalesce(p_data->>'email', '')), '');
  v_address text := nullif(trim(coalesce(p_data->>'address', '')), '');
begin
  if v_name is null then
    return null;
  end if;

  select sg.guardian_id into v_guardian_id
  from public.student_guardians sg
  where sg.student_id = p_student_id
    and ((p_kind = 'primary' and sg.is_primary)
      or (p_kind = 'substitute' and sg.is_substitute)
      or (p_kind = 'emergency' and sg.is_emergency_contact and not sg.is_primary and not sg.is_substitute))
  limit 1;

  if v_guardian_id is not null then
    update public.guardians set
      full_name = v_name,
      run = coalesce(v_run, run),
      phone = coalesce(v_phone, phone),
      phone_alt = coalesce(v_phone_alt, phone_alt),
      email = coalesce(v_email, email),
      address = coalesce(v_address, address),
      relationship = coalesce(v_rel, relationship)
    where id = v_guardian_id;
    update public.student_guardians set relationship = coalesce(v_rel, relationship)
    where student_id = p_student_id and guardian_id = v_guardian_id;
  else
    insert into public.guardians (full_name, run, phone, phone_alt, email, address, relationship)
    values (v_name, v_run, v_phone, v_phone_alt, v_email, v_address, v_rel)
    returning id into v_guardian_id;

    insert into public.student_guardians (student_id, guardian_id, relationship, is_primary, is_emergency_contact, is_substitute)
    values (p_student_id, v_guardian_id, v_rel, p_kind = 'primary', p_kind = 'emergency', p_kind = 'substitute');
  end if;

  if p_kind = 'primary' then
    update public.students set guardian_id = v_guardian_id where id = p_student_id and guardian_id is null;
  end if;

  return v_guardian_id;
end;
$$;

-- Función interna: nadie la llama directamente, solo register_student_enrollment (security definer).
revoke execute on function public._matricula_upsert_guardian(uuid, jsonb, text) from public;

-- ---------------------------------------------------------------------------
-- 3) Registrar la ficha de matrícula completa
-- ---------------------------------------------------------------------------
-- p (jsonb):
--   academic_year_id, course_id, enrolled_at (fecha), admission_type ('Nueva' | 'Continuidad' | 'Traslado'),
--   origin_school, prematricula_id (opcional: la solicitud que se está matriculando)
--   student:    first_names, paternal_last_name, maternal_last_name, run, ipe, birth_date, nationality,
--               sex ('M' | 'F'), social_name, address_street, address_commune, address_sector
--   guardian / substitute / emergency: full_name, run, relationship, phone, phone_alt, email, address
--   pickup:     [{ full_name, relationship, phone }]
--   pickup_restriction (texto), emergency_alerts, support_coordination ('si' | 'no' | 'verificar'),
--   transport_mode, documents { codigo: true }, rules_informed, evaluation_rules_informed, privacy_informed,
--   outings_informed, image_authorization ('autorizo' | 'no_autorizo'), notes, received_by
create or replace function public.register_student_enrollment(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year_id uuid := nullif(p->>'academic_year_id', '')::uuid;
  v_course_id uuid := nullif(p->>'course_id', '')::uuid;
  v_year int;
  s jsonb := coalesce(p->'student', '{}'::jsonb);
  v_run text := upper(regexp_replace(coalesce(s->>'run', ''), '[.\s]', '', 'g'));
  v_first text := nullif(trim(coalesce(s->>'first_names', '')), '');
  v_last text := nullif(trim(coalesce(s->>'paternal_last_name', '') || ' ' || coalesce(s->>'maternal_last_name', '')), '');
  v_sex text := nullif(upper(trim(coalesce(s->>'sex', ''))), '');
  v_birth date := nullif(s->>'birth_date', '')::date;
  v_student_id uuid;
  v_created boolean := false;
  v_primary uuid;
  v_enrollment_id uuid;
  v_folio text;
  v_existing record;
  v_item jsonb;
  v_doc text;
  v_restriction text := nullif(trim(coalesce(p->>'pickup_restriction', '')), '');
  v_image text := nullif(p->>'image_authorization', '');
  v_enrolled_at date := coalesce(nullif(p->>'enrolled_at', '')::date, current_date);
  v_admission text := nullif(trim(coalesce(p->>'admission_type', '')), '');
begin
  if not public.has_any_role(array['director','utp','superadmin','inspectoria_general','administrativo']) then
    raise exception 'No autorizado';
  end if;
  if v_run = '' or v_first is null or v_last is null then
    raise exception 'Faltan los nombres, los apellidos o el RUN del estudiante';
  end if;
  if v_year_id is null or v_course_id is null then
    raise exception 'Falta el año o el curso de la matrícula';
  end if;
  select year into v_year from public.academic_years where id = v_year_id;
  if v_year is null then
    raise exception 'Año académico no encontrado';
  end if;
  if not exists (select 1 from public.courses where id = v_course_id and academic_year_id = v_year_id) then
    raise exception 'El curso indicado no corresponde a ese año académico';
  end if;
  if v_sex is not null and v_sex not in ('M', 'F') then
    v_sex := null;
  end if;

  -- Estudiante: se reutiliza si el RUN ya existe
  select id into v_student_id from public.students where run = v_run;
  if v_student_id is null then
    insert into public.students (
      first_names, last_names, run, birth_date, nationality, sex, ipe, social_name,
      address_street, address_commune, address_sector, status, active, first_enrollment_date
    ) values (
      v_first, v_last, v_run, v_birth,
      nullif(trim(coalesce(s->>'nationality', '')), ''), v_sex,
      nullif(trim(coalesce(s->>'ipe', '')), ''), nullif(trim(coalesce(s->>'social_name', '')), ''),
      nullif(trim(coalesce(s->>'address_street', '')), ''), nullif(trim(coalesce(s->>'address_commune', '')), ''),
      nullif(trim(coalesce(s->>'address_sector', '')), ''), 'matriculado', true, v_enrolled_at
    ) returning id into v_student_id;
    v_created := true;
  else
    update public.students set
      first_names = v_first,
      last_names = v_last,
      birth_date = coalesce(v_birth, birth_date),
      nationality = coalesce(nullif(trim(coalesce(s->>'nationality', '')), ''), nationality),
      sex = coalesce(v_sex, sex),
      ipe = coalesce(nullif(trim(coalesce(s->>'ipe', '')), ''), ipe),
      social_name = coalesce(nullif(trim(coalesce(s->>'social_name', '')), ''), social_name),
      address_street = coalesce(nullif(trim(coalesce(s->>'address_street', '')), ''), address_street),
      address_commune = coalesce(nullif(trim(coalesce(s->>'address_commune', '')), ''), address_commune),
      address_sector = coalesce(nullif(trim(coalesce(s->>'address_sector', '')), ''), address_sector),
      status = 'matriculado',
      active = true,
      first_enrollment_date = coalesce(first_enrollment_date, v_enrolled_at)
    where id = v_student_id;
  end if;

  -- Apoderados
  v_primary := public._matricula_upsert_guardian(v_student_id, coalesce(p->'guardian', '{}'::jsonb), 'primary');
  perform public._matricula_upsert_guardian(v_student_id, coalesce(p->'substitute', '{}'::jsonb), 'substitute');
  perform public._matricula_upsert_guardian(v_student_id, coalesce(p->'emergency', '{}'::jsonb), 'emergency');

  -- Personas autorizadas para retirar (no se duplican por nombre)
  for v_item in select * from jsonb_array_elements(coalesce(p->'pickup', '[]'::jsonb)) loop
    if nullif(trim(coalesce(v_item->>'full_name', '')), '') is not null
       and not exists (
         select 1 from public.student_pickup_authorizations a
         where a.student_id = v_student_id and lower(a.full_name) = lower(trim(v_item->>'full_name'))
       ) then
      insert into public.student_pickup_authorizations (student_id, full_name, relationship, phone, created_by)
      values (
        v_student_id, trim(v_item->>'full_name'),
        nullif(trim(coalesce(v_item->>'relationship', '')), ''), nullif(trim(coalesce(v_item->>'phone', '')), ''), auth.uid()
      );
    end if;
  end loop;

  -- Restricción de retiro (solo alerta mínima, igual que el resto de la plataforma)
  if v_restriction is not null then
    insert into public.student_pickup_restrictions (student_id, note, created_by)
    values (v_student_id, v_restriction, auth.uid())
    on conflict (student_id) do update set note = excluded.note;
    update public.students set pickup_restriction_flag = true where id = v_student_id;
  end if;

  -- Matrícula del año (una por estudiante y año): se crea con folio o se actualiza
  select id, status into v_existing from public.enrollments where student_id = v_student_id and academic_year_id = v_year_id;
  if v_existing.id is null then
    v_folio := public.next_certificate_folio('matricula', v_year);
    insert into public.enrollments (
      student_id, course_id, academic_year_id, status, enrolled_at, enrollment_number,
      origin_school, admission_condition, notes, emergency_alerts, support_coordination, transport_mode,
      rules_informed, evaluation_rules_informed, privacy_informed, outings_informed, received_by
    ) values (
      v_student_id, v_course_id, v_year_id, 'activa', v_enrolled_at, v_folio,
      nullif(trim(coalesce(p->>'origin_school', '')), ''), v_admission, nullif(trim(coalesce(p->>'notes', '')), ''),
      nullif(trim(coalesce(p->>'emergency_alerts', '')), ''), nullif(p->>'support_coordination', ''), nullif(p->>'transport_mode', ''),
      coalesce((p->>'rules_informed')::boolean, false), coalesce((p->>'evaluation_rules_informed')::boolean, false),
      coalesce((p->>'privacy_informed')::boolean, false), coalesce((p->>'outings_informed')::boolean, false),
      nullif(trim(coalesce(p->>'received_by', '')), '')
    ) returning id, enrollment_number into v_enrollment_id, v_folio;
  else
    update public.enrollments set
      course_id = v_course_id,
      status = 'activa',
      enrolled_at = v_enrolled_at,
      origin_school = coalesce(nullif(trim(coalesce(p->>'origin_school', '')), ''), origin_school),
      admission_condition = coalesce(v_admission, admission_condition),
      notes = coalesce(nullif(trim(coalesce(p->>'notes', '')), ''), notes),
      emergency_alerts = coalesce(nullif(trim(coalesce(p->>'emergency_alerts', '')), ''), emergency_alerts),
      support_coordination = coalesce(nullif(p->>'support_coordination', ''), support_coordination),
      transport_mode = coalesce(nullif(p->>'transport_mode', ''), transport_mode),
      rules_informed = coalesce((p->>'rules_informed')::boolean, rules_informed),
      evaluation_rules_informed = coalesce((p->>'evaluation_rules_informed')::boolean, evaluation_rules_informed),
      privacy_informed = coalesce((p->>'privacy_informed')::boolean, privacy_informed),
      outings_informed = coalesce((p->>'outings_informed')::boolean, outings_informed),
      received_by = coalesce(nullif(trim(coalesce(p->>'received_by', '')), ''), received_by)
    where id = v_existing.id
    returning id, enrollment_number into v_enrollment_id, v_folio;
  end if;

  -- Documentos recibidos (solo se marcan los entregados; nunca se baja uno ya entregado)
  for v_doc in select key from jsonb_each(coalesce(p->'documents', '{}'::jsonb)) where value = 'true'::jsonb loop
    insert into public.student_enrollment_documents (student_id, doc_type, status, doc_date, created_by)
    values (v_student_id, v_doc, 'entregado', current_date, auth.uid())
    on conflict (student_id, doc_type) do update set status = 'entregado', doc_date = current_date;
  end loop;

  -- Autorización de uso de imagen (voluntaria, no condiciona la matrícula)
  if v_image in ('autorizo', 'no_autorizo') then
    insert into public.student_authorizations (student_id, auth_type, authorized, guardian_id, created_by)
    values (v_student_id, 'uso_imagen', v_image = 'autorizo', v_primary, auth.uid())
    on conflict (student_id, auth_type) do update
      set authorized = excluded.authorized, authorized_at = current_date, guardian_id = excluded.guardian_id;
  end if;

  -- Si venía de una pre-matrícula, queda marcada como matriculada
  if nullif(p->>'prematricula_id', '') is not null then
    update public.prematricula_requests set
      status = 'matriculada',
      student_id = v_student_id,
      enrollment_id = v_enrollment_id,
      reviewed_by = auth.uid(),
      reviewed_at = now()
    where id = (p->>'prematricula_id')::uuid;
  end if;

  perform public.log_audit('registrar_matricula', 'matricula', 'enrollments', v_enrollment_id::text,
    jsonb_build_object('student_id', v_student_id, 'academic_year', v_year, 'course_id', v_course_id,
      'new_student', v_created, 'admission_type', v_admission, 'prematricula_id', p->>'prematricula_id'));

  return jsonb_build_object(
    'student_id', v_student_id,
    'enrollment_id', v_enrollment_id,
    'enrollment_number', v_folio,
    'created_student', v_created
  );
end;
$$;

revoke execute on function public.register_student_enrollment(jsonb) from public;
grant execute on function public.register_student_enrollment(jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 4) Pre-matrícula en línea
-- ---------------------------------------------------------------------------
create table public.prematricula_campaigns (
  id uuid primary key default gen_random_uuid(),
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  title text not null,
  intro_text text,
  -- Token del enlace público: largo y aleatorio, no adivinable.
  token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  active boolean not null default true,
  opens_at timestamptz,
  closes_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.prematricula_requests (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.prematricula_campaigns(id) on delete cascade,
  status text not null default 'pendiente' check (status in ('pendiente', 'revisada', 'aceptada', 'rechazada', 'matriculada')),
  student_run text,
  student_name text,
  level_requested text,
  admission_type text,
  guardian_name text,
  guardian_phone text,
  guardian_email text,
  -- Toda la ficha tal como la completó la familia.
  data jsonb not null,
  staff_notes text,
  student_id uuid references public.students(id) on delete set null,
  enrollment_id uuid references public.enrollments(id) on delete set null,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_prematricula_requests_campaign on public.prematricula_requests (campaign_id, created_at desc);
create index idx_prematricula_requests_status on public.prematricula_requests (status);

alter table public.prematricula_campaigns enable row level security;
alter table public.prematricula_requests enable row level security;

-- Campañas: la familia solo ve las abiertas (para armar el formulario); el personal ve todas.
create policy "prematricula_campaigns_select_open_anon" on public.prematricula_campaigns
  for select to anon, authenticated
  using (active and (opens_at is null or opens_at <= now()) and (closes_at is null or closes_at > now()));
create policy "prematricula_campaigns_select_staff" on public.prematricula_campaigns
  for select to authenticated
  using (public.has_any_role(array['director','utp','superadmin','inspectoria_general','administrativo']));
create policy "prematricula_campaigns_write_staff" on public.prematricula_campaigns
  for all to authenticated
  using (public.has_any_role(array['director','utp','superadmin','inspectoria_general']))
  with check (public.has_any_role(array['director','utp','superadmin','inspectoria_general']));

-- Solicitudes: la familia solo puede ENVIAR (insertar en una campaña abierta); nunca leer ni modificar.
create policy "prematricula_requests_insert_public" on public.prematricula_requests
  for insert to anon, authenticated
  with check (
    status = 'pendiente'
    and pg_column_size(data) < 60000
    and exists (
      select 1 from public.prematricula_campaigns c
      where c.id = campaign_id and c.active
        and (c.opens_at is null or c.opens_at <= now())
        and (c.closes_at is null or c.closes_at > now())
    )
  );
create policy "prematricula_requests_staff" on public.prematricula_requests
  for all to authenticated
  using (public.has_any_role(array['director','utp','superadmin','inspectoria_general','administrativo']))
  with check (public.has_any_role(array['director','utp','superadmin','inspectoria_general','administrativo']));

grant select on public.prematricula_campaigns to anon;
grant insert on public.prematricula_requests to anon;
grant select, insert, update, delete on public.prematricula_campaigns to authenticated;
grant select, insert, update, delete on public.prematricula_requests to authenticated;
