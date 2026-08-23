export const PUBLIC_NAV = [
  { label: "Inicio", href: "/" },
  { label: "Nuestra Escuela", href: "/nuestra-escuela" },
  { label: "Proyecto Educativo", href: "/proyecto-educativo" },
  { label: "Equipo Directivo", href: "/equipo-directivo" },
  { label: "Equipo PIE", href: "/equipo-pie" },
  { label: "Cursos", href: "/cursos" },
  { label: "Asistentes de la Educación", href: "/asistentes-de-la-educacion" },
  { label: "Noticias", href: "/noticias" },
  { label: "Galería", href: "/galeria" },
  { label: "Documentos", href: "/documentos" },
  { label: "Contacto", href: "/contacto" },
] as const;

export type PlatformNavItem = {
  label: string;
  href: string;
  icon: string;
  roles?: string[];
};

export const PLATFORM_NAV: PlatformNavItem[] = [
  { label: "Panel Principal", href: "/plataforma/dashboard", icon: "LayoutDashboard" },
  { label: "Estudiantes", href: "/plataforma/estudiantes", icon: "Users", roles: ["director", "utp", "administrativo", "docente", "pie", "convivencia", "superadmin", "inspectoria_general"] },
  { label: "Cursos", href: "/plataforma/cursos", icon: "School", roles: ["director", "utp", "administrativo", "docente", "inspectoria_general"] },
  { label: "Asignaturas", href: "/plataforma/asignaturas", icon: "BookOpen", roles: ["director", "utp", "superadmin"] },
  { label: "Evaluaciones", href: "/plataforma/evaluaciones", icon: "ClipboardList", roles: ["director", "utp", "docente", "superadmin"] },
  { label: "Calificaciones", href: "/plataforma/calificaciones", icon: "NotebookPen", roles: ["director", "utp", "docente", "superadmin"] },
  { label: "Asistencia", href: "/plataforma/asistencia", icon: "CalendarCheck", roles: ["director", "utp", "docente", "convivencia", "superadmin", "inspectoria_general"] },
  { label: "Objetivos de Aprendizaje", href: "/plataforma/objetivos", icon: "Target", roles: ["director", "utp", "superadmin"] },
  { label: "Planificaciones", href: "/plataforma/planificaciones", icon: "FileEdit", roles: ["director", "utp", "docente", "superadmin"] },
  { label: "PIE", href: "/plataforma/pie", icon: "HeartHandshake", roles: ["director", "utp", "pie", "superadmin", "educadora_diferencial", "psicopedagoga", "fonoaudiologa", "psicologo"] },
  { label: "Seguimiento Pedagógico", href: "/plataforma/seguimiento", icon: "Activity", roles: ["director", "utp", "docente", "convivencia", "superadmin"] },
  { label: "Acompañamiento al Aula", href: "/plataforma/acompanamiento", icon: "Eye", roles: ["director", "utp", "superadmin", "docente"] },
  { label: "Certificados", href: "/plataforma/certificados", icon: "Award", roles: ["director", "utp", "administrativo", "superadmin"] },
  { label: "Informes", href: "/plataforma/informes", icon: "FileBarChart", roles: ["director", "utp", "administrativo", "superadmin"] },
  { label: "Documentos", href: "/plataforma/documentos", icon: "FolderOpen" },
  { label: "Informativos Semanales", href: "/plataforma/informativos", icon: "Megaphone" },
  { label: "Calendario", href: "/plataforma/calendario", icon: "Calendar" },
  { label: "Noticias", href: "/plataforma/noticias", icon: "Newspaper" },
  { label: "Galería", href: "/plataforma/galeria", icon: "Images" },
  { label: "Reportes", href: "/plataforma/reportes", icon: "BarChart3", roles: ["director", "utp", "superadmin"] },
  { label: "Administración", href: "/plataforma/administracion", icon: "Settings", roles: ["director", "superadmin"] },
  { label: "Bitácora", href: "/plataforma/auditoria", icon: "History", roles: ["director", "superadmin"] },
];
