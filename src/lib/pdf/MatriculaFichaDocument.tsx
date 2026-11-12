import { Children, cloneElement, isValidElement } from "react";
import { Document, Page, View, Text } from "@react-pdf/renderer";
import { SITE } from "@/config/site";
import { ENROLLMENT_CHECKLIST, IMAGE_AUTH_OPTIONS, SUPPORT_OPTIONS, TRANSPORT_OPTIONS, ADMISSION_TYPES } from "@/lib/matricula";
import { formatRun } from "@/lib/utils";
import type { MatriculaFichaData } from "@/services/matricula-ficha";

const GREEN = "#0b5540";
const BAR = "#e7f3ee";
const LINE = "#c9d9d2";
const LABEL = "#5f6f6a";

function dateText(value: string): string {
  if (!value) return "";
  const [y, m, d] = value.split("-");
  return y && m && d ? `${d}-${m}-${y}` : value;
}

function Header({ title, note }: { title: string; note: string }) {
  return (
    <View>
      <View style={{ backgroundColor: GREEN, marginTop: -34, marginLeft: -36, marginRight: -36, paddingHorizontal: 36, paddingTop: 22, paddingBottom: 18 }}>
        <Text style={{ color: "#bfe3d3", fontSize: 7.5, fontFamily: "Helvetica-Bold", letterSpacing: 0.6 }}>INSPECTORÍA GENERAL  /  MATRÍCULA ESTUDIANTIL</Text>
        <Text style={{ color: "#ffffff", fontSize: 18, fontFamily: "Helvetica-Bold", marginTop: 5 }}>{SITE.name.toUpperCase()}</Text>
        <Text style={{ color: "#dff2ea", fontSize: 8.5, marginTop: 4 }}>San Antonio · RBD {SITE.rbd.split("-")[0]} · Prekínder a 8° básico</Text>
      </View>
      <Text style={{ fontSize: 15, fontFamily: "Helvetica-Bold", color: GREEN, marginTop: 14 }}>{title}</Text>
      <Text style={{ fontSize: 8, color: LABEL, marginTop: 3, marginBottom: 6 }}>{note}</Text>
    </View>
  );
}

function Footer({ page }: { page: number }) {
  return (
    <View style={{ position: "absolute", bottom: 18, left: 36, right: 36, borderTopWidth: 0.75, borderTopColor: LINE, paddingTop: 5, flexDirection: "row", justifyContent: "space-between" }} fixed>
      <Text style={{ fontSize: 7, color: LABEL }}>Ficha para registro manual y posterior digitalización · Resguardo institucional</Text>
      <Text style={{ fontSize: 7, color: LABEL }}>Página {page} de 3</Text>
    </View>
  );
}

function Bar({ children }: { children: string }) {
  return (
    <View style={{ backgroundColor: BAR, borderRadius: 4, paddingVertical: 4, paddingHorizontal: 7, marginTop: 10, marginBottom: 4 }}>
      <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: GREEN, letterSpacing: 0.3 }}>{children}</Text>
    </View>
  );
}

/** `roomy`: en la ficha en blanco los campos son más altos, para poder escribir a mano. */
function Field({ label, value, flex = 1, tall, solo, roomy }: { label: string; value?: string; flex?: number; tall?: boolean; solo?: boolean; roomy?: boolean }) {
  // `solo`: campo suelto (fuera de una fila) -- sin flex, para que no se estire hacia abajo.
  return (
    <View style={{ flex: solo ? undefined : flex, marginBottom: 4 }}>
      <Text style={{ fontSize: 6.8, fontFamily: "Helvetica-Bold", color: LABEL }}>{label}</Text>
      <View style={{ borderBottomWidth: 0.75, borderBottomColor: LINE, minHeight: tall ? (roomy ? 54 : 34) : roomy ? 28 : 16, justifyContent: "flex-end", paddingBottom: 1.5 }}>
        <Text style={{ fontSize: 9, color: "#1c2624" }}>{value && value.trim() ? value : " "}</Text>
      </View>
    </View>
  );
}

function Row({ children, roomy }: { children: React.ReactNode; roomy?: boolean }) {
  return (
    <View style={{ flexDirection: "row", gap: 14 }}>
      {Children.map(children, (child) => (isValidElement<{ roomy?: boolean }>(child) ? cloneElement(child, { roomy }) : child))}
    </View>
  );
}

function Check({ label, checked }: { label: string; checked: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginRight: 16, marginBottom: 3 }}>
      <View style={{ width: 9, height: 9, borderWidth: 0.9, borderColor: GREEN, alignItems: "center", justifyContent: "center", marginRight: 4 }}>
        {checked && <View style={{ width: 5, height: 5, backgroundColor: GREEN }} />}
      </View>
      <Text style={{ fontSize: 8.5, color: "#1c2624" }}>{label}</Text>
    </View>
  );
}

function Checks({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 2, marginBottom: 4 }}>{children}</View>;
}

function Label({ children }: { children: string }) {
  return <Text style={{ fontSize: 6.8, fontFamily: "Helvetica-Bold", color: LABEL, marginTop: 3 }}>{children}</Text>;
}

/**
 * Ficha de matrícula de Inspectoría General -- mismo formato de la ficha impresa
 * (3 páginas: 1. Matrícula e identificación, 2. Responsables y antecedentes,
 * 3. Constancias y cierre). En blanco sirve para completar a mano; con datos,
 * es el comprobante de lo registrado en la plataforma.
 */
export function MatriculaFichaDocument({ data }: { data: MatriculaFichaData }) {
  const f = data.form;
  const pickup = [...f.pickup, { full_name: "", relationship: "", phone: "" }, { full_name: "", relationship: "", phone: "" }].slice(0, Math.max(2, f.pickup.length));
  const sexText = f.sex === "F" ? "Femenino" : f.sex === "M" ? "Masculino" : "";

  const roomy = !f.first_names && !f.run;

  return (
    <Document title={`Ficha de matrícula${f.run ? ` - ${f.first_names} ${f.paternal_last_name}` : ""}`}>
      <Page size="A4" style={{ padding: 34, paddingTop: 34, paddingBottom: 46, fontFamily: "Helvetica", color: "#1c2624" }}>
        <Header title="1. Matrícula e identificación" note="Complete con letra clara. Los campos se validarán en el registro digital." />
        <Bar>DATOS DE MATRÍCULA</Bar>
        <Row roomy={roomy}>
          <Field label="Año escolar" value={data.yearLabel} />
          <Field label="Fecha de matrícula" value={dateText(f.enrolled_at)} />
          <Field label="Curso de ingreso" value={data.courseLabel} />
          <Field label="Folio (uso interno)" value={data.folio} />
        </Row>
        <Label>Tipo de matrícula</Label>
        <Checks>
          {ADMISSION_TYPES.map((t) => (
            <Check key={t} label={t} checked={f.admission_type === t} />
          ))}
        </Checks>
        <Field label="Establecimiento de procedencia (si corresponde)" value={f.origin_school} solo roomy={roomy} />

        <Bar>IDENTIFICACIÓN DEL ESTUDIANTE</Bar>
        <Row roomy={roomy}>
          <Field label="Nombres" value={f.first_names} flex={2} />
          <Field label="Apellido paterno" value={f.paternal_last_name} />
          <Field label="Apellido materno" value={f.maternal_last_name} />
        </Row>
        <Row roomy={roomy}>
          <Field label="RUN / RUT" value={f.run ? formatRun(f.run) : ""} />
          <Field label="IPE (si corresponde)" value={f.ipe} />
          <Field label="Fecha de nacimiento" value={dateText(f.birth_date)} />
        </Row>
        <Row roomy={roomy}>
          <Field label="Nacionalidad" value={f.nationality} />
          <Field label="Sexo registral (si consta)" value={sexText} />
          <Field label="Nombre social / preferido" value={f.social_name} />
        </Row>
        <Field label="Domicilio completo" value={f.address_street} solo roomy={roomy} />
        <Row roomy={roomy}>
          <Field label="Comuna" value={f.address_commune} />
          <Field label="Sector / localidad" value={f.address_sector} />
        </Row>

        <Bar>APODERADO/A TITULAR</Bar>
        <Row roomy={roomy}>
          <Field label="Nombre completo" value={f.guardian.full_name} flex={2} />
          <Field label="RUN / RUT" value={f.guardian.run ? formatRun(f.guardian.run) : ""} />
        </Row>
        <Row roomy={roomy}>
          <Field label="Vínculo con estudiante" value={f.guardian.relationship} />
          <Field label="Teléfono principal" value={f.guardian.phone} />
          <Field label="Teléfono alternativo" value={f.guardian.phone_alt} />
        </Row>
        <Row roomy={roomy}>
          <Field label="Correo electrónico" value={f.guardian.email} />
          <Field label="Domicilio si es distinto" value={f.guardian.address} />
        </Row>
        <Footer page={1} />
      </Page>

      <Page size="A4" style={{ padding: 34, paddingBottom: 46, fontFamily: "Helvetica", color: "#1c2624" }}>
        <Header title="2. Responsables y antecedentes esenciales" note="Solo registre datos necesarios para el funcionamiento y seguridad escolar." />
        <Bar>APODERADO/A SUPLENTE</Bar>
        <Row roomy={roomy}>
          <Field label="Nombre completo" value={f.substitute.full_name} flex={2} />
          <Field label="RUN / RUT" value={f.substitute.run ? formatRun(f.substitute.run) : ""} />
        </Row>
        <Row roomy={roomy}>
          <Field label="Vínculo con estudiante" value={f.substitute.relationship} />
          <Field label="Teléfono de contacto" value={f.substitute.phone} />
        </Row>

        <Bar>PERSONAS AUTORIZADAS PARA RETIRO</Bar>
        {pickup.map((p, i) => (
          <Row key={i} roomy={roomy}>
            <Field label="Nombre completo / vínculo" value={[p.full_name, p.relationship].filter(Boolean).join(" — ")} flex={2} />
            <Field label="Documento / teléfono" value={p.phone} />
          </Row>
        ))}
        <Field label="Restricciones de retiro formalmente acreditadas (solo lo indispensable)" value={f.pickup_restriction} tall solo roomy={roomy} />

        <Bar>CONTACTO DE EMERGENCIA Y BIENESTAR</Bar>
        <Row roomy={roomy}>
          <Field label="Contacto de emergencia (si es diferente)" value={f.emergency.full_name} flex={2} />
          <Field label="Teléfono" value={f.emergency.phone} />
        </Row>
        <Field label="Alertas indispensables para respuesta de emergencia (sin diagnósticos extensos)" value={f.emergency_alerts} tall solo roomy={roomy} />
        <Label>¿Requiere coordinación de apoyos escolares?</Label>
        <Checks>
          {SUPPORT_OPTIONS.map((o) => (
            <Check key={o.value} label={o.label} checked={f.support_coordination === o.value} />
          ))}
        </Checks>
        <Label>Forma habitual de traslado</Label>
        <Checks>
          {TRANSPORT_OPTIONS.map((o) => (
            <Check key={o.value} label={o.label} checked={f.transport_mode === o.value} />
          ))}
        </Checks>

        <Bar>CONTROL DE ANTECEDENTES</Bar>
        <Label>Documentos recibidos / verificados</Label>
        <Checks>
          {ENROLLMENT_CHECKLIST.map((d) => (
            <Check key={d.code} label={d.label} checked={Boolean(f.documents[d.code])} />
          ))}
        </Checks>
        <Text style={{ fontSize: 7, color: LABEL, marginTop: 2 }}>*Según corresponda al caso. La documentación solicitada debe ajustarse a los requisitos legales vigentes.</Text>
        <Footer page={2} />
      </Page>

      <Page size="A4" style={{ padding: 34, paddingBottom: 46, fontFamily: "Helvetica", color: "#1c2624" }}>
        <Header title="3. Constancias y cierre administrativo" note="Las autorizaciones opcionales son independientes de la matrícula." />
        <Bar>CONSTANCIAS DE INFORMACIÓN</Bar>
        <Label>Marque cuando corresponda:</Label>
        <Checks>
          <Check label="Reglamento interno informado" checked={f.rules_informed} />
          <Check label="Reglamento de evaluación informado" checked={f.evaluation_rules_informed} />
          <Check label="Información de privacidad entregada" checked={f.privacy_informed} />
        </Checks>

        <Bar>AUTORIZACIONES OPCIONALES</Bar>
        <Label>Uso institucional de imágenes del estudiante:</Label>
        <Checks>
          {IMAGE_AUTH_OPTIONS.map((o) => (
            <Check key={o.value} label={o.label} checked={f.image_authorization === o.value} />
          ))}
        </Checks>
        <Text style={{ fontSize: 7, color: LABEL }}>
          La autorización de imágenes es voluntaria y no condiciona la matrícula. Su alcance y revocación se gestionarán según la política institucional.
        </Text>
        <Label>Información sobre actividades y salidas:</Label>
        <Checks>
          <Check label="Información entregada" checked={f.outings_informed} />
        </Checks>
        <Text style={{ fontSize: 7, color: LABEL }}>Esta constancia no reemplaza la autorización específica que pueda requerirse para cada salida educativa.</Text>

        <Bar>OBSERVACIONES ADMINISTRATIVAS</Bar>
        <Field label="Pendientes, documentos por revisar o datos que requieren verificación (no incluir antecedentes sensibles)" value={f.notes} tall solo roomy={roomy} />

        <Bar>CIERRE Y FIRMAS</Bar>
        <Row roomy={roomy}>
          <Field label="Nombre de quien recibe en Inspectoría" value={f.received_by} flex={2} />
          <Field label="Fecha / hora de registro" value={dateText(f.enrolled_at)} />
        </Row>
        <View style={{ height: 8 }} />
        <Row roomy={roomy}>
          <Field label="Nombre del apoderado/a que declara" value={f.guardian.full_name} flex={2} />
          <Field label="Firma del apoderado/a" tall />
        </Row>
        <Row roomy={roomy}>
          <Field label="Firma y timbre del funcionario/a" tall flex={2} />
          <Field label="Estado / folio posterior al ingreso" value={data.folio} tall />
        </Row>

        <Text style={{ fontSize: 7.5, color: LABEL, marginTop: 14 }}>
          IMPORTANTE: Esta ficha de contingencia no confirma cupo ni formaliza por sí sola la matrícula; sus datos deben ingresarse y validarse posteriormente en el sistema.
        </Text>
        <Footer page={3} />
      </Page>
    </Document>
  );
}
