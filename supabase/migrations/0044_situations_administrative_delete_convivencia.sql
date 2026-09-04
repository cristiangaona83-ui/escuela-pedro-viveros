-- =============================================================================
-- Eliminación administrativa de Situaciones -- agrega convivencia
-- =============================================================================
-- 0043 (ya ejecutada) creó permanently_delete_situation_administrative()
-- solo para director/superadmin. Este archivo la reemplaza (mismo nombre,
-- misma firma -- CREATE OR REPLACE, no un DROP) para agregar 'convivencia'
-- a la comprobación de rol: la Encargada de Convivencia debe tener las
-- mismas facultades operativas que Dirección para administrar situaciones
-- (editar/archivar/eliminar), incluida esta excepción administrativa.
--
-- Sin cambios en el resto de la lógica: sigue rechazando siempre si
-- case_id no es nulo (0042 tampoco se toca), sigue devolviendo las rutas de
-- Storage para que la aplicación las borre después de confirmar el éxito
-- del DELETE en base de datos, y sigue registrando
-- 'eliminar_situacion_definitivamente' en audit_logs.
--
-- RLS de convivencia_situations (0026) ya daba a 'convivencia' el mismo
-- alcance que director/superadmin en UPDATE y DELETE -- sin cambios ahí,
-- este archivo solo alinea la RPC administrativa con esa misma paridad.
-- =============================================================================

create or replace function public.permanently_delete_situation_administrative(
  p_situation_id uuid
) returns text[]
language plpgsql security definer set search_path = public as $$
declare
  v_case_id uuid;
  v_paths text[];
begin
  if not public.has_any_role(array['director', 'superadmin', 'convivencia']) then
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
