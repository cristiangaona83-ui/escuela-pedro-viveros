import Image from "next/image";
import { UserRound } from "lucide-react";
import type { StaffMemberRow } from "@/types/database";

export function StaffCard({ member }: { member: StaffMemberRow }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
      <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-brand-50 text-brand-300">
        {member.photo_url ? (
          <Image src={member.photo_url} alt={member.full_name} fill className="object-cover" sizes="96px" />
        ) : (
          <UserRound className="h-10 w-10" strokeWidth={1.5} />
        )}
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-900">{member.full_name}</h3>
      <p className="mt-1 text-sm text-brand-700">{member.role_title}</p>
      {member.bio && <p className="mt-3 text-sm text-slate-500">{member.bio}</p>}
    </div>
  );
}
