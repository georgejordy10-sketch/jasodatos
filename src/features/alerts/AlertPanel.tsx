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
      background: "rgba(220, 38, 38, 0.10)",
      color: "#B91C1C",
      border: "1px solid rgba(220, 38, 38, 0.18)",
    };
  }

  if (severity === "media") {
    return {
      background: "rgba(245, 158, 11, 0.12)",
      color: "#B45309",
      border: "1px solid rgba(245, 158, 11, 0.22)",
    };
  }

  return {
    background: "rgba(22, 163, 74, 0.10)",
    color: "#15803D",
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
    background:
      "linear-gradient(135deg, #FFFFFF 0%, rgba(248, 250, 252, 0.96) 100%)",
    borderRadius: 22,
    padding: 18,
    border: "1px solid var(--jd-border, #E2E8F0)",
    boxShadow: "0 14px 34px rgba(15, 23, 42, 0.07)",
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
    background: "rgba(61, 44, 141, 0.08)",
    color: "var(--jd-brand-secondary, #3D2C8D)",
    border: "1px solid rgba(61, 44, 141, 0.14)",
    fontSize: 11,
    fontWeight: 850,
  },
  title: {
    margin: 0,
    color: "var(--jd-text-main, #0F172A)",
    fontSize: 22,
    fontWeight: 900,
    lineHeight: 1.08,
    letterSpacing: "-0.035em",
  },
  subtitle: {
    margin: 0,
    color: "var(--jd-text-secondary, #475569)",
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
    background:
      "linear-gradient(135deg, rgba(46, 13, 79, 0.06) 0%, rgba(40, 53, 147, 0.08) 100%)",
    border: "1px solid rgba(61, 44, 141, 0.12)",
    padding: "8px 12px",
  },
  counter: {
    color: "var(--jd-brand-secondary, #3D2C8D)",
    fontSize: 22,
    fontWeight: 950,
    lineHeight: 1,
  },
  counterLabel: {
    color: "var(--jd-text-muted, #64748B)",
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
    color: "var(--jd-text-secondary, #475569)",
    border: "1px dashed rgba(148, 163, 184, 0.50)",
    borderRadius: 16,
    background: "rgba(248, 250, 252, 0.80)",
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
    background: "#FFFFFF",
    border: "1px solid var(--jd-border, #E2E8F0)",
    display: "grid",
    gap: 10,
    minHeight: 148,
    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
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
    color: "var(--jd-text-main, #0F172A)",
    fontSize: 17,
    fontWeight: 900,
    lineHeight: 1.2,
    letterSpacing: "-0.02em",
  },
  alertMessage: {
    margin: 0,
    color: "var(--jd-text-secondary, #475569)",
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
    border: "1px solid rgba(61, 44, 141, 0.18)",
    background:
      "linear-gradient(135deg, rgba(61, 44, 141, 0.08) 0%, rgba(124, 58, 237, 0.10) 100%)",
    color: "var(--jd-brand-secondary, #3D2C8D)",
    borderRadius: 999,
    padding: "8px 12px",
    fontSize: 12,
    fontWeight: 900,
    cursor: "pointer",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  noAction: {
    color: "var(--jd-text-muted, #64748B)",
    fontSize: 12,
    fontWeight: 700,
  },
};