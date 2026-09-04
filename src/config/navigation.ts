export const PUBLIC_NAV = [
  { label: "Inicio", href: "/" },
  { label: "Nuestra Escuela", href: "/nuestra-escuela" },
  { label: "Proyecto Educativo", href: "/proyecto-educativo" },
  { label: "Equipo Directivo", href: "/equipo-directivo" },
  { label: "Equipo PIE", href: "/equipo-pie" },
  { label: "Docentes y Asistentes", href: "/cursos" },
  { label: "Asistentes de la Educación", href: "/asistentes-de-la-educacion" },
  { label: "Noticias", href: "/noticias" },
  { label: "Galería", href: "/galeria" },
  { label: "Documentos", href: "/documentos" },
  { label: "Contacto", href: "/contacto" },
] as const;

export type PlatformNavGroup = "principal" | "utp" | "inspectoria" | "convivencia" | "pie" | "general" | "direccion";

export type PlatformNavItem = {
  label: string;
  href: string;
  icon: string;
  roles?: string[];
  group: PlatformNavGroup;
};

export const NAV_GROUP_LABELS: Record<PlatformNavGroup, string> = {
  principal: "",
  utp: "UTP",
  inspectoria: "Inspectoría General",
  convivencia: "Convivencia Educativa",
  pie: "PIE",
  general: "General",
  direccion: "Dirección",
};

// Reorganizado por unidad de gestión real del establecimiento (Áreas de
// Gestión: UTP / Inspectoría General / Convivencia Educativa / PIE), más
// "general" (compartido entre todos) y "direccion" (solo director/
// superadmin). Ninguna ruta cambió de lugar ni de permisos respecto de
// antes -- esto es solo cómo se agrupan visualmente en el menú lateral.
export const PLATFORM_NAV: PlatformNavItem[] = [
  { label: "Panel Principal", href: "/plataforma/dashboard", icon: "LayoutDashboard", group: "principal" },
  { label: "Áreas de Gestión", href: "/plataforma/areas", icon: "LayoutGrid", group: "principal" },
  { label: "Estudiantes", href: "/plataforma/estudiantes", icon: "Users", roles: ["director", "utp", "administrativo", "docente", "pie", "convivencia", "superadmin", "inspectoria_general"], group: "principal" },
  { label: "Cursos", href: "/plataforma/cursos", icon: "School", roles: ["director", "utp", "administrativo", "docente", "inspectoria_general"], group: "principal" },

  { label: "Asignaturas", href: "/plataforma/asignaturas", icon: "BookOpen", roles: ["director", "utp", "superadmin"], group: "utp" },
  { label: "Evaluaciones", href: "/plataforma/evaluaciones", icon: "ClipboardList", roles: ["director", "utp", "docente", "superadmin"], group: "utp" },
  { label: "Calificaciones", href: "/plataforma/calificaciones", icon: "NotebookPen", roles: ["director", "utp", "docente", "superadmin"], group: "utp" },
  { label: "Objetivos de Aprendizaje", href: "/plataforma/objetivos", icon: "Target", roles: ["director", "utp", "superadmin"], group: "utp" },
  { label: "Planificaciones", href: "/plataforma/planificaciones", icon: "FileEdit", roles: ["director", "utp", "docente", "superadmin"], group: "utp" },
  { label: "Seguimiento Pedagógico", href: "/plataforma/seguimiento", icon: "Activity", roles: ["director", "utp", "docente", "convivencia", "superadmin"], group: "utp" },
  { label: "Acompañamiento al Aula", href: "/plataforma/acompanamiento", icon: "Eye", roles: ["director", "utp", "superadmin", "docente"], group: "utp" },
  { label: "Jefaturas", href: "/plataforma/cursos/jefaturas", icon: "UserCog", roles: ["director", "utp", "superadmin"], group: "utp" },
  { label: "Carga docente", href: "/plataforma/cursos/carga-docente", icon: "Briefcase", roles: ["director", "utp", "superadmin"], group: "utp" },
  { label: "Informes", href: "/plataforma/informes", icon: "FileBarChart", roles: ["director", "utp", "administrativo", "superadmin"], group: "utp" },

  { label: "Asistencia", href: "/plataforma/asistencia", icon: "CalendarCheck", roles: ["director", "utp", "docente", "convivencia", "superadmin", "inspectoria_general"], group: "inspectoria" },
  { label: "Seguro Escolar", href: "/plataforma/seguro-escolar", icon: "ShieldAlert", roles: ["director", "superadmin", "inspectoria_general"], group: "inspectoria" },

  { label: "Convivencia Educativa", href: "/plataforma/convivencia", icon: "ShieldCheck", roles: ["director", "superadmin", "convivencia", "inspectoria_general"], group: "convivencia" },

  { label: "PIE", href: "/plataforma/pie", icon: "HeartHandshake", roles: ["director", "utp", "pie", "superadmin", "educadora_diferencial", "psicopedagoga", "fonoaudiologa", "psicologo"], group: "pie" },

  { label: "Certificados", href: "/plataforma/certificados", icon: "Award", roles: ["director", "utp", "administrativo", "superadmin"], group: "general" },
  { label: "Documentos", href: "/plataforma/documentos", icon: "FolderOpen", group: "general" },
  { label: "Informativos Semanales", href: "/plataforma/informativos", icon: "Megaphone", group: "general" },
  { label: "Calendario", href: "/plataforma/calendario", icon: "Calendar", group: "general" },
  { label: "Noticias", href: "/plataforma/noticias", icon: "Newspaper", group: "general" },
  { label: "Galería", href: "/plataforma/galeria", icon: "Images", group: "general" },
  { label: "Equipo institucional", href: "/plataforma/equipo-institucional", icon: "IdCard", group: "general" },
  { label: "Reportes", href: "/plataforma/reportes", icon: "BarChart3", roles: ["director", "utp", "superadmin"], group: "general" },

  { label: "Administración", href: "/plataforma/administracion", icon: "Settings", roles: ["director", "superadmin"], group: "direccion" },
  { label: "Bitácora", href: "/plataforma/auditoria", icon: "History", roles: ["director", "superadmin"], group: "direccion" },
];
