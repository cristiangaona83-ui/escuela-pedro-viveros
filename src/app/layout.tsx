import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import { SITE } from "@/config/site";
import "./globals.css";

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: "variable",
  style: ["normal"],
  axes: ["opsz"],
  display: "swap",
});

const description =
  "Sitio institucional de la Escuela Profesor Pedro Viveros Ormeño, ubicada en Tejas Verdes, Llolleo, San Antonio. Educamos para aprender, convivir y construir nuevas oportunidades.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.domains.public),
  title: {
    default: `${SITE.name} | San Antonio`,
    template: `%s | ${SITE.name}`,
  },
  description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "es_CL",
    siteName: SITE.name,
    title: `${SITE.name} | San Antonio`,
    description,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${inter.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-white text-slate-800">{children}</body>
    </html>
  );
}
