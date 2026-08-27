/**
 * Compresión de video en el navegador con ffmpeg.wasm -- se importa
 * dinámicamente (ver la llamada a `import()` más abajo) SOLO cuando de
 * verdad hace falta, nunca en el bundle principal ni siquiera del admin.
 *
 * VÍA RÁPIDA (sin FFmpeg): un MP4 <=30 MB que el propio navegador ya puede
 * reproducir en <=1080p se sube tal cual, usando únicamente APIs nativas
 * (<video> + loadedmetadata + videoWidth/videoHeight + canvas para la
 * miniatura). FFmpeg.wasm es pesado y, sobre todo, su límite de memoria en
 * el entorno WASM de un solo hilo puede fallar de forma críptica incluso
 * con archivos de tamaño moderado (~24 MB) -- cargarlo innecesariamente
 * para un video que el navegador ya reproduce sin problema es el riesgo
 * que esta vía rápida evita. Ver `compressVideo` para el detalle exacto de
 * cuándo se toma cada camino.
 *
 * Vercel es serverless (límites de tiempo/memoria por función); comprimir
 * ahí un video de varios minutos es frágil. Comprimir en el navegador del
 * administrador evita depender de esa infraestructura por completo.
 *
 * El original NUNCA se sube a Supabase modificado -- o se sube tal cual
 * (vía rápida, bit a bit idéntico) o se sube el resultado de FFmpeg (MP4
 * optimizado + miniatura). Nunca se sube el original cuando supera 30 MB.
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
/**
 * Límite de ENTRADA para siquiera intentar procesar con FFmpeg en el
 * navegador (no confundir con MAX_OPTIMIZED_SIZE_BYTES, que es el límite de
 * SALIDA hacia Storage). Un MP4 de 40-60 MB sigue siendo razonable de
 * procesar -- solo se rechaza sin intentar cuando supera este umbral, muy
 * por encima de lo que un usuario subiría por error, pensado para evitar
 * que el navegador quede colgado varios minutos en un intento condenado a
 * fallar por memoria.
 */
export const MAX_INPUT_SIZE_FOR_COMPRESSION_BYTES = 300 * 1024 * 1024;
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
  /** true si el archivo ya cumplía los límites y se subió tal cual, sin pasar por FFmpeg. */
  skippedRecompression: boolean;
}

function formatMb(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
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

/** Bytes "ftyp" del contenedor MP4/MOV/ISO-BMFF en la posición 4-7 -- misma firma que storage.ts. Más confiable que confiar en `file.type`, que el sistema operativo/navegador puede reportar vacío o incorrecto. */
async function looksLikeMp4Container(file: File): Promise<boolean> {
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  return head[4] === 0x66 && head[5] === 0x74 && head[6] === 0x79 && head[7] === 0x70;
}

// Tolerancia de redondeo: muchos codificadores rellenan (pad) el frame al
// múltiplo de 16 más cercano (macrobloque de H.264) y `videoWidth`/
// `videoHeight` reportan ese tamaño decodificado, no el "display size"
// lógico -- un video 1080p real puede reportar 1088 (1080 redondeado a
// múltiplo de 16), o simplemente 1081 por un recorte no exacto. Sin esta
// tolerancia, un video legítimamente 1080p cae innecesariamente a FFmpeg.
const RESOLUTION_TOLERANCE_PX = 16;

/** Resolución <=1920x1080 (con tolerancia de redondeo) sin importar orientación (vertical u horizontal). */
function isWithinNativeResolution(width: number, height: number): boolean {
  const long = Math.max(width, height);
  const short = Math.min(width, height);
  return long <= MAX_WIDTH + RESOLUTION_TOLERANCE_PX && short <= MAX_HEIGHT + RESOLUTION_TOLERANCE_PX;
}

/** Chequeo de capacidad del navegador (no depende del archivo) -- barato, sin cargar nada. */
function browserCanPlayMp4(): boolean {
  if (typeof document === "undefined") return false;
  return document.createElement("video").canPlayType("video/mp4") !== "";
}

interface NativeProbeResult {
  width: number;
  height: number;
  durationSeconds: number | null;
}

/**
 * Analiza el video con el propio decodificador del navegador (<video> +
 * loadedmetadata) -- sin FFmpeg. Si el navegador logra reportar dimensiones
 * reales, es prueba directa de que puede reproducir este archivo concreto
 * (más confiable que adivinar el codec por nombre).
 */
function probeVideoNatively(file: File, timeoutMs = 8000): Promise<NativeProbeResult | null> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") {
      resolve(null);
      return;
    }
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    const url = URL.createObjectURL(file);
    let settled = false;
    const cleanup = () => {
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      video.removeAttribute("src");
      video.load();
    };
    const finish = (result: NativeProbeResult | null) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };
    const timer = setTimeout(() => finish(null), timeoutMs);
    video.onloadedmetadata = () => {
      const { videoWidth, videoHeight, duration } = video;
      if (!videoWidth || !videoHeight) {
        finish(null);
        return;
      }
      finish({ width: videoWidth, height: videoHeight, durationSeconds: Number.isFinite(duration) ? duration : null });
    };
    video.onerror = () => finish(null);
    video.src = url;
  });
}

/** Captura un frame real (decodificado por el navegador) a un <canvas> -- confirma que el video no solo reporta metadata sino que efectivamente decodifica, y sirve de miniatura sin usar FFmpeg. */
function captureThumbnailNatively(file: File, atSeconds = 0.5, timeoutMs = 8000): Promise<Blob | null> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") {
      resolve(null);
      return;
    }
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    const url = URL.createObjectURL(file);
    let settled = false;
    const cleanup = () => {
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      video.removeAttribute("src");
      video.load();
    };
    const finish = (blob: Blob | null) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(blob);
    };
    const timer = setTimeout(() => finish(null), timeoutMs);
    video.onloadedmetadata = () => {
      const target = Math.min(atSeconds, Math.max(0, (video.duration || atSeconds) - 0.05));
      video.currentTime = target;
    };
    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx || canvas.width === 0 || canvas.height === 0) {
          finish(null);
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => finish(blob), "image/jpeg", 0.85);
      } catch {
        finish(null);
      }
    };
    video.onerror = () => finish(null);
    video.src = url;
  });
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
  const originalSizeBytes = file.size;
  const originalWithinCap = originalSizeBytes <= MAX_OPTIMIZED_SIZE_BYTES;

  // --- VÍA RÁPIDA: MP4 <=30 MB que el navegador ya reproduce en <=1080p ---
  // No se carga FFmpeg en ningún momento para tomar ni ejecutar esta
  // decisión -- solo file.size, la firma de bytes del contenedor,
  // canPlayType y <video>+loadedmetadata/canvas.
  if (originalWithinCap && browserCanPlayMp4() && (await looksLikeMp4Container(file))) {
    onProgress({ phase: "loading", percent: 0 });
    const probe = await probeVideoNatively(file);
    if (probe && isWithinNativeResolution(probe.width, probe.height)) {
      onProgress({ phase: "thumbnail", percent: 0 });
      const thumbnailBlob = await captureThumbnailNatively(file, 0.5);
      if (thumbnailBlob) {
        return {
          videoBlob: file,
          thumbnailBlob,
          originalSizeBytes,
          optimizedSizeBytes: originalSizeBytes,
          savingsPercent: 0,
          durationSeconds: probe.durationSeconds,
          resolution: `${probe.width}x${probe.height}`,
          mimeType: "video/mp4",
          skippedRecompression: true,
        };
      }
      // La miniatura nativa falló (raro, ej. decodificador con soporte
      // parcial) -- no se sube sin miniatura, se sigue a FFmpeg abajo.
    }
    // Metadata no disponible o resolución fuera de rango -- sigue a FFmpeg.
  }

  // --- VÍA FFMPEG: todo lo que no calificó arriba (>30MB, >1080p, formato
  // que el navegador no reproduce directamente, o donde la vía rápida no
  // pudo confirmar reproducción real) ---
  if (originalSizeBytes > MAX_INPUT_SIZE_FOR_COMPRESSION_BYTES) {
    throw new CompressVideoError(
      "out_of_memory",
      `Este video es demasiado grande para procesarlo en este navegador (máximo ${formatMb(MAX_INPUT_SIZE_FOR_COMPRESSION_BYTES)} de entrada). Prueba con una versión ya comprimida o usa un enlace de YouTube.`
    );
  }

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
    const isWithinResolution = isWithinNativeResolution(probe.width, probe.height);
    // La vía rápida ya cubre el caso común -- esto solo aplica cuando esa
    // vía no pudo confirmar reproducción nativa pero FFmpeg, ya cargado,
    // confirma que en realidad no hacía falta recodificar (evita una
    // recompresión con pérdida innecesaria).
    const ffmpegConfirmedOptimized = isMp4Container && isWebReadyCodec && isWithinResolution && originalWithinCap;

    if (ffmpegConfirmedOptimized) {
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
