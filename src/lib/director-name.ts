function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

const MAX_NAME_LINE_LENGTH = 80;

/**
 * ¿Esta línea de texto es la firma impresa del Director (ej. "Cristian Gaona
 * Villena" o "Cristian Gaona")? Se usa para ubicar dónde van la firma y el
 * timbre en informativos y circulares: arriba de esa línea.
 *
 * Reconoce el nombre sin importar tildes/mayúsculas ni si se escribió
 * completo o abreviado: basta con que aparezcan al menos 2 palabras del
 * nombre configurado del Director (hoy "Cristian Fernando Gaona Villena").
 * Solo líneas cortas -- una oración larga que mencione al Director en el
 * cuerpo del texto no cuenta como su firma.
 */
export function looksLikeDirectorName(text: string, directorFullName: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > MAX_NAME_LINE_LENGTH) return false;

  const nameTokens = normalize(directorFullName)
    .split(/\s+/)
    .filter((token) => token.length > 2);
  const lineWords = new Set(normalize(trimmed).split(/[^a-z0-9]+/).filter(Boolean));
  const matches = nameTokens.filter((token) => lineWords.has(token)).length;
  return matches >= 2;
}

interface TextBlock {
  type?: string;
  text?: string;
  content?: TextBlock[];
}

function blockPlainText(node: TextBlock): string {
  return (node.content ?? []).map((n) => (n.type === "hardBreak" ? " " : n.text ?? "")).join("");
}

/**
 * Último bloque (párrafo o título) de un documento TipTap que es el nombre
 * impreso del Director: la firma y el timbre van justo arriba de él. -1 si no
 * aparece. Compartido por el PDF y por la página web del informativo.
 */
export function findDirectorNameBlockIndex(blocks: TextBlock[], directorFullName: string): number {
  for (let i = blocks.length - 1; i >= 0; i--) {
    const n = blocks[i];
    if ((n.type === "paragraph" || n.type === "heading") && looksLikeDirectorName(blockPlainText(n), directorFullName)) return i;
  }
  return -1;
}
