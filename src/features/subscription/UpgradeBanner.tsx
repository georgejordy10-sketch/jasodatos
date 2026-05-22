"use client";

import type { CSSProperties } from "react";
import type { SubscriptionPlan } from "./types";

type Props = {
  currentPlan: SubscriptionPlan;
  planLabel: string;
  onOpenPlans: () => void;
};

function getUpgradeMessage(plan: SubscriptionPlan): {
  title: string;
  subtitle: string;
  cta: string;
} {
  if (plan === "basic") {
    return {
      title: "Desbloquea análisis avanzados",
      subtitle:
        "Activa desempeño entre sucursales, JasoBot comercial y exportación PDF.",
      cta: "Ver Crecimiento",
    };
  }

  if (plan === "pro") {
    return {
      title: "Automatización comercial disponible",
      subtitle:
        "Acciones de WhatsApp y capacidades premium del plan Control.",
      cta: "Ver Control",
    };
  }

  return {
    title: "Plan Control activo",
    subtitle:
      "Tienes disponible la experiencia comercial más avanzada de JasoDatos.",
    cta: "Ver planes",
  };
}

export default function UpgradeBanner({
  currentPlan,
  planLabel,
  onOpenPlans,
}: Props) {
  const content = getUpgradeMessage(currentPlan);

  return (
    <section
      style={{
        ...styles.wrapper,
        ...(currentPlan === "ultra" ? styles.wrapperUltra : null),
      }}
    >
      <div style={styles.content}>
        <span
          style={{
            ...styles.badge,
            ...(currentPlan === "basic"
              ? styles.badgeBasic
              : currentPlan === "pro"
              ? styles.badgePro
              : styles.badgeUltra),
          }}
        >
          {planLabel}
        </span>

        <div style={styles.textBlock}>
          <h3 style={styles.title}>{content.title}</h3>
          <p style={styles.subtitle}>{content.subtitle}</p>
        </div>
      </div>

      <button type="button" style={styles.button} onClick={onOpenPlans}>
        {content.cta}
      </button>
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  wrapper: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    padding: "10px 14px",
    borderRadius: 16,
    background:
      "linear-gradient(135deg, rgba(238, 242, 255, 0.94) 0%, rgba(224, 231, 255, 0.82) 100%)",
    border: "1px solid rgba(79, 70, 229, 0.14)",
    boxShadow: "0 8px 18px rgba(79, 70, 229, 0.06)",
  },
  wrapperUltra: {
    background:
      "linear-gradient(135deg, rgba(240, 253, 244, 0.94) 0%, rgba(220, 252, 231, 0.78) 100%)",
    border: "1px solid rgba(34, 197, 94, 0.18)",
    boxShadow: "0 8px 18px rgba(34, 197, 94, 0.06)",
  },
  content: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    minWidth: 0,
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 26,
    padding: "0 12px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 900,
    color: "#FFFFFF",
    whiteSpace: "nowrap",
  },
  badgeBasic: {
    background: "linear-gradient(135deg, #475569 0%, #64748B 100%)",
  },
  badgePro: {
    background: "linear-gradient(135deg, #4338CA 0%, #6366F1 100%)",
  },
  badgeUltra: {
    background: "linear-gradient(135deg, #16A34A 0%, #22C55E 100%)",
  },
  textBlock: {
    display: "grid",
    gap: 2,
    minWidth: 0,
  },
  title: {
    margin: 0,
    color: "var(--jd-brand-secondary, #3D2C8D)",
    fontSize: 15,
    fontWeight: 900,
    letterSpacing: "-0.015em",
    lineHeight: 1.18,
  },
  subtitle: {
    margin: 0,
    color: "var(--jd-text-secondary, #475569)",
    fontSize: 12.5,
    lineHeight: 1.35,
    fontWeight: 650,
    maxWidth: 680,
  },
  button: {
    minHeight: 36,
    padding: "0 14px",
    borderRadius: 999,
    border: "1px solid rgba(79, 70, 229, 0.18)",
    background:
      "linear-gradient(135deg, var(--jd-action-primary, #2563EB) 0%, var(--jd-action-premium, #7C3AED) 100%)",
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: "0 8px 18px rgba(68, 96, 255, 0.14)",
    whiteSpace: "nowrap",
  },
};