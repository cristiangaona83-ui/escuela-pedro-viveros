import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
    ],
    // Las imágenes subidas a Supabase Storage reciben una ruta única
    // (timestamp + UUID) y nunca se sobrescriben en el mismo path (ver
    // uploadPublicFile en src/lib/supabase/storage.ts) -- una URL nunca
    // pasa a apuntar a un archivo distinto, así que es seguro cachear cada
    // variante optimizada por mucho más que el default de Next (60s).
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 días
  },
};

export default nextConfig;
