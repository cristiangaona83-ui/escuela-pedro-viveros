/**
 * Compresión de video en el navegador con ffmpeg.wasm -- se importa
 * dinámicamente (ver la llamada a `import()` más abajo), nunca en el bundle
 * principal ni siquiera del admin: solo se descarga cuando alguien
 * efectivamente selecciona un video para subir a Galería.
 *
 * Vercel es serverless (límites de tiempo/memoria por función); comprimir
 * ahí un video de varios minutos es frágil. Comprimir en el navegador del
 * administrador evita depender de esa infraestructura por completo.
 *
 * El original NUNCA se sube a Supabase -- solo el resultado de esta función
 * (MP4 optimizado + miniatura) sale de esta pestaña.
 */

const FFMPEG_CORE_BASE = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1080;
export const MAX_OPTIMIZED_SIZE_BYTES = 30 * 1024 * 1024;

export class VideoTooLargeError extends Error {
  constructor(public sizeBytes: number) {
    super("El video optimizado sigue superando el límite de 30 MB.");
  }
}

export interface CompressVideoProgress {
  phase: "loading" | "compressing" | "thumbnail";
  percent: number;
}

export interface CompressVideoResult {
  videoBlob: Blob;
  thumbnailBlob: Blob;
  originalSizeBytes: number;
  optimizedSizeBytes: number;
  savingsPercent: number;
  durationSeconds: number | null;
  resolution: string | null;
  mimeType: "video/mp4";
}

function computeScaledDimensions(width: number, height: number): { width: number; height: number } {
  if (width <= MAX_WIDTH && height <= MAX_HEIGHT) {
    // Nunca escalar hacia arriba: 720p o menor se sube tal cual (ya recodificado, no el original).
    return { width: evenify(width), height: evenify(height) };
  }
  const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
  return { width: evenify(width * ratio), height: evenify(height * ratio) };
}

/** H.264 exige dimensiones pares. */
function evenify(n: number): number {
  return Math.max(2, Math.round(n / 2) * 2);
}

/** ffmpeg.readFile() puede devolver un Uint8Array respaldado por SharedArrayBuffer, que Blob no acepta -- se copia a un ArrayBuffer plano. */
function toArrayBuffer(data: Uint8Array | string): ArrayBuffer {
  if (typeof data === "string") return new TextEncoder().encode(data).buffer as ArrayBuffer;
  return new Uint8Array(data).buffer as ArrayBuffer;
}

function extensionOf(fileName: string): string {
  const match = fileName.match(/\.[a-zA-Z0-9]+$/);
  return match ? match[0] : ".mp4";
}

export async function compressVideo(
  file: File,
  onProgress: (progress: CompressVideoProgress) => void
): Promise<CompressVideoResult> {
  const { FFmpeg } = await import("@ffmpeg/ffmpeg");
  const { fetchFile, toBlobURL } = await import("@ffmpeg/util");

  const ffmpeg = new FFmpeg();
  let logBuffer = "";
  ffmpeg.on("log", ({ message }) => {
    logBuffer += message + "\n";
  });
  ffmpeg.on("progress", ({ progress }) => {
    onProgress({ phase: "compressing", percent: Math.min(100, Math.max(0, Math.round(progress * 100))) });
  });

  try {
    onProgress({ phase: "loading", percent: 0 });
    await ffmpeg.load({
      coreURL: await toBlobURL(`${FFMPEG_CORE_BASE}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${FFMPEG_CORE_BASE}/ffmpeg-core.wasm`, "application/wasm"),
    });

    const inputName = `input${extensionOf(file.name)}`;
    await ffmpeg.writeFile(inputName, await fetchFile(file));

    // Se probe el video (duracion/resolucion de entrada) leyendo los logs de
    // ffmpeg -- el core WASM no trae ffprobe, este es el camino estandar en
    // proyectos ffmpeg.wasm para obtener metadatos sin un segundo binario.
    const inputResolution = parseResolutionFromLog(logBuffer) ?? (await probeInputResolution(ffmpeg, inputName, () => logBuffer));
    const { width, height } = inputResolution ? computeScaledDimensions(inputResolution.width, inputResolution.height) : { width: MAX_WIDTH, height: MAX_HEIGHT };

    onProgress({ phase: "compressing", percent: 0 });
    await ffmpeg.exec([
      "-i", inputName,
      "-vf", `scale=${width}:${height}`,
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-crf", "26",
      "-c:a", "aac",
      "-b:a", "128k",
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      "output.mp4",
    ]);

    const outputData = await ffmpeg.readFile("output.mp4");
    const videoBlob = new Blob([toArrayBuffer(outputData)], { type: "video/mp4" });

    onProgress({ phase: "thumbnail", percent: 0 });
    await ffmpeg.exec(["-i", "output.mp4", "-ss", "00:00:00.5", "-frames:v", "1", "-q:v", "3", "thumb.jpg"]);
    const thumbData = await ffmpeg.readFile("thumb.jpg");
    const thumbnailBlob = new Blob([toArrayBuffer(thumbData)], { type: "image/jpeg" });

    const durationSeconds = parseDurationFromLog(logBuffer);
    const optimizedSizeBytes = videoBlob.size;
    const originalSizeBytes = file.size;
    const savingsPercent = originalSizeBytes > 0 ? Math.max(0, Math.round((1 - optimizedSizeBytes / originalSizeBytes) * 1000) / 10) : 0;

    if (optimizedSizeBytes > MAX_OPTIMIZED_SIZE_BYTES) {
      throw new VideoTooLargeError(optimizedSizeBytes);
    }

    return {
      videoBlob,
      thumbnailBlob,
      originalSizeBytes,
      optimizedSizeBytes,
      savingsPercent,
      durationSeconds,
      resolution: `${width}x${height}`,
      mimeType: "video/mp4",
    };
  } finally {
    ffmpeg.terminate();
  }
}

function parseDurationFromLog(log: string): number | null {
  const match = log.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!match) return null;
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + parseFloat(match[3]);
}

function parseResolutionFromLog(log: string): { width: number; height: number } | null {
  // Busca la linea de stream de video del INPUT (antes de "Output #0"), ej:
  // "Stream #0:0(und): Video: h264 ..., 1920x1080 [SAR 1:1 DAR 16:9], ..."
  const inputSection = log.split("Output #0")[0];
  const match = inputSection.match(/Video:.*?(\d{2,5})x(\d{2,5})/);
  if (!match) return null;
  return { width: Number(match[1]), height: Number(match[2]) };
}

/** Si el primer intento de log-parse falla (video sin metadatos claros), fuerza un probe rapido con -f null. */
async function probeInputResolution(
  ffmpeg: import("@ffmpeg/ffmpeg").FFmpeg,
  inputName: string,
  getLog: () => string
): Promise<{ width: number; height: number } | null> {
  try {
    await ffmpeg.exec(["-i", inputName, "-f", "null", "-t", "0", "-"]);
  } catch {
    // ffmpeg sale con error cuando no hay salida real -- el log ya quedo escrito, se ignora el throw.
  }
  return parseResolutionFromLog(getLog());
}
