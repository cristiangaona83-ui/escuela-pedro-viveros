-- =============================================================================
-- Un docente ve y puede calificar TODAS las evaluaciones/notas de un curso
-- que enseña, sin importar quién haya creado la evaluación.
-- =============================================================================
-- Diagnóstico: `evaluations`/`grades` decidían visibilidad y escritura por
-- "quién es dueño de la evaluación" (evaluations.teacher_id = auth.uid(),
-- via owns_evaluation()), no por "quién enseña ese curso/asignatura"
-- (teacher_assignments, via teaches_course() -- ya existe, usada en
-- attendance y otras tablas). Cuando UTP/Dirección crea una evaluación
-- para el curso de un docente (ej. desde "Gestionar evaluaciones" o el
-- módulo Evaluaciones), esa fila queda con teacher_id = UTP, no el
-- profesor real -- y el docente queda sin ver ni poder calificar esa
-- evaluación, aunque sea de su propio curso.
--
-- Esta migración es ADITIVA: en cada política se agrega `teaches_course`/
-- `teaches_evaluation` con OR junto a la condición que ya existía (nunca
-- se reemplaza ni se le quita acceso a nadie que ya lo tenía). Solo cambia
-- SELECT/INSERT/UPDATE/DELETE de docentes sobre evaluaciones/notas de
-- cursos donde tienen una asignación activa (o son profesor/a jefe) --
-- Dirección/UTP/superadmin ya tenían control total y no cambian.
-- =============================================================================

-- `teaches_evaluation`: igual que `owns_evaluation`, pero por asignación
-- real de curso (teaches_course) en vez de por autoría de la evaluación.
create or replace function public.teaches_evaluation(p_evaluation_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.evaluations e
    where e.id = p_evaluation_id and public.teaches_course(e.course_id)
  );
$$;

-- ---------------------------------------------------------------------------
-- evaluations: ver/editar/eliminar cualquier evaluación del curso que se
-- enseña (crear ya funcionaba igual: cualquier docente que enseña el curso
-- puede crear evaluaciones ahí, sin cambios).
-- ---------------------------------------------------------------------------
alter policy "evaluations_select_scope" on public.evaluations
  using (teacher_id = auth.uid() or public.teaches_course(course_id) or public.is_academic_management());

alter policy "evaluations_update_scope" on public.evaluations
  using (public.is_academic_management() or public.teaches_course(course_id))
  with check (public.is_academic_management() or public.teaches_course(course_id));

alter policy "evaluations_delete_scope" on public.evaluations
  using (public.is_academic_management() or public.teaches_course(course_id));

-- ---------------------------------------------------------------------------
-- grades: ver/ingresar/editar/eliminar notas de cualquier evaluación del
-- curso que se enseña (antes solo evaluaciones propias). El período debe
-- seguir abierto para escribir, igual que hoy.
-- ---------------------------------------------------------------------------
alter policy "grades_select_scope" on public.grades
  using (public.is_academic_management() or public.owns_evaluation(evaluation_id) or public.teaches_evaluation(evaluation_id));

alter policy "grades_insert_scope" on public.grades
  with check (
    public.has_any_role(array['director','utp','superadmin'])
    or ((public.owns_evaluation(evaluation_id) or public.teaches_evaluation(evaluation_id)) and public.evaluation_period_open(evaluation_id))
  );

alter policy "grades_update_scope" on public.grades
  using (
    public.has_any_role(array['director','utp','superadmin'])
    or ((public.owns_evaluation(evaluation_id) or public.teaches_evaluation(evaluation_id)) and public.evaluation_period_open(evaluation_id))
  )
  with check (
    public.has_any_role(array['director','utp','superadmin'])
    or ((public.owns_evaluation(evaluation_id) or public.teaches_evaluation(evaluation_id)) and public.evaluation_period_open(evaluation_id))
  );

alter policy "grades_delete_scope" on public.grades
  using (
    public.has_any_role(array['director','utp','superadmin'])
    or ((public.owns_evaluation(evaluation_id) or public.teaches_evaluation(evaluation_id)) and public.evaluation_period_open(evaluation_id))
  );
