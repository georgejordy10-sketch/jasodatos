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

    const section = document.getElementById(sectionId);

    if (!section) {
      console.warn(`No se encontró la sección: ${sectionId}`);
      return;
    }

    section.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  if (!recommendations.length) {
    return (
      <section style={styles.wrapper}>
        <div style={styles.header}>
          <div>
            <span style={styles.eyebrow}>Recomendaciones del negocio</span>
            <h3 style={styles.title}>Acciones recomendadas</h3>
            <p style={styles.subtitle}>
              Aún no hay acciones claras para recomendar. Carga datos de ventas, inventario y canales para recibir sugerencias útiles.
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
          <span style={styles.eyebrow}>Recomendaciones del negocio</span>
          <h3 style={styles.title}>Acciones recomendadas</h3>
          <p style={styles.subtitle}>
            Sugerencias creadas a partir de tus ventas, inventario y canales para ayudarte a tomar mejores decisiones.
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
                    • {evidence}
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
    borderRadius: 22,
    padding: 18,
    border: "1px solid var(--jd-border-accent)",
    boxShadow: "var(--jd-shadow-card)",
    display: "grid",
    gap: 14,
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
    minHeight: 24,
    padding: "0 10px",
    borderRadius: 999,
    background: "var(--jd-info-soft)",
    color: "var(--jd-info)",
    border: "1px solid var(--jd-border-accent-soft)",
    fontSize: 11,
    fontWeight: 900,
    marginBottom: 8,
  },
  title: {
    margin: 0,
    fontSize: 21,
    fontWeight: 800,
    color: "var(--jd-text-main)",
    letterSpacing: "-0.04em",
    lineHeight: 1.08,
  },
  subtitle: {
    margin: "5px 0 0",
    color: "var(--jd-text-secondary)",
    fontSize: 13,
    lineHeight: 1.4,
    fontWeight: 500,
    maxWidth: 760,
  },
  countBadge: {
    minHeight: 30,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 12px",
    borderRadius: 999,
    background: "#FFFFFF",
    color: "var(--jd-brand-secondary)",
    border: "1px solid var(--jd-border-accent-soft)",
    fontSize: 12,
    fontWeight: 900,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
    gap: 12,
  },
  card: {
    background: "var(--jd-gradient-table-surface)",
    border: "1px solid var(--jd-border-accent-soft)",
    borderRadius: 18,
    padding: 14,
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
    minHeight: 25,
    padding: "0 9px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 900,
  },
  typeBadge: {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 25,
    padding: "0 9px",
    borderRadius: 999,
    background: "#FFFFFF",
    color: "var(--jd-brand-secondary)",
    border: "1px solid var(--jd-border-accent-soft)",
    fontSize: 11,
    fontWeight: 900,
  },
typeButton: {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 27,
  padding: "0 11px",
  borderRadius: 999,
  background: "rgba(109, 126, 219, 0.12)",
  color: "var(--jd-brand-secondary)",
  border: "1px solid var(--jd-border-accent-soft)",
  fontSize: 11,
  fontWeight: 750,
  cursor: "pointer",
  whiteSpace: "nowrap",
},
cardTitle: {
  margin: 0,
  color: "var(--jd-text-main)",
  fontSize: 15,
  fontWeight: 800,
  letterSpacing: "-0.015em",
},
cardText: {
  margin: 0,
  color: "var(--jd-text-secondary)",
  fontSize: 13,
  lineHeight: 1.45,
  fontWeight: 500,
},
  evidenceBox: {
    display: "grid",
    gap: 5,
    padding: 10,
    borderRadius: 14,
    background: "rgba(255,255,255,0.72)",
    border: "1px solid var(--jd-border-accent-subtle)",
  },
  evidenceTitle: {
    color: "var(--jd-text-main)",
    fontSize: 11,
    fontWeight: 850,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  evidenceItem: {
    color: "var(--jd-text-secondary)",
    fontSize: 12,
    lineHeight: 1.35,
    fontWeight: 500,
  },
button: {
  minHeight: 28,
  width: "fit-content",
  padding: "0 10px",
  borderRadius: 999,
  border: "1px solid var(--jd-border-accent-soft)",
  background: "rgba(109, 126, 219, 0.12)",
  color: "var(--jd-brand-secondary)",
  fontSize: 11,
  fontWeight: 750,
  cursor: "pointer",
  boxShadow: "none",
},
};