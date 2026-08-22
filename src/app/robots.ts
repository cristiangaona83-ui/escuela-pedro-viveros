import type { MetadataRoute } from "next";
import { SITE } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/plataforma", "/api"] },
    ],
    sitemap: `${SITE.domains.public}/sitemap.xml`,
  };
}
