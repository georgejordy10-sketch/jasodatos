const navItems = [
  { label: "Resumen", href: "/cargas#resumen" },
  { label: "Comparativo", href: "/cargas#comparativo" },
  { label: "Ventas", href: "/cargas#ventas" },
  { label: "Inventario", href: "/cargas#inventario" },
  { label: "Productos", href: "/cargas#productos" },
  { label: "Alertas", href: "/cargas#alertas" },
  { label: "Reportes", href: "/cargas#reportes" },
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
        padding: "22px 14px 16px",
        color: "#FFFFFF",
        background: "var(--jd-gradient-brand-dark)",
        borderRight: isDrawer ? "none" : "1px solid rgba(255,255,255,0.10)",
        position: isDrawer ? "relative" : "sticky",
        top: 0,
        alignSelf: "start",
        overflowY: isDrawer ? "auto" : undefined,
        boxShadow: "inset -1px 0 0 rgba(255,255,255,0.04)",
      }}
    >
      <div style={{ marginBottom: "24px", paddingRight: isDrawer ? 42 : 0 }}>
        <div
          style={{
            fontSize: "23px",
            fontWeight: 900,
            letterSpacing: "-0.05em",
            lineHeight: 1,
          }}
        >
          JasoDatos
        </div>

        <div
          style={{
            marginTop: "8px",
            fontSize: "12.5px",
            color: "rgba(248,250,252,0.74)",
            lineHeight: 1.45,
            fontWeight: 600,
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
        {navItems.map((item, index) => {
          const isActive = index === 0;

          return (
            <a
              key={item.label}
              href={item.href}
              onClick={onNavigate}
              style={{
                display: "flex",
                alignItems: "center",
                minHeight: "40px",
                padding: "0 12px",
                borderRadius: "14px",
                color: isActive ? "#FFFFFF" : "rgba(248,250,252,0.78)",
                textDecoration: "none",
                fontSize: "13px",
                fontWeight: isActive ? 900 : 750,
                border: isActive
                  ? "1px solid rgba(255,255,255,0.14)"
                  : "1px solid rgba(255,255,255,0.08)",
                background: isActive
                  ? "rgba(109,126,219,0.24)"
                  : "rgba(255,255,255,0.06)",
                boxShadow: isActive
                  ? "0 10px 22px rgba(20,18,66,0.22)"
                  : "inset 0 1px 0 rgba(255,255,255,0.03)",
              }}
            >
              {item.label}
            </a>
          );
        })}
      </nav>

      <div
        style={{
          marginTop: "28px",
          padding: "14px",
          borderRadius: "18px",
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(255,255,255,0.08)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            minHeight: 24,
            padding: "0 10px",
            borderRadius: 999,
            background: "rgba(109,126,219,0.24)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "#FFFFFF",
            fontSize: "11px",
            fontWeight: 900,
            marginBottom: "10px",
          }}
        >
          Comercial v1
        </div>

        <div
          style={{
            fontSize: "14px",
            fontWeight: 850,
            marginBottom: "6px",
            color: "#FFFFFF",
          }}
        >
          Enfoque comercial
        </div>

        <p
          style={{
            margin: 0,
            fontSize: "12px",
            lineHeight: 1.48,
            color: "rgba(248,250,252,0.72)",
            fontWeight: 600,
          }}
        >
          Ventas, inventario, alertas y acciones recomendadas para pequeños
          negocios.
        </p>
      </div>
    </aside>
  );
}