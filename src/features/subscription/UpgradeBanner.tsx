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
  background: "rgba(56, 189, 248, 0.18)",
  border: "1px solid rgba(125, 211, 252, 0.36)",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.10), 0 0 10px rgba(56,189,248,0.06)",
  color: "#FFFFFF",
},
wrapperUltra: {
  background: "rgba(56, 189, 248, 0.18)",
  border: "1px solid rgba(125, 211, 252, 0.36)",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.10), 0 0 10px rgba(56,189,248,0.06)",
  color: "#FFFFFF",
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
  fontWeight: 600,
  color: "#1E3A8A",
  whiteSpace: "nowrap",
  border: "1px solid rgba(30, 58, 138, 0.42)",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.18), 0 0 10px rgba(30,58,138,0.08)",
},
  badgeBasic: {
    background: "linear-gradient(135deg, #475569 0%, #64748B 100%)",
  },
  badgePro: {
    background: "linear-gradient(135deg, #4338CA 0%, #6366F1 100%)",
  },
badgeUltra: {
  background: "rgba(30, 58, 138, 0.12)",
  color: "#1E3A8A",
},
  textBlock: {
    display: "grid",
    gap: 2,
    minWidth: 0,
  },
title: {
  margin: 0,
  color: "#1E3A8A",
  fontSize: 15,
  fontWeight: 700,
  letterSpacing: "-0.015em",
  lineHeight: 1.18,
},
subtitle: {
  margin: 0,
  color: "rgba(30, 58, 138, 0.82)",
  fontSize: 12.5,
  lineHeight: 1.35,
  fontWeight: 400,
  maxWidth: 680,
},
button: {
  minHeight: 36,
  padding: "0 16px",
  borderRadius: 999,
  border: "1px solid rgba(30, 58, 138, 0.46)",
  background: "rgba(30, 58, 138, 0.12)",
  color: "#1E3A8A",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.16), 0 0 10px rgba(30,58,138,0.08)",
  whiteSpace: "nowrap",
},
};