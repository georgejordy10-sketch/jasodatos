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
  <span style={styles.badge}>Incluido en Inicio</span>
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
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 12,
    flexWrap: "wrap",
    margin: "0 0 14px",
    padding: "12px 14px",
    width: "100%",
    borderRadius: 16,
    background: "rgba(224, 242, 254, 0.88)",
    border: "1px solid rgba(125, 211, 252, 0.46)",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.72), 0 10px 22px rgba(15,23,42,0.06)",
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
    background: "rgba(219, 234, 254, 0.72)",
    border: "1px solid rgba(30, 58, 138, 0.24)",
    color: "#1E3A8A",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.54)",
    whiteSpace: "nowrap",
  },

  modulePlanText: {
    color: "#1E3A8A",
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: "-0.01em",
  },
};