-- =============================================================================
-- Privilegios de esquema/tabla/función — Escuela Profesor Pedro Viveros Ormeño
-- Ejecutar después de 0001_schema.sql, 0002_rls.sql y 0003_verification.sql.
--
-- Por qué existe este archivo:
-- RLS filtra FILAS, pero Postgres primero exige un GRANT a nivel de TABLA
-- para el rol que hace la consulta (anon / authenticated). Las migraciones
-- 0001-0003 crearon tablas, funciones y políticas RLS, pero nunca ejecutaron
-- GRANT — por eso toda lectura fallaba con "permission denied for table X",
-- incluso en tablas con política explícita "to anon". Este archivo es la
-- única fuente de verdad de esos privilegios; es seguro volver a ejecutarlo
-- (todas las sentencias son idempotentes).
--
-- Principio aplicado: mínimo privilegio.
--   - anon  : solo SELECT en las tablas con contenido explícitamente público,
--             más INSERT en el formulario de contacto. Nada de estudiantes,
--             perfiles, calificaciones, asistencia, PIE, observaciones
--             pedagógicas ni documentos privados.
--   - authenticated : el resto del control real de acceso lo sigue haciendo
--             RLS (rol/curso/propietario). Aquí solo se abre la puerta a
--             nivel de tabla para que esas políticas puedan evaluarse.
--   - DELETE : se concede solo donde 0002_rls.sql ya define una política de
--             delete explícita y la tabla NO tiene un campo de baja lógica
--             (active / status / published / handled). Donde ese campo
--             existe, el diseño es desactivar, no borrar — así que no se
--             otorga DELETE aunque la política "for all" técnicamente lo
--             permitiría. certificate_sequences no recibe ningún grant:
--             solo se usa internamente vía next_certificate_folio().
-- No modifica 0001_schema.sql, 0002_rls.sql ni 0003_verification.sql.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Visibilidad del esquema (requisito previo a cualquier GRANT de tabla/función)
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Reinicio limpio: nos aseguramos de partir de cero en tablas antes de
-- otorgar exactamente lo necesario. Evita arrastrar privilegios por defecto
-- que pudieran haberse asignado fuera de este archivo.
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;

-- ---------------------------------------------------------------------------
-- anon — únicamente contenido explícitamente público del sitio institucional
-- ---------------------------------------------------------------------------
grant select on public.courses            to anon; -- solo public_visible=true vía RLS
grant select on public.staff_members      to anon; -- solo active=true vía RLS
grant select on public.news               to anon; -- solo published=true vía RLS
grant select on public.gallery            to anon; -- solo published=true vía RLS
grant select on public.documents          to anon; -- solo is_public=true vía RLS
grant select on public.school_config      to anon; -- solo is_public=true vía RLS
grant insert on public.contact_messages   to anon; -- formulario de contacto público

-- anon NO recibe ningún privilegio sobre: profiles, roles, user_roles,
-- students, guardians, enrollments, grades, evaluations, attendance,
-- pie_records, student_support, classroom_observations, certificates,
-- audit_logs, certificate_sequences, ni sobre columnas/documentos privados.

-- ---------------------------------------------------------------------------
-- authenticated — habilita la evaluación de las políticas RLS existentes.
-- El control real de "quién puede qué" lo sigue haciendo RLS (rol, curso
-- asignado, propietario del registro, período abierto/cerrado, etc.).
-- ---------------------------------------------------------------------------

-- Identidad y roles
grant select, update on public.profiles              to authenticated; -- alta la hace handle_new_user() (security definer)
grant select on public.roles                          to authenticated; -- catálogo fijo, sin CRUD desde la app
grant select, insert, delete on public.user_roles      to authenticated; -- asignar/revocar rol

-- Estructura académica (con baja lógica vía "active": no se concede DELETE)
grant select, insert, update on public.academic_years        to authenticated;
grant select, insert, update on public.courses                to authenticated;
grant select, insert, update on public.subjects                to authenticated;
grant select, insert, update on public.teacher_assignments      to authenticated;
grant select, insert, update on public.academic_periods          to authenticated; -- abrir/cerrar es un update de status

-- Estudiantes y matrícula (información privada; nunca active=false se borra, se desactiva)
grant select, insert, update on public.students   to authenticated;
grant select, insert, update, delete on public.guardians to authenticated; -- sin campo de baja lógica
grant select, insert, update on public.enrollments to authenticated; -- baja lógica vía status ('retirada','trasladada')

-- Evaluaciones y calificaciones (0002 ya define política de delete explícita)
grant select, insert, update, delete on public.evaluations to authenticated;
grant select, insert, update, delete on public.grades      to authenticated;

-- Asistencia (registro académico sensible: se corrige con UPDATE, no se borra)
grant select, insert, update on public.attendance to authenticated;

-- Planificación y objetivos de aprendizaje
grant select, insert, update on public.learning_objectives     to authenticated;
grant select, insert, update, delete on public.lesson_plans          to authenticated; -- 0002 ya define política de delete explícita
grant select, insert, delete on public.lesson_plan_objectives to authenticated; -- tabla puente, sin update con sentido

-- Seguimiento pedagógico y PIE (confidenciales: baja lógica vía status, no se borran)
grant select, insert, update on public.student_support to authenticated;
grant select, insert, update on public.pie_records      to authenticated;

-- Acompañamiento docente (registro sensible de evaluación de desempeño: sin delete)
grant select, insert, update on public.classroom_observations to authenticated;

-- Certificados (baja lógica vía status='anulado'; certificate_sequences es
-- de uso exclusivo de next_certificate_folio(), no recibe ningún grant)
grant select, insert, update on public.certificates to authenticated;

-- Contenido público administrable (sin registros críticos que preservar)
grant select, insert, update, delete on public.staff_members to authenticated;
grant select, insert, update, delete on public.news           to authenticated;
grant select, insert, update, delete on public.gallery         to authenticated;
grant select, insert, update, delete on public.documents        to authenticated;
grant select, insert, update, delete on public.events            to authenticated;

-- Buzón de contacto (se marca "handled", no se borra)
grant select, insert, update on public.contact_messages to authenticated;

-- Configuración institucional (alto impacto si se borra por error: solo update/insert de valores)
grant select, insert, update on public.school_config to authenticated;

-- Bitácora de auditoría: solo lectura para Dirección/Superadmin vía RLS.
-- La escritura ocurre exclusivamente a través de log_audit() (security definer).
grant select on public.audit_logs to authenticated;

-- ---------------------------------------------------------------------------
-- Funciones: por defecto Postgres concede EXECUTE a PUBLIC (es decir, también
-- a anon) al crear una función, salvo que se revoque explícitamente. Cerramos
-- ese hueco y dejamos solo lo estrictamente necesario.
-- ---------------------------------------------------------------------------
revoke execute on function public.set_updated_at() from public;
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.teaches_course(uuid) from public;
revoke execute on function public.owns_evaluation(uuid) from public;
revoke execute on function public.evaluation_period_open(uuid) from public;
revoke execute on function public.teaches_student(uuid) from public;
revoke execute on function public.log_audit(text, text, text, text, jsonb) from public;
revoke execute on function public.current_user_roles() from public;
revoke execute on function public.has_role(text) from public;
revoke execute on function public.has_any_role(text[]) from public;
revoke execute on function public.is_academic_management() from public;
revoke execute on function public.next_certificate_folio(text, int) from public;
revoke execute on function public.verify_certificate(text) from public;

-- Helpers usados dentro de políticas RLS y llamados por RPC desde código
-- autenticado (nunca desde anon: folios y auditoría son solo para personal).
grant execute on function public.teaches_course(uuid) to authenticated;
grant execute on function public.owns_evaluation(uuid) to authenticated;
grant execute on function public.evaluation_period_open(uuid) to authenticated;
grant execute on function public.teaches_student(uuid) to authenticated;
grant execute on function public.current_user_roles() to authenticated;
grant execute on function public.has_role(text) to authenticated;
grant execute on function public.has_any_role(text[]) to authenticated;
grant execute on function public.is_academic_management() to authenticated;
grant execute on function public.log_audit(text, text, text, text, jsonb) to authenticated;
grant execute on function public.next_certificate_folio(text, int) to authenticated;

-- verify_certificate() es la única función pensada para llamarse sin sesión
-- (página pública /verificar) y devuelve exclusivamente: válido/no válido,
-- folio, tipo de documento, nombre del estudiante, fecha de emisión y
-- establecimiento — nunca notas, asistencia, RUN completo del apoderado ni
-- ningún otro dato académico o personal sensible.
grant execute on function public.verify_certificate(text) to anon, authenticated;

-- set_updated_at() y handle_new_user() son funciones de trigger: las invoca
-- Postgres internamente al insertar/actualizar filas, no se llaman por RPC
-- desde el cliente. Quedan sin EXECUTE para anon ni authenticated a propósito.
