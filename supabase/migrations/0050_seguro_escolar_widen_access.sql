-- =============================================================================
-- Seguro Escolar -- amplía el acceso operativo a administrativo/convivencia
-- =============================================================================
-- Hasta ahora el módulo (0046) solo permitía ver/crear/editar a
-- director/superadmin/inspectoria_general. Se pide que además puedan
-- operarlo (crear, editar, adjuntar documentos, contactar apoderados,
-- registrar seguimiento) el personal administrativo y de Convivencia
-- Escolar -- concretamente el equipo que hoy tramita los accidentes.
--
-- Deliberadamente NO se amplía:
--  - seguro_escolar_attachments_delete ni la política de storage.objects
--    "..._delete": borrar un documento adjunto sigue reservado a
--    director/superadmin/inspectoria_general.
--  - permanently_delete_seguro_escolar_declaration (0047): la eliminación
--    administrativa definitiva de una declaración completa sigue siendo
--    una acción de director/superadmin/inspectoria_general únicamente --
--    esta ronda es sobre poder "realizar" el Seguro Escolar (uso diario),
--    no sobre ampliar quién puede borrar.
--
-- Postgres no permite modificar el USING/CHECK de una policy existente con
-- ALTER POLICY -- hay que recrearla. Mismo nombre y misma condición que
-- 0046, solo con el arreglo de roles ampliado.
-- =============================================================================

drop policy if exists "seguro_escolar_declarations_select" on public.seguro_escolar_declarations;
create policy "seguro_escolar_declarations_select" on public.seguro_escolar_declarations
  for select to authenticated
  using (public.has_any_role(array['director', 'superadmin', 'inspectoria_general', 'administrativo', 'convivencia']));

drop policy if exists "seguro_escolar_declarations_insert" on public.seguro_escolar_declarations;
create policy "seguro_escolar_declarations_insert" on public.seguro_escolar_declarations
  for insert to authenticated
  with check (public.has_any_role(array['director', 'superadmin', 'inspectoria_general', 'administrativo', 'convivencia']) and created_by = auth.uid());

drop policy if exists "seguro_escolar_declarations_update" on public.seguro_escolar_declarations;
create policy "seguro_escolar_declarations_update" on public.seguro_escolar_declarations
  for update to authenticated
  using (public.has_any_role(array['director', 'superadmin', 'inspectoria_general', 'administrativo', 'convivencia']))
  with check (public.has_any_role(array['director', 'superadmin', 'inspectoria_general', 'administrativo', 'convivencia']));

drop policy if exists "seguro_escolar_attachments_select" on public.seguro_escolar_attachments;
create policy "seguro_escolar_attachments_select" on public.seguro_escolar_attachments
  for select to authenticated
  using (public.has_any_role(array['director', 'superadmin', 'inspectoria_general', 'administrativo', 'convivencia']));

drop policy if exists "seguro_escolar_attachments_insert" on public.seguro_escolar_attachments;
create policy "seguro_escolar_attachments_insert" on public.seguro_escolar_attachments
  for insert to authenticated
  with check (public.has_any_role(array['director', 'superadmin', 'inspectoria_general', 'administrativo', 'convivencia']) and uploaded_by = auth.uid());

drop policy if exists "seguro_escolar_guardian_contacts_select" on public.seguro_escolar_guardian_contacts;
create policy "seguro_escolar_guardian_contacts_select" on public.seguro_escolar_guardian_contacts
  for select to authenticated
  using (public.has_any_role(array['director', 'superadmin', 'inspectoria_general', 'administrativo', 'convivencia']));

drop policy if exists "seguro_escolar_guardian_contacts_insert" on public.seguro_escolar_guardian_contacts;
create policy "seguro_escolar_guardian_contacts_insert" on public.seguro_escolar_guardian_contacts
  for insert to authenticated
  with check (public.has_any_role(array['director', 'superadmin', 'inspectoria_general', 'administrativo', 'convivencia']) and created_by = auth.uid());

drop policy if exists "seguro_escolar_followups_select" on public.seguro_escolar_followups;
create policy "seguro_escolar_followups_select" on public.seguro_escolar_followups
  for select to authenticated
  using (public.has_any_role(array['director', 'superadmin', 'inspectoria_general', 'administrativo', 'convivencia']));

drop policy if exists "seguro_escolar_followups_insert" on public.seguro_escolar_followups;
create policy "seguro_escolar_followups_insert" on public.seguro_escolar_followups
  for insert to authenticated
  with check (public.has_any_role(array['director', 'superadmin', 'inspectoria_general', 'administrativo', 'convivencia']) and created_by = auth.uid());

drop policy if exists "seguro_escolar_followups_update" on public.seguro_escolar_followups;
create policy "seguro_escolar_followups_update" on public.seguro_escolar_followups
  for update to authenticated
  using (public.has_any_role(array['director', 'superadmin', 'inspectoria_general', 'administrativo', 'convivencia']))
  with check (public.has_any_role(array['director', 'superadmin', 'inspectoria_general', 'administrativo', 'convivencia']));

drop policy if exists "archivos_internos_seguro_escolar_select" on storage.objects;
create policy "archivos_internos_seguro_escolar_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'archivos-internos'
    and (storage.foldername(name))[1] = 'seguro-escolar'
    and public.has_any_role(array['director', 'superadmin', 'inspectoria_general', 'administrativo', 'convivencia'])
  );

drop policy if exists "archivos_internos_seguro_escolar_insert" on storage.objects;
create policy "archivos_internos_seguro_escolar_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'archivos-internos'
    and (storage.foldername(name))[1] = 'seguro-escolar'
    and public.has_any_role(array['director', 'superadmin', 'inspectoria_general', 'administrativo', 'convivencia'])
  );
