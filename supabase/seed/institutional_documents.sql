-- =============================================================================
-- Documentos institucionales reales, entregados por la dirección.
-- Ejecutar una vez conectado el proyecto Supabase para poder administrarlos
-- desde Administración → Documentos en vez de servirlos como archivos
-- estáticos. Los PDF ya están publicados en /public/documents del sitio
-- público; reemplaza file_url por la URL de Supabase Storage si prefieres
-- migrarlos allí.
-- =============================================================================

insert into public.documents (title, category, description, file_url, is_public) values
  (
    'Proyecto Educativo Institucional (PEI)',
    'PEI',
    'Proyecto Educativo Institucional de la Escuela Profesor Pedro Viveros Ormeño.',
    'https://www.escuelapedroviveros.cl/documents/proyecto-educativo-institucional.pdf',
    true
  ),
  (
    'Reglamento Interno',
    'Reglamento',
    'Reglamento Interno del establecimiento.',
    'https://www.escuelapedroviveros.cl/documents/reglamento-interno.pdf',
    true
  ),
  (
    'Reglamento de Evaluación',
    'Reglamento',
    'Reglamento de Evaluación, Calificación y Promoción.',
    'https://www.escuelapedroviveros.cl/documents/reglamento-evaluacion.pdf',
    true
  );
