-- =============================================================================
-- Eliminar caso y situación de origen, en una sola operación administrativa
-- =============================================================================
-- Aviso: lo que pediste como "0043" ya existe y ya está ejecutado --
-- permanently_delete_situation_administrative() (0043) cubre la situación
-- SIN caso asociado, ampliada a director/superadmin/convivencia en 0044.
-- Esta migración es la siguiente disponible (0045) y agrega una función
-- NUEVA y separada, específicamente para cuando la situación SÍ tiene
-- case_id: reutiliza el mismo análisis de FKs y el mismo orden seguro ya
-- usado por permanently_delete_case_administrative (0040) -- no se toca esa
-- función ni el botón "Eliminar definitivamente" de la Papelera, que sigue
-- exigiendo que el caso ya esté en la papelera y sigue siendo exclusivo de
-- director/superadmin. Esta es una vía administrativa distinta, pensada
-- para el flujo "Eliminar caso y situación" desde la propia situación,
-- donde pediste explícitamente que 'convivencia' también pueda ejecutarla.
--
-- Orden seguro: se borra primero el CASO (cascada a todas sus
-- sub-entidades -- medidas, entrevistas, derivaciones, seguimientos,
-- protocolos, adjuntos, actas de case_minutes y sus adjuntos, asignaciones,
-- cierre). convivencia_situations.case_id usa ON DELETE SET NULL (0026),
-- así que al borrar el caso la situación queda con case_id = null de forma
-- automática -- el trigger trg_guard_situation_delete (0042) deja de
-- bloquear su DELETE por esa razón sin que este archivo lo toque ni lo
-- debilite. Los documentos propios de la situación (convivencia_attachments
-- con situation_id) se borran explícitamente antes de la situación, igual
-- que en 0043. psychologist_reports.case_id usa ON DELETE SET NULL --
-- sobrevive, igual que en 0040.
--
-- Storage: nunca se toca desde SQL. Se devuelven todas las rutas (adjuntos
-- del caso + adjuntos propios de la situación + adjuntos de las actas de
-- case_minutes) para que la aplicación las borre recién después de
-- confirmar el éxito del DELETE.
-- =============================================================================

create or replace function public.permanently_delete_case_and_situation_administrative(
  p_situation_id uuid
) returns text[]
language plpgsql security definer set search_path = public as $$
declare
  v_case_id uuid;
  v_minute_ids uuid[];
  v_paths text[];
begin
  if not public.has_any_role(array['director', 'superadmin', 'convivencia']) then
    raise exception 'No autorizado';
  end if;

  select case_id into v_case_id from public.convivencia_situations where id = p_situation_id;
  if not found then
    raise exception 'Situación no encontrada';
  end if;
  if v_case_id is null then
    raise exception 'Esta situación no está asociada a un caso.';
  end if;

  select coalesce(array_agg(id), array[]::uuid[]) into v_minute_ids
    from public.case_minutes where case_id = v_case_id;

  select
    coalesce((select array_agg(storage_path) from public.convivencia_attachments where case_id = v_case_id), array[]::text[])
    || coalesce((select array_agg(storage_path) from public.convivencia_attachments where situation_id = p_situation_id), array[]::text[])
    || coalesce((select array_agg(storage_path) from public.case_minute_attachments where minute_id = any(v_minute_ids)), array[]::text[])
  into v_paths;

  perform public.log_audit(
    'eliminar_caso_y_situacion_definitivamente',
    'convivencia',
    'convivencia_cases',
    v_case_id::text,
    jsonb_build_object('situation_id', p_situation_id, 'document_count', coalesce(array_length(v_paths, 1), 0))
  );

  delete from public.convivencia_cases where id = v_case_id;

  delete from public.convivencia_attachments where situation_id = p_situation_id;
  delete from public.convivencia_situations where id = p_situation_id;

  return v_paths;
end;
$$;

revoke execute on function public.permanently_delete_case_and_situation_administrative(uuid) from public;
grant execute on function public.permanently_delete_case_and_situation_administrative(uuid) to authenticated;
