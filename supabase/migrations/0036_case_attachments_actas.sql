-- =============================================================================
-- Actas y documentos adjuntos de Caso — extiende convivencia_attachments
-- (0026), no crea una tabla nueva.
--
-- Auditoría previa (resumen):
--  - convivencia_attachments (0026) ya es exactamente "un archivo colgado de
--    un caso/situación/entrevista/acción preventiva, en Storage privado, con
--    URL firmada" -- la forma pedida ahora (subir un acta como archivo, con
--    tipo/descripción/estado) es una extensión de columnas de esa misma
--    tabla, no un concepto nuevo. case_minutes/case_minute_attachments
--    (0032, todavía sin ejecutar) es un sistema DISTINTO -- actas redactadas
--    con campos estructurados (motivo, acuerdos, compromisos, etc.) más su
--    propia copia firmada -- y no se toca en esta migración.
--  - El único padre que necesita las columnas nuevas es case_id (es la
--    sección "dentro de cada caso" del pedido); situation_id/interview_id/
--    preventive_action_id se dejan como estaban, document_type/status
--    quedan nullable/con default para no romper esas filas.
--  - "Versión firmada" se modela como una fila NUEVA (nunca un update de
--    storage_path de la fila existente) con document_type='acta_firmada' y
--    related_attachment_id apuntando al acta original -- mismo criterio
--    "nunca sobrescribir" que ya usa case_minute_attachments en 0032.
--  - inspectoria_general y psicologo NO tenían ninguna política en
--    convivencia_attachments (0026 los excluyó a propósito, adjuntos
--    "confidenciales"). El pedido de esta vez es explícito: darles acceso
--    ACOTADO a actas de caso (case_id not null) solo cuando tienen acceso
--    operacional a ESE caso -- se reutiliza convivencia_case_assigned()
--    (0026), la misma función/tabla de asignación que ya usa
--    inspectoria_general en el resto del módulo, en vez de crear un
--    mecanismo de asignación paralelo para psicólogo. Un psicólogo con
--    acceso a actas de un caso necesita una fila en
--    convivencia_case_assignments para ese caso (la crea
--    director/convivencia/superadmin, igual que hoy para inspectoria).
--  - "No borrado normal de actas finalizadas/firmadas" reemplaza la política
--    original "convivencia_attachments_all" (que daba DELETE incondicional a
--    director/superadmin/convivencia) por un DELETE acotado a status =
--    'borrador', más un DELETE de superadmin sin condición para el resto
--    (mismo patrón que case_minutes_delete_superadmin en 0032). Esto SÍ
--    reemplaza una política creada por 0026 -- no se edita el archivo
--    0026.sql, se reemplaza la política en vivo desde esta migración nueva,
--    mismo patrón ya usado por 0028 ("repair") sobre 0027.
--
-- No destructiva: ALTER TABLE ADD COLUMN (nullable o con default), políticas
-- RLS nuevas/reemplazadas, políticas de Storage nuevas (las de 0026 para
-- archivos-internos/convivencia/ no se tocan y ya cubren cualquier subcarpeta,
-- incluida la nueva convivencia/actas/{case_id}/, para director/superadmin/
-- convivencia).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Columnas nuevas.
-- ---------------------------------------------------------------------------
alter table public.convivencia_attachments add column if not exists document_type text;
alter table public.convivencia_attachments add constraint convivencia_attachments_document_type_check
  check (document_type is null or document_type in (
    'acta_entrevista', 'acta_apoderado', 'acta_estudiante', 'acta_reunion',
    'acta_seguimiento', 'acta_firmada', 'otro'
  ));

alter table public.convivencia_attachments add column if not exists status text not null default 'finalizada';
alter table public.convivencia_attachments add constraint convivencia_attachments_status_check
  check (status in ('borrador', 'finalizada', 'firmada', 'archivada'));

alter table public.convivencia_attachments add column if not exists mime_type text;
alter table public.convivencia_attachments add column if not exists file_size_bytes bigint;

-- Vínculo a la versión sin firmar (nunca se sobrescribe esa fila -- la
-- versión firmada es siempre un registro aparte).
alter table public.convivencia_attachments add column if not exists related_attachment_id
  uuid references public.convivencia_attachments(id) on delete set null;

create index if not exists idx_convivencia_attachments_document_type on public.convivencia_attachments(document_type);
create index if not exists idx_convivencia_attachments_status on public.convivencia_attachments(status);

comment on column public.convivencia_attachments.document_type is
  'Tipo de acta/documento (solo aplica a adjuntos de caso -- null para adjuntos de situación/entrevista/acción preventiva).';
comment on column public.convivencia_attachments.related_attachment_id is
  'Para document_type=acta_firmada: apunta al acta original sin firmar. La carga de una firmada nunca reemplaza la fila original.';

-- ---------------------------------------------------------------------------
-- 2) RLS -- reemplaza "convivencia_attachments_all" (0026) por políticas
--    separadas: SELECT/INSERT ampliados (inspectoria_general/psicologo
--    acotados a actas de caso con acceso operacional), UPDATE sin cambios de
--    alcance (solo director/superadmin/convivencia), DELETE acotado a
--    borrador (+ superadmin sin condición).
-- ---------------------------------------------------------------------------
drop policy if exists "convivencia_attachments_all" on public.convivencia_attachments;

create policy "convivencia_attachments_select" on public.convivencia_attachments
  for select to authenticated
  using (
    public.has_any_role(array['director', 'superadmin', 'convivencia'])
    or (
      case_id is not null
      and public.has_any_role(array['inspectoria_general', 'psicologo'])
      and public.convivencia_case_assigned(case_id)
    )
  );

create policy "convivencia_attachments_insert" on public.convivencia_attachments
  for insert to authenticated
  with check (
    public.has_any_role(array['director', 'superadmin', 'convivencia'])
    or (
      case_id is not null
      and public.has_any_role(array['inspectoria_general', 'psicologo'])
      and public.convivencia_case_assigned(case_id)
    )
  );

create policy "convivencia_attachments_update" on public.convivencia_attachments
  for update to authenticated
  using (public.has_any_role(array['director', 'superadmin', 'convivencia']))
  with check (public.has_any_role(array['director', 'superadmin', 'convivencia']));

create policy "convivencia_attachments_delete_draft" on public.convivencia_attachments
  for delete to authenticated
  using (status = 'borrador' and public.has_any_role(array['director', 'superadmin', 'convivencia']));

create policy "convivencia_attachments_delete_superadmin" on public.convivencia_attachments
  for delete to authenticated
  using (public.has_role('superadmin'));

-- Los grants de 0026 (select/insert/update/delete a authenticated) ya cubren
-- estas políticas -- GRANT es independiente de RLS y no necesita repetirse.

-- ---------------------------------------------------------------------------
-- 3) Storage -- acceso acotado nuevo para inspectoria_general/psicologo bajo
--    archivos-internos/convivencia/actas/{case_id}/. Las políticas de 0026
--    para archivos-internos/convivencia/ (cualquier subcarpeta) ya cubren a
--    director/superadmin/convivencia sin cambios.
-- ---------------------------------------------------------------------------
create policy "archivos_internos_convivencia_actas_select_scoped"
on storage.objects for select to authenticated
using (
  bucket_id = 'archivos-internos'
  and (storage.foldername(name))[1] = 'convivencia'
  and (storage.foldername(name))[2] = 'actas'
  and public.has_any_role(array['inspectoria_general', 'psicologo'])
  and public.convivencia_case_assigned(((storage.foldername(name))[3])::uuid)
);

create policy "archivos_internos_convivencia_actas_insert_scoped"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'archivos-internos'
  and (storage.foldername(name))[1] = 'convivencia'
  and (storage.foldername(name))[2] = 'actas'
  and public.has_any_role(array['inspectoria_general', 'psicologo'])
  and public.convivencia_case_assigned(((storage.foldername(name))[3])::uuid)
);
