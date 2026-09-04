-- =============================================================================
-- Eliminación administrativa de declaraciones de Seguro Escolar
-- =============================================================================
-- 0046 (ya ejecutada) deliberadamente NO creó política de DELETE en
-- seguro_escolar_declarations ("una declaración emitida debe conservarse").
-- Ese diseño cambia aquí por pedido explícito: se necesita poder eliminar
-- un registro creado por error o duplicado, incluso con documentos o ya
-- emitido, para director/superadmin/inspectoria_general -- mismo patrón ya
-- usado para situaciones de Convivencia (0043/0044/0045): una RPC
-- security definer, no una política de DELETE abierta en la tabla (que
-- seguiría sin política -- la única vía de borrado real es esta función,
-- que exige el rol explícitamente).
--
-- Orden seguro: se coleccionan las storage_path de los adjuntos ANTES de
-- borrar nada. La fila de la declaración se borra con cascada (0046 ya
-- definió on delete cascade en seguro_escolar_attachments,
-- seguro_escolar_guardian_contacts y seguro_escolar_followups), así que
-- esta función no necesita DELETE explícito sobre esas tres tablas. Storage
-- nunca se toca desde SQL -- la aplicación borra los archivos recién
-- después de confirmar el éxito de este DELETE.
-- =============================================================================

create or replace function public.permanently_delete_seguro_escolar_declaration(
  p_declaration_id uuid
) returns text[]
language plpgsql security definer set search_path = public as $fn$
declare
  v_paths text[];
begin
  if not public.has_any_role(array['director', 'superadmin', 'inspectoria_general']) then
    raise exception 'No autorizado';
  end if;

  if not exists (select 1 from public.seguro_escolar_declarations where id = p_declaration_id) then
    raise exception 'Declaración no encontrada';
  end if;

  select coalesce(array_agg(storage_path), array[]::text[]) into v_paths
    from public.seguro_escolar_attachments where declaration_id = p_declaration_id;

  perform public.log_audit(
    'seguro_escolar_eliminado',
    'seguro_escolar',
    'seguro_escolar_declarations',
    p_declaration_id::text,
    jsonb_build_object('document_count', coalesce(array_length(v_paths, 1), 0))
  );

  delete from public.seguro_escolar_declarations where id = p_declaration_id;

  return v_paths;
end;
$fn$;

revoke execute on function public.permanently_delete_seguro_escolar_declaration(uuid) from public;
grant execute on function public.permanently_delete_seguro_escolar_declaration(uuid) to authenticated;
