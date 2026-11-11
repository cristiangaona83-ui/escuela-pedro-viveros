-- =============================================================================
-- Informes Pedagógicos de Educación Parvularia (Prekínder y Kínder)
-- =============================================================================
-- Informe conceptual por semestre, con la escala L / ML / PL / N/O, para los
-- dos niveles de transición. Los indicadores NO están fijos en el código: viven
-- en una tabla editable (Informes -> Prebásica -> Administrar indicadores), para
-- poder agregar, editar, reordenar o desactivar indicadores sin tocar el sistema.
--
--   parvularia_indicators      Catálogo de indicadores por nivel (Ámbito > Núcleo > Indicador).
--                              Se desactivan (active = false), nunca se borran: así los
--                              informes ya registrados conservan lo evaluado.
--   parvularia_evaluations     Valor (L, ML, PL, NO) de cada indicador, por niño(a), año y semestre.
--   parvularia_report_notes    Observaciones y fecha de entrega del informe de cada niño(a) y año.
--
-- Ejecutar después de 0001-0056 (usa has_any_role, teaches_student, set_updated_at).
-- Los indicadores iniciales son los de los informes Word oficiales 2026
-- (Prekínder: 73 indicadores; Kínder: 84).
-- =============================================================================

create table public.parvularia_indicators (
  id uuid primary key default gen_random_uuid(),
  level text not null check (level in ('Prekínder', 'Kínder')),
  ambito text not null,
  nucleo text not null,
  text text not null,
  -- Orden dentro del nivel. Los iniciales van de a 1000 para poder insertar entre medio.
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_parvularia_indicators_updated_at before update on public.parvularia_indicators
  for each row execute function public.set_updated_at();
create index idx_parvularia_indicators_level on public.parvularia_indicators (level, sort_order);

create table public.parvularia_evaluations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  indicator_id uuid not null references public.parvularia_indicators(id) on delete cascade,
  semester smallint not null check (semester in (1, 2)),
  value text not null check (value in ('L', 'ML', 'PL', 'NO')),
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, academic_year_id, indicator_id, semester)
);
create trigger trg_parvularia_evaluations_updated_at before update on public.parvularia_evaluations
  for each row execute function public.set_updated_at();
create index idx_parvularia_evaluations_student on public.parvularia_evaluations (student_id, academic_year_id);

create table public.parvularia_report_notes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  observations text,
  delivery_date date,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, academic_year_id)
);
create trigger trg_parvularia_report_notes_updated_at before update on public.parvularia_report_notes
  for each row execute function public.set_updated_at();

alter table public.parvularia_indicators enable row level security;
alter table public.parvularia_evaluations enable row level security;
alter table public.parvularia_report_notes enable row level security;

-- Indicadores: los lee todo el personal (no son datos sensibles); los edita Dirección/UTP/Superadmin.
create policy "parvularia_indicators_select_staff" on public.parvularia_indicators
  for select to authenticated using (true);
create policy "parvularia_indicators_write_admin" on public.parvularia_indicators
  for all to authenticated
  using (public.has_any_role(array['director','utp','superadmin']))
  with check (public.has_any_role(array['director','utp','superadmin']));

-- Evaluaciones y observaciones: las ve y registra Dirección/UTP/Superadmin (y Administrativo solo lectura),
-- más el personal docente que enseña el curso del niño(a) (teaches_student).
create policy "parvularia_evaluations_select_scope" on public.parvularia_evaluations
  for select to authenticated
  using (public.has_any_role(array['director','utp','superadmin','administrativo']) or public.teaches_student(student_id));
create policy "parvularia_evaluations_write_scope" on public.parvularia_evaluations
  for all to authenticated
  using (public.has_any_role(array['director','utp','superadmin']) or public.teaches_student(student_id))
  with check (public.has_any_role(array['director','utp','superadmin']) or public.teaches_student(student_id));

create policy "parvularia_report_notes_select_scope" on public.parvularia_report_notes
  for select to authenticated
  using (public.has_any_role(array['director','utp','superadmin','administrativo']) or public.teaches_student(student_id));
create policy "parvularia_report_notes_write_scope" on public.parvularia_report_notes
  for all to authenticated
  using (public.has_any_role(array['director','utp','superadmin']) or public.teaches_student(student_id))
  with check (public.has_any_role(array['director','utp','superadmin']) or public.teaches_student(student_id));

grant select, insert, update, delete on public.parvularia_indicators to authenticated;
grant select, insert, update, delete on public.parvularia_evaluations to authenticated;
grant select, insert, update, delete on public.parvularia_report_notes to authenticated;

-- ---------------------------------------------------------------------------
-- Indicadores iniciales (solo si el catálogo está vacío -- re-ejecutar no duplica).
-- ---------------------------------------------------------------------------
insert into public.parvularia_indicators (level, ambito, nucleo, text, sort_order)
select * from (values
  ('Kínder', 'DESARROLLO PERSONAL Y SOCIAL', 'Identidad y Autonomía', 'Expresa adecuadamente sus sentimientos y emociones.', 1000),
  ('Kínder', 'DESARROLLO PERSONAL Y SOCIAL', 'Identidad y Autonomía', 'Tiene conciencia de su género', 2000),
  ('Kínder', 'DESARROLLO PERSONAL Y SOCIAL', 'Identidad y Autonomía', 'Concentra la atención durante el período de trabajo.', 3000),
  ('Kínder', 'DESARROLLO PERSONAL Y SOCIAL', 'Identidad y Autonomía', 'Expresa sus preferencias, opiniones, ideas en diversas situaciones cotidianas y juegos.', 4000),
  ('Kínder', 'DESARROLLO PERSONAL Y SOCIAL', 'Identidad y Autonomía', 'Identifica roles y cualidades personales.', 5000),
  ('Kínder', 'DESARROLLO PERSONAL Y SOCIAL', 'Identidad y Autonomía', 'Presenta autonomía en prácticas de higiene, alimentación y vestuario', 6000),
  ('Kínder', 'DESARROLLO PERSONAL Y SOCIAL', 'Identidad y Autonomía', 'Identifica y cuida sus pertenencias', 7000),
  ('Kínder', 'DESARROLLO PERSONAL Y SOCIAL', 'Convivencia y Ciudadanía', 'Presenta hábitos de cortesía y respeto con adultos y compañeros', 8000),
  ('Kínder', 'DESARROLLO PERSONAL Y SOCIAL', 'Convivencia y Ciudadanía', 'Cumple responsabilidades asignadas', 9000),
  ('Kínder', 'DESARROLLO PERSONAL Y SOCIAL', 'Convivencia y Ciudadanía', 'Pide la palabra para hablar levantando la mano', 10000),
  ('Kínder', 'DESARROLLO PERSONAL Y SOCIAL', 'Convivencia y Ciudadanía', 'Respeta reglas y normas de convivencia', 11000),
  ('Kínder', 'DESARROLLO PERSONAL Y SOCIAL', 'Convivencia y Ciudadanía', 'Comprende y sigue instrucciones', 12000),
  ('Kínder', 'DESARROLLO PERSONAL Y SOCIAL', 'Convivencia y Ciudadanía', 'Participa y comparte con agrado en juegos y actividades', 13000),
  ('Kínder', 'DESARROLLO PERSONAL Y SOCIAL', 'Convivencia y Ciudadanía', 'Manifiesta empatía y solidaridad con sus compañeros', 14000),
  ('Kínder', 'DESARROLLO PERSONAL Y SOCIAL', 'Convivencia y Ciudadanía', 'Resuelve conflictos en forma pacífica', 15000),
  ('Kínder', 'DESARROLLO PERSONAL Y SOCIAL', 'Convivencia y Ciudadanía', 'Reconoce y evita situaciones de riesgo', 16000),
  ('Kínder', 'DESARROLLO PERSONAL Y SOCIAL', 'Convivencia y Ciudadanía', 'Aprecia el significado de las diversas manifestaciones culturales de su entorno', 17000),
  ('Kínder', 'DESARROLLO PERSONAL Y SOCIAL', 'Convivencia y Ciudadanía', 'Aprecia la diversidad de las personas y sus formas de vida', 18000),
  ('Kínder', 'DESARROLLO PERSONAL Y SOCIAL', 'Corporalidad y Movimiento', 'Reconoce partes y funciones de su cuerpo', 19000),
  ('Kínder', 'DESARROLLO PERSONAL Y SOCIAL', 'Corporalidad y Movimiento', 'Reconoce su lateralidad', 20000),
  ('Kínder', 'DESARROLLO PERSONAL Y SOCIAL', 'Corporalidad y Movimiento', 'Presenta hábitos de autocuidado personal', 21000),
  ('Kínder', 'DESARROLLO PERSONAL Y SOCIAL', 'Corporalidad y Movimiento', 'Presenta conciencia de su esquema corporal', 22000),
  ('Kínder', 'DESARROLLO PERSONAL Y SOCIAL', 'Corporalidad y Movimiento', 'Representa la figura humana completa y con detalles', 23000),
  ('Kínder', 'DESARROLLO PERSONAL Y SOCIAL', 'Corporalidad y Movimiento', 'Coordina sus habilidades motrices finas en función de sus intereses de exploración y juego (colorear, recortar, rasgar, troquelar, plegar, rellenar, etc.)', 24000),
  ('Kínder', 'DESARROLLO PERSONAL Y SOCIAL', 'Corporalidad y Movimiento', 'Mantiene el equilibrio, control y coordinación al combinar diversos movimientos, posturas y desplazamientos, en diferentes direcciones, con y sin obstáculos, correr, saltar, trepar', 25000),
  ('Kínder', 'DESARROLLO PERSONAL Y SOCIAL', 'Corporalidad y Movimiento', 'Coordina habilidades psicomotoras en ejercicios de fuerza, resistencia y tracción: Tirar la cuerda, transportar objetos, utilizar implementos en situaciones cotidianas y de juego', 26000),
  ('Kínder', 'DESARROLLO PERSONAL Y SOCIAL', 'Corporalidad y Movimiento', 'Reproduce esquemas rítmicos con su cuerpo o implementos', 27000),
  ('Kínder', 'DESARROLLO PERSONAL Y SOCIAL', 'Corporalidad y Movimiento', 'Identifica nociones temporales tales como: día/noche, hoy/mañana, antes/después', 28000),
  ('Kínder', 'COMUNICACIÓN INTEGRAL', 'Lenguaje Verbal', 'Se expresa oralmente en forma clara y comprensible', 29000),
  ('Kínder', 'COMUNICACIÓN INTEGRAL', 'Lenguaje Verbal', 'Manifiesta gusto e interés por los cuentos y otros textos', 30000),
  ('Kínder', 'COMUNICACIÓN INTEGRAL', 'Lenguaje Verbal', 'Memoriza poesías, rimas, trabalenguas y canciones', 31000),
  ('Kínder', 'COMUNICACIÓN INTEGRAL', 'Lenguaje Verbal', 'Comprende el significado de algunos símbolos (carteles, etiquetas, objetos, logos, etc.)', 32000),
  ('Kínder', 'COMUNICACIÓN INTEGRAL', 'Lenguaje Verbal', 'Se expresa en oraciones completas y coherentes', 33000),
  ('Kínder', 'COMUNICACIÓN INTEGRAL', 'Lenguaje Verbal', 'Posee un vocabulario amplio que le permite contar sus experiencias', 34000),
  ('Kínder', 'COMUNICACIÓN INTEGRAL', 'Lenguaje Verbal', 'Comprende contenidos de textos literarios y no literarios', 35000),
  ('Kínder', 'COMUNICACIÓN INTEGRAL', 'Lenguaje Verbal', 'Identifica sonidos finales (rimas)', 36000),
  ('Kínder', 'COMUNICACIÓN INTEGRAL', 'Lenguaje Verbal', 'Separa palabras en sílabas (análisis silábico)', 37000),
  ('Kínder', 'COMUNICACIÓN INTEGRAL', 'Lenguaje Verbal', 'Identifica sonidos iniciales vocálicos', 38000),
  ('Kínder', 'COMUNICACIÓN INTEGRAL', 'Lenguaje Verbal', 'Reconoce y lee vocales', 39000),
  ('Kínder', 'COMUNICACIÓN INTEGRAL', 'Lenguaje Verbal', 'Identifica sonidos iniciales consonánticos (J, M, P, L, N)', 40000),
  ('Kínder', 'COMUNICACIÓN INTEGRAL', 'Lenguaje Verbal', 'Reconoce y lee consonantes J, M, P, L, N', 41000),
  ('Kínder', 'COMUNICACIÓN INTEGRAL', 'Lenguaje Verbal', 'Realiza análisis y síntesis de Palabras (Palabra, sílaba, letra a letra, sílaba, palabra)', 42000),
  ('Kínder', 'COMUNICACIÓN INTEGRAL', 'Lenguaje Verbal', 'Toma el lápiz correctamente', 43000),
  ('Kínder', 'COMUNICACIÓN INTEGRAL', 'Lenguaje Verbal', 'Realiza trazo continuo, sin levantar el lápiz', 44000),
  ('Kínder', 'COMUNICACIÓN INTEGRAL', 'Lenguaje Verbal', 'Traza correctamente movimientos de escritura, liga letras y forma palabras simples', 45000),
  ('Kínder', 'COMUNICACIÓN INTEGRAL', 'Lenguaje Verbal', 'Escribe vocales adecuadamente', 46000),
  ('Kínder', 'COMUNICACIÓN INTEGRAL', 'Lenguaje Verbal', 'Escribe consonantes J, M, P, L, N adecuadamente.', 47000),
  ('Kínder', 'COMUNICACIÓN INTEGRAL', 'Lenguaje Verbal', 'Escribe su nombre', 48000),
  ('Kínder', 'COMUNICACIÓN INTEGRAL', 'Lenguaje Verbal', 'Reconoce algunas palabras o mensajes de otras lenguas', 49000),
  ('Kínder', 'COMUNICACIÓN INTEGRAL', 'Lenguajes Artísticos', 'Expresa emociones e ideas a través de la Plástica', 50000),
  ('Kínder', 'COMUNICACIÓN INTEGRAL', 'Lenguajes Artísticos', 'Se expresa a través de la música interpretando canciones y juegos musicales', 51000),
  ('Kínder', 'COMUNICACIÓN INTEGRAL', 'Lenguajes Artísticos', 'Expresa corporalmente sensaciones, emociones e ideas en dramatizaciones, juegos teatrales, mímica y danza', 52000),
  ('Kínder', 'COMUNICACIÓN INTEGRAL', 'Lenguajes Artísticos', 'Se expresa a través de la literatura, cuentos y poemas', 53000),
  ('Kínder', 'COMUNICACIÓN INTEGRAL', 'Lenguajes Artísticos', 'Expresa ideas, emociones, intereses y experiencias a través del dibujo', 54000),
  ('Kínder', 'INTERACCIÓN Y COMPRENSIÓN DEL ENTORNO', 'Exploración del Entorno Natural', 'Reconoce la importancia del agua y la energía solar para la vida humana', 55000),
  ('Kínder', 'INTERACCIÓN Y COMPRENSIÓN DEL ENTORNO', 'Exploración del Entorno Natural', 'Reconoce y practica diferentes formas de preservar al medio ambiente', 56000),
  ('Kínder', 'INTERACCIÓN Y COMPRENSIÓN DEL ENTORNO', 'Exploración del Entorno Natural', 'Nombra propiedades básicas y uso de objetos y elementos naturales', 57000),
  ('Kínder', 'INTERACCIÓN Y COMPRENSIÓN DEL ENTORNO', 'Exploración del Entorno Natural', 'Reconoce etapas de crecimiento y características básicas de personas, animales y plantas.', 58000),
  ('Kínder', 'INTERACCIÓN Y COMPRENSIÓN DEL ENTORNO', 'Exploración del Entorno Natural', 'Reconoce algunos elementos del universo', 59000),
  ('Kínder', 'INTERACCIÓN Y COMPRENSIÓN DEL ENTORNO', 'Exploración del Entorno Natural', 'Reconoce las estaciones del año y sus características', 60000),
  ('Kínder', 'INTERACCIÓN Y COMPRENSIÓN DEL ENTORNO', 'Exploración del Entorno Natural', 'Formula hipótesis a partir de cambios observados en experimentos (mezclas y disoluciones), comunicando a través de diferentes medios', 61000),
  ('Kínder', 'INTERACCIÓN Y COMPRENSIÓN DEL ENTORNO', 'Comprensión del Entorno Sociocultural', 'Reconoce roles de los miembros de la familia', 62000),
  ('Kínder', 'INTERACCIÓN Y COMPRENSIÓN DEL ENTORNO', 'Comprensión del Entorno Sociocultural', 'Reconoce sucesos y personajes de la historia', 63000),
  ('Kínder', 'INTERACCIÓN Y COMPRENSIÓN DEL ENTORNO', 'Comprensión del Entorno Sociocultural', 'Reconoce trabajos, oficios y/o profesiones', 64000),
  ('Kínder', 'INTERACCIÓN Y COMPRENSIÓN DEL ENTORNO', 'Comprensión del Entorno Sociocultural', 'Identifica la función que cumplen diversas instituciones presentes en la comunidad', 65000),
  ('Kínder', 'INTERACCIÓN Y COMPRENSIÓN DEL ENTORNO', 'Comprensión del Entorno Sociocultural', 'Reconoce y menciona semejanzas y diferencias entre el campo y la ciudad', 66000),
  ('Kínder', 'INTERACCIÓN Y COMPRENSIÓN DEL ENTORNO', 'Comprensión del Entorno Sociocultural', 'Reconoce características funcionamiento y utilidad de diferentes objetos tecnológicos', 67000),
  ('Kínder', 'INTERACCIÓN Y COMPRENSIÓN DEL ENTORNO', 'Pensamiento Matemático', 'Cuenta ascendentemente a lo menos hasta 30', 68000),
  ('Kínder', 'INTERACCIÓN Y COMPRENSIÓN DEL ENTORNO', 'Pensamiento Matemático', 'Cuenta en forma descendente desde el 10', 69000),
  ('Kínder', 'INTERACCIÓN Y COMPRENSIÓN DEL ENTORNO', 'Pensamiento Matemático', 'Reconoce y representa los números en forma simbólica', 70000),
  ('Kínder', 'INTERACCIÓN Y COMPRENSIÓN DEL ENTORNO', 'Pensamiento Matemático', 'Resuelve problemas simples en forma concreta y pictórica, hasta 10 elementos', 71000),
  ('Kínder', 'INTERACCIÓN Y COMPRENSIÓN DEL ENTORNO', 'Pensamiento Matemático', 'Identifica atributos de figuras 2D (Cuadrado, Círculo, Triángulo, Rectángulo)', 72000),
  ('Kínder', 'INTERACCIÓN Y COMPRENSIÓN DEL ENTORNO', 'Pensamiento Matemático', 'Identifica atributos de cuerpos 3D (Cubo, Esfera, Cono)', 73000),
  ('Kínder', 'INTERACCIÓN Y COMPRENSIÓN DEL ENTORNO', 'Pensamiento Matemático', 'Comprende relaciones temporales (antes-después, día-noche)', 74000),
  ('Kínder', 'INTERACCIÓN Y COMPRENSIÓN DEL ENTORNO', 'Pensamiento Matemático', 'Ordena secuencia temporal hasta 5 acontecimientos', 75000),
  ('Kínder', 'INTERACCIÓN Y COMPRENSIÓN DEL ENTORNO', 'Pensamiento Matemático', 'Identifica nociones espaciales (arriba-abajo, adentro-fuera, cerca-lejos, etc.)', 76000),
  ('Kínder', 'INTERACCIÓN Y COMPRENSIÓN DEL ENTORNO', 'Pensamiento Matemático', 'Utiliza cuantificadores: más-menos, igual que, muchos-pocos al comparar cantidades', 77000),
  ('Kínder', 'INTERACCIÓN Y COMPRENSIÓN DEL ENTORNO', 'Pensamiento Matemático', 'Compara según distintas dimensiones (tamaño, cantidad, altura, longitud, etc.)', 78000),
  ('Kínder', 'INTERACCIÓN Y COMPRENSIÓN DEL ENTORNO', 'Pensamiento Matemático', 'Establece semejanzas-diferencias (igual-distinto)', 79000),
  ('Kínder', 'INTERACCIÓN Y COMPRENSIÓN DEL ENTORNO', 'Pensamiento Matemático', 'Clasifica objetos por dos o tres atributos a la vez: (Forma, color, tamaño, etc.)', 80000),
  ('Kínder', 'INTERACCIÓN Y COMPRENSIÓN DEL ENTORNO', 'Pensamiento Matemático', 'Completa patrones simples y complejos', 81000),
  ('Kínder', 'INTERACCIÓN Y COMPRENSIÓN DEL ENTORNO', 'Pensamiento Matemático', 'Crea patrones sonoros, gestuales, corporales y otros de dos y tres elementos', 82000),
  ('Kínder', 'INTERACCIÓN Y COMPRENSIÓN DEL ENTORNO', 'Pensamiento Matemático', 'Seria al menos 5 elementos (Según variación de una dimensión: altura, tamaño, grosor, etc.)', 83000),
  ('Kínder', 'INTERACCIÓN Y COMPRENSIÓN DEL ENTORNO', 'Pensamiento Matemático', 'Establece correspondencia número-cantidad (0-5) (6-10)', 84000),
  ('Prekínder', 'DESARROLLO PERSONAL Y SOCIAL', 'Identidad y Autonomía', 'Expresa adecuadamente sus sentimientos y emociones', 1000),
  ('Prekínder', 'DESARROLLO PERSONAL Y SOCIAL', 'Identidad y Autonomía', 'Tiene conciencia de su género', 2000),
  ('Prekínder', 'DESARROLLO PERSONAL Y SOCIAL', 'Identidad y Autonomía', 'Concentra la atención durante el período de trabajo.', 3000),
  ('Prekínder', 'DESARROLLO PERSONAL Y SOCIAL', 'Identidad y Autonomía', 'Expresa sus ideas en diversas situaciones', 4000),
  ('Prekínder', 'DESARROLLO PERSONAL Y SOCIAL', 'Identidad y Autonomía', 'Identifica roles y cualidades personales', 5000),
  ('Prekínder', 'DESARROLLO PERSONAL Y SOCIAL', 'Identidad y Autonomía', 'Presenta autonomía en prácticas de higiene y bienestar personal', 6000),
  ('Prekínder', 'DESARROLLO PERSONAL Y SOCIAL', 'Identidad y Autonomía', 'Identifica y cuida sus pertenencias', 7000),
  ('Prekínder', 'DESARROLLO PERSONAL Y SOCIAL', 'Convivencia y Ciudadanía', 'Presenta hábitos de cortesía y respeto con adultos y compañeros', 8000),
  ('Prekínder', 'DESARROLLO PERSONAL Y SOCIAL', 'Convivencia y Ciudadanía', 'Cumple responsabilidades asignadas', 9000),
  ('Prekínder', 'DESARROLLO PERSONAL Y SOCIAL', 'Convivencia y Ciudadanía', 'Pide la palabra para hablar levantando la mano', 10000),
  ('Prekínder', 'DESARROLLO PERSONAL Y SOCIAL', 'Convivencia y Ciudadanía', 'Respeta reglas y normas de convivencia.', 11000),
  ('Prekínder', 'DESARROLLO PERSONAL Y SOCIAL', 'Convivencia y Ciudadanía', 'Comprende y sigue instrucciones', 12000),
  ('Prekínder', 'DESARROLLO PERSONAL Y SOCIAL', 'Convivencia y Ciudadanía', 'Participa y comparte con agrado en juegos y actividades', 13000),
  ('Prekínder', 'DESARROLLO PERSONAL Y SOCIAL', 'Convivencia y Ciudadanía', 'Manifiesta empatía y solidaridad con sus compañeros', 14000),
  ('Prekínder', 'DESARROLLO PERSONAL Y SOCIAL', 'Convivencia y Ciudadanía', 'Resuelve conflictos en forma pacífica', 15000),
  ('Prekínder', 'DESARROLLO PERSONAL Y SOCIAL', 'Convivencia y Ciudadanía', 'Reconoce y evita situaciones de riesgo', 16000),
  ('Prekínder', 'DESARROLLO PERSONAL Y SOCIAL', 'Convivencia y Ciudadanía', 'Aprecia el significado de las diversas manifestaciones culturales de su entorno', 17000),
  ('Prekínder', 'DESARROLLO PERSONAL Y SOCIAL', 'Convivencia y Ciudadanía', 'Aprecia la diversidad de las personas y sus formas de vida', 18000),
  ('Prekínder', 'DESARROLLO PERSONAL Y SOCIAL', 'Corporalidad y Movimiento', 'Reconoce partes y funciones de su cuerpo', 19000),
  ('Prekínder', 'DESARROLLO PERSONAL Y SOCIAL', 'Corporalidad y Movimiento', 'Presenta conciencia de su esquema corporal', 20000),
  ('Prekínder', 'DESARROLLO PERSONAL Y SOCIAL', 'Corporalidad y Movimiento', 'Reconoce su lateralidad', 21000),
  ('Prekínder', 'DESARROLLO PERSONAL Y SOCIAL', 'Corporalidad y Movimiento', 'Presenta hábitos de autocuidado personal', 22000),
  ('Prekínder', 'DESARROLLO PERSONAL Y SOCIAL', 'Corporalidad y Movimiento', 'Representa la figura humana completa', 23000),
  ('Prekínder', 'DESARROLLO PERSONAL Y SOCIAL', 'Corporalidad y Movimiento', 'Coordina con precisión habilidades psicomotora finas (colorear, recortar, rasgar, troquelar, plegar, rellenar, etc.)', 24000),
  ('Prekínder', 'DESARROLLO PERSONAL Y SOCIAL', 'Corporalidad y Movimiento', 'Mantiene el equilibrio, control y coordinación al combinar diversos movimientos, posturas y desplazamientos, en diferentes direcciones, con y sin obstáculos, correr, trotar, caminar, saltar, reptar, lanzar y recibir en diversos juegos.', 25000),
  ('Prekínder', 'DESARROLLO PERSONAL Y SOCIAL', 'Corporalidad y Movimiento', 'Coordina habilidades psicomotoras en ejercicios de fuerza, resistencia y tracción: Tirar la cuerda, transportar objetos, utilizar implementos en situaciones cotidianas y de juego', 26000),
  ('Prekínder', 'DESARROLLO PERSONAL Y SOCIAL', 'Corporalidad y Movimiento', 'Reproduce esquemas rítmicos', 27000),
  ('Prekínder', 'DESARROLLO PERSONAL Y SOCIAL', 'Corporalidad y Movimiento', 'Reconoce categorías de ubicación espacial y temporal: adelante/atrás/al lado/entre, día/noche, hoy/mañana, antes/después', 28000),
  ('Prekínder', 'COMUNICACIÓN INTEGRAL', 'Lenguaje Verbal', 'Se expresa oralmente en forma clara y comprensible', 29000),
  ('Prekínder', 'COMUNICACIÓN INTEGRAL', 'Lenguaje Verbal', 'Posee un vocabulario amplio que le permite contar sus experiencias', 30000),
  ('Prekínder', 'COMUNICACIÓN INTEGRAL', 'Lenguaje Verbal', 'Memoriza poesías, rimas, trabalenguas y canciones', 31000),
  ('Prekínder', 'COMUNICACIÓN INTEGRAL', 'Lenguaje Verbal', 'Manifiesta gusto e interés por los cuentos y otros textos', 32000),
  ('Prekínder', 'COMUNICACIÓN INTEGRAL', 'Lenguaje Verbal', 'Comprende contenidos de textos literarios y no literarios', 33000),
  ('Prekínder', 'COMUNICACIÓN INTEGRAL', 'Lenguaje Verbal', 'Identifica sonidos finales (rimas)', 34000),
  ('Prekínder', 'COMUNICACIÓN INTEGRAL', 'Lenguaje Verbal', 'Separa palabras en sílabas (análisis silábico)', 35000),
  ('Prekínder', 'COMUNICACIÓN INTEGRAL', 'Lenguaje Verbal', 'Identifica sonidos iniciales vocálicos', 36000),
  ('Prekínder', 'COMUNICACIÓN INTEGRAL', 'Lenguaje Verbal', 'Reconoce y lee vocales', 37000),
  ('Prekínder', 'COMUNICACIÓN INTEGRAL', 'Lenguaje Verbal', 'Reconoce lenguaje escrito (nombres compañeros, objetos, días de la semana, logos, etc.).', 38000),
  ('Prekínder', 'COMUNICACIÓN INTEGRAL', 'Lenguaje Verbal', 'Toma el lápiz correctamente', 39000),
  ('Prekínder', 'COMUNICACIÓN INTEGRAL', 'Lenguaje Verbal', 'Escribe su nombre', 40000),
  ('Prekínder', 'COMUNICACIÓN INTEGRAL', 'Lenguaje Verbal', 'Reconoce algunas palabras o mensajes de otras lenguas', 41000),
  ('Prekínder', 'COMUNICACIÓN INTEGRAL', 'Lenguajes Artísticos', 'Expresa emociones e ideas a través de la Plástica', 42000),
  ('Prekínder', 'COMUNICACIÓN INTEGRAL', 'Lenguajes Artísticos', 'Se expresa a través de la música interpretando canciones y juegos musicales', 43000),
  ('Prekínder', 'COMUNICACIÓN INTEGRAL', 'Lenguajes Artísticos', 'Expresa corporalmente sensaciones, emociones e ideas en dramatizaciones, juegos teatrales, mímica y danza', 44000),
  ('Prekínder', 'COMUNICACIÓN INTEGRAL', 'Lenguajes Artísticos', 'Se expresa a través de la literatura, cuentos y poemas', 45000),
  ('Prekínder', 'COMUNICACIÓN INTEGRAL', 'Lenguajes Artísticos', 'Expresa ideas, emociones, intereses y experiencias a través del dibujo', 46000),
  ('Prekínder', 'INTERACCIÓN Y COMPRENSIÓN DEL ENTORNO', 'Exploración del Entorno Natural', 'Reconoce la importancia del agua y la energía solar para la vida humana', 47000),
  ('Prekínder', 'INTERACCIÓN Y COMPRENSIÓN DEL ENTORNO', 'Exploración del Entorno Natural', 'Reconoce y practica diferentes formas de preservar al medio ambiente', 48000),
  ('Prekínder', 'INTERACCIÓN Y COMPRENSIÓN DEL ENTORNO', 'Exploración del Entorno Natural', 'Nombra propiedades básicas y uso de objetos y elementos naturales', 49000),
  ('Prekínder', 'INTERACCIÓN Y COMPRENSIÓN DEL ENTORNO', 'Exploración del Entorno Natural', 'Reconoce etapas de crecimiento y características básicas de personas, animales y plantas.', 50000),
  ('Prekínder', 'INTERACCIÓN Y COMPRENSIÓN DEL ENTORNO', 'Exploración del Entorno Natural', 'Reconoce algunos elementos del universo', 51000),
  ('Prekínder', 'INTERACCIÓN Y COMPRENSIÓN DEL ENTORNO', 'Exploración del Entorno Natural', 'Reconoce las estaciones del año y sus características', 52000),
  ('Prekínder', 'INTERACCIÓN Y COMPRENSIÓN DEL ENTORNO', 'Exploración del Entorno Natural', 'Formula hipótesis a partir de cambios observados en experimentos (mezclas y disoluciones), comunicado a través de diferentes medios', 53000),
  ('Prekínder', 'INTERACCIÓN Y COMPRENSIÓN DEL ENTORNO', 'Comprensión del Entorno Sociocultural', 'Reconoce roles de los miembros de la familia', 54000),
  ('Prekínder', 'INTERACCIÓN Y COMPRENSIÓN DEL ENTORNO', 'Comprensión del Entorno Sociocultural', 'Reconoce sucesos y personajes de la historia', 55000),
  ('Prekínder', 'INTERACCIÓN Y COMPRENSIÓN DEL ENTORNO', 'Comprensión del Entorno Sociocultural', 'Reconoce trabajos, oficios y/o profesiones', 56000),
  ('Prekínder', 'INTERACCIÓN Y COMPRENSIÓN DEL ENTORNO', 'Comprensión del Entorno Sociocultural', 'Reconoce y comprende las funciones que cumplen diferentes personas e instituciones presentes en la comunidad.', 57000),
  ('Prekínder', 'INTERACCIÓN Y COMPRENSIÓN DEL ENTORNO', 'Comprensión del Entorno Sociocultural', 'Reconoce y menciona semejanzas y diferencias entre el campo y la ciudad.', 58000),
  ('Prekínder', 'INTERACCIÓN Y COMPRENSIÓN DEL ENTORNO', 'Comprensión del Entorno Sociocultural', 'Reconoce características, funcionamiento y utilidad de diferentes objetos tecnológicos', 59000),
  ('Prekínder', 'INTERACCIÓN Y COMPRENSIÓN DEL ENTORNO', 'Pensamiento Matemático', 'Cuenta ascendentemente a lo menos hasta 10', 60000),
  ('Prekínder', 'INTERACCIÓN Y COMPRENSIÓN DEL ENTORNO', 'Pensamiento Matemático', 'Representa números y cantidades hasta el 10, en forma concreta, pictórica y simbólica', 61000),
  ('Prekínder', 'INTERACCIÓN Y COMPRENSIÓN DEL ENTORNO', 'Pensamiento Matemático', 'Identifica figuras 2D: Cuadrado, círculo, triángulo', 62000),
  ('Prekínder', 'INTERACCIÓN Y COMPRENSIÓN DEL ENTORNO', 'Pensamiento Matemático', 'Identifica figuras 3D: Cubo, Esfera, cilindro, paralelepípedo', 63000),
  ('Prekínder', 'INTERACCIÓN Y COMPRENSIÓN DEL ENTORNO', 'Pensamiento Matemático', 'Comprende relaciones temporales (antes-después, día-noche, larga-corta)', 64000),
  ('Prekínder', 'INTERACCIÓN Y COMPRENSIÓN DEL ENTORNO', 'Pensamiento Matemático', 'Ordena secuencia temporal hasta 3 acontecimientos', 65000),
  ('Prekínder', 'INTERACCIÓN Y COMPRENSIÓN DEL ENTORNO', 'Pensamiento Matemático', 'Identifica nociones espaciales (arriba - abajo -adentro - fuera-cerca-lejos, etc.)', 66000),
  ('Prekínder', 'INTERACCIÓN Y COMPRENSIÓN DEL ENTORNO', 'Pensamiento Matemático', 'Emplea cuantificadores: más que-menos que- igual que-algunos-todos-ninguno-muchos-pocos al comparar cantidades', 67000),
  ('Prekínder', 'INTERACCIÓN Y COMPRENSIÓN DEL ENTORNO', 'Pensamiento Matemático', 'Compara según distintas dimensiones (tamaño, cantidad, altura, longitud, etc.)', 68000),
  ('Prekínder', 'INTERACCIÓN Y COMPRENSIÓN DEL ENTORNO', 'Pensamiento Matemático', 'Establece semejanzas-diferencias (igual-distinto)', 69000),
  ('Prekínder', 'INTERACCIÓN Y COMPRENSIÓN DEL ENTORNO', 'Pensamiento Matemático', 'Clasifica objetos por dos o tres atributos a la vez: (Forma, color, tamaño, etc.)', 70000),
  ('Prekínder', 'INTERACCIÓN Y COMPRENSIÓN DEL ENTORNO', 'Pensamiento Matemático', 'Reproduce patrones sonoros, gestuales, corporales y otros de 2 elementos', 71000),
  ('Prekínder', 'INTERACCIÓN Y COMPRENSIÓN DEL ENTORNO', 'Pensamiento Matemático', 'Seria al menos 3 elementos según variación de una dimensión: altura, tamaño, grosor', 72000),
  ('Prekínder', 'INTERACCIÓN Y COMPRENSIÓN DEL ENTORNO', 'Pensamiento Matemático', 'Establece correspondencia número-cantidad (0-5)', 73000)
) as v(level, ambito, nucleo, text, sort_order)
where not exists (select 1 from public.parvularia_indicators);
