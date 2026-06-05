type PlanStatusBannerProps = {
  planName: string;
  planStatus: string;
};

function getPlanDisplayName(planName: string) {
  const normalized = planName.toLowerCase();

  if (
    normalized === "basic" ||
    normalized === "básico" ||
    normalized === "basico"
  ) {
    return "Inicio";
  }

  if (normalized === "pro") {
    return "Crecimiento";
  }

  if (normalized === "ultra") {
    return "Control";
  }

  return planName;
}

function getStatusLabel(status: string) {
  const normalized = status.toLowerCase();

  if (normalized === "active") return "Activo";
  if (normalized === "trial") return "Prueba";
  if (normalized === "past_due") return "Pago pendiente";
  if (normalized === "canceled") return "Cancelado";
  if (normalized === "manual") return "Manual";

  return status;
}

function getStatusColor(status: string) {
  const normalized = status.toLowerCase();

  if (normalized === "active") return "#16A34A";
  if (normalized === "trial") return "#0284C7";
  if (normalized === "past_due") return "#F59E0B";
  if (normalized === "canceled") return "#DC2626";

  return "#64748B";
}

export function PlanStatusBanner({
  planName,
  planStatus,
}: PlanStatusBannerProps) {
  const displayPlanName = getPlanDisplayName(planName);
  const statusLabel = getStatusLabel(planStatus);
  const statusColor = getStatusColor(planStatus);

  return (
    <section
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
        padding: "18px 20px",
        borderRadius: "22px",
        border: "1px solid var(--jd-border, #E2E8F0)",
        background:
          "linear-gradient(135deg, #FFFFFF 0%, rgba(238,242,255,0.88) 100%)",
        boxShadow: "0 18px 45px rgba(15, 23, 42, 0.08)",
      }}
    >
      <div>
        <p
          style={{
            margin: 0,
            color: "var(--jd-text-muted, #64748B)",
            fontSize: "15px",
            fontWeight: 750,
            lineHeight: 1.2,
          }}
        >
          Estado del plan
        </p>

        <h2
          style={{
            margin: "6px 0 0",
            color: "var(--jd-text-main, #0F172A)",
            fontSize: "22px",
            fontWeight: 850,
            lineHeight: 1.15,
            letterSpacing: "-0.025em",
          }}
        >
          Plan {displayPlanName}
        </h2>
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
            display: "inline-flex",
            alignItems: "center",
            minHeight: "38px",
            padding: "0 14px",
            borderRadius: "999px",
            color: statusColor,
            background: "rgba(255,255,255,0.74)",
            border: `1px solid ${statusColor}33`,
            fontSize: "15px",
            fontWeight: 850,
          }}
        >
          {statusLabel}
        </span>

        <a href="/cargas#planes" className="jd-button jd-button-premium">
          Ver planes
        </a>
      </div>
    </section>
  );
}