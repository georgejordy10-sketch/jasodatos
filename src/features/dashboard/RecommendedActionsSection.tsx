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
  padding: "12px 14px",
  border: "1px solid var(--jd-border-accent)",
  boxShadow: "var(--jd-shadow-card)",
  display: "grid",
  gap: 9,
},
header: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 10,
  flexWrap: "wrap",
},
eyebrow: {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 21,
  padding: "0 9px",
  borderRadius: 999,
  background: "var(--jd-info-soft)",
  color: "var(--jd-info)",
  border: "1px solid var(--jd-border-accent-soft)",
  fontSize: 10,
  fontWeight: 900,
  marginBottom: 5,
},
title: {
  margin: 0,
  fontSize: 17,
  fontWeight: 900,
  color: "var(--jd-text-main)",
  letterSpacing: "-0.03em",
  lineHeight: 1.05,
},
subtitle: {
  margin: "3px 0 0",
  color: "var(--jd-text-secondary)",
  fontSize: 11,
  lineHeight: 1.3,
  fontWeight: 600,
  maxWidth: 760,
},
countBadge: {
  minHeight: 26,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "0 13px",
  borderRadius: 999,
  background: "rgba(56, 189, 248, 0.18)",
  border: "1px solid rgba(255,255,255,0.86)",
  color: "#FFFFFF",
  fontSize: 11,
  fontWeight: 600,
  lineHeight: 1,
  whiteSpace: "nowrap",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.14), 0 0 10px rgba(56,189,248,0.08)",
},
grid: {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 9,
},
card: {
  background: "var(--jd-gradient-table-surface)",
  border: "1px solid var(--jd-border-accent-soft)",
  borderRadius: 14,
  padding: "9px 10px",
  display: "grid",
  gap: 5,
},
cardTop: {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 6,
  flexWrap: "wrap",
},
priorityBadge: {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 20,
  padding: "0 8px",
  borderRadius: 999,
  fontSize: 9,
  fontWeight: 900,
},
typeBadge: {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 20,
  padding: "0 8px",
  borderRadius: 999,
  background: "var(--jd-gradient-table-surface)",
  color: "var(--jd-text-main)",
  border: "1px solid var(--jd-border-accent-soft)",
  fontSize: 9,
  fontWeight: 900,
},
typeButton: {
  minHeight: 24,
  padding: "0 11px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.86)",
  background: "rgba(56, 189, 248, 0.18)",
  color: "#FFFFFF",
  fontSize: 11,
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.14), 0 0 10px rgba(56,189,248,0.08)",
},
cardTitle: {
  margin: 0,
  color: "#FFFFFF",
  fontSize: 16,
  fontWeight: 600,
  letterSpacing: "-0.01em",
  lineHeight: 1.18,
},
cardText: {
  margin: 0,
  color: "#FFFFFF",
  fontSize: 13,
  lineHeight: 1.38,
  fontWeight: 400,
},
evidenceBox: {
  display: "grid",
  gap: 3,
  padding: "7px 9px",
  borderRadius: 11,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.10)",
},
evidenceTitle: {
  color: "#FFFFFF",
  fontSize: 10,
  fontWeight: 650,
  textTransform: "uppercase",
  letterSpacing: "0.045em",
  lineHeight: 1.1,
},
evidenceItem: {
  color: "rgba(255,255,255,0.86)",
  fontSize: 11,
  lineHeight: 1.25,
  fontWeight: 400,
},
button: {
  minHeight: 28,
  width: "fit-content",
  padding: "0 10px",
  borderRadius: 999,
  border: "1px solid var(--jd-border-accent-soft)",
  background: "rgba(109, 126, 219, 0.12)",
  color: "var(--jd-text-main)",
  fontSize: 11,
  fontWeight: 750,
  cursor: "pointer",
  boxShadow: "none",
},
};