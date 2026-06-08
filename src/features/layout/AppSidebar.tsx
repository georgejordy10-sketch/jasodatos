"use client";

import { useEffect, useState } from "react";

const NAV_ITEMS = [
  { label: "Vista general", href: "#general" },
  { label: "Resumen", href: "#resumen" },
  { label: "Acciones", href: "#acciones" },
  { label: "Comparativo", href: "#comparativo" },
  { label: "Alertas", href: "#alertas" },
  { label: "Ventas", href: "#ventas" },
  { label: "Inventario", href: "#inventario" },
  { label: "Productos", href: "#productos" },
  { label: "Archivo", href: "#reportes" },
  { label: "Configuración", href: "#configuracion" },
  { label: "Clientes", href: "/admin/clientes" },
  { label: "JasoJevasa", href: "/admin/prospectos" },
];

type AppSidebarProps = {
  businessName?: string;
  onNavigate?: () => void;
  isDrawer?: boolean;
};

export function AppSidebar({
  businessName,
  onNavigate,
  isDrawer = false,
}: AppSidebarProps) {
  const [activeTarget, setActiveTarget] = useState("#general");

  const [sidebarBusinessName, setSidebarBusinessName] = useState(
    businessName?.trim() || "Negocio actual"
  );

  useEffect(() => {
    if (businessName?.trim()) {
      setSidebarBusinessName(businessName.trim());
    }
  }, [businessName]);

  useEffect(() => {
    function updateActiveTarget() {
      if (window.location.pathname.startsWith("/admin")) {
        setActiveTarget(window.location.pathname);
        return;
      }

      setActiveTarget(window.location.hash || "#general");
    }

    function updateBusinessNameFromDashboard(event: Event) {
      const customEvent = event as CustomEvent<string>;
      const nextBusinessName = customEvent.detail?.trim();

      setSidebarBusinessName(nextBusinessName || "Negocio actual");
    }

    updateActiveTarget();

    window.addEventListener("hashchange", updateActiveTarget);
    window.addEventListener("popstate", updateActiveTarget);
    window.addEventListener(
      "jasodatos:business-name-updated",
      updateBusinessNameFromDashboard
    );

    return () => {
      window.removeEventListener("hashchange", updateActiveTarget);
      window.removeEventListener("popstate", updateActiveTarget);
      window.removeEventListener(
        "jasodatos:business-name-updated",
        updateBusinessNameFromDashboard
      );
    };
  }, []);

  return (
    <aside
      style={{
        minHeight: isDrawer ? "100dvh" : "100vh",
        width: isDrawer ? "100%" : undefined,
        padding: "14px 12px 16px",
        color: "#FFFFFF",
        background:
          "linear-gradient(180deg, #262B82 0%, #222878 45%, #1F246D 100%)",
        borderRight: isDrawer ? "none" : "1px solid rgba(255,255,255,0.10)",
        position: isDrawer ? "relative" : "sticky",
        top: 0,
        alignSelf: "start",
        overflowY: isDrawer ? "auto" : undefined,
        boxShadow:
          "inset -1px 0 0 rgba(255,255,255,0.05), 10px 0 28px rgba(15,23,42,0.18)",
      }}
    >
      <div style={{ marginBottom: "18px", paddingRight: isDrawer ? 42 : 0 }}>
        <div
          style={{
            display: "grid",
            gap: 6,
            alignItems: "start",
          }}
        >
          <img
            src="/brand/jasodatos-logo-negativo.png"
            alt="JasoDatos"
            style={{
              width: 170,
              maxWidth: "100%",
              height: "auto",
              display: "block",
              objectFit: "contain",
              marginTop: "-2px",
              marginLeft: "-2px",
            }}
          />

          <p
            style={{
              margin: "5px 0 0",
              color: "#FFFFFF",
              fontSize: "13.5px",
              fontWeight: 450,
              lineHeight: 1.45,
              letterSpacing: "0.005em",
              opacity: 0.9,
            }}
          >
            Convierte tus datos en decisiones.
          </p>
        </div>
      </div>

      <nav
        aria-label="Navegación principal"
        style={{
          display: "grid",
          gap: "8px",
        }}
      >
        {NAV_ITEMS.map((item) => {
          const itemTarget = item.href.includes("#")
            ? `#${item.href.split("#")[1]}`
            : item.href;

          const isActive = activeTarget === itemTarget;

          return (
            <a
              key={item.label}
              href={item.href}
              onClick={() => {
                setActiveTarget(itemTarget);
                onNavigate?.();
              }}
              style={{
                display: "flex",
                alignItems: "center",
                minHeight: "46px",
                padding: "0 14px",
                borderRadius: "14px",
                color: "#FFFFFF",
                textDecoration: "none",
                fontSize: "15px",
                fontWeight: 600,
                letterSpacing: "0.005em",
                lineHeight: 1.35,
                opacity: isActive ? 1 : 0.92,
                border: isActive
                  ? "1px solid rgba(255,255,255,0.28)"
                  : "1px solid rgba(255,255,255,0.10)",
                background: isActive
                  ? "rgba(56, 189, 248, 0.18)"
                  : "rgba(255,255,255,0.07)",
                boxShadow: isActive
                  ? "inset 0 1px 0 rgba(255,255,255,0.14), 0 0 10px rgba(56,189,248,0.08)"
                  : "inset 0 1px 0 rgba(255,255,255,0.04)",
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
          border: "1px solid rgba(255,255,255,0.14)",
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.06) 100%)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.08), 0 12px 26px rgba(15,23,42,0.16)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 12,
          }}
        >
          <div
            aria-hidden="true"
            style={{
              width: 38,
              height: 38,
              borderRadius: 14,
              display: "grid",
              placeItems: "center",
              background:
                "linear-gradient(135deg, rgba(124,58,237,0.95), rgba(37,99,235,0.88))",
              color: "#FFFFFF",
              boxShadow: "0 10px 22px rgba(37,99,235,0.24)",
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M4 20V9.5L12 4L20 9.5V20"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M8 20V12H16V20"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M10 9.5H14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <div style={{ minWidth: 0 }}>
            <div
              style={{
                color: "#FFFFFF",
                fontSize: "15px",
                fontWeight: 700,
                lineHeight: 1.28,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {sidebarBusinessName}
            </div>

            <div
              style={{
                marginTop: 2,
                color: "rgba(255,255,255,0.78)",
                fontSize: "13px",
                fontWeight: 500,
                lineHeight: 1.3,
              }}
            >
              Plan Comercial v1
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            marginBottom: 12,
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              minHeight: 28,
              padding: "0 10px",
              borderRadius: 999,
              background: "rgba(34,197,94,0.14)",
              border: "1px solid rgba(134,239,172,0.28)",
              color: "#BBF7D0",
              fontSize: "13px",
              fontWeight: 700,
            }}
          >
            Activo
          </span>

          <span
            style={{
              color: "rgba(255,255,255,0.72)",
              fontSize: "13px",
              fontWeight: 500,
            }}
          >
            Panel comercial
          </span>
        </div>

        <p
          style={{
            margin: "0 0 12px",
            fontSize: "14px",
            lineHeight: 1.5,
            color: "#FFFFFF",
            fontWeight: 450,
            letterSpacing: "0.005em",
            opacity: 0.9,
          }}
        >
          Ventas, inventario y alertas convertidas en acciones comerciales.
        </p>

        <a
          href="/cargas#planes"
          onClick={(event) => {
            event.preventDefault();

            window.dispatchEvent(new CustomEvent("jasodatos:open-plans"));
            window.location.hash = "planes";

            onNavigate?.();
          }}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 40,
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.28)",
            background: "rgba(255,255,255,0.06)",
            color: "#FFFFFF",
            textDecoration: "none",
            fontSize: "14px",
            fontWeight: 700,
            letterSpacing: "0.005em",
          }}
        >
          Ver planes
        </a>
      </div>
    </aside>
  );
}