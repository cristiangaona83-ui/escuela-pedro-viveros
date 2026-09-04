-- =============================================================================
-- Seguro Escolar -- antecedentes de atención inicial y derivación
-- =============================================================================
-- El nuevo documento institucional (PDF propio de la escuela, ya no una
-- copia del formulario 0374-3) agrega secciones que el formulario oficial
-- no cubre -- "Atención y procedimiento" y "Derivación" -- con datos
-- específicos del accidente que no existían todavía en
-- seguro_escolar_declarations. Son columnas nuevas y nullable (aditivo,
-- no rompe filas existentes); no se toca ninguna columna ni tabla de 0046.
-- care_staff_name es texto libre (a diferencia de responsible_id/
-- staff_member_id que ya usan las otras tablas del módulo para "quién hizo
-- esto"): quien dio la atención inicial no siempre es un usuario de la
-- plataforma con perfil propio.
-- =============================================================================

alter table public.seguro_escolar_declarations
  add column if not exists location text,
  add column if not exists activity text,
  add column if not exists initial_care text,
  add column if not exists care_staff_name text,
  add column if not exists care_time time,
  add column if not exists care_measure text
    check (care_measure in ('permanece_establecimiento', 'retiro_apoderado', 'derivacion_centro_asistencial', 'traslado_ambulancia', 'otro')),
  add column if not exists referral_departure_time time,
  add column if not exists referral_accompanying_adult text,
  add column if not exists referral_transport_means text,
  add column if not exists observations text;
