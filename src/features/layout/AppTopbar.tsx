type AppTopbarProps = {
  businessName: string;
  periodLabel: string;
  isMobile?: boolean;
  onOpenSidebar?: () => void;
};

export function AppTopbar({
  businessName,
  periodLabel,
  isMobile = false,
  onOpenSidebar,
}: AppTopbarProps) {
  return (
    <header
      style={{
        minHeight: "76px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
        padding: isMobile ? "0 14px" : "0 24px",
        background: "rgba(255,255,255,0.88)",
        borderBottom: "1px solid var(--jd-border, #E2E8F0)",
        backdropFilter: "blur(16px)",
        position: "sticky",
        top: 0,
        zIndex: 20,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          minWidth: 0,
        }}
      >
        {isMobile ? (
          <button
            type="button"
            onClick={onOpenSidebar}
            aria-label="Abrir menú"
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "14px",
              border: "1px solid var(--jd-border, #E2E8F0)",
              background: "#FFFFFF",
              color: "var(--jd-brand-main, #2E0D4F)",
              fontSize: "22px",
              fontWeight: 800,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
              flex: "0 0 auto",
            }}
          >
            ☰
          </button>
        ) : null}

        <div style={{ minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              fontSize: "13px",
              color: "var(--jd-text-muted, #64748B)",
              fontWeight: 650,
            }}
          >
            Panel comercial
          </p>

          <h1
            style={{
              margin: "4px 0 0",
              fontSize: isMobile ? "18px" : "22px",
              lineHeight: 1.15,
              letterSpacing: "-0.035em",
              color: "var(--jd-text-main, #0F172A)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: isMobile ? "120px" : "100%",
            }}
          >
            {businessName}
          </h1>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: isMobile ? "8px" : "10px",
          flexWrap: "wrap",
          justifyContent: "flex-end",
        }}
      >
        {!isMobile ? (
          <span
            style={{
              minHeight: "38px",
              display: "inline-flex",
              alignItems: "center",
              padding: "0 14px",
              borderRadius: "999px",
              background: "var(--jd-bg-soft, #EEF2FF)",
              color: "var(--jd-brand-secondary, #3D2C8D)",
              border: "1px solid var(--jd-border, #E2E8F0)",
              fontSize: "13px",
              fontWeight: 750,
            }}
          >
            {periodLabel}
          </span>
        ) : null}

        <button type="button" className="jd-button jd-button-secondary">
          Exportar
        </button>

        <a href="/cargas#configuracion" className="jd-button jd-button-primary">
          Configuración
        </a>
      </div>
    </header>
  );
}