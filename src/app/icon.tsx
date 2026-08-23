import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  const logoPath = join(process.cwd(), "public", "images", "logo-escuela-renovado.png");
  const logoBase64 = readFileSync(logoPath).toString("base64");

  return new ImageResponse(
    (
      // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- requerido por ImageResponse (next/og), no es un <img> HTML de página
      <img
        src={`data:image/png;base64,${logoBase64}`}
        width={32}
        height={32}
        style={{ borderRadius: 6 }}
      />
    ),
    size
  );
}
