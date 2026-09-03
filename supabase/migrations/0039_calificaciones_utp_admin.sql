-- =============================================================================
-- Administración avanzada de Calificaciones para UTP/Director/Superadmin
-- =============================================================================
-- 1) Amplía evaluations.status (agrega, no reemplaza valores existentes).
-- 2) grade_change_history: historial de cada cambio de nota, protegido por
--    trigger (no depende de que el frontend recuerde registrarlo).
-- 3) RPCs security definer para escritura administrativa de notas y
--    eliminación de evaluación, que dejan el "motivo" disponible para el
--    trigger dentro de la misma transacción.
-- 4) RLS: agrega UTP a la rama administrativa de grades_insert/update/delete
--    (evaluations_* no se toca -- UTP ya tenía control total ahí vía
--    is_academic_management()).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Estados de evaluación -- se agregan valores, no se renombra ninguno.
--    planificada/aplicada/cerrada siguen significando lo mismo que hoy.
-- ---------------------------------------------------------------------------
alter table public.evaluations drop constraint if exists evaluations_status_check;
alter table public.evaluations add constraint evaluations_status_check
  check (status in ('planificada','aplicada','cerrada','borrador','archivada'));

-- ---------------------------------------------------------------------------
-- 2) grade_change_history
-- ---------------------------------------------------------------------------
create table public.grade_change_history (
  id uuid primary key default gen_random_uuid(),
  evaluation_id uuid references public.evaluations(id) on delete set null,
  student_id uuid references public.students(id) on delete set null,
  previous_score numeric(3,1),
  new_score numeric(3,1),
  action text not null check (action in ('creada','modificada','eliminada','restaurada')),
  reason text check (reason in ('error_digitacion','correccion_docente','evaluacion_recuperativa','autorizacion_utp','otro')),
  reason_note text,
  changed_by uuid references public.profiles(id) on delete set null,
  -- Desnormalizado a propósito: evaluation_id usa ON DELETE SET NULL (nunca
  -- CASCADE) para que el historial sobreviva a la eliminación de la
  -- evaluación, pero sin estos 3 campos la fila quedaría sin poder decir
  -- "de qué evaluación/curso/asignatura era" una vez que el FK se anula.
  evaluation_name text,
  course_id uuid references public.courses(id) on delete set null,
  subject_id uuid references public.subjects(id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_grade_change_history_student on public.grade_change_history(student_id);
create index idx_grade_change_history_evaluation on public.grade_change_history(evaluation_id);
create index idx_grade_change_history_course on public.grade_change_history(course_id);
create index idx_grade_change_history_subject on public.grade_change_history(subject_id);
create index idx_grade_change_history_changed_by on public.grade_change_history(changed_by);
create index idx_grade_change_history_created_at on public.grade_change_history(created_at desc);

alter table public.grade_change_history enable row level security;

-- Solo lectura para roles de gestión académica -- coincide con "Ver
-- historial de modificaciones" pedido para Director/UTP. Sin políticas de
-- insert/update/delete: la única vía de escritura es el trigger de abajo
-- (security definer), igual que audit_logs con log_audit().
create policy "grade_change_history_select_admin" on public.grade_change_history
  for select to authenticated
  using (public.is_academic_management());

grant select on public.grade_change_history to authenticated;

-- ---------------------------------------------------------------------------
-- 3) Trigger de historial sobre grades -- captura TODO insert/update/delete,
--    sin importar si vino de un RPC nuevo o de una escritura directa (ej. el
--    GradeEntryGrid actual del docente, que no se modifica). El "motivo" y
--    el "snapshot" de la evaluación (para el caso de eliminación en cascada,
--    donde la fila de evaluations ya no existe cuando este trigger corre
--    sobre cada nota) se leen de variables de sesión que las RPC de abajo
--    dejan configuradas dentro de la misma transacción con set_config(...,
--    true) -- "true" = LOCAL a la transacción, se limpia solo al terminar.
-- ---------------------------------------------------------------------------
create or replace function public.log_grade_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_eval record;
  v_snapshot jsonb;
  v_reason text;
  v_note text;
begin
  v_reason := nullif(current_setting('app.grade_change_reason', true), '');
  v_note := nullif(current_setting('app.grade_change_note', true), '');

  if tg_op = 'DELETE' then
    select name, course_id, subject_id into v_eval from public.evaluations where id = old.evaluation_id;
    if not found then
      v_snapshot := nullif(current_setting('app.grade_change_eval_snapshot', true), '')::jsonb;
      if v_snapshot is not null then
        v_eval.name := v_snapshot->>'name';
        v_eval.course_id := (v_snapshot->>'course_id')::uuid;
        v_eval.subject_id := (v_snapshot->>'subject_id')::uuid;
      end if;
    end if;

    insert into public.grade_change_history
      (evaluation_id, student_id, previous_score, new_score, action, reason, reason_note, changed_by, evaluation_name, course_id, subject_id)
    values
      (old.evaluation_id, old.student_id, old.score, null, 'eliminada', v_reason, v_note, auth.uid(), v_eval.name, v_eval.course_id, v_eval.subject_id);
    return old;

  elsif tg_op = 'UPDATE' then
    if old.score is distinct from new.score then
      select name, course_id, subject_id into v_eval from public.evaluations where id = new.evaluation_id;
      insert into public.grade_change_history
        (evaluation_id, student_id, previous_score, new_score, action, reason, reason_note, changed_by, evaluation_name, course_id, subject_id)
      values
        (new.evaluation_id, new.student_id, old.score, new.score, 'modificada', v_reason, v_note, auth.uid(), v_eval.name, v_eval.course_id, v_eval.subject_id);
    end if;
    return new;

  elsif tg_op = 'INSERT' then
    select name, course_id, subject_id into v_eval from public.evaluations where id = new.evaluation_id;
    insert into public.grade_change_history
      (evaluation_id, student_id, previous_score, new_score, action, reason, reason_note, changed_by, evaluation_name, course_id, subject_id)
    values
      (new.evaluation_id, new.student_id, null, new.score, 'creada', v_reason, v_note, auth.uid(), v_eval.name, v_eval.course_id, v_eval.subject_id);
    return new;
  end if;

  return null;
end;
$$;

create trigger trg_grades_history
  after insert or update or delete on public.grades
  for each row execute function public.log_grade_change();

-- ---------------------------------------------------------------------------
-- 4) RPCs administrativas -- verifican rol explícitamente (no dependen solo
--    de RLS, ya que son security definer y la bypasean), exigen motivo, y
--    dejan la config de sesión para que el trigger de arriba la use.
-- ---------------------------------------------------------------------------
create or replace function public.set_grade_administrative(
  p_evaluation_id uuid,
  p_student_id uuid,
  p_score numeric,
  p_reason text,
  p_reason_note text default null
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_any_role(array['director','utp','superadmin']) then
    raise exception 'No autorizado';
  end if;
  if p_reason is null or p_reason = '' then
    raise exception 'Debe indicar un motivo de modificación';
  end if;
  if not exists (select 1 from public.evaluations where id = p_evaluation_id) then
    raise exception 'Evaluación no encontrada';
  end if;

  perform set_config('app.grade_change_reason', p_reason, true);
  perform set_config('app.grade_change_note', coalesce(p_reason_note, ''), true);

  insert into public.grades (evaluation_id, student_id, score, entered_by, updated_by)
  values (p_evaluation_id, p_student_id, p_score, auth.uid(), auth.uid())
  on conflict (evaluation_id, student_id)
  do update set score = excluded.score, updated_by = auth.uid();

  perform public.log_audit('modificar_nota_admin', 'calificaciones', 'grades', p_student_id::text,
    jsonb_build_object('evaluation_id', p_evaluation_id, 'score', p_score, 'reason', p_reason));
end;
$$;

create or replace function public.delete_grade_administrative(
  p_evaluation_id uuid,
  p_student_id uuid,
  p_reason text,
  p_reason_note text default null
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_any_role(array['director','utp','superadmin']) then
    raise exception 'No autorizado';
  end if;
  if p_reason is null or p_reason = '' then
    raise exception 'Debe indicar un motivo de modificación';
  end if;

  perform set_config('app.grade_change_reason', p_reason, true);
  perform set_config('app.grade_change_note', coalesce(p_reason_note, ''), true);

  delete from public.grades where evaluation_id = p_evaluation_id and student_id = p_student_id;

  perform public.log_audit('eliminar_nota_admin', 'calificaciones', 'grades', p_student_id::text,
    jsonb_build_object('evaluation_id', p_evaluation_id, 'reason', p_reason));
end;
$$;

create or replace function public.delete_evaluation_administrative(
  p_evaluation_id uuid,
  p_reason text,
  p_reason_note text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_eval record;
begin
  if not public.has_any_role(array['director','utp','superadmin']) then
    raise exception 'No autorizado';
  end if;
  if p_reason is null or p_reason = '' then
    raise exception 'Debe indicar un motivo';
  end if;

  select name, course_id, subject_id into v_eval from public.evaluations where id = p_evaluation_id;
  if not found then
    raise exception 'Evaluación no encontrada';
  end if;

  perform set_config('app.grade_change_reason', p_reason, true);
  perform set_config('app.grade_change_note', coalesce(p_reason_note, ''), true);
  perform set_config(
    'app.grade_change_eval_snapshot',
    jsonb_build_object('name', v_eval.name, 'course_id', v_eval.course_id, 'subject_id', v_eval.subject_id)::text,
    true
  );

  -- El trigger sobre grades captura cada nota eliminada por esta cascada,
  -- usando el snapshot recién dejado (la fila de evaluations ya no existirá
  -- para ese momento).
  delete from public.evaluations where id = p_evaluation_id;

  perform public.log_audit('eliminar_evaluacion', 'calificaciones', 'evaluations', p_evaluation_id::text,
    jsonb_build_object('name', v_eval.name, 'reason', p_reason));
end;
$$;

revoke execute on function public.set_grade_administrative(uuid, uuid, numeric, text, text) from public;
revoke execute on function public.delete_grade_administrative(uuid, uuid, text, text) from public;
revoke execute on function public.delete_evaluation_administrative(uuid, text, text) from public;
grant execute on function public.set_grade_administrative(uuid, uuid, numeric, text, text) to authenticated;
grant execute on function public.delete_grade_administrative(uuid, uuid, text, text) to authenticated;
grant execute on function public.delete_evaluation_administrative(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 5) RLS grades -- agrega UTP a la rama administrativa. evaluations_* no se
--    toca (UTP ya tenía control total vía is_academic_management()).
-- ---------------------------------------------------------------------------
alter policy "grades_insert_scope" on public.grades
  with check (
    public.has_any_role(array['director','utp','superadmin'])
    or (public.owns_evaluation(evaluation_id) and public.evaluation_period_open(evaluation_id))
  );

alter policy "grades_update_scope" on public.grades
  using (
    public.has_any_role(array['director','utp','superadmin'])
    or (public.owns_evaluation(evaluation_id) and public.evaluation_period_open(evaluation_id))
  )
  with check (
    public.has_any_role(array['director','utp','superadmin'])
    or (public.owns_evaluation(evaluation_id) and public.evaluation_period_open(evaluation_id))
  );

alter policy "grades_delete_scope" on public.grades
  using (
    public.has_any_role(array['director','utp','superadmin'])
    or (public.owns_evaluation(evaluation_id) and public.evaluation_period_open(evaluation_id))
  );
