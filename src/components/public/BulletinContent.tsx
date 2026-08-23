import type { JSONContent } from "@tiptap/core";
import { cn } from "@/lib/utils";
import { renderBulletinHTML } from "@/lib/bulletin-content";

export function BulletinContent({ content, className }: { content: JSONContent; className?: string }) {
  const html = renderBulletinHTML(content);
  return <div className={cn("bulletin-content text-sm text-slate-700 sm:text-[15px]", className)} dangerouslySetInnerHTML={{ __html: html }} />;
}
