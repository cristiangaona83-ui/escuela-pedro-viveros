-- =============================================================================
-- Administración de evaluaciones: proteger notas existentes
-- =============================================================================
-- No crea tablas ni RPC nuevas -- 0039 ya dejó evaluations/grades listas para
-- edición/eliminación administrativa. Este archivo solo agrega dos triggers
-- de seguridad sobre `evaluations`, para que la protección exista a nivel de
-- base de datos sin importar la vía de escritura (RPC administrativa de
-- 0039, escritura directa respaldada por RLS del propio docente, o
-- cualquier otra futura):
--
-- 1) trg_guard_evaluation_delete -- bloquea eliminar una evaluación que ya
--    tiene una o más filas en `grades`. El historial académico nunca se
--    borra por una eliminación de evaluación; hay que archivarla en su
--    lugar (evaluations.status ya admite 'archivada' desde 0039).
-- 2) trg_guard_evaluation_update -- bloquea cambiar curso/asignatura/
--    período/ponderación de una evaluación que ya tiene calificaciones,
--    porque esos campos alteran el significado de notas ya registradas
--    (a qué curso/asignatura/período pertenecen, o cuánto pesan en el
--    promedio). Nombre/descripción/fecha/tipo/estado siguen editables
--    libremente, con o sin notas.
--
-- No modifica 0039 ni ninguna migración ya ejecutada.
-- =============================================================================

create or replace function public.guard_evaluation_delete() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.grades where evaluation_id = old.id) then
    raise exception 'Esta evaluación contiene calificaciones registradas y no puede eliminarse directamente. Archívela en su lugar.';
  end if;
  return old;
end;
$$;

drop trigger if exists trg_guard_evaluation_delete on public.evaluations;
create trigger trg_guard_evaluation_delete
  before delete on public.evaluations
  for each row execute function public.guard_evaluation_delete();

create or replace function public.guard_evaluation_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (
    new.course_id is distinct from old.course_id
    or new.subject_id is distinct from old.subject_id
    or new.period_id is distinct from old.period_id
    or new.weight is distinct from old.weight
  ) and exists (select 1 from public.grades where evaluation_id = old.id) then
    raise exception 'No se puede modificar curso, asignatura, período o ponderación: esta evaluación ya tiene calificaciones registradas.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_evaluation_update on public.evaluations;
create trigger trg_guard_evaluation_update
  before update on public.evaluations
  for each row execute function public.guard_evaluation_update();
