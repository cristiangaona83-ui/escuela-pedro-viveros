import type { MetadataRoute } from "next";
import { SITE } from "@/config/site";
import { PUBLIC_NAV } from "@/config/navigation";
import { getPublishedNews } from "@/services/public-content";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE.domains.public;
  const staticEntries: MetadataRoute.Sitemap = PUBLIC_NAV.map((item) => ({
    url: `${base}${item.href === "/" ? "" : item.href}`,
    changeFrequency: "weekly",
    priority: item.href === "/" ? 1 : 0.7,
  }));

  const news = await getPublishedNews();
  const newsEntries: MetadataRoute.Sitemap = news.map((item) => ({
    url: `${base}/noticias/${item.slug}`,
    lastModified: item.updated_at,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  return [...staticEntries, ...newsEntries];
}
