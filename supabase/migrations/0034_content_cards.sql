-- =============================================================================
-- Tarjetas de contenido público — Escuela Profesor Pedro Viveros Ormeño
--
-- Una sola tabla reutilizada en tres secciones (misma idea que
-- staff_section_memberships para Directivo/PIE/Asistentes en
-- 0025_institutional_team_management.sql): Destacados de Inicio, Sellos
-- Educativos y Valores Institucionales de Nuestra Escuela. Reemplaza los
-- arrays hardcodeados HIGHLIGHTS ((public)/page.tsx), EDUCATIONAL_SEALS y
-- VALUES (config/institutional-content.ts).
--
-- icon/href solo aplican a 'inicio_destacados' (Sellos/Valores no llevan
-- ícono ni enlace propio). icon guarda el NOMBRE del ícono de lucide-react
-- (lista corta predefinida en código, ver src/config/content-icons.ts) --
-- nunca un ícono/imagen subida por el usuario.
-- =============================================================================

create table public.content_cards (
  id uuid primary key default gen_random_uuid(),
  section text not null check (section in ('inicio_destacados', 'nuestra_escuela_sellos', 'nuestra_escuela_valores')),
  title text not null,
  description text not null,
  icon text,
  href text,
  order_index int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_content_cards_section on public.content_cards(section, order_index);

create trigger trg_content_cards_updated_at
  before update on public.content_cards
  for each row execute function public.set_updated_at();

alter table public.content_cards enable row level security;

create policy "content_cards_select_public_active" on public.content_cards
  for select to anon using (active = true);
create policy "content_cards_select_all_staff" on public.content_cards
  for select to authenticated using (true);
create policy "content_cards_write_admin" on public.content_cards
  for all to authenticated
  using (public.has_any_role(array['director', 'utp', 'superadmin']))
  with check (public.has_any_role(array['director', 'utp', 'superadmin']));

grant select on public.content_cards to anon;
grant select, insert, update, delete on public.content_cards to authenticated;

-- ---------------------------------------------------------------------------
-- Semilla: el contenido que hoy está hardcodeado, para que el sitio se vea
-- exactamente igual el día que el código pase a leer desde esta tabla.
-- ---------------------------------------------------------------------------
insert into public.content_cards (section, title, description, icon, href, order_index) values
  ('inicio_destacados', 'Proyecto Educativo', 'Nuestra propuesta pedagógica, sellos institucionales y forma de acompañar a cada estudiante.', 'BookOpen', '/proyecto-educativo', 0),
  ('inicio_destacados', 'Programa de Integración Escolar', 'Un equipo especializado que apoya a estudiantes y familias con trabajo colaborativo.', 'HeartHandshake', '/equipo-pie', 1),
  ('inicio_destacados', 'Equipo Directivo', 'Conoce a quienes lideran la gestión pedagógica y administrativa de la escuela.', 'Users2', '/equipo-directivo', 2);

insert into public.content_cards (section, title, description, order_index) values
  ('nuestra_escuela_sellos', 'Formación Integral', 'Promover el desarrollo armónico de las dimensiones intelectual, emocional, social y física de los estudiantes.', 0),
  ('nuestra_escuela_sellos', 'Educación Inclusiva y Equitativa', 'Garantizar el acceso, la permanencia y el éxito educativo de todos los estudiantes, respetando la diversidad.', 1),
  ('nuestra_escuela_sellos', 'Bienestar y Vida Saludable', 'Fomentar hábitos de vida saludable, autocuidado y bienestar emocional para un desarrollo equilibrado.', 2),
  ('nuestra_escuela_sellos', 'Ciudadanía y Convivencia Democrática', 'Desarrollar valores como el respeto, la empatía y la participación activa en la comunidad.', 3);

-- ---------------------------------------------------------------------------
-- Corrección: institutional_profile se guardó con is_public = false en la
-- Etapa 2 (solo la consumían rutas de certificados, ya autenticadas). La
-- Etapa 4 hace que Contacto/Inicio/Nuestra Escuela lean el mismo perfil sin
-- sesión -- nada del contenido (nombre, dirección, teléfono, RBD, RECOFI...)
-- es sensible, ya está en los certificados y en el sitio público actual.
-- ---------------------------------------------------------------------------
update public.school_config set is_public = true where key = 'institutional_profile';

insert into public.content_cards (section, title, description, order_index) values
  ('nuestra_escuela_valores', 'Inclusión', 'Promovemos la participación activa de todas y todos, procurando que cada integrante de la comunidad se sienta valorado y parte fundamental de ella.', 0),
  ('nuestra_escuela_valores', 'Compromiso', 'Asumimos nuestras responsabilidades con participación, constancia y disposición para contribuir al desarrollo de nuestra comunidad educativa.', 1),
  ('nuestra_escuela_valores', 'Creatividad', 'Valoramos la capacidad de proponer ideas nuevas, expresar el pensamiento y buscar distintas soluciones frente a los desafíos.', 2),
  ('nuestra_escuela_valores', 'Equidad', 'Reconocemos y respetamos las diferencias individuales, procurando entregar a cada persona las oportunidades y apoyos que necesita para desarrollarse plenamente.', 3),
  ('nuestra_escuela_valores', 'Solidaridad', 'Promovemos la colaboración, la generosidad y la preocupación genuina por el bienestar de quienes forman parte de nuestra comunidad.', 4),
  ('nuestra_escuela_valores', 'Tolerancia', 'Escuchamos y respetamos las distintas opiniones, experiencias y puntos de vista, favoreciendo el diálogo y la sana convivencia.', 5),
  ('nuestra_escuela_valores', 'Empatía', 'Procuramos comprender las emociones y necesidades de los demás, actuando con respeto, amabilidad y consideración.', 6),
  ('nuestra_escuela_valores', 'Resiliencia', 'Enfrentamos las dificultades con perseverancia y una actitud constructiva, aprendiendo de los errores y desafíos para continuar avanzando.', 7),
  ('nuestra_escuela_valores', 'Integridad', 'Actuamos con honestidad, responsabilidad y coherencia, respetando nuestros principios y las normas de convivencia.', 8);
