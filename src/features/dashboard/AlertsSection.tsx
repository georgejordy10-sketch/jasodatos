"use client";

import type { CSSProperties } from "react";
import AlertPanel from "@/features/alerts/AlertPanel";
import type { BusinessAlert } from "@/features/alerts/types";

type Props = {
  alerts: BusinessAlert[];
  isExportingPdf?: boolean;
};

export default function AlertsSection({
  alerts,
  isExportingPdf = false,
}: Props) {
  return (
    <section style={styles.wrapper}>
      <div style={styles.modulePlanRow}>
{!isExportingPdf ? (
  <span style={styles.badge}>Incluido en BASIC</span>
) : null}
        <span style={styles.modulePlanText}>Alertas base del negocio</span>
      </div>

      <AlertPanel alerts={alerts} />
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  wrapper: {
    marginTop: 1,
  },
  modulePlanRow: {
    display: "inline-flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    margin: "0 0 12px 4px",
    padding: 0,
    width: "fit-content",
    background: "transparent",
    border: "none",
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
    border: "1px solid rgba(71, 85, 105, 0.30)",
    boxShadow: "0 6px 14px rgba(15, 23, 42, 0.10)",
    background: "linear-gradient(135deg, #475569 0%, #64748B 100%)",
    color: "#FFFFFF",
  },
  modulePlanText: {
    color: "#1E2670",
    fontSize: 14,
    fontWeight: 800,
    letterSpacing: "-0.01em",
  },
};