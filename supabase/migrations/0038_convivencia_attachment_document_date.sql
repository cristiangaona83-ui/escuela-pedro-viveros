-- =============================================================================
-- Actas de reunión y documentos -- fecha del acta + tipo "Acta con funcionarios"
-- Extiende convivencia_attachments (0026, luego 0036 -- ambas ya ejecutadas,
-- NINGUNA de las dos se modifica ni se vuelve a ejecutar).
--
-- Auditoría previa: convivencia_attachments ya cubre exactamente lo pedido
-- (un archivo colgado de un caso, en Storage privado, con tipo/descripción/
-- estado) -- reutilizada tal cual, sin tabla nueva. Lo único que falta es un
-- campo real: hoy solo existe created_at (fecha/hora en que se SUBIÓ el
-- archivo), y el pedido pide explícitamente "Fecha del acta" como campo del
-- formulario y columna del listado, distinta de "fecha/hora de carga" -- un
-- acta firmada en papel puede escanearse y subirse días después de la
-- reunión real. Sin esa columna no hay forma honesta de mostrar esa fecha
-- sin inventar un valor. Ninguna tabla ni migración nueva: un ALTER TABLE
-- aditivo (nullable, no rompe filas existentes) es la única vía real.
--
-- También se agrega 'acta_funcionarios' al catálogo de document_type -- la
-- lista pedida (reunión/apoderado/estudiante/funcionarios/seguimiento/
-- firmada/otro) no tiene equivalente exacto entre los 7 tipos ya existentes
-- ("Acta de entrevista" es otra cosa, no se renombra ni se quita para no
-- alterar el significado de filas ya guardadas con ese tipo). Mismo patrón
-- idempotente que 0036: DROP CONSTRAINT IF EXISTS + ADD CONSTRAINT.
--
-- No destructiva: ADD COLUMN nullable, un CHECK reemplazado (superset del
-- anterior, ningún valor existente deja de ser válido). Sin RLS nueva (las
-- políticas de 0036 ya cubren cualquier columna de la fila) ni políticas de
-- Storage nuevas (las de 0026 para archivos-internos/convivencia/ ya cubren
-- cualquier subcarpeta, incluida convivencia/actas/{case_id}/ que ya usa el
-- formulario existente).
-- =============================================================================

alter table public.convivencia_attachments add column if not exists document_date date;

comment on column public.convivencia_attachments.document_date is
  'Fecha en que ocurrió/se firmó el acta (reunión, entrevista, etc.), distinta de created_at (fecha/hora en que se subió el archivo). Nullable: las filas cargadas antes de esta migración no la tienen.';

alter table public.convivencia_attachments drop constraint if exists convivencia_attachments_document_type_check;
alter table public.convivencia_attachments add constraint convivencia_attachments_document_type_check
  check (document_type is null or document_type in (
    'acta_entrevista', 'acta_apoderado', 'acta_estudiante', 'acta_funcionarios', 'acta_reunion',
    'acta_seguimiento', 'acta_firmada', 'otro'
  ));
