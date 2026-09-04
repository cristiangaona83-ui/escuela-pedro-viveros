-- =============================================================================
-- Eliminación administrativa de Situaciones (Director/Superadmin)
-- =============================================================================
-- 0042 ya protege el DELETE normal de convivencia_situations con un trigger
-- que bloquea si tiene documentos adjuntos o si ya es un caso -- esa
-- protección NO se toca ni se debilita aquí. Este archivo agrega una RPC
-- security definer nueva, aparte, para la excepción administrativa pedida:
-- Director/Superadmin pueden eliminar una situación SIN caso asociado aunque
-- tenga documentos adjuntos. La RPC borra primero los documentos (dentro de
-- la misma transacción) para que, al llegar al DELETE de la situación, el
-- trigger de 0042 ya no encuentre adjuntos que bloqueen la operación -- el
-- trigger se cumple igual, no se elude. Si la situación ya tiene case_id,
-- la RPC rechaza explícitamente (mismo criterio de 0042, verificado dos
-- veces: aquí y en el trigger).
--
-- Storage: esta función NUNCA toca Storage (no puede desde SQL). Devuelve
-- el arreglo de storage_path que existía, para que el código de aplicación
-- los borre DESPUÉS de confirmar que el DELETE de base de datos tuvo éxito
-- -- mismo orden seguro que 0040 (DB primero, Storage después, nunca al
-- revés).
-- =============================================================================

create or replace function public.permanently_delete_situation_administrative(
  p_situation_id uuid
) returns text[]
language plpgsql security definer set search_path = public as $$
declare
  v_case_id uuid;
  v_paths text[];
begin
  if not public.has_any_role(array['director', 'superadmin']) then
    raise exception 'No autorizado';
  end if;

  select case_id into v_case_id from public.convivencia_situations where id = p_situation_id;
  if not found then
    raise exception 'Situación no encontrada';
  end if;
  if v_case_id is not null then
    raise exception 'Esta situación ya dio origen a un caso de Convivencia. Para resguardar la trazabilidad, gestione primero el caso correspondiente.';
  end if;

  select coalesce(array_agg(storage_path), array[]::text[]) into v_paths
    from public.convivencia_attachments where situation_id = p_situation_id;

  delete from public.convivencia_attachments where situation_id = p_situation_id;
  -- convivencia_situation_students se elimina en cascada (0026) -- es solo
  -- el vínculo situación<->estudiante, no un antecedente a preservar.
  delete from public.convivencia_situations where id = p_situation_id;

  perform public.log_audit(
    'eliminar_situacion_definitivamente',
    'convivencia',
    'convivencia_situations',
    p_situation_id::text,
    jsonb_build_object('document_count', coalesce(array_length(v_paths, 1), 0))
  );

  return v_paths;
end;
$$;

revoke execute on function public.permanently_delete_situation_administrative(uuid) from public;
grant execute on function public.permanently_delete_situation_administrative(uuid) to authenticated;
