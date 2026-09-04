-- =============================================================================
-- Convivencia Educativa: expediente digital -- mejoras sobre lo existente
-- =============================================================================
-- No crea ningún sistema paralelo: amplía convivencia_attachments (ya
-- soportaba múltiples documentos), convivencia_events (ya era la línea de
-- tiempo real) y convivencia_cases (agrega papelera, nunca reemplaza status).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) convivencia_attachments -- más tipos de documento (se conservan los 8
--    actuales), título descriptivo opcional, DELETE incondicional también
--    para Director (antes solo Superadmin). `convivencia` mantiene
--    exactamente su alcance actual (solo borradores) -- no se amplía.
-- ---------------------------------------------------------------------------
alter table public.convivencia_attachments drop constraint if exists convivencia_attachments_document_type_check;
alter table public.convivencia_attachments add constraint convivencia_attachments_document_type_check
  check (document_type is null or document_type in (
    'acta_entrevista', 'acta_apoderado', 'acta_estudiante', 'acta_funcionarios', 'acta_reunion',
    'acta_seguimiento', 'acta_firmada', 'informe_direccion', 'informe_convivencia', 'informe_externo',
    'evidencia', 'resolucion', 'derivacion', 'seguimiento', 'documento_judicial', 'oficio', 'otro'
  ));

alter table public.convivencia_attachments add column if not exists title text;
comment on column public.convivencia_attachments.title is
  'Título/nombre descriptivo opcional, distinto del nombre del archivo subido (file_name). Si es null, la UI muestra file_name.';

drop policy if exists "convivencia_attachments_delete_superadmin" on public.convivencia_attachments;
create policy "convivencia_attachments_delete_management" on public.convivencia_attachments
  for delete to authenticated
  using (public.has_any_role(array['director', 'superadmin']));

-- ---------------------------------------------------------------------------
-- 2) convivencia_events -- más tipos de evento (se conservan los 10
--    actuales), para que la línea de tiempo ya existente también registre
--    documentos y cambios administrativos del caso.
-- ---------------------------------------------------------------------------
alter table public.convivencia_events drop constraint if exists convivencia_events_event_type_check;
alter table public.convivencia_events add constraint convivencia_events_event_type_check
  check (event_type in (
    'caso_creado', 'entrevista', 'contacto_apoderado', 'seguimiento', 'medida', 'acuerdo', 'derivacion',
    'protocolo', 'caso_cerrado', 'documento_agregado', 'documento_editado', 'documento_eliminado',
    'caso_editado', 'caso_archivado', 'caso_enviado_papelera', 'caso_restaurado', 'otro'
  ));

-- ---------------------------------------------------------------------------
-- 3) convivencia_cases -- papelera (deleted_at/deleted_by), separada del
--    status. Se agrega 'archivado' al status existente (expediente válido y
--    finalizado que se conserva institucionalmente -- distinto de la
--    papelera, que es para registros creados por error).
-- ---------------------------------------------------------------------------
alter table public.convivencia_cases add column if not exists deleted_at timestamptz;
alter table public.convivencia_cases add column if not exists deleted_by uuid references public.profiles(id) on delete set null;
create index if not exists idx_convivencia_cases_deleted_at on public.convivencia_cases(deleted_at);

alter table public.convivencia_cases drop constraint if exists convivencia_cases_status_check;
alter table public.convivencia_cases add constraint convivencia_cases_status_check
  check (status in ('abierto', 'en_evaluacion', 'protocolo_activo', 'en_seguimiento', 'pendiente_antecedentes', 'cerrado', 'archivado'));

-- ---------------------------------------------------------------------------
-- 4) convivencia_situations -- agrega 'archivado' al status ya existente
--    (0030), para "situación creada por error" sin borrar datos reales.
-- ---------------------------------------------------------------------------
alter table public.convivencia_situations drop constraint if exists convivencia_situations_status_check;
alter table public.convivencia_situations add constraint convivencia_situations_status_check
  check (status in ('recibido', 'en_revision', 'en_gestion', 'cerrado', 'archivado'));

-- ---------------------------------------------------------------------------
-- 5) Papelera de casos -- 3 RPC security definer (mismo patrón que
--    withdraw_student en 0014): verifican rol explícitamente, así la
--    papelera no depende de que "convivencia" (que legítimamente puede
--    editar casos) se abstenga de usar UPDATE directo. Solo Director/
--    Superadmin, tal como pediste.
-- ---------------------------------------------------------------------------
create or replace function public.send_case_to_trash_administrative(
  p_case_id uuid,
  p_reason text default null
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_any_role(array['director', 'superadmin']) then
    raise exception 'No autorizado';
  end if;
  if not exists (select 1 from public.convivencia_cases where id = p_case_id and deleted_at is null) then
    raise exception 'Expediente no encontrado o ya está en la papelera';
  end if;

  update public.convivencia_cases set deleted_at = now(), deleted_by = auth.uid() where id = p_case_id;

  insert into public.convivencia_events (case_id, event_type, observation, created_by)
  values (p_case_id, 'caso_enviado_papelera', coalesce(p_reason, 'Expediente enviado a la papelera.'), auth.uid());

  perform public.log_audit('enviar_caso_papelera', 'convivencia', 'convivencia_cases', p_case_id::text,
    jsonb_build_object('reason', p_reason));
end;
$$;

create or replace function public.restore_case_from_trash(
  p_case_id uuid
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_any_role(array['director', 'superadmin']) then
    raise exception 'No autorizado';
  end if;
  if not exists (select 1 from public.convivencia_cases where id = p_case_id and deleted_at is not null) then
    raise exception 'Expediente no encontrado en la papelera';
  end if;

  update public.convivencia_cases set deleted_at = null, deleted_by = null where id = p_case_id;

  insert into public.convivencia_events (case_id, event_type, observation, created_by)
  values (p_case_id, 'caso_restaurado', 'Expediente restaurado desde la papelera.', auth.uid());

  perform public.log_audit('restaurar_caso', 'convivencia', 'convivencia_cases', p_case_id::text, null);
end;
$$;

-- Elimina la FILA del caso (y cascadas de sus sub-entidades). NO toca
-- Storage -- eso lo hace el código de aplicación ANTES de llamar esta
-- función (recolecta y borra los archivos, y solo entonces borra el caso),
-- porque un objeto de Storage no se puede eliminar desde una función SQL.
-- Exige que el caso ya esté en la papelera: nunca se elimina definitivamente
-- de forma directa desde un caso activo.
create or replace function public.permanently_delete_case_administrative(
  p_case_id uuid,
  p_reason text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_case record;
begin
  if not public.has_any_role(array['director', 'superadmin']) then
    raise exception 'No autorizado';
  end if;

  select folio, title into v_case from public.convivencia_cases where id = p_case_id and deleted_at is not null;
  if not found then
    raise exception 'El expediente debe estar en la papelera antes de eliminarlo definitivamente';
  end if;

  -- Último rastro permanente -- convivencia_events se pierde con la cascada,
  -- así que este log_audit es la única fuente que queda de que este
  -- expediente existió.
  perform public.log_audit('eliminar_caso_definitivo', 'convivencia', 'convivencia_cases', p_case_id::text,
    jsonb_build_object('folio', v_case.folio, 'title', v_case.title, 'reason', p_reason));

  delete from public.convivencia_cases where id = p_case_id;
end;
$$;

revoke execute on function public.send_case_to_trash_administrative(uuid, text) from public;
revoke execute on function public.restore_case_from_trash(uuid) from public;
revoke execute on function public.permanently_delete_case_administrative(uuid, text) from public;
grant execute on function public.send_case_to_trash_administrative(uuid, text) to authenticated;
grant execute on function public.restore_case_from_trash(uuid) to authenticated;
grant execute on function public.permanently_delete_case_administrative(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 6) audit_logs -- índice para que "Ver historial" (Calificaciones,
--    Convivencia y lo que venga después) filtre por (entity, entity_id) sin
--    escanear toda la tabla.
-- ---------------------------------------------------------------------------
create index if not exists idx_audit_logs_entity on public.audit_logs(entity, entity_id);

-- ---------------------------------------------------------------------------
-- 7) Papelera invisible para quien no es Director/Superadmin -- "no confiar
--    solamente en esconder botones". convivencia_cases_select (0026) no
--    filtraba por deleted_at (la columna no existía), así que sin este
--    reemplazo cualquier rol con acceso de lectura al módulo (convivencia,
--    inspectoria_general asignado) seguiría viendo los casos en la papelera
--    con una simple consulta directa a la tabla. Director/Superadmin ven
--    todo (incluida la papelera); el resto nunca ve deleted_at is not null.
--    Mismo criterio para UPDATE: un caso en la papelera no se edita por la
--    vía normal (solo restore/permanent-delete, ambas RPC ya gateadas).
-- ---------------------------------------------------------------------------
drop policy if exists "convivencia_cases_select" on public.convivencia_cases;
create policy "convivencia_cases_select" on public.convivencia_cases
  for select to authenticated
  using (
    public.has_any_role(array['director','superadmin'])
    or (
      deleted_at is null
      and (
        public.has_any_role(array['convivencia'])
        or (public.has_role('inspectoria_general') and public.convivencia_case_assigned(id))
      )
    )
  );

drop policy if exists "convivencia_cases_update" on public.convivencia_cases;
create policy "convivencia_cases_update" on public.convivencia_cases
  for update to authenticated
  using (
    public.has_any_role(array['director','superadmin'])
    or (public.has_any_role(array['convivencia']) and deleted_at is null)
  )
  with check (
    public.has_any_role(array['director','superadmin'])
    or (public.has_any_role(array['convivencia']) and deleted_at is null)
  );
