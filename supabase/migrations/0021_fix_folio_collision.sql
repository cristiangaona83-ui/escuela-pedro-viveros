-- =============================================================================
-- Corrige la causa real de "Ya existe un informe con ese folio" en Informe
-- Anual e Informe de Cierre de Año.
--
-- CAUSA (confirmada por revisión de código, no una hipótesis):
-- next_certificate_folio(p_cert_type, p_year) numera los folios en
-- certificate_sequences con una secuencia INDEPENDIENTE por (cert_type,
-- year) — eso es correcto y ya era atómico (INSERT ... ON CONFLICT ...
-- RETURNING, sin condición de carrera). El problema es que el FOLIO
-- DEVUELTO nunca incluyó el cert_type, solo 'PVO-<año>-<número>'. Como
-- certificates.folio es único de forma GLOBAL (sin importar el tipo),
-- el primer certificado de CUALQUIER tipo emitido en un año reclama
-- "PVO-<año>-000001", y el primer certificado del SIGUIENTE tipo
-- distinto emitido ese mismo año vuelve a calcular número 1 en SU PROPIA
-- secuencia (porque es una fila distinta en certificate_sequences) y
-- genera el mismo texto de folio → viola el UNIQUE de certificates.folio
-- (23505). Esto explica por qué falla específicamente el segundo y tercer
-- tipo de informe que se intenta emitir en el año (típicamente Informe
-- Anual y Cierre de Año, después de que Informe Semestral o Alumno
-- Regular ya reclamó "000001"), y por qué NINGÚN informe llegaba a
-- registrarse aunque el folio en sí se generara sin error.
--
-- No es un problema de MAX(...)+1 (no se usa ese patrón), no es RLS, no
-- es una secuencia compartida por error entre dos tipos (cada tipo SÍ
-- tiene su propio contador), y no hay registros huérfanos que limpiar: al
-- ser INSERT atómico con UNIQUE, el intento que colisiona nunca llega a
-- crear fila — solo el primer tipo que "ganó" el folio quedó registrado,
-- correctamente.
--
-- CORRECCIÓN: el folio ahora incluye un código de 2 letras del tipo de
-- documento ('IA' informe_anual, 'CA' cierre_anio, 'IS' informe_semestral,
-- 'AR' alumno_regular, 'MA' matricula), quedando p. ej.
-- "PVO-IA-2026-000001" / "PVO-CA-2026-000001" — nunca vuelven a coincidir
-- entre tipos distintos, sin tocar certificate_sequences ni el UNIQUE de
-- certificates.folio. Los folios YA EMITIDOS (formato antiguo, sin
-- código de tipo) no se tocan ni se renumeran — siguen siendo válidos
-- como registro histórico permanente. Ningún código en el repositorio
-- parsea o valida el formato del folio (se usa como texto opaco en PDFs
-- y en el registro), así que el cambio de formato hacia adelante es
-- seguro.
--
-- Reemisión de un informe para el mismo estudiante/año/tipo: sigue
-- creando una fila NUEVA con folio nuevo (no una actualización de la
-- existente) — es el comportamiento correcto para un documento formal
-- numerado, igual que un certificado reimpreso no sobrescribe al
-- original. certificates.status ('vigente'/'anulado') ya existe para
-- invalidar una emisión anterior si corresponde, sin necesidad de un
-- mecanismo nuevo.
-- =============================================================================

create or replace function public.next_certificate_folio(p_cert_type text, p_year int)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_number int;
  v_prefix text := 'PVO';
  v_type_code text;
begin
  v_type_code := case p_cert_type
    when 'alumno_regular' then 'AR'
    when 'informe_semestral' then 'IS'
    when 'informe_anual' then 'IA'
    when 'cierre_anio' then 'CA'
    when 'matricula' then 'MA'
    -- Código genérico para cualquier cert_type futuro no listado arriba,
    -- para no depender de otra migración si se agrega un tipo nuevo.
    else upper(left(regexp_replace(p_cert_type, '[^a-zA-Z]', '', 'g') || 'XX', 2))
  end;

  insert into public.certificate_sequences (cert_type, year, last_number)
  values (p_cert_type, p_year, 1)
  on conflict (cert_type, year)
  do update set last_number = public.certificate_sequences.last_number + 1
  returning last_number into v_number;

  return v_prefix || '-' || v_type_code || '-' || p_year::text || '-' || lpad(v_number::text, 6, '0');
end;
$$;
-- Mismo nombre y firma (text, int) que la función original de 0001_schema.sql
-- → CREATE OR REPLACE conserva el grant ya existente a "authenticated"
-- (0004_grants.sql); no hace falta repetir revoke/grant.
