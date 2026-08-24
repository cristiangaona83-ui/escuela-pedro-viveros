import { createClient } from "@/lib/supabase/server";
import type {
  CourseTeamMemberRow,
  CourseTeamRow,
  StaffMemberRow,
  StaffSection,
  StaffSectionMembershipRow,
  SubjectTeacherRow,
} from "@/types/database";

export type SectionMembershipAdmin = StaffSectionMembershipRow & { staff_member: StaffMemberRow };
export type CourseTeamAdmin = CourseTeamRow & {
  members: (CourseTeamMemberRow & { staff_member: StaffMemberRow })[];
};
export type SubjectTeacherAdmin = SubjectTeacherRow & { staff_member: StaffMemberRow };

/** Todas las personas del registro central — para el selector "persona existente". */
export async function listAllStaffMembers(): Promise<StaffMemberRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("staff_members").select("*").order("full_name", { ascending: true });
  return data ?? [];
}

export async function listSectionMemberships(section: StaffSection): Promise<SectionMembershipAdmin[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("staff_section_memberships")
    .select("*, staff_member:staff_members(*)")
    .eq("section", section)
    .order("order_index", { ascending: true });
  return (data as unknown as SectionMembershipAdmin[]) ?? [];
}

export async function getSectionMembership(id: string): Promise<SectionMembershipAdmin | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("staff_section_memberships")
    .select("*, staff_member:staff_members(*)")
    .eq("id", id)
    .maybeSingle();
  return (data as unknown as SectionMembershipAdmin) ?? null;
}

export async function listCourseTeamsAdmin(): Promise<CourseTeamAdmin[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("course_teams")
    .select("*, members:course_team_members(*, staff_member:staff_members(*))")
    .order("order_index", { ascending: true });
  return (data as unknown as CourseTeamAdmin[]) ?? [];
}

export async function getCourseTeamAdmin(id: string): Promise<CourseTeamAdmin | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("course_teams")
    .select("*, members:course_team_members(*, staff_member:staff_members(*))")
    .eq("id", id)
    .maybeSingle();
  return (data as unknown as CourseTeamAdmin) ?? null;
}

export async function listSubjectTeachersAdmin(): Promise<SubjectTeacherAdmin[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("subject_teachers")
    .select("*, staff_member:staff_members(*)")
    .order("order_index", { ascending: true });
  return (data as unknown as SubjectTeacherAdmin[]) ?? [];
}

export async function getSubjectTeacherAdmin(id: string): Promise<SubjectTeacherAdmin | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("subject_teachers")
    .select("*, staff_member:staff_members(*)")
    .eq("id", id)
    .maybeSingle();
  return (data as unknown as SubjectTeacherAdmin) ?? null;
}
