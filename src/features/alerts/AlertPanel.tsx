"use client";

import type { CSSProperties } from "react";
import type { BusinessAlert, AlertSeverity } from "./types";

type AlertPanelProps = {
  alerts: BusinessAlert[];
};

function severityLabel(severity: AlertSeverity): string {
  if (severity === "alta") return "alta";
  if (severity === "media") return "media";
  return "baja";
}

function severityStyles(severity: AlertSeverity): CSSProperties {
  if (severity === "alta") {
    return {
      background: "rgba(239, 68, 68, 0.16)",
      color: "#FFD3D3",
      border: "1px solid rgba(239, 68, 68, 0.30)",
    };
  }

  if (severity === "media") {
    return {
      background: "rgba(245, 158, 11, 0.16)",
      color: "#FFE7B0",
      border: "1px solid rgba(245, 158, 11, 0.30)",
    };
  }

  return {
    background: "rgba(34, 197, 94, 0.16)",
    color: "#C8FFD9",
    border: "1px solid rgba(34, 197, 94, 0.30)",
  };
}
function findScrollableParent(element: HTMLElement): HTMLElement | Window {
  let parent = element.parentElement;

  while (parent) {
    const style = window.getComputedStyle(parent);
    const overflowY = style.overflowY;

    const canScroll =
      (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") &&
      parent.scrollHeight > parent.clientHeight;

    if (canScroll) {
      return parent;
    }

    parent = parent.parentElement;
  }

  return window;
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
    "0 0 0 10px rgba(34, 197, 94, 0.22), 0 12px 28px rgba(0, 0, 0, 0.28)";
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
  const high = alerts.filter((a) => a.severity === "alta").length;
  const medium = alerts.filter((a) => a.severity === "media").length;
  const low = alerts.filter((a) => a.severity === "baja").length;

  return (
    <section style={styles.card}>
      <div style={styles.header}>
        <div style={styles.headerCopy}>
          <h2 style={styles.title}>Alertas del negocio</h2>
          <p style={styles.subtitle}>
            prioridades ejecutivas detectadas automáticamente a partir del período filtrado
          </p>
        </div>

        <div style={styles.counterWrap}>
          <span style={styles.counter}>{total}</span>
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
          No se detectaron alertas relevantes con los filtros actuales.
        </div>
      ) : (
        <div style={styles.grid}>
          {alerts.map((alert) => (
            <article key={alert.id} style={styles.alertCard}>
              <div style={styles.alertTop}>
                <span style={{ ...styles.severityBadge, ...severityStyles(alert.severity) }}>
                  {severityLabel(alert.severity).toUpperCase()}
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
  <span />
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
    background: "linear-gradient(135deg, #202969 0%, #2B2F86 100%)",
    borderRadius: 20,
    padding: 18,
    border: "1px solid rgba(255,255,255,0.10)",
    boxShadow: "0 12px 24px rgba(17,24,39,0.10)",
    display: "grid",
    gap: 12,
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 2,
  },
  headerCopy: {
    display: "grid",
    gap: 3,
  },
  title: {
    margin: 0,
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: 800,
    lineHeight: 1.1,
    letterSpacing: "-0.01em",
  },
  subtitle: {
    margin: 0,
    color: "rgba(245,248,255,0.96)",
    fontSize: 14,
    fontWeight: 500,
    lineHeight: 1.35,
  },
  counterWrap: {
    minWidth: 50,
    height: 50,
    borderRadius: 16,
    display: "grid",
    placeItems: "center",
    background: "rgba(127, 178, 255, 0.12)",
    border: "1px solid rgba(127, 178, 255, 0.22)",
    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.03)",
  },
  counter: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: 800,
    lineHeight: 1,
  },
  summaryRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginTop: 2,
  },
  summaryPill: {
    borderRadius: 999,
    padding: "7px 12px",
    fontSize: 13,
    fontWeight: 800,
    lineHeight: 1,
    minHeight: 34,
    display: "inline-flex",
    alignItems: "center",
  },
  emptyState: {
    minHeight: 68,
    display: "grid",
    placeItems: "center",
    color: "rgba(245,248,255,0.94)",
    border: "1px dashed rgba(127, 178, 255, 0.20)",
    borderRadius: 16,
    background: "rgba(127, 178, 255, 0.04)",
    padding: 14,
    textAlign: "center",
    fontSize: 14,
    fontWeight: 500,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 12,
  },
  alertCard: {
    borderRadius: 18,
    padding: 16,
    background: "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(127,178,255,0.02) 100%)",
    border: "1px solid rgba(255,255,255,0.08)",
    display: "grid",
    gap: 10,
    minHeight: 150,
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
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 0.25,
    lineHeight: 1,
  },
  contentBlock: {
    display: "grid",
    gap: 8,
  },
  alertTitle: {
    margin: 0,
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: 800,
    lineHeight: 1.2,
  },
  alertMessage: {
    margin: 0,
    color: "rgba(247,250,255,0.98)",
    fontSize: 15,
    fontWeight: 500,
    lineHeight: 1.45,
  },
  actionsRow: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: "auto",
  },
actionButton: {
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(255,255,255,0.10)",
  color: "#FFFFFF",
  borderRadius: 999,
  padding: "8px 12px",
  fontSize: 12,
  fontWeight: 800,
  cursor: "pointer",
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
},
};