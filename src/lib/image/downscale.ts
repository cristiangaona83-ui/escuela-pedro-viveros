/**
 * Reduce una foto grande (ej. del celular, 4000px / varios MB) a un máximo de
 * `maxDimension` px por lado antes de subirla -- así la imagen carga rápido en
 * la web y no infla el PDF del informativo. Mantiene el formato (JPG/PNG,
 * conserva la transparencia del PNG). Si algo falla o no ahorra espacio,
 * devuelve el archivo original sin tocar.
 */
export async function downscaleImage(file: File, maxDimension = 1600): Promise<File> {
  if (file.type !== "image/jpeg" && file.type !== "image/png") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    if (scale === 1) {
      bitmap.close();
      return file;
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, file.type, 0.85));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name, { type: file.type });
  } catch {
    return file;
  }
}
