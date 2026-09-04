-- =============================================================================
-- Eliminar Situación: proteger antecedentes reales
-- =============================================================================
-- No crea tablas ni RPC nuevas -- convivencia_situations_delete (0026) ya
-- restringe el DELETE a director/superadmin/convivencia (inspectoria_general
-- y docentes nunca tuvieron acceso de borrado ahí, sin cambios). Este
-- archivo solo agrega un trigger que bloquea el DELETE cuando existen
-- antecedentes reales que no deben perderse, sin importar la vía de
-- escritura -- mismo patrón que 0041 para evaluations.
--
-- Auditoría de FKs reales apuntando a convivencia_situations (0026):
--  - convivencia_situation_students.situation_id -- on delete cascade. Es
--    solo el vínculo situación<->estudiante, nace y muere con la situación
--    misma -- no es un "antecedente" que deba sobrevivir, se deja en
--    cascada tal cual ya estaba.
--  - convivencia_attachments.situation_id -- on delete cascade. Actas o
--    documentos adjuntos SÍ son antecedentes reales (el mismo criterio que
--    ya protege documentos de un caso en 0040) -- si existen, se bloquea.
--  - convivencia_situations.case_id -- si ya fue convertida en Caso, ese
--    caso completo (entrevistas/medidas/derivaciones/seguimientos/actas)
--    depende de esta situación como origen; se bloquea.
-- Ningún otro catálogo (protocolos, medidas, entrevistas, derivaciones,
-- seguimientos, eventos) tiene columna situation_id -- todos son
-- exclusivos de convivencia_cases, así que quedan cubiertos por la
-- comprobación de case_id de arriba (si algo de eso existe, la situación ya
-- tiene case_id asignado).
--
-- No se ofrece una eliminación administrativa "de todas formas" para
-- Director/Superadmin en este caso: una situación con case_id no puede
-- borrarse sin dejar al caso real sin su origen, así que no es técnicamente
-- segura sin romper trazabilidad -- se ofrece archivar en su lugar
-- (convivencia_situations.status ya admite 'archivado' desde 0040).
-- =============================================================================

create or replace function public.guard_situation_delete() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.case_id is not null then
    raise exception 'Esta situación ya fue convertida en un caso y no puede eliminarse directamente. Archívela en su lugar.';
  end if;
  if exists (select 1 from public.convivencia_attachments where situation_id = old.id) then
    raise exception 'Esta situación tiene documentos adjuntos y no puede eliminarse directamente. Archívela en su lugar.';
  end if;
  return old;
end;
$$;

drop trigger if exists trg_guard_situation_delete on public.convivencia_situations;
create trigger trg_guard_situation_delete
  before delete on public.convivencia_situations
  for each row execute function public.guard_situation_delete();
