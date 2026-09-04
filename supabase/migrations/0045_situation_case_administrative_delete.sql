-- =============================================================================
-- Eliminar caso y situación de origen, en una sola operación administrativa
-- =============================================================================
-- Agrega una función NUEVA y separada para cuando una situación SÍ tiene
-- case_id: reutiliza el mismo análisis de FKs y el mismo orden seguro ya
-- usado por permanently_delete_case_administrative (0040) -- no se toca esa
-- función ni el botón "Eliminar definitivamente" de la Papelera, que sigue
-- exigiendo que el caso ya esté en la papelera y sigue siendo exclusivo de
-- director/superadmin. Esta es una vía administrativa distinta, para el
-- flujo "Eliminar caso y situación" desde la propia situación, donde
-- 'convivencia' también puede ejecutarla.
--
-- Orden seguro: se borra primero el CASO (cascada a todas sus
-- sub-entidades -- medidas, entrevistas, derivaciones, seguimientos,
-- protocolos, adjuntos, asignaciones, cierre, y actas de case_minutes con
-- sus adjuntos SI esa tabla existe). convivencia_situations.case_id usa ON
-- DELETE SET NULL (0026), así que al borrar el caso la situación queda con
-- case_id = null de forma automática -- el trigger trg_guard_situation_delete
-- (0042) deja de bloquear su DELETE por esa razón sin que este archivo lo
-- toque ni lo debilite. Los documentos propios de la situación
-- (convivencia_attachments con situation_id) se borran explícitamente antes
-- de la situación, igual que en 0043. psychologist_reports.case_id usa ON
-- DELETE SET NULL -- sobrevive, igual que en 0040.
--
-- case_minutes / case_minute_attachments (0032) son OPCIONALES: esa
-- migración todavía no está aplicada en este proyecto y esta función no
-- puede depender de ella. Antes de tocarlas se verifica su existencia con
-- to_regclass(), que devuelve null sin lanzar error si la tabla no existe
-- -- si no existen, esa parte simplemente se omite (0 actas, 0 adjuntos de
-- actas) y la eliminación del caso/situación/dependencias reales sigue su
-- curso normal. El acceso a esas tablas se hace con SQL dinámico (EXECUTE)
-- para que Postgres nunca intente planificar una consulta contra una tabla
-- inexistente -- así se evita cualquier "relation does not exist" incluso
-- en el peor caso. El día que 0032 se aplique, esta misma función las
-- reconoce automáticamente, sin tocar este archivo.
--
-- Ninguna otra tabla referenciada aquí depende de una migración pendiente:
-- convivencia_situations/convivencia_cases/convivencia_attachments son de
-- 0026 (aplicada), has_any_role/log_audit son núcleo del esquema (0001).
--
-- Storage: nunca se toca desde SQL. Se devuelven todas las rutas (adjuntos
-- del caso + adjuntos propios de la situación + adjuntos de actas de
-- case_minutes si existieran) para que la aplicación las borre recién
-- después de confirmar el éxito del DELETE.
-- =============================================================================

create or replace function public.permanently_delete_case_and_situation_administrative(
  p_situation_id uuid
) returns text[]
language plpgsql security definer set search_path = public as $fn$
declare
  v_case_id uuid;
  v_minute_ids uuid[] := array[]::uuid[];
  v_minute_paths text[] := array[]::text[];
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

  -- Rutas de actas (case_minutes) -- solo si la tabla existe. SQL dinámico
  -- a propósito: una referencia estática a case_minutes se planificaría
  -- igual aunque este bloque nunca se ejecute, y podría fallar si Postgres
  -- decide validarla antes; con EXECUTE la consulta ni siquiera se
  -- construye cuando to_regclass() devuelve null.
  if to_regclass('public.case_minutes') is not null then
    execute 'select coalesce(array_agg(id), array[]::uuid[]) from public.case_minutes where case_id = $1'
      into v_minute_ids using v_case_id;

    if to_regclass('public.case_minute_attachments') is not null and coalesce(array_length(v_minute_ids, 1), 0) > 0 then
      execute 'select coalesce(array_agg(storage_path), array[]::text[]) from public.case_minute_attachments where minute_id = any($1)'
        into v_minute_paths using v_minute_ids;
    end if;
  end if;

  select
    coalesce((select array_agg(storage_path) from public.convivencia_attachments where case_id = v_case_id), array[]::text[])
    || coalesce((select array_agg(storage_path) from public.convivencia_attachments where situation_id = p_situation_id), array[]::text[])
    || v_minute_paths
  into v_paths;

  perform public.log_audit(
    'eliminar_caso_y_situacion_definitivamente',
    'convivencia',
    'convivencia_cases',
    v_case_id::text,
    jsonb_build_object('situation_id', p_situation_id, 'document_count', coalesce(array_length(v_paths, 1), 0))
  );

  -- Borra el caso -- cascada a todas sus sub-entidades, incluidas
  -- case_minutes/case_minute_attachments si esa FK existe (0032). No hace
  -- falta un DELETE explícito sobre esas tablas: si existen, la cascada de
  -- convivencia_cases ya las limpia; si no existen, no hay nada que borrar.
  delete from public.convivencia_cases where id = v_case_id;

  delete from public.convivencia_attachments where situation_id = p_situation_id;
  delete from public.convivencia_situations where id = p_situation_id;

  return v_paths;
end;
$fn$;

revoke execute on function public.permanently_delete_case_and_situation_administrative(uuid) from public;
grant execute on function public.permanently_delete_case_and_situation_administrative(uuid) to authenticated;
