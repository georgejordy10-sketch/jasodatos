"use client";

import type { CSSProperties } from "react";
import type { AlertSeverity, BusinessAlert } from "./types";

type AlertPanelProps = {
  alerts: BusinessAlert[];
};

function severityLabel(severity: AlertSeverity): string {
  if (severity === "alta") return "Alta";
  if (severity === "media") return "Media";
  return "Baja";
}

function severityStyles(severity: AlertSeverity): CSSProperties {
  if (severity === "alta") {
    return {
      background: "var(--jd-danger-soft)",
      color: "var(--jd-danger)",
      border: "1px solid rgba(220, 38, 38, 0.18)",
    };
  }

  if (severity === "media") {
    return {
      background: "var(--jd-warning-soft)",
      color: "var(--jd-warning)",
      border: "1px solid rgba(245, 158, 11, 0.22)",
    };
  }

  return {
    background: "var(--jd-success-soft)",
    color: "var(--jd-success)",
    border: "1px solid rgba(22, 163, 74, 0.18)",
  };
}

function goToAnchor(anchorId?: string) {
  if (!anchorId) return;

  const target = document.getElementById(anchorId);

  if (!target) {
    console.warn(`No se encontró el destino: ${anchorId}`);
    return;
  }

  target.scrollIntoView({
    behavior: "smooth",
    block: "center",
    inline: "nearest",
  });

  target.style.transition =
    "box-shadow 0.25s ease, outline 0.25s ease, background-color 0.25s ease";
  target.style.outline = "4px solid rgba(34, 197, 94, 1)";
  target.style.outlineOffset = "4px";
  target.style.boxShadow =
    "0 0 0 10px rgba(34, 197, 94, 0.22), 0 12px 28px rgba(15, 23, 42, 0.18)";
  target.style.backgroundColor = "rgba(34, 197, 94, 0.08)";
  target.style.borderRadius = "18px";

  window.setTimeout(() => {
    target.style.outline = "";
    target.style.outlineOffset = "";
    target.style.boxShadow = "";
    target.style.backgroundColor = "";
    target.style.borderRadius = "";
  }, 1800);
}

export default function AlertPanel({ alerts }: AlertPanelProps) {
  const total = alerts.length;
  const high = alerts.filter((alert) => alert.severity === "alta").length;
  const medium = alerts.filter((alert) => alert.severity === "media").length;
  const low = alerts.filter((alert) => alert.severity === "baja").length;

  return (
    <section style={styles.card}>
      <div style={styles.header}>
        <div style={styles.headerCopy}>
          <span style={styles.eyebrow}>Alertas accionables</span>

          <h2 style={styles.title}>Alertas del negocio</h2>

          <p style={styles.subtitle}>
            JasoDatos revisa tus datos y prioriza los puntos que requieren
            atención comercial.
          </p>
        </div>

        <div style={styles.counterWrap}>
          <span style={styles.counter}>{total}</span>
          <span style={styles.counterLabel}>alertas</span>
        </div>
      </div>

      <div style={styles.summaryRow}>
        <div style={{ ...styles.summaryPill, ...severityStyles("alta") }}>
          Altas: {high}
        </div>

        <div style={{ ...styles.summaryPill, ...severityStyles("media") }}>
          Medias: {medium}
        </div>

        <div style={{ ...styles.summaryPill, ...severityStyles("baja") }}>
          Bajas: {low}
        </div>
      </div>

      {alerts.length === 0 ? (
        <div style={styles.emptyState}>
          No encontramos puntos urgentes por revisar con los filtros actuales.
        </div>
      ) : (
        <div style={styles.grid}>
          {alerts.map((alert) => (
            <article key={alert.id} style={styles.alertCard}>
              <div style={styles.alertTop}>
                <span
                  style={{
                    ...styles.severityBadge,
                    ...severityStyles(alert.severity),
                  }}
                >
                  {severityLabel(alert.severity)}
                </span>
              </div>

              <div style={styles.contentBlock}>
                <h3 style={styles.alertTitle}>{alert.title}</h3>
                <p style={styles.alertMessage}>{alert.message}</p>
              </div>

              <div style={styles.actionsRow}>
                {alert.actionLabel && alert.anchorId ? (
                  <a
                    href={`#${alert.anchorId}`}
                    style={styles.actionButton}
                    onClick={() => {
                      window.setTimeout(() => goToAnchor(alert.anchorId), 80);
                    }}
                  >
                    {alert.actionLabel}
                  </a>
                ) : (
                  <span style={styles.noAction}>Sin acción directa</span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
card: {
  background: "var(--jd-gradient-container)",
  borderRadius: 18,
  padding: "12px 14px",
  border: "1px solid var(--jd-border-accent)",
  boxShadow: "var(--jd-shadow-card)",
  display: "grid",
  gap: 8,
},

header: {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 10,
  flexWrap: "wrap",
},

headerCopy: {
  display: "grid",
  gap: 3,
  minWidth: 0,
},

 eyebrow: {
  display: "inline-flex",
  alignItems: "center",
  width: "fit-content",
  minHeight: 22,
  padding: "0 9px",
  borderRadius: 999,
  background: "var(--jd-info-soft)",
  color: "var(--jd-info)",
  border: "1px solid var(--jd-border-accent-soft)",
  fontSize: 10,
  fontWeight: 900,
},

title: {
  margin: 0,
  color: "var(--jd-text-main)",
  fontSize: 16,
  fontWeight: 950,
  lineHeight: 1.02,
  letterSpacing: "-0.025em",
},
subtitle: {
  margin: 0,
  color: "var(--jd-text-secondary)",
  fontSize: 11,
  fontWeight: 600,
  lineHeight: 1.25,
},

counterWrap: {
  minWidth: 54,
  minHeight: 38,
  borderRadius: 14,
  display: "grid",
  placeItems: "center",
  gap: 0,
  background: "rgba(56, 189, 248, 0.18)",
  border: "1px solid rgba(255,255,255,0.86)",
  padding: "5px 10px",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.14), 0 0 10px rgba(56,189,248,0.08)",
},

counter: {
  color: "#FFFFFF",
  fontSize: 15,
  fontWeight: 700,
  lineHeight: 1,
},
counterLabel: {
  color: "#FFFFFF",
  fontSize: 10,
  fontWeight: 500,
  lineHeight: 1,
},

summaryRow: {
  display: "flex",
  gap: 6,
  flexWrap: "wrap",
},

summaryPill: {
  borderRadius: 999,
  padding: "0 12px",
  fontSize: 11,
  fontWeight: 700,
  lineHeight: 1,
  minHeight: 24,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  whiteSpace: "nowrap",
},

  emptyState: {
    minHeight: 68,
    display: "grid",
    placeItems: "center",
    color: "var(--jd-text-secondary)",
    border: "1px dashed rgba(109,126,219,0.35)",
    borderRadius: 16,
    background: "rgba(255,255,255,0.72)",
    padding: 14,
    textAlign: "center",
    fontSize: 14,
    fontWeight: 600,
  },

grid: {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 6,
},
alertCard: {
  borderRadius: 12,
  padding: "7px 9px",
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.12)",
  display: "grid",
  gap: 2,
  minHeight: 54,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
},
  alertTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },

severityBadge: {
  borderRadius: 999,
  padding: "0 10px",
  minHeight: 22,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 0.2,
  lineHeight: 1,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
},

contentBlock: {
  display: "grid",
  gap: 1,
},

alertTitle: {
  margin: 0,
  color: "#FFFFFF",
  fontSize: 14,
  fontWeight: 650,
  lineHeight: 1.12,
  letterSpacing: "-0.01em",
},

alertMessage: {
  margin: 0,
  color: "#FFFFFF",
  fontSize: 11,
  fontWeight: 400,
  lineHeight: 1.18,
},

actionsRow: {
  display: "flex",
  justifyContent: "flex-end",
  marginTop: 0,
},

actionButton: {
  border: "1px solid rgba(255,255,255,0.28)",
  background: "rgba(80, 96, 220, 0.24)",
  color: "#FFFFFF",
  borderRadius: 999,
  padding: "4px 9px",
  fontSize: 10,
  fontWeight: 500,
  cursor: "pointer",
  textDecoration: "none",
  whiteSpace: "nowrap",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
},
noAction: {
  color: "var(--jd-text-muted)",
  fontSize: 11,
  fontWeight: 700,
},
};