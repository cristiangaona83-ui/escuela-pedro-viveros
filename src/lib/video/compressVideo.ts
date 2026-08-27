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
 * (MP4 optimizado + miniatura), o el archivo original tal cual cuando ya
 * cumple los límites (ver `compressVideo`), sale de esta pestaña.
 *
 * NOTA IMPORTANTE sobre bundling: el worker interno de @ffmpeg/ffmpeg
 * (dist/esm/worker.js) carga el core con un `import(_coreURL)` totalmente
 * dinámico (URL solo conocida en tiempo de ejecución) marcado únicamente
 * con `/* @vite-ignore *\/` -- un comentario que solo entiende Vite. Bajo
 * Turbopack (bundler por defecto de Next 16, ver next dev/build) esto
 * revienta en tiempo de ejecución con "Cannot find module as expression is
 * too dynamic", SIEMPRE, para cualquier video. Se corrige con un patch
 * (patch-package, ver /patches/@ffmpeg+ffmpeg+0.12.15.patch) que agrega los
 * comentarios mágicos que sí entienden webpack/Turbopack
 * (`webpackIgnore`/`turbopackIgnore`) delante de ese import -- el patch se
 * reaplica solo en cada `npm install` vía el script "postinstall".
 */

// Debe coincidir con la versión de core que espera la versión instalada de
// @ffmpeg/ffmpeg (ver CORE_VERSION en su dist/esm/const.js) -- un desajuste
// de versiones entre el wrapper JS y el core WASM produce fallas de bajo
// nivel (ej. "RuntimeError: table index is out of bounds") en vez de un
// error claro.
const FFMPEG_CORE_BASE = "https://unpkg.com/@ffmpeg/core@0.12.9/dist/esm";
const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1080;
export const MAX_OPTIMIZED_SIZE_BYTES = 30 * 1024 * 1024;
/** Codecs que el navegador ya reproduce nativamente en un <video> -- si el archivo ya viene en uno de estos, no hace falta recodificar. */
const WEB_READY_VIDEO_CODECS = new Set(["h264", "avc", "avc1"]);

export type CompressVideoErrorCode =
  | "load_failed"
  | "read_failed"
  | "unsupported_codec"
  | "out_of_memory"
  | "conversion_failed";

/** Error con causa clasificada -- permite mostrar un mensaje concreto en vez de uno genérico, sin filtrar detalles técnicos al usuario final. */
export class CompressVideoError extends Error {
  constructor(public code: CompressVideoErrorCode, message: string) {
    super(message);
  }
}

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
  /** true si el archivo ya cumplía los límites y se subió tal cual, sin recodificar. */
  skippedRecompression: boolean;
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

/** Bytes "ftyp" del contenedor MP4/MOV/ISO-BMFF en la posición 4-7 -- misma firma que storage.ts. */
async function looksLikeMp4Container(file: File): Promise<boolean> {
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  return head[4] === 0x66 && head[5] === 0x74 && head[6] === 0x79 && head[7] === 0x70;
}

function isOutOfMemoryError(text: string): boolean {
  return /out of memory|Aborted\(|RuntimeError|memory access out of bounds|allocation failed/i.test(text);
}

function isUnsupportedCodecError(text: string): boolean {
  return /could not find codec|Unsupported codec|Unknown decoder|does not contain any stream/i.test(text);
}

/** Archivo truncado/corrupto (no un codec real pero incompatible) -- ej. una descarga incompleta o un archivo dañado. */
function isUnreadableFileError(text: string): boolean {
  return /moov atom not found|Invalid data found when processing input|End of file/i.test(text);
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

  const originalSizeBytes = file.size;
  const originalWithinCap = originalSizeBytes <= MAX_OPTIMIZED_SIZE_BYTES;

  try {
    onProgress({ phase: "loading", percent: 0 });
    try {
      await ffmpeg.load({
        coreURL: await toBlobURL(`${FFMPEG_CORE_BASE}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${FFMPEG_CORE_BASE}/ffmpeg-core.wasm`, "application/wasm"),
      });
    } catch (err) {
      throw wrapError("load_failed", "El navegador no pudo cargar el compresor de video. Verifica tu conexión e inténtalo nuevamente.", originalWithinCap, err);
    }

    const inputName = `input${extensionOf(file.name)}`;
    try {
      await ffmpeg.writeFile(inputName, await fetchFile(file));
    } catch (err) {
      throw wrapError("read_failed", "No pudimos leer este archivo de video. Verifica que no esté dañado e inténtalo con otro.", originalWithinCap, err);
    }

    const probe = await probeInput(ffmpeg, inputName, () => logBuffer);
    if (!probe) {
      console.error("[compressVideo] no se detectó stream de video en el log:", logBuffer);
      if (isUnreadableFileError(logBuffer)) {
        throw wrapError("read_failed", "No pudimos leer este archivo de video. Verifica que no esté dañado o incompleto e inténtalo con otro.", originalWithinCap);
      }
      throw wrapError("unsupported_codec", "El codec de este video no es compatible. Prueba exportarlo como MP4 (H.264) desde tu cámara o editor.", originalWithinCap);
    }

    const isMp4Container = await looksLikeMp4Container(file);
    const isWebReadyCodec = WEB_READY_VIDEO_CODECS.has(probe.codec.toLowerCase());
    const isWithinResolution = probe.width <= MAX_WIDTH && probe.height <= MAX_HEIGHT;
    const alreadyOptimized = isMp4Container && isWebReadyCodec && isWithinResolution && originalWithinCap;

    if (alreadyOptimized) {
      // No se recodifica (mismo video/audio, sin pérdida de calidad), pero sí
      // se remuxea con "-c copy" -- una copia de contenedor casi instantánea,
      // no una recompresión -- para dos motivos: (1) el archivo original de
      // una cámara/celular normalmente no trae el átomo "moov" al inicio, y
      // buscar un frame ahí para la miniatura (`-ss`) puede fallar de forma
      // críptica en el entorno WASM; (2) +faststart es lo que permite que el
      // video empiece a reproducirse en la web sin descargarlo completo antes.
      let remuxName: string;
      try {
        remuxName = await remuxToFaststartMp4(ffmpeg, inputName);
      } catch (err) {
        throw classifyExecError(logBuffer, originalWithinCap, err);
      }

      onProgress({ phase: "thumbnail", percent: 0 });
      let thumbnailBlob: Blob;
      let videoBlob: Blob;
      try {
        thumbnailBlob = await extractThumbnail(ffmpeg, remuxName);
        videoBlob = new Blob([toArrayBuffer(await ffmpeg.readFile(remuxName))], { type: "video/mp4" });
      } catch (err) {
        throw classifyExecError(logBuffer, originalWithinCap, err);
      }

      return {
        videoBlob,
        thumbnailBlob,
        originalSizeBytes,
        optimizedSizeBytes: videoBlob.size,
        savingsPercent: 0,
        durationSeconds: probe.durationSeconds,
        resolution: `${probe.width}x${probe.height}`,
        mimeType: "video/mp4",
        skippedRecompression: true,
      };
    }

    const { width, height } = computeScaledDimensions(probe.width, probe.height);

    onProgress({ phase: "compressing", percent: 0 });
    try {
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
    } catch (err) {
      throw classifyExecError(logBuffer, originalWithinCap, err);
    }

    const outputData = await ffmpeg.readFile("output.mp4");
    const videoBlob = new Blob([toArrayBuffer(outputData)], { type: "video/mp4" });

    onProgress({ phase: "thumbnail", percent: 0 });
    let thumbnailBlob: Blob;
    try {
      thumbnailBlob = await extractThumbnail(ffmpeg, "output.mp4");
    } catch (err) {
      throw classifyExecError(logBuffer, originalWithinCap, err);
    }

    const optimizedSizeBytes = videoBlob.size;
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
      durationSeconds: probe.durationSeconds,
      resolution: `${width}x${height}`,
      mimeType: "video/mp4",
      skippedRecompression: false,
    };
  } finally {
    ffmpeg.terminate();
  }
}

/** Envuelve un error con una causa clasificada; si el original ya superaba el límite, prioriza el mensaje de "recomendar YouTube" sobre la causa técnica puntual. */
function wrapError(code: CompressVideoErrorCode, message: string, originalWithinCap: boolean, cause?: unknown): CompressVideoError {
  if (cause) {
    console.error(`[compressVideo] ${code}:`, cause);
  }
  if (!originalWithinCap) {
    return new CompressVideoError(code, "No pudimos optimizar este video en el navegador. Puedes probar con otro archivo o usar un enlace de YouTube.");
  }
  return new CompressVideoError(code, message);
}

function classifyExecError(logBuffer: string, originalWithinCap: boolean, err: unknown): CompressVideoError {
  const errText = err instanceof Error ? `${err.name} ${err.message}` : String(err);
  const combined = `${logBuffer}\n${errText}`;
  if (isOutOfMemoryError(combined)) {
    return wrapError("out_of_memory", "Este video es demasiado grande para procesarlo en este navegador. Prueba con un archivo más liviano o usa un enlace de YouTube.", originalWithinCap, err);
  }
  if (isUnreadableFileError(combined)) {
    return wrapError("read_failed", "No pudimos leer este archivo de video. Verifica que no esté dañado o incompleto e inténtalo con otro.", originalWithinCap, err);
  }
  if (isUnsupportedCodecError(combined)) {
    return wrapError("unsupported_codec", "El codec de este video no es compatible. Prueba exportarlo como MP4 (H.264) desde tu cámara o editor.", originalWithinCap, err);
  }
  return wrapError("conversion_failed", "Ocurrió un error durante la conversión del video. Prueba con otro archivo.", originalWithinCap, err);
}

/** Copia de contenedor sin recodificar (mismos streams de video/audio) con el átomo moov al inicio -- necesario antes de buscar un frame (`-ss`) para la miniatura y para que el video arranque rápido en la web. */
async function remuxToFaststartMp4(ffmpeg: import("@ffmpeg/ffmpeg").FFmpeg, inputName: string): Promise<string> {
  await ffmpeg.exec(["-i", inputName, "-c", "copy", "-movflags", "+faststart", "remux.mp4"]);
  return "remux.mp4";
}

async function extractThumbnail(ffmpeg: import("@ffmpeg/ffmpeg").FFmpeg, sourceName: string): Promise<Blob> {
  await ffmpeg.exec(["-i", sourceName, "-ss", "00:00:00.5", "-frames:v", "1", "-q:v", "3", "thumb.jpg"]);
  const thumbData = await ffmpeg.readFile("thumb.jpg");
  return new Blob([toArrayBuffer(thumbData)], { type: "image/jpeg" });
}

function parseDurationFromLog(log: string): number | null {
  const match = log.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!match) return null;
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + parseFloat(match[3]);
}

function parseVideoStreamFromLog(log: string): { width: number; height: number; codec: string } | null {
  // Busca la linea de stream de video del INPUT (antes de "Output #0"), ej:
  // "Stream #0:0(und): Video: h264 ..., 1920x1080 [SAR 1:1 DAR 16:9], ..."
  const inputSection = log.split("Output #0")[0];
  const match = inputSection.match(/Video:\s*([a-zA-Z0-9_]+).*?(\d{2,5})x(\d{2,5})/);
  if (!match) return null;
  return { codec: match[1], width: Number(match[2]), height: Number(match[3]) };
}

/** Fuerza un probe rapido con -f null para obtener metadatos (duracion/resolucion/codec) leyendo los logs -- el core WASM no trae ffprobe. */
async function probeInput(
  ffmpeg: import("@ffmpeg/ffmpeg").FFmpeg,
  inputName: string,
  getLog: () => string
): Promise<{ width: number; height: number; codec: string; durationSeconds: number | null } | null> {
  let stream = parseVideoStreamFromLog(getLog());
  if (!stream) {
    try {
      await ffmpeg.exec(["-i", inputName, "-f", "null", "-t", "0", "-"]);
    } catch {
      // ffmpeg sale con error cuando no hay salida real -- el log ya quedo escrito, se ignora el throw.
    }
    stream = parseVideoStreamFromLog(getLog());
  }
  if (!stream) return null;
  return { ...stream, durationSeconds: parseDurationFromLog(getLog()) };
}
