const navItems = [
  { label: "Resumen", href: "/cargas" },
  { label: "Ventas", href: "/cargas#ventas" },
  { label: "Inventario", href: "/cargas#inventario" },
  { label: "Productos", href: "/cargas#productos" },
  { label: "Alertas", href: "/cargas#alertas" },
  { label: "Reportes", href: "/cargas#reportes" },
  { label: "Configuración", href: "/cargas#configuracion" },
  { label: "Admin", href: "/admin/clientes" },
];

type AppSidebarProps = {
  onNavigate?: () => void;
  isDrawer?: boolean;
};

export function AppSidebar({ onNavigate, isDrawer = false }: AppSidebarProps) {
  return (
    <aside
      style={{
        minHeight: isDrawer ? "100dvh" : "100vh",
        width: isDrawer ? "100%" : undefined,
        padding: "24px 18px",
        color: "#FFFFFF",
        background:
          "linear-gradient(180deg, #283593 0%, #2E0D4F 62%, #1A0630 100%)",
        borderRight: isDrawer ? "none" : "1px solid rgba(255,255,255,0.12)",
        position: isDrawer ? "relative" : "sticky",
        top: 0,
        alignSelf: "start",
        overflowY: isDrawer ? "auto" : undefined,
      }}
    >
      <div style={{ marginBottom: "28px", paddingRight: isDrawer ? 42 : 0 }}>
        <div
          style={{
            fontSize: "24px",
            fontWeight: 800,
            letterSpacing: "-0.04em",
            lineHeight: 1,
          }}
        >
          JasoDatos
        </div>

        <div
          style={{
            marginTop: "8px",
            fontSize: "13px",
            color: "rgba(255,255,255,0.72)",
            lineHeight: 1.4,
          }}
        >
          Micro-BI comercial para decisiones rápidas.
        </div>
      </div>

      <nav
        aria-label="Navegación principal"
        style={{
          display: "grid",
          gap: "8px",
        }}
      >
        {navItems.map((item) => (
          <a
            key={item.label}
            href={item.href}
            onClick={onNavigate}
            style={{
              display: "flex",
              alignItems: "center",
              minHeight: "42px",
              padding: "0 14px",
              borderRadius: "14px",
              color: "rgba(255,255,255,0.86)",
              textDecoration: "none",
              fontSize: "14px",
              fontWeight: 650,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.08)",
            }}
          >
            {item.label}
          </a>
        ))}
      </nav>

      <div
        style={{
          marginTop: "28px",
          padding: "14px",
          borderRadius: "18px",
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.10)",
        }}
      >
        <div
          style={{
            fontSize: "13px",
            fontWeight: 750,
            marginBottom: "6px",
          }}
        >
          Enfoque comercial v1
        </div>

        <p
          style={{
            margin: 0,
            fontSize: "12px",
            lineHeight: 1.45,
            color: "rgba(255,255,255,0.72)",
          }}
        >
          Ventas, inventario, alertas y acciones recomendadas para pequeños
          negocios.
        </p>
      </div>
    </aside>
  );
}