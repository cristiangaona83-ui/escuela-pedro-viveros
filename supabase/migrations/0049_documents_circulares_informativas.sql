-- =============================================================================
-- Documentos -- Circulares Informativas
-- =============================================================================
-- Nueva categoría dentro del módulo Documentos existente (category =
-- 'circulares_informativas' en la misma tabla `documents`, sin tabla nueva
-- -- `category` ya es texto libre, no un enum). Estas tres columnas son
-- aditivas y nullable/con default seguro: ninguna categoría existente de
-- `documents` las usa hoy, así que no cambian nada de lo que ya funciona.
--
--  - document_number: "N° de circular" -- texto libre y opcional porque no
--    todas las circulares usan un correlativo (pedido explícito).
--  - document_date: fecha propia del documento (ej. fecha del hecho o de
--    emisión), distinta de created_at (cuándo se subió el registro) y de
--    year (que ya existía, se sigue usando para agrupar/filtrar por año).
--  - status: ciclo editorial de la circular. Default 'publicada' para que
--    todas las filas existentes (de cualquier categoría) queden en un
--    estado válido sin requerir intervención manual.
-- =============================================================================

alter table public.documents
  add column if not exists document_number text,
  add column if not exists document_date date,
  add column if not exists status text not null default 'publicada'
    check (status in ('borrador', 'publicada', 'archivada'));

create index if not exists documents_category_status_idx on public.documents (category, status);
