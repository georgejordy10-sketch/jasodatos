"use client";

import type { CSSProperties } from "react";

type Props = {
  businessName?: string;
  filteredCount: number;
  fileName: string;
  planLabel: string;
  onSelectAnotherFile?: () => void;
  onExportExcel: () => void;
  onClearFile?: () => void;
  onOpenPlans: () => void;
  onOpenSettings: () => void;
};

export default function HeroHeader({
  businessName,
  filteredCount,
  fileName,
  planLabel,
  onSelectAnotherFile,
  onExportExcel,
  onClearFile,
  onOpenPlans,
  onOpenSettings,
}: Props) {
  const safeBusinessName = businessName || "JasoDatos";

  const initials = safeBusinessName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
return (
  <section style={styles.hero}>
    <div style={styles.brandArea}>
      <div style={styles.eyebrow}>Negocio analizado</div>

      <div style={styles.brandRow}>
        <div style={styles.brandIcon}>{initials}</div>

        <div style={styles.titleBlock}>
          <h1 style={styles.brandTitle}>{safeBusinessName}</h1>

          <p style={styles.brandSubtitle}>
            Indicadores comerciales, alertas e insights listos para actuar.
          </p>
        </div>
      </div>
    </div>

    <div style={styles.bottomRow}>
      <div style={styles.metaGrid}>
        <div style={styles.planMetaCard}>
          <span style={styles.metaLabel}>Plan actual</span>
          <strong style={styles.planMetaValue}>{planLabel}</strong>
        </div>
      </div>

      <div style={styles.actionsPanel}>
        <button
          type="button"
          style={styles.primaryButton}
          onClick={() => onSelectAnotherFile?.()}
        >
          Seleccionar archivo
        </button>

        <button
          type="button"
          style={styles.secondaryButton}
          onClick={onExportExcel}
        >
          Exportar Excel
        </button>

        <button
          type="button"
          style={styles.secondaryButton}
          onClick={() => onClearFile?.()}
        >
          Limpiar archivo
        </button>

        <button type="button" style={styles.planButton} onClick={onOpenPlans}>
          Ver planes
        </button>

        <button
          type="button"
          style={styles.secondaryButton}
          onClick={onOpenSettings}
        >
          Configuración
        </button>
      </div>
    </div>
  </section>
);
}

const styles: Record<string, CSSProperties> = {
  hero: {
    display: "grid",
    gap: 14,
    background: "var(--jd-gradient-container)",
    color: "var(--jd-text-main)",
    borderRadius: 22,
    padding: "16px 18px",
    border: "1px solid var(--jd-border-accent)",
    boxShadow: "var(--jd-shadow-card)",
    position: "relative",
    overflow: "hidden",
  },

bottomRow: {
  display: "grid",
  gridTemplateColumns: "220px minmax(0, 1fr)",
  gap: 18,
  alignItems: "center",
},

  brandArea: {
    display: "grid",
    gap: 12,
    minWidth: 0,
  },

  eyebrow: {
    display: "inline-flex",
    alignItems: "center",
    width: "fit-content",
    minHeight: 26,
    padding: "0 12px",
    borderRadius: 999,
    background: "var(--jd-info-soft)",
    color: "var(--jd-info)",
    border: "1px solid var(--jd-border-accent-soft)",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: "0.02em",
  },

brandRow: {
  display: "flex",
  alignItems: "center",
  gap: 14,
},

brandIcon: {
  width: 58,
  height: 58,
  borderRadius: 16,
  background: "linear-gradient(135deg, #2E0D4F 0%, #3D2C8D 100%)",
  color: "#FFFFFF",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 20,
  fontWeight: 950,
  boxShadow: "0 14px 28px rgba(46, 13, 79, 0.18)",
  flexShrink: 0,
},

  titleBlock: {
    minWidth: 0,
  },

brandTitle: {
  margin: 0,
  color: "var(--jd-text-main)",
  fontSize: 46,
  fontWeight: 950,
  lineHeight: 0.95,
  letterSpacing: "-0.065em",
  textTransform: "capitalize",
},

brandSubtitle: {
  margin: "6px 0 0",
  color: "var(--jd-text-secondary)",
  fontSize: 13,
  fontWeight: 650,
  lineHeight: 1.25,
},

actionsPanel: {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 10,
  padding: 0,
  background: "transparent",
  border: "none",
  boxShadow: "none",
  minWidth: 0,
  flexWrap: "wrap",
},
primaryButton: {
  background: "rgba(255,255,255,0.72)",
  color: "var(--jd-brand-secondary)",
  border: "1px solid var(--jd-border-accent-soft)",
  borderRadius: 12,
  minHeight: 42,
  minWidth: 190,
  padding: "0 18px",
  fontWeight: 900,
  fontSize: 13,
  cursor: "pointer",
  boxShadow: "0 8px 18px rgba(15, 23, 42, 0.035)",
  whiteSpace: "nowrap",
},

secondaryButton: {
  background: "rgba(255,255,255,0.72)",
  color: "var(--jd-brand-secondary)",
  border: "1px solid var(--jd-border-accent-soft)",
  borderRadius: 12,
  minHeight: 42,
  minWidth: 120,
  padding: "0 14px",
  fontWeight: 850,
  fontSize: 12,
  cursor: "pointer",
  boxShadow: "0 8px 18px rgba(15, 23, 42, 0.035)",
  whiteSpace: "nowrap",
},

planButton: {
  background: "var(--jd-gradient-brand-dark)",
  color: "#FFFFFF",
  border: "1px solid rgba(255,255,255,0.18)",
  borderRadius: 12,
  minHeight: 42,
  minWidth: 110,
  padding: "0 14px",
  fontWeight: 900,
  fontSize: 12,
  cursor: "pointer",
  boxShadow: "0 10px 22px rgba(46, 13, 79, 0.14)",
  whiteSpace: "nowrap",
},

metaGrid: {
  display: "grid",
  gridTemplateColumns: "220px",
  gap: 8,
  alignItems: "stretch",
  width: "fit-content",
},

planMetaCard: {
  borderRadius: 14,
  padding: "10px 14px",
  minHeight: 54,
  minWidth: 220,
  display: "grid",
  alignContent: "center",
  background:
    "linear-gradient(135deg, rgba(88, 101, 242, 0.20) 0%, rgba(61, 44, 141, 0.13) 100%)",
  border: "1px solid rgba(91, 104, 255, 0.45)",
  boxShadow:
    "0 12px 28px rgba(61, 44, 141, 0.13), inset 0 0 0 1px rgba(255,255,255,0.38)",
},
  metaLabel: {
    display: "block",
    color: "var(--jd-text-secondary)",
    fontSize: 11,
    fontWeight: 800,
    lineHeight: 1.15,
    marginBottom: 5,
  },

  planMetaValue: {
    color: "var(--jd-text-main)",
    fontSize: 18,
    fontWeight: 950,
    lineHeight: 1.05,
    letterSpacing: "-0.02em",
  },
};