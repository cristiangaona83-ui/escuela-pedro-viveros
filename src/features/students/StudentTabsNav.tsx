import Link from "next/link";
import { cn } from "@/lib/utils";

export interface StudentTab {
  key: string;
  label: string;
}

export function StudentTabsNav({ studentId, tabs, active }: { studentId: string; tabs: StudentTab[]; active: string }) {
  return (
    <div className="mt-6 flex flex-wrap gap-1 border-b border-slate-200">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={`/plataforma/estudiantes/${studentId}?tab=${t.key}`}
          className={cn(
            "rounded-t-lg px-3.5 py-2 text-sm font-medium",
            active === t.key
              ? "border-b-2 border-brand-600 text-brand-700"
              : "text-slate-500 hover:text-slate-800"
          )}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
