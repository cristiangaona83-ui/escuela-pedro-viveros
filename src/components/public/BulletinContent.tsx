import type { JSONContent } from "@tiptap/core";
import { cn } from "@/lib/utils";
import { renderBulletinHTML, safeAlignment, type BulletinAlignment } from "@/lib/bulletin-content";
import { findDirectorNameBlockIndex } from "@/lib/director-name";

/** Firma y timbre del Director para la página web del informativo (copias públicas, ver lib/bulletin-signature-assets). */
export interface BulletinSignatureView {
  signatureUrl: string;
  stampUrl?: string | null;
  directorName: string;
  directorTitle: string;
}

const JUSTIFY: Record<BulletinAlignment, string> = {
  left: "justify-start",
  justify: "justify-start",
  center: "justify-center",
  right: "justify-end",
};

function SignatureImages({ signature, align }: { signature: BulletinSignatureView; align: BulletinAlignment }) {
  return (
    <div className={cn("mt-4 mb-1 flex items-center gap-2", JUSTIFY[align])}>
      {/* eslint-disable-next-line @next/next/no-img-element -- imagen pública pequeña de Storage; sin optimización necesaria */}
      <img src={signature.signatureUrl} alt="Firma del Director" className={cn("h-auto", signature.stampUrl ? "w-32" : "w-40")} />
      {signature.stampUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- ídem
        <img src={signature.stampUrl} alt="Timbre institucional" className="h-16 w-16 object-contain" />
      )}
    </div>
  );
}

function Html({ content, className }: { content: JSONContent; className?: string }) {
  return <div className={cn("bulletin-content text-sm text-slate-700 sm:text-[15px]", className)} dangerouslySetInnerHTML={{ __html: renderBulletinHTML(content) }} />;
}

export function BulletinContent({ content, className, signature }: { content: JSONContent; className?: string; signature?: BulletinSignatureView | null }) {
  if (!signature) return <Html content={content} className={className} />;

  const blocks = content?.content ?? [];
  const anchor = findDirectorNameBlockIndex(blocks, signature.directorName);

  if (anchor >= 0) {
    const align = safeAlignment(blocks[anchor].attrs?.textAlign);
    return (
      <>
        <Html content={{ ...content, content: blocks.slice(0, anchor) }} className={className} />
        <SignatureImages signature={signature} align={align} />
        <Html content={{ ...content, content: blocks.slice(anchor) }} className={className} />
      </>
    );
  }

  // El texto no trae el nombre del Director: se agrega un cierre con firma, timbre, nombre y cargo.
  return (
    <>
      <Html content={content} className={className} />
      <div className="mt-6 flex flex-col items-center">
        <SignatureImages signature={signature} align="center" />
        <p className="text-sm font-semibold text-slate-800">{signature.directorName}</p>
        <p className="text-xs text-slate-500">{signature.directorTitle}</p>
      </div>
    </>
  );
}
