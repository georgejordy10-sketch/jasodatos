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
        "Activa Desempeño entre sucursales, JasoBot Comercial y exportación PDF con el plan Pro.",
      cta: "Ver beneficios de Pro",
    };
  }

  if (plan === "pro") {
    return {
      title: "Activa automatización comercial",
      subtitle:
        "Lleva tu operación al siguiente nivel con acciones de WhatsApp y capacidades premium del plan Ultra.",
      cta: "Ver beneficios de Ultra",
    };
  }

  return {
    title: "Ya tienes el plan más completo",
    subtitle:
      "Ultra desbloquea la experiencia comercial más avanzada de JasoDatos.",
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
          Plan actual: {planLabel}
        </span>

        <div style={styles.textBlock}>
          <h3 style={styles.title}>{content.title}</h3>
          <p style={styles.subtitle}>{content.subtitle}</p>
        </div>
      </div>

      <button style={styles.button} onClick={onOpenPlans}>
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
    gap: 16,
    flexWrap: "wrap",
    padding: "16px 18px",
    borderRadius: 18,
    background: "linear-gradient(135deg, #ced2f6 0%, #ced2f6 100%)",
    border: "1px solid rgba(79, 70, 229, 0.16)",
    boxShadow: "0 10px 22px rgba(79, 70, 229, 0.08)",
  },
  wrapperUltra: {
    background: "linear-gradient(135deg, #ced2f6  0%, #ced2f6 100%)",
    border: "1px solid rgba(34, 197, 94, 0.18)",
    boxShadow: "0 10px 22px rgba(34, 197, 94, 0.08)",
  },
  content: {
    display: "flex",
    alignItems: "flex-start",
    gap: 14,
    flexWrap: "wrap",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 30,
    padding: "0 14px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 800,
    color: "#FFFFFF",
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
    gap: 4,
  },
  title: {
    margin: 0,
    color: "#1E2670",
    fontSize: 17,
    fontWeight: 800,
    letterSpacing: "-0.01em",
  },
  subtitle: {
    margin: 0,
    color: "#334155",
    fontSize: 14,
    lineHeight: 1.5,
    fontWeight: 600,
    maxWidth: 760,
  },
  button: {
    minHeight: 46,
    padding: "0 18px",
    borderRadius: 14,
    border: "1px solid rgba(79, 70, 229, 0.18)",
    background: "linear-gradient(135deg, #4460FF 0%, #5B6CFF 100%)",
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 10px 20px rgba(68, 96, 255, 0.16)",
  },
};