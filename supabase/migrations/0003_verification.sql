-- =============================================================================
-- Verificación pública de certificados (/verificar)
-- Expone solo datos mínimos, nunca información académica sensible.
-- =============================================================================

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
  where c.verification_code = p_code or c.folio = p_code
  limit 1;
end;
$$;

grant execute on function public.verify_certificate(text) to anon, authenticated;
