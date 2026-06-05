"use client";

import type { CSSProperties } from "react";
import type { CommercialRecommendation } from "@/features/recommendations/types";

type Props = {
  recommendations: CommercialRecommendation[];
  isExportingPdf?: boolean;
};

function getPriorityLabel(priority: CommercialRecommendation["priority"]) {
  if (priority === "alta") return "Alta";
  if (priority === "media") return "Media";
  return "Baja";
}

function getPriorityStyle(priority: CommercialRecommendation["priority"]): CSSProperties {
  if (priority === "alta") {
    return {
      background: "var(--jd-danger-soft)",
      color: "var(--jd-danger)",
      border: "1px solid rgba(220, 38, 38, 0.16)",
    };
  }

  if (priority === "media") {
    return {
      background: "var(--jd-warning-soft)",
      color: "var(--jd-warning)",
      border: "1px solid rgba(245, 158, 11, 0.18)",
    };
  }

  return {
    background: "var(--jd-info-soft)",
    color: "var(--jd-info)",
    border: "1px solid var(--jd-border-accent-soft)",
  };
}

export default function RecommendedActionsSection({
  recommendations,
  isExportingPdf = false,
}: Props) {
  function irAlAnalisis(sectionId?: string) {
    if (!sectionId) return;

    window.location.hash = sectionId;

    window.setTimeout(() => {
      const section = document.getElementById(sectionId);

      if (!section) {
        console.warn(`No se encontró la sección: ${sectionId}`);
        return;
      }

      section.scrollIntoView({ behavior: "smooth", block: "center" });

      const previousBorder = section.style.border;
      const previousBoxShadow = section.style.boxShadow;
      const previousTransition = section.style.transition;
      const previousBorderRadius = section.style.borderRadius;
      const previousOverflow = section.style.overflow;

      section.style.border = "5px solid rgba(34, 197, 94, 1)";
      section.style.borderRadius = "24px";
      section.style.overflow = "hidden";
      section.style.boxShadow =
        "0 0 0 5px rgba(34, 197, 94, 0.24), 0 0 28px rgba(34, 197, 94, 0.50)";
      section.style.transition =
        "border 180ms ease, box-shadow 180ms ease, border-radius 180ms ease";

      window.setTimeout(() => {
        section.style.border = previousBorder;
        section.style.boxShadow = previousBoxShadow;
        section.style.transition = previousTransition;
        section.style.borderRadius = previousBorderRadius;
        section.style.overflow = previousOverflow;
      }, 2400);
    }, 120);
  }

  if (!recommendations.length) {
    return (
      <section style={styles.wrapper}>
        <div style={styles.header}>
          <div>
            <span style={styles.eyebrow}>Prioridades detectadas</span>
            <h3 style={styles.title}>Qué deberías hacer primero</h3>
            <p style={styles.subtitle}>
              Aún no hay acciones claras para recomendar. Carga datos de ventas,
              inventario y canales para recibir sugerencias útiles.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section style={styles.wrapper}>
      <div style={styles.header}>
        <div>
          <span style={styles.eyebrow}>Prioridades detectadas</span>
          <h3 style={styles.title}>Qué deberías hacer primero</h3>
          <p style={styles.subtitle}>
            JasoDatos analiza tus ventas e inventario y te muestra acciones concretas
            para vender mejor, reponer a tiempo y corregir riesgos.
          </p>
        </div>

        {!isExportingPdf ? (
          <span style={styles.countBadge}>{recommendations.length} acciones</span>
        ) : null}
      </div>

      <div style={styles.grid}>
        {recommendations.map((item) => (
          <article key={item.id} style={styles.card}>
            <div style={styles.cardTop}>
              <span style={{ ...styles.priorityBadge, ...getPriorityStyle(item.priority) }}>
                Prioridad {getPriorityLabel(item.priority)}
              </span>

              {item.anchorId && !isExportingPdf ? (
                <button
                  type="button"
                  style={styles.typeButton}
                  onClick={() => irAlAnalisis(item.anchorId ?? undefined)}
                >
                  {item.actionLabel}
                </button>
              ) : (
                <span style={styles.typeBadge}>{item.actionLabel}</span>
              )}
            </div>

            <h4 style={styles.cardTitle}>{item.title}</h4>
            <p style={styles.cardText}>{item.message}</p>

            {item.evidence.length > 0 ? (
              <div style={styles.evidenceBox}>
                <span style={styles.evidenceTitle}>Por qué se recomienda</span>
                {item.evidence.slice(0, 2).map((evidence) => (
                  <div key={evidence} style={styles.evidenceItem}>
                    {"\u2022"} {evidence}
                  </div>
                ))}
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  wrapper: {
    background: "var(--jd-gradient-container)",
    color: "var(--jd-text-main)",
    borderRadius: 18,
    padding: "18px 20px",
    border: "1px solid var(--jd-border-accent)",
    boxShadow: "var(--jd-shadow-card)",
    display: "grid",
    gap: 16,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    flexWrap: "wrap",
  },
  eyebrow: {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 28,
    padding: "0 12px",
    borderRadius: 999,
    background: "var(--jd-info-soft)",
    color: "var(--jd-info)",
    border: "1px solid var(--jd-border-accent-soft)",
    fontSize: 12,
    fontWeight: 900,
    marginBottom: 7,
  },
  title: {
    margin: 0,
    fontSize: 24,
    fontWeight: 900,
    color: "var(--jd-text-main)",
    letterSpacing: "-0.03em",
    lineHeight: 1.12,
  },
  subtitle: {
    margin: "6px 0 0",
    color: "var(--jd-text-secondary)",
    fontSize: 15,
    lineHeight: 1.5,
    fontWeight: 500,
    maxWidth: 840,
  },
  countBadge: {
    minHeight: 32,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 15px",
    borderRadius: 999,
    background: "rgba(56, 189, 248, 0.18)",
    border: "1px solid rgba(255,255,255,0.86)",
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: 700,
    lineHeight: 1,
    whiteSpace: "nowrap",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.14), 0 0 10px rgba(56,189,248,0.08)",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 14,
  },
  card: {
    background: "var(--jd-gradient-table-surface)",
    border: "1px solid var(--jd-border-accent-soft)",
    borderRadius: 14,
    padding: "14px 16px",
    display: "grid",
    gap: 10,
  },
  cardTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    flexWrap: "wrap",
  },
  priorityBadge: {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 26,
    padding: "0 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
  },
  typeBadge: {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 26,
    padding: "0 10px",
    borderRadius: 999,
    background: "var(--jd-gradient-table-surface)",
    color: "var(--jd-text-main)",
    border: "1px solid var(--jd-border-accent-soft)",
    fontSize: 12,
    fontWeight: 900,
  },
  typeButton: {
    minHeight: 32,
    padding: "0 14px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.86)",
    background: "rgba(56, 189, 248, 0.18)",
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.14), 0 0 10px rgba(56,189,248,0.08)",
  },
cardTitle: {
  margin: 0,
  fontSize: 23,
  fontWeight: 600,
  color: "#86EFAC",
  WebkitTextFillColor: "#86EFAC",
  lineHeight: 1.22,
  letterSpacing: "-0.015em",
  textShadow: "0 0 8px rgba(34,197,94,0.18)",
},
  cardText: {
    margin: 0,
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 1.5,
    fontWeight: 450,
  },
  evidenceBox: {
    display: "grid",
    gap: 6,
    padding: "10px 12px",
    borderRadius: 11,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.10)",
  },
  evidenceTitle: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: 750,
    textTransform: "uppercase",
    letterSpacing: "0.045em",
    lineHeight: 1.2,
  },
  evidenceItem: {
    color: "rgba(255,255,255,0.86)",
    fontSize: 13,
    lineHeight: 1.4,
    fontWeight: 450,
  },
  button: {
    minHeight: 34,
    width: "fit-content",
    padding: "0 12px",
    borderRadius: 999,
    border: "1px solid var(--jd-border-accent-soft)",
    background: "rgba(109, 126, 219, 0.12)",
    color: "var(--jd-text-main)",
    fontSize: 14,
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "none",
  },
};