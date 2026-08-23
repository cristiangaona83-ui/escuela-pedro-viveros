-- =============================================================================
-- Roles profesionales PIE: educadora_diferencial, psicopedagoga,
-- fonoaudiologa, psicologo.
--
-- Distintos del rol 'pie' (Coordinadora PIE), que conserva su alcance más
-- amplio (todo pie_records, todos los estudiantes) definido en 0001-0002.
-- Estos 4 roles nuevos reciben un alcance más acotado, específico al módulo
-- PIE, sin permisos administrativos ni académicos amplios:
--   - pie_records: solo sus propios casos (professional_id = auth.uid()),
--     nunca los de otro profesional ni la vista global de la Coordinadora.
--   - students: solo estudiantes con un registro en pie_records donde
--     professional_id = auth.uid() — es decir, casos que la Coordinadora PIE
--     ya le asignó explícitamente a ese profesional, nunca la cartera
--     completa del programa PIE ni la nómina del colegio. Un especialista no
--     puede "descubrir" estudiantes de otro profesional, ni iniciar el
--     ingreso de un estudiante nuevo al programa por sí solo: eso sigue
--     siendo tarea de la Coordinadora PIE (o Dirección/UTP), que crea el
--     registro inicial y asigna el professional_id — recién ahí el
--     especialista asignado gana visibilidad sobre ese estudiante.
-- No se toca is_academic_management() (sigue siendo solo director/utp/superadmin).
-- No se otorga director/utp/superadmin/inspectoria_general/convivencia/
-- administrativo ni edición de notas/retiro/gestión de cursos a estos roles.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Roles nuevos
-- ---------------------------------------------------------------------------
alter table public.roles drop constraint roles_code_check;
alter table public.roles add constraint roles_code_check check (code in
  ('director','utp','docente','pie','convivencia','administrativo','superadmin',
   'inspectoria_general','educadora_diferencial','psicopedagoga','fonoaudiologa','psicologo'));

insert into public.roles (code, name) values
  ('educadora_diferencial', 'Educadora Diferencial'),
  ('psicopedagoga', 'Psicopedagoga'),
  ('fonoaudiologa', 'Fonoaudióloga'),
  ('psicologo', 'Psicólogo');

-- ---------------------------------------------------------------------------
-- 2) pie_records — alcance acotado a los propios casos (professional_id)
--    La política existente pie_records_select_scope / pie_records_write_scope
--    (pie/director/utp/superadmin, acceso global) NO se toca. Estas políticas
--    nuevas se combinan por OR, sin ampliar el alcance de los roles ya existentes.
-- ---------------------------------------------------------------------------
create policy "pie_records_select_own_professional" on public.pie_records
  for select to authenticated
  using (
    public.has_any_role(array['educadora_diferencial','psicopedagoga','fonoaudiologa','psicologo'])
    and professional_id = auth.uid()
  );

create policy "pie_records_insert_own_professional" on public.pie_records
  for insert to authenticated
  with check (
    public.has_any_role(array['educadora_diferencial','psicopedagoga','fonoaudiologa','psicologo'])
    and professional_id = auth.uid()
  );

create policy "pie_records_update_own_professional" on public.pie_records
  for update to authenticated
  using (
    public.has_any_role(array['educadora_diferencial','psicopedagoga','fonoaudiologa','psicologo'])
    and professional_id = auth.uid()
  )
  with check (
    public.has_any_role(array['educadora_diferencial','psicopedagoga','fonoaudiologa','psicologo'])
    and professional_id = auth.uid()
  );
-- Sin política de DELETE para estos 4 roles.

-- ---------------------------------------------------------------------------
-- 3) students — solo estudiantes con un caso PIE asignado a ESE profesional
--    específico (professional_id = auth.uid()), no toda la cartera PIE ni
--    la nómina completa. students_write_admin no se toca: estos roles nunca
--    pueden editar la ficha del estudiante.
-- ---------------------------------------------------------------------------
alter policy "students_select_scope" on public.students
  using (
    public.has_any_role(array['director','utp','administrativo','pie','convivencia','superadmin','inspectoria_general'])
    or public.teaches_student(id)
    or (
      public.has_any_role(array['educadora_diferencial','psicopedagoga','fonoaudiologa','psicologo'])
      and exists (
        select 1 from public.pie_records pr
        where pr.student_id = students.id and pr.professional_id = auth.uid()
      )
    )
  );
