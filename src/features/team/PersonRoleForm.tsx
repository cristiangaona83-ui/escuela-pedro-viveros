"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Save, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select } from "@/components/ui/Field";
import { createClient } from "@/lib/supabase/client";
import { uploadPublicFile, deletePublicFile, pathFromPublicUrl, FileValidationError } from "@/lib/supabase/storage";
import type { StaffMemberRow, StaffSection } from "@/types/database";

const FOLDER = "equipo";

const ASISTENTE_CATEGORIES = [
  { value: "salud_bienestar", label: "Salud y Bienestar" },
  { value: "auxiliares_servicios", label: "Auxiliares de Servicios" },
  { value: "apoyo_educativo", label: "Apoyo educativo" },
  { value: "apoyo_administrativo", label: "Apoyo administrativo y de funcionamiento" },
];

export type PersonRoleTarget =
  | { kind: "membership"; section: StaffSection }
  | { kind: "subject_teacher" }
  | { kind: "course_role"; courseTeamId: string; role: "jefe" | "asistente" };

export type PersonRoleEditing = {
  linkId: string;
  staffMemberId: string;
  fullName: string;
  photoUrl: string | null;
  roleTitle: string;
  category: string | null;
  orderIndex: number;
  active: boolean;
};

/** Formulario compartido para las 4 secciones de Equipo institucional. Una
 * persona nueva se crea una sola vez en staff_members (registro central,
 * una foto); una persona existente se reutiliza por id sin duplicarla — su
 * nombre y fotografía solo se editan desde el modo edición, y ese cambio se
 * refleja en todas las secciones donde aparece porque comparten el mismo
 * staff_member_id. */
export function PersonRoleForm({
  target,
  existingPeople,
  editing,
  redirectTo,
  auditModule,
}: {
  target: PersonRoleTarget;
  existingPeople: StaffMemberRow[];
  editing?: PersonRoleEditing;
  redirectTo: string;
  auditModule: string;
}) {
  const router = useRouter();
  const isEdit = Boolean(editing);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usingExisting, setUsingExisting] = useState(false);
  const [selectedExistingId, setSelectedExistingId] = useState("");
  const [active, setActive] = useState(editing?.active ?? true);

  const showCategory = target.kind === "membership" && target.section === "asistente";
  const showActive = target.kind !== "course_role";
  const hasCurrentPhoto = Boolean(editing?.photoUrl);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const file = form.get("photo") as File | null;
    const roleTitle = String(form.get("role_title") || "").trim();
    const category = showCategory ? String(form.get("category") || "") || null : null;
    const orderIndex = Number(form.get("order_index") || 0);

    if (!roleTitle) {
      setLoading(false);
      setError("Ingresa el cargo.");
      return;
    }
    if (showCategory && !category) {
      setLoading(false);
      setError("Selecciona una categoría.");
      return;
    }

    const supabase = createClient();
    let previousPhotoUrl: string | null = null;

    try {
      let staffMemberId: string;

      if (isEdit) {
        staffMemberId = editing!.staffMemberId;
        const fullName = String(form.get("full_name") || "").trim();
        if (!fullName) throw new FileValidationError("Ingresa el nombre completo.");

        let photoUrl = editing!.photoUrl;
        if (file && file.size > 0) {
          previousPhotoUrl = editing!.photoUrl && editing!.photoUrl.startsWith("http") ? editing!.photoUrl : null;
          photoUrl = await uploadPublicFile(FOLDER, file, "image");
        }

        const { error: personError } = await supabase
          .from("staff_members")
          .update({ full_name: fullName, photo_url: photoUrl })
          .eq("id", staffMemberId);
        if (personError) throw personError;
      } else if (usingExisting) {
        if (!selectedExistingId) throw new FileValidationError("Selecciona una persona.");
        staffMemberId = selectedExistingId;
      } else {
        const fullName = String(form.get("full_name") || "").trim();
        if (!fullName) throw new FileValidationError("Ingresa el nombre completo.");

        let photoUrl: string | null = null;
        if (file && file.size > 0) {
          photoUrl = await uploadPublicFile(FOLDER, file, "image");
        }

        const { data: created, error: createError } = await supabase
          .from("staff_members")
          .insert({ full_name: fullName, photo_url: photoUrl })
          .select("id")
          .single();
        if (createError) throw createError;
        staffMemberId = created!.id;
      }

      if (target.kind === "membership") {
        const payload = {
          staff_member_id: staffMemberId,
          section: target.section,
          role_title: roleTitle,
          category,
          order_index: orderIndex,
          active,
        };
        const { error: linkError } = isEdit
          ? await supabase.from("staff_section_memberships").update(payload).eq("id", editing!.linkId)
          : await supabase.from("staff_section_memberships").insert(payload);
        if (linkError) throw linkError;
      } else if (target.kind === "subject_teacher") {
        const payload = { staff_member_id: staffMemberId, role_title: roleTitle, order_index: orderIndex, active };
        const { error: linkError } = isEdit
          ? await supabase.from("subject_teachers").update(payload).eq("id", editing!.linkId)
          : await supabase.from("subject_teachers").insert(payload);
        if (linkError) throw linkError;
      } else {
        const payload = {
          course_team_id: target.courseTeamId,
          staff_member_id: staffMemberId,
          role: target.role,
          role_title: roleTitle,
          order_index: 0,
        };
        const { error: linkError } = isEdit
          ? await supabase.from("course_team_members").update(payload).eq("id", editing!.linkId)
          : await supabase.from("course_team_members").insert(payload);
        if (linkError) throw linkError;
      }

      await supabase.rpc("log_audit", {
        p_action: isEdit ? "actualizar_equipo" : "crear_equipo",
        p_module: auditModule,
        p_entity:
          target.kind === "membership" ? "staff_section_memberships" : target.kind === "subject_teacher" ? "subject_teachers" : "course_team_members",
        p_entity_id: editing?.linkId,
        p_details: { role_title: roleTitle },
      });

      if (previousPhotoUrl) {
        const oldPath = pathFromPublicUrl(previousPhotoUrl);
        if (oldPath) void deletePublicFile(oldPath);
      }

      setLoading(false);
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      setLoading(false);
      setError(err instanceof FileValidationError ? err.message : "No pudimos guardar los cambios. Si es una persona repetida en esta sección, primero edita el registro existente.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!isEdit && (
        <div className="flex gap-4 text-sm text-slate-700">
          <label className="flex items-center gap-1.5">
            <input type="radio" checked={!usingExisting} onChange={() => setUsingExisting(false)} /> Persona nueva
          </label>
          <label className="flex items-center gap-1.5">
            <input type="radio" checked={usingExisting} onChange={() => setUsingExisting(true)} /> Persona ya existente
          </label>
        </div>
      )}

      {!isEdit && usingExisting && (
        <FormField
          label="Persona"
          htmlFor="existing_person"
          required
          hint="Reutiliza el registro y la fotografía de una persona ya cargada — no la duplica."
        >
          <Select id="existing_person" value={selectedExistingId} onChange={(e) => setSelectedExistingId(e.target.value)} required>
            <option value="">Selecciona una persona…</option>
            {existingPeople.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </Select>
        </FormField>
      )}

      {(isEdit || !usingExisting) && (
        <>
          <FormField
            label="Nombre completo"
            htmlFor="full_name"
            required
            hint={isEdit ? "Se actualiza en todas las secciones donde esta persona aparece." : undefined}
          >
            <Input id="full_name" name="full_name" required defaultValue={editing?.fullName} />
          </FormField>
          <FormField
            label="Fotografía"
            htmlFor="photo"
            hint={
              isEdit
                ? hasCurrentPhoto
                  ? "Opcional — déjalo vacío para conservar la fotografía actual. Se actualiza en todas las secciones donde aparece."
                  : "Aún no tiene fotografía — se muestra un avatar con iniciales."
                : "Opcional. JPG, PNG o WEBP, máximo 5 MB."
            }
          >
            <Input id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" />
          </FormField>
        </>
      )}

      <FormField label="Cargo" htmlFor="role_title" required>
        <Input id="role_title" name="role_title" required defaultValue={editing?.roleTitle} />
      </FormField>

      {showCategory && (
        <FormField label="Categoría" htmlFor="category" required>
          <Select id="category" name="category" required defaultValue={editing?.category ?? ""}>
            <option value="" disabled>
              Selecciona una categoría…
            </option>
            {ASISTENTE_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </FormField>
      )}

      {target.kind !== "course_role" && (
        <FormField label="Orden de aparición" htmlFor="order_index" hint="Número menor aparece primero.">
          <Input id="order_index" name="order_index" type="number" defaultValue={editing?.orderIndex ?? 0} />
        </FormField>
      )}

      {showActive && (
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          Visible en el sitio público
        </label>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      <Button type="submit" size="sm" disabled={loading}>
        <Save className="h-4 w-4" /> {loading ? "Guardando…" : isEdit ? "Guardar cambios" : "Agregar"}
      </Button>
    </form>
  );
}
