-- =============================================================================
-- Soporte de video en Galería — Escuela Profesor Pedro Viveros Ormeño
--
-- Extiende `gallery` (0001_schema.sql, columna "description" agregada en
-- 0009_gallery_description.sql) para admitir tres tipos de elemento en la
-- misma tabla plana ya existente -- sin introducir un concepto de "álbum"
-- nuevo (la agrupación visual sigue siendo `category`, como ya usa
-- GalleryGrid hoy). Todas las columnas son nuevas y nullable/con default:
-- las filas de fotografías existentes quedan intactas
-- (media_type = 'image' por defecto, el resto en null).
--
-- `image_url` (NOT NULL, sin cambios) sigue siendo la miniatura mostrada en
-- la grilla para CUALQUIER tipo: para 'video' es el fotograma/poster subido
-- junto al video optimizado; para 'youtube' es la miniatura pública de
-- YouTube (no requiere subida). Así el componente de grilla actual apenas
-- cambia -- solo agrega el ícono ▶ para no-imágenes.
--
-- No se requiere ningún cambio de RLS ni de GRANT (mismo razonamiento que
-- 0009_gallery_description.sql): las políticas ya filtran por fila
-- (published/rol), no por columna, y el GRANT de 0004_grants.sql ya es a
-- nivel de tabla.
-- =============================================================================

alter table public.gallery add column if not exists media_type text not null default 'image';
alter table public.gallery add constraint gallery_media_type_check
  check (media_type in ('image', 'video', 'youtube'));

-- Video subido y optimizado (mp4/webm) -- URL pública en archivos-publicos/galeria/videos.
alter table public.gallery add column if not exists video_url text;
alter table public.gallery add column if not exists mime_type text;
alter table public.gallery add column if not exists duration_seconds numeric;
alter table public.gallery add column if not exists resolution text;
alter table public.gallery add column if not exists original_size_bytes bigint;
alter table public.gallery add column if not exists optimized_size_bytes bigint;
alter table public.gallery add column if not exists savings_percent numeric;

-- Video de YouTube -- solo referencia externa, nunca se descarga a Storage.
alter table public.gallery add column if not exists youtube_id text;
alter table public.gallery add column if not exists youtube_url text;

-- Orden manual (Subir/Bajar en el admin) -- hoy la grilla pública ordena por
-- event_date; con esta columna el admin puede fijar un orden propio.
alter table public.gallery add column if not exists order_index int not null default 0;

alter table public.gallery add constraint gallery_video_requires_url
  check (media_type <> 'video' or video_url is not null);
alter table public.gallery add constraint gallery_youtube_requires_id
  check (media_type <> 'youtube' or (youtube_id is not null and youtube_url is not null));

create index if not exists idx_gallery_media_type on public.gallery(media_type);

comment on column public.gallery.image_url is
  'Miniatura mostrada en la grilla para cualquier media_type: la fotografía misma (image), el fotograma/poster subido (video), o la miniatura pública de YouTube (youtube, sin subir nada).';
