-- =============================================================================
-- Row Level Security — Escuela Profesor Pedro Viveros Ormeño
-- La seguridad vive en la base de datos: el frontend solo oculta botones,
-- estas políticas son la barrera real. Ejecutar después de 0001_schema.sql.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Alta automática de perfil al crear un usuario en Supabase Auth
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Helpers de alcance docente
-- ---------------------------------------------------------------------------
create or replace function public.teaches_course(p_course_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.teacher_assignments ta
    where ta.course_id = p_course_id and ta.teacher_id = auth.uid() and ta.active
  ) or exists (
    select 1 from public.courses c
    where c.id = p_course_id and c.homeroom_teacher_id = auth.uid()
  );
$$;

create or replace function public.owns_evaluation(p_evaluation_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.evaluations e
    where e.id = p_evaluation_id and e.teacher_id = auth.uid()
  );
$$;

create or replace function public.evaluation_period_open(p_evaluation_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select ap.status = 'abierto'
    from public.evaluations e
    join public.academic_periods ap on ap.id = e.period_id
    where e.id = p_evaluation_id
  ), false);
$$;

create or replace function public.teaches_student(p_student_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.enrollments en
    where en.student_id = p_student_id
      and en.status = 'activa'
      and public.teaches_course(en.course_id)
  );
$$;

-- ---------------------------------------------------------------------------
-- Auditoría (solo insertable vía función security definer)
-- ---------------------------------------------------------------------------
create or replace function public.log_audit(
  p_action text, p_module text, p_entity text default null,
  p_entity_id text default null, p_details jsonb default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_logs (user_id, action, module, entity, entity_id, details)
  values (auth.uid(), p_action, p_module, p_entity, p_entity_id, p_details);
end;
$$;

-- ---------------------------------------------------------------------------
-- Activar RLS en todas las tablas
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.user_roles enable row level security;
alter table public.academic_years enable row level security;
alter table public.courses enable row level security;
alter table public.subjects enable row level security;
alter table public.teacher_assignments enable row level security;
alter table public.guardians enable row level security;
alter table public.students enable row level security;
alter table public.enrollments enable row level security;
alter table public.academic_periods enable row level security;
alter table public.evaluations enable row level security;
alter table public.grades enable row level security;
alter table public.attendance enable row level security;
alter table public.learning_objectives enable row level security;
alter table public.lesson_plans enable row level security;
alter table public.lesson_plan_objectives enable row level security;
alter table public.student_support enable row level security;
alter table public.pie_records enable row level security;
alter table public.classroom_observations enable row level security;
alter table public.certificate_sequences enable row level security;
alter table public.certificates enable row level security;
alter table public.staff_members enable row level security;
alter table public.news enable row level security;
alter table public.gallery enable row level security;
alter table public.documents enable row level security;
alter table public.events enable row level security;
alter table public.contact_messages enable row level security;
alter table public.school_config enable row level security;
alter table public.audit_logs enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create policy "profiles_select_authenticated" on public.profiles
  for select to authenticated using (true);
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles_manage_admin" on public.profiles
  for all to authenticated using (public.has_any_role(array['director','superadmin']))
  with check (public.has_any_role(array['director','superadmin']));

-- ---------------------------------------------------------------------------
-- roles / user_roles
-- ---------------------------------------------------------------------------
create policy "roles_select_authenticated" on public.roles
  for select to authenticated using (true);
create policy "roles_write_superadmin" on public.roles
  for all to authenticated using (public.has_role('superadmin')) with check (public.has_role('superadmin'));

create policy "user_roles_select_own_or_admin" on public.user_roles
  for select to authenticated
  using (user_id = auth.uid() or public.has_any_role(array['director','superadmin','utp']));
create policy "user_roles_write_admin" on public.user_roles
  for all to authenticated
  using (public.has_any_role(array['director','superadmin']))
  with check (public.has_any_role(array['director','superadmin']));

-- ---------------------------------------------------------------------------
-- academic_years / subjects / courses / teacher_assignments
-- ---------------------------------------------------------------------------
create policy "academic_years_select_authenticated" on public.academic_years
  for select to authenticated using (true);
create policy "academic_years_write_admin" on public.academic_years
  for all to authenticated using (public.has_any_role(array['director','superadmin']))
  with check (public.has_any_role(array['director','superadmin']));

create policy "subjects_select_authenticated" on public.subjects
  for select to authenticated using (true);
create policy "subjects_write_admin" on public.subjects
  for all to authenticated using (public.has_any_role(array['director','utp','superadmin']))
  with check (public.has_any_role(array['director','utp','superadmin']));

create policy "courses_select_authenticated" on public.courses
  for select to authenticated using (true);
create policy "courses_select_public_anon" on public.courses
  for select to anon using (public_visible = true and active = true);
create policy "courses_write_admin" on public.courses
  for all to authenticated using (public.has_any_role(array['director','utp','superadmin']))
  with check (public.has_any_role(array['director','utp','superadmin']));

create policy "teacher_assignments_select_scope" on public.teacher_assignments
  for select to authenticated
  using (teacher_id = auth.uid() or public.is_academic_management());
create policy "teacher_assignments_write_admin" on public.teacher_assignments
  for all to authenticated using (public.has_any_role(array['director','utp','superadmin']))
  with check (public.has_any_role(array['director','utp','superadmin']));

-- ---------------------------------------------------------------------------
-- guardians / students / enrollments (privados — nunca públicos)
-- ---------------------------------------------------------------------------
create policy "guardians_select_scope" on public.guardians
  for select to authenticated
  using (public.has_any_role(array['director','utp','administrativo','pie','convivencia','superadmin']));
create policy "guardians_write_admin" on public.guardians
  for all to authenticated using (public.has_any_role(array['director','utp','administrativo','superadmin']))
  with check (public.has_any_role(array['director','utp','administrativo','superadmin']));

create policy "students_select_scope" on public.students
  for select to authenticated
  using (
    public.has_any_role(array['director','utp','administrativo','pie','convivencia','superadmin'])
    or public.teaches_student(id)
  );
create policy "students_write_admin" on public.students
  for all to authenticated using (public.has_any_role(array['director','utp','administrativo','superadmin']))
  with check (public.has_any_role(array['director','utp','administrativo','superadmin']));

create policy "enrollments_select_scope" on public.enrollments
  for select to authenticated
  using (public.is_academic_management() or public.has_role('administrativo') or public.teaches_course(course_id));
create policy "enrollments_write_admin" on public.enrollments
  for all to authenticated using (public.has_any_role(array['director','utp','administrativo','superadmin']))
  with check (public.has_any_role(array['director','utp','administrativo','superadmin']));

-- ---------------------------------------------------------------------------
-- academic_periods
-- ---------------------------------------------------------------------------
create policy "periods_select_authenticated" on public.academic_periods
  for select to authenticated using (true);
create policy "periods_insert_admin" on public.academic_periods
  for insert to authenticated with check (public.has_any_role(array['director','utp','superadmin']));
create policy "periods_update_close_director" on public.academic_periods
  for update to authenticated
  using (public.has_any_role(array['director','superadmin']))
  with check (public.has_any_role(array['director','superadmin']));

-- ---------------------------------------------------------------------------
-- evaluations
-- ---------------------------------------------------------------------------
create policy "evaluations_select_scope" on public.evaluations
  for select to authenticated
  using (teacher_id = auth.uid() or public.is_academic_management());
create policy "evaluations_insert_scope" on public.evaluations
  for insert to authenticated
  with check (
    public.is_academic_management()
    or (teacher_id = auth.uid() and public.teaches_course(course_id))
  );
create policy "evaluations_update_scope" on public.evaluations
  for update to authenticated
  using (public.is_academic_management() or (teacher_id = auth.uid() and public.teaches_course(course_id)))
  with check (public.is_academic_management() or (teacher_id = auth.uid() and public.teaches_course(course_id)));
create policy "evaluations_delete_scope" on public.evaluations
  for delete to authenticated
  using (public.is_academic_management() or (teacher_id = auth.uid() and public.teaches_course(course_id)));

-- ---------------------------------------------------------------------------
-- grades (administrativo NO puede escribir notas salvo permiso explícito)
-- ---------------------------------------------------------------------------
create policy "grades_select_scope" on public.grades
  for select to authenticated
  using (public.is_academic_management() or public.owns_evaluation(evaluation_id));
create policy "grades_insert_scope" on public.grades
  for insert to authenticated
  with check (
    public.has_any_role(array['director','superadmin'])
    or (public.owns_evaluation(evaluation_id) and public.evaluation_period_open(evaluation_id))
  );
create policy "grades_update_scope" on public.grades
  for update to authenticated
  using (
    public.has_any_role(array['director','superadmin'])
    or (public.owns_evaluation(evaluation_id) and public.evaluation_period_open(evaluation_id))
  )
  with check (
    public.has_any_role(array['director','superadmin'])
    or (public.owns_evaluation(evaluation_id) and public.evaluation_period_open(evaluation_id))
  );
create policy "grades_delete_scope" on public.grades
  for delete to authenticated
  using (
    public.has_any_role(array['director','superadmin'])
    or (public.owns_evaluation(evaluation_id) and public.evaluation_period_open(evaluation_id))
  );

-- ---------------------------------------------------------------------------
-- attendance
-- ---------------------------------------------------------------------------
create policy "attendance_select_scope" on public.attendance
  for select to authenticated
  using (public.is_academic_management() or public.has_role('convivencia') or public.teaches_course(course_id));
create policy "attendance_write_scope" on public.attendance
  for all to authenticated
  using (public.is_academic_management() or public.teaches_course(course_id))
  with check (public.is_academic_management() or public.teaches_course(course_id));

-- ---------------------------------------------------------------------------
-- learning_objectives / lesson_plans
-- ---------------------------------------------------------------------------
create policy "objectives_select_authenticated" on public.learning_objectives
  for select to authenticated using (true);
create policy "objectives_write_admin" on public.learning_objectives
  for all to authenticated using (public.has_any_role(array['director','utp','superadmin']))
  with check (public.has_any_role(array['director','utp','superadmin']));

create policy "lesson_plans_select_scope" on public.lesson_plans
  for select to authenticated
  using (teacher_id = auth.uid() or public.is_academic_management());
create policy "lesson_plans_insert_own" on public.lesson_plans
  for insert to authenticated
  with check (teacher_id = auth.uid() or public.is_academic_management());
create policy "lesson_plans_update_scope" on public.lesson_plans
  for update to authenticated
  using (teacher_id = auth.uid() or public.is_academic_management())
  with check (teacher_id = auth.uid() or public.is_academic_management());
create policy "lesson_plans_delete_scope" on public.lesson_plans
  for delete to authenticated using (teacher_id = auth.uid() or public.is_academic_management());

create policy "lesson_plan_objectives_select" on public.lesson_plan_objectives
  for select to authenticated using (true);
create policy "lesson_plan_objectives_write" on public.lesson_plan_objectives
  for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- student_support (seguimiento pedagógico)
-- ---------------------------------------------------------------------------
create policy "student_support_select_scope" on public.student_support
  for select to authenticated
  using (
    public.is_academic_management() or public.has_role('convivencia')
    or responsible_id = auth.uid() or public.teaches_student(student_id)
  );
create policy "student_support_write_scope" on public.student_support
  for all to authenticated
  using (public.is_academic_management() or public.has_role('convivencia') or public.teaches_student(student_id))
  with check (public.is_academic_management() or public.has_role('convivencia') or public.teaches_student(student_id));

-- ---------------------------------------------------------------------------
-- pie_records (estrictamente confidencial)
-- ---------------------------------------------------------------------------
create policy "pie_records_select_scope" on public.pie_records
  for select to authenticated
  using (public.has_any_role(array['pie','director','utp','superadmin']));
create policy "pie_records_write_scope" on public.pie_records
  for all to authenticated
  using (public.has_any_role(array['pie','director','utp','superadmin']))
  with check (public.has_any_role(array['pie','director','utp','superadmin']));

-- ---------------------------------------------------------------------------
-- classroom_observations (acompañamiento docente)
-- ---------------------------------------------------------------------------
create policy "observations_select_scope" on public.classroom_observations
  for select to authenticated
  using (teacher_id = auth.uid() or public.is_academic_management());
create policy "observations_write_admin" on public.classroom_observations
  for all to authenticated
  using (public.is_academic_management())
  with check (public.is_academic_management());

-- ---------------------------------------------------------------------------
-- certificates
-- ---------------------------------------------------------------------------
create policy "certificates_select_scope" on public.certificates
  for select to authenticated
  using (public.has_any_role(array['director','utp','administrativo','superadmin']));
create policy "certificates_insert_scope" on public.certificates
  for insert to authenticated
  with check (public.has_any_role(array['director','utp','administrativo','superadmin']));
create policy "certificates_update_scope" on public.certificates
  for update to authenticated
  using (public.has_any_role(array['director','utp','superadmin']))
  with check (public.has_any_role(array['director','utp','superadmin']));

-- certificate_sequences: sin políticas -> solo accesible vía función security definer

-- ---------------------------------------------------------------------------
-- staff_members (equipo público)
-- ---------------------------------------------------------------------------
create policy "staff_select_public_active" on public.staff_members
  for select to anon, authenticated using (active = true);
create policy "staff_write_admin" on public.staff_members
  for all to authenticated using (public.has_any_role(array['director','utp','superadmin']))
  with check (public.has_any_role(array['director','utp','superadmin']));

-- ---------------------------------------------------------------------------
-- news / gallery / documents / events (contenido público administrable)
-- ---------------------------------------------------------------------------
create policy "news_select_published_anon" on public.news
  for select to anon using (published = true);
create policy "news_select_all_staff" on public.news
  for select to authenticated using (true);
create policy "news_write_admin" on public.news
  for all to authenticated using (public.has_any_role(array['director','utp','superadmin']))
  with check (public.has_any_role(array['director','utp','superadmin']));

create policy "gallery_select_published_anon" on public.gallery
  for select to anon using (published = true);
create policy "gallery_select_all_staff" on public.gallery
  for select to authenticated using (true);
create policy "gallery_write_admin" on public.gallery
  for all to authenticated using (public.has_any_role(array['director','utp','superadmin']))
  with check (public.has_any_role(array['director','utp','superadmin']));

create policy "documents_select_public_anon" on public.documents
  for select to anon using (is_public = true);
create policy "documents_select_all_staff" on public.documents
  for select to authenticated using (true);
create policy "documents_write_admin" on public.documents
  for all to authenticated using (public.has_any_role(array['director','utp','administrativo','superadmin']))
  with check (public.has_any_role(array['director','utp','administrativo','superadmin']));

create policy "events_select_authenticated" on public.events
  for select to authenticated using (true);
create policy "events_write_admin" on public.events
  for all to authenticated using (public.has_any_role(array['director','utp','superadmin']))
  with check (public.has_any_role(array['director','utp','superadmin']));

-- ---------------------------------------------------------------------------
-- contact_messages (formulario público)
-- ---------------------------------------------------------------------------
create policy "contact_insert_anon" on public.contact_messages
  for insert to anon, authenticated with check (true);
create policy "contact_select_admin" on public.contact_messages
  for select to authenticated using (public.has_any_role(array['director','administrativo','superadmin']));
create policy "contact_update_admin" on public.contact_messages
  for update to authenticated
  using (public.has_any_role(array['director','administrativo','superadmin']))
  with check (public.has_any_role(array['director','administrativo','superadmin']));

-- ---------------------------------------------------------------------------
-- school_config
-- ---------------------------------------------------------------------------
create policy "config_select_public_anon" on public.school_config
  for select to anon using (is_public = true);
create policy "config_select_all_staff" on public.school_config
  for select to authenticated using (true);
create policy "config_write_admin" on public.school_config
  for all to authenticated using (public.has_any_role(array['director','superadmin']))
  with check (public.has_any_role(array['director','superadmin']));

-- ---------------------------------------------------------------------------
-- audit_logs: solo lectura para dirección; sin insert directo (usar log_audit)
-- ---------------------------------------------------------------------------
create policy "audit_select_admin" on public.audit_logs
  for select to authenticated using (public.has_any_role(array['director','superadmin']));
