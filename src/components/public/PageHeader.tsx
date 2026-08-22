export function PageHeader({ eyebrow, title, description }: { eyebrow?: string; title: string; description?: string }) {
  return (
    <div className="border-b border-slate-200 bg-brand-900">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        {eyebrow && (
          <span className="text-xs font-semibold uppercase tracking-wider text-accent-400">{eyebrow}</span>
        )}
        <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">{title}</h1>
        {description && <p className="mt-3 max-w-2xl text-brand-100">{description}</p>}
      </div>
    </div>
  );
}
