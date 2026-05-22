type AppTopbarProps = {
  businessName: string;
  periodLabel: string;
};

export function AppTopbar({ businessName, periodLabel }: AppTopbarProps) {
  return (
    <header
      style={{
        minHeight: "76px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
        padding: "0 24px",
        background: "rgba(255,255,255,0.88)",
        borderBottom: "1px solid var(--jd-border, #E2E8F0)",
        backdropFilter: "blur(16px)",
        position: "sticky",
        top: 0,
        zIndex: 20,
      }}
    >
      <div>
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
            fontSize: "22px",
            lineHeight: 1.15,
            letterSpacing: "-0.035em",
            color: "var(--jd-text-main, #0F172A)",
          }}
        >
          {businessName}
        </h1>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          flexWrap: "wrap",
          justifyContent: "flex-end",
        }}
      >
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

        <button type="button" className="jd-button jd-button-secondary">
          Exportar
        </button>

        <a href="/configuracion" className="jd-button jd-button-primary">
          Configuración
        </a>
      </div>
    </header>
  );
}