-- Fase 5 (Planificaciones): dos ajustes descubiertos durante la implementación,
-- fuera del alcance de las 10 tablas ya auditadas en 0001-0004.

-- 1) Campo de observaciones propias del docente, distinto del comentario de
--    revisión (reviewer_comment es exclusivo de UTP/Dirección). El formulario
--    pedido por el usuario requiere "observaciones" como campo propio, y no
--    existía ninguna columna para guardarlo.
alter table public.lesson_plans add column observations text;

-- 2) RLS es a nivel de fila, no de columna: la política "lesson_plans_update_scope"
--    permite a un docente actualizar CUALQUIER columna de su propia planificación,
--    incluyendo status/reviewer_id/reviewer_comment. Sin este trigger, un docente
--    podría "auto-aprobarse" editando la fila directamente (evitando la UI). El
--    trigger cierra ese vacío como control real de base de datos, no solo de
--    interfaz.
create or replace function public.enforce_lesson_plan_status_transition()
returns trigger
language plpgsql
as $$
begin
  if public.is_academic_management() then
    return new;
  end if;

  -- El docente solo puede editar mientras está en borrador o en observada (para
  -- corregir y volver a enviar), y solo puede dejarla en borrador o enviada --
  -- nunca marcarse a sí mismo revisada/aprobada/observada. Una vez "enviada",
  -- la planificación queda entregada para revisión y se bloquea para el
  -- docente (no puede volver a borrador ni editarla) hasta que dirección/UTP
  -- la marque "observada" (reabre edición) o avance su estado. "revisada" y
  -- "aprobada" quedan igual de bloqueadas para el docente.
  if new.status not in ('borrador', 'enviada') or old.status not in ('borrador', 'observada') then
    raise exception 'Esta planificación no puede modificarse en su estado actual. Solo dirección o UTP pueden revisarla, aprobarla u observarla.';
  end if;

  if new.reviewer_id is distinct from old.reviewer_id
     or new.reviewer_comment is distinct from old.reviewer_comment then
    raise exception 'Solo dirección o UTP pueden completar la revisión.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_lesson_plans_status_guard on public.lesson_plans;
create trigger trg_lesson_plans_status_guard
  before update on public.lesson_plans
  for each row execute function public.enforce_lesson_plan_status_transition();
