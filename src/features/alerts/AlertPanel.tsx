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
    borderRadius: 22,
    padding: 18,
    border: "1px solid var(--jd-border-accent)",
    boxShadow: "var(--jd-shadow-card)",
    display: "grid",
    gap: 14,
  },

  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
    flexWrap: "wrap",
  },

  headerCopy: {
    display: "grid",
    gap: 5,
    minWidth: 0,
  },

  eyebrow: {
    display: "inline-flex",
    alignItems: "center",
    width: "fit-content",
    minHeight: 26,
    padding: "0 11px",
    borderRadius: 999,
    background: "var(--jd-info-soft)",
    color: "var(--jd-info)",
    border: "1px solid var(--jd-border-accent-soft)",
    fontSize: 11,
    fontWeight: 900,
  },

  title: {
    margin: 0,
    color: "var(--jd-text-main)",
    fontSize: 22,
    fontWeight: 950,
    lineHeight: 1.08,
    letterSpacing: "-0.035em",
  },

  subtitle: {
    margin: 0,
    color: "var(--jd-text-secondary)",
    fontSize: 14,
    fontWeight: 600,
    lineHeight: 1.4,
  },

  counterWrap: {
    minWidth: 72,
    minHeight: 58,
    borderRadius: 18,
    display: "grid",
    placeItems: "center",
    gap: 2,
    background: "var(--jd-gradient-table-surface)",
    border: "1px solid var(--jd-border-accent-soft)",
    padding: "8px 12px",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.72)",
  },

  counter: {
    color: "var(--jd-brand-secondary)",
    fontSize: 22,
    fontWeight: 950,
    lineHeight: 1,
  },

  counterLabel: {
    color: "var(--jd-text-muted)",
    fontSize: 11,
    fontWeight: 750,
    lineHeight: 1,
  },

  summaryRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },

  summaryPill: {
    borderRadius: 999,
    padding: "7px 12px",
    fontSize: 12,
    fontWeight: 850,
    lineHeight: 1,
    minHeight: 32,
    display: "inline-flex",
    alignItems: "center",
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
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 12,
  },

alertCard: {
  borderRadius: 18,
  padding: 16,
  background: "var(--jd-gradient-container)",
  border: "1px solid var(--jd-border-accent)",
  display: "grid",
  gap: 10,
  minHeight: 148,
  boxShadow: "var(--jd-shadow-card)",
},

  alertTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },

  severityBadge: {
    borderRadius: 999,
    padding: "6px 11px",
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: 0.2,
    lineHeight: 1,
  },

  contentBlock: {
    display: "grid",
    gap: 7,
  },

  alertTitle: {
    margin: 0,
    color: "var(--jd-text-main)",
    fontSize: 17,
    fontWeight: 900,
    lineHeight: 1.2,
    letterSpacing: "-0.02em",
  },

  alertMessage: {
    margin: 0,
    color: "var(--jd-text-secondary)",
    fontSize: 14,
    fontWeight: 600,
    lineHeight: 1.45,
  },

  actionsRow: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: "auto",
  },

actionButton: {
  border: "1px solid var(--jd-border-accent-soft)",
  background: "rgba(109, 126, 219, 0.12)",
  color: "var(--jd-brand-secondary)",
  borderRadius: 999,
  padding: "8px 12px",
  fontSize: 12,
  fontWeight: 900,
  cursor: "pointer",
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 8px 18px rgba(46, 13, 79, 0.06)",
},

  noAction: {
    color: "var(--jd-text-muted)",
    fontSize: 12,
    fontWeight: 700,
  },
};