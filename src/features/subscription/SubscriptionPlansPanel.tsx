"use client";

import type { CSSProperties } from "react";
import {
  PLAN_FEATURE_LABELS,
  PLAN_FEATURES,
  PLAN_LABELS,
  type SubscriptionPlan,
} from "./types";

type Props = {
  open: boolean;
  onClose: () => void;
  currentPlan: SubscriptionPlan;
  setCurrentPlan: (plan: SubscriptionPlan) => void;
};

const ORDER: SubscriptionPlan[] = ["basic", "pro", "ultra"];

export default function SubscriptionPlansPanel({
  open,
  onClose,
  currentPlan,
  setCurrentPlan,
}: Props) {
  if (!open) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.panel}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>Planes de suscripción</h2>
            <p style={styles.subtitle}>
              Gating visual del producto. No hay billing todavía.
            </p>
          </div>

          <button type="button" onClick={onClose} style={styles.closeButton}>
            Cerrar
          </button>
        </div>

        <div style={styles.grid}>
          {ORDER.map((plan) => {
            const isCurrent = currentPlan === plan;

            return (
              <div
                key={plan}
                style={{
                  ...styles.card,
                  ...(isCurrent ? styles.cardActive : null),
                }}
              >
                <div style={styles.cardTop}>
                  <span style={styles.planName}>{PLAN_LABELS[plan]}</span>
                  <span
                    style={{
                      ...styles.planBadge,
                      ...(isCurrent ? styles.planBadgeActive : null),
                    }}
                  >
                    {isCurrent ? "Plan actual" : "Disponible"}
                  </span>
                </div>

                <div style={styles.featureList}>
                  {PLAN_FEATURES[plan].map((feature) => (
                    <div key={feature} style={styles.featureItem}>
                      • {PLAN_FEATURE_LABELS[feature]}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentPlan(plan)}
                  style={{
                    ...styles.planButton,
                    ...(isCurrent ? styles.planButtonActive : null),
                  }}
                >
                  {isCurrent ? "Activo" : `Usar ${PLAN_LABELS[plan]}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(8, 12, 32, 0.64)",
    backdropFilter: "blur(6px)",
    display: "grid",
    placeItems: "center",
    padding: 20,
    zIndex: 1100,
  },
  panel: {
    width: "min(1100px, 100%)",
    background: "linear-gradient(135deg, #202969 0%, #2B2F86 100%)",
    borderRadius: 24,
    border: "1px solid rgba(255,255,255,0.10)",
    boxShadow: "0 20px 40px rgba(10, 17, 70, 0.35)",
    padding: 22,
    display: "grid",
    gap: 18,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    flexWrap: "wrap",
  },
  title: {
    margin: 0,
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: 800,
  },
  subtitle: {
    margin: "6px 0 0 0",
    color: "rgba(236,242,255,0.90)",
    fontSize: 14,
    lineHeight: 1.45,
  },
  closeButton: {
    minHeight: 40,
    padding: "0 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(127,178,255,0.12)",
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: 800,
    cursor: "pointer",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 14,
  },
  card: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 20,
    padding: 18,
    display: "grid",
    gap: 14,
  },
  cardActive: {
    border: "1px solid rgba(127,178,255,0.38)",
    boxShadow: "0 10px 24px rgba(10, 17, 70, 0.20)",
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  planName: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: 800,
  },
  planBadge: {
    padding: "4px 10px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.10)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "#DDE6FF",
    fontSize: 11,
    fontWeight: 800,
  },
  planBadgeActive: {
    background: "rgba(34,197,94,0.16)",
    border: "1px solid rgba(34,197,94,0.28)",
    color: "#86EFAC",
  },
  featureList: {
    display: "grid",
    gap: 8,
    color: "#EAF2FF",
    fontSize: 14,
    lineHeight: 1.45,
  },
  featureItem: {
    fontWeight: 600,
  },
  planButton: {
    minHeight: 42,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(127,178,255,0.12)",
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: 800,
    cursor: "pointer",
  },
  planButtonActive: {
    background: "rgba(34,197,94,0.16)",
    border: "1px solid rgba(34,197,94,0.28)",
    color: "#86EFAC",
  },
};