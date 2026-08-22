-- Corrige el hallazgo CRÍTICO C1 de la auditoría final: verify_certificate()
-- (0003_verification.sql) aceptaba tanto el código de verificación aleatorio
-- (verification_code, uuid sin guiones, no adivinable) como el folio humano
-- (PVO-2026-000001, secuencial y por lo tanto predecible). La página pública
-- /verificar invita a escribir cualquiera de los dos. Como el folio es
-- consecutivo, cualquier persona sin sesión podía recorrer la secuencia
-- numérica y obtener el nombre completo de cada estudiante con un
-- certificado emitido, sin necesitar jamás el código real.
--
-- No se toca el sistema de folios (next_certificate_folio, certificate_sequences,
-- la columna certificates.folio) ni ningún certificado ya emitido: cada
-- certificado ya tiene su verification_code real desde que se creó (la
-- columna lo genera automáticamente por default), y el QR de
-- CertificateAlumnoRegular.tsx ya usaba verification_code, nunca el folio, así
-- que la verificación por QR sigue funcionando exactamente igual para
-- certificados anteriores y nuevos.
--
-- No se modifica 0003_verification.sql -- esta es una migración incremental
-- nueva que reemplaza la función en la base de datos en vivo.
create or replace function public.verify_certificate(p_code text)
returns table (
  valid boolean,
  folio text,
  cert_type text,
  student_name text,
  issued_at timestamptz,
  status text,
  institution text
)
language plpgsql security definer set search_path = public as $$
begin
  return query
  select
    (c.status = 'vigente') as valid,
    c.folio,
    c.cert_type,
    s.first_names || ' ' || s.last_names as student_name,
    c.issued_at,
    c.status,
    'Escuela Profesor Pedro Viveros Ormeño'::text as institution
  from public.certificates c
  join public.students s on s.id = c.student_id
  where c.verification_code = p_code
  limit 1;
end;
$$;

-- El GRANT ya existente (0004_grants.sql, "grant execute ... to anon, authenticated")
-- sigue aplicando sin cambios: mismo nombre de función, misma firma.
