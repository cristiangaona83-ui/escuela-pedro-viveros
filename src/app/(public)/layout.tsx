import { Header } from "@/components/public/Header";
import { Footer } from "@/components/public/Footer";
import { SITE } from "@/config/site";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "School",
    name: SITE.name,
    address: {
      "@type": "PostalAddress",
      streetAddress: SITE.address.street,
      addressLocality: "Llolleo, San Antonio",
      addressRegion: "Valparaíso",
      addressCountry: "CL",
    },
    url: SITE.domains.public,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
