export interface ParsedYouTubeVideo {
  id: string;
  url: string;
  thumbnailUrl: string;
}

/** Extrae el ID de un video de YouTube desde cualquier formato de URL habitual. Null si no es una URL de YouTube reconocible. */
export function parseYouTubeUrl(input: string): ParsedYouTubeVideo | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "");
  let id: string | null = null;

  if (host === "youtu.be") {
    id = url.pathname.slice(1).split("/")[0] || null;
  } else if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
    if (url.pathname === "/watch") {
      id = url.searchParams.get("v");
    } else if (url.pathname.startsWith("/embed/")) {
      id = url.pathname.split("/embed/")[1]?.split("/")[0] || null;
    } else if (url.pathname.startsWith("/shorts/")) {
      id = url.pathname.split("/shorts/")[1]?.split("/")[0] || null;
    }
  }

  if (!id || !/^[\w-]{11}$/.test(id)) return null;

  return {
    id,
    url: `https://www.youtube.com/watch?v=${id}`,
    thumbnailUrl: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
  };
}

export function youtubeEmbedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0`;
}
