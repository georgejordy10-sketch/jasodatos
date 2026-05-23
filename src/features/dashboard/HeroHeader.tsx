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
      <div style={styles.mainColumn}>
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

        <div style={styles.metaGrid}>
          <div style={styles.metaCard}>
            <span style={styles.metaLabel}>Plan actual</span>
            <strong style={styles.metaValue}>{planLabel}</strong>
          </div>

          <div style={styles.metaCard}>
            <span style={styles.metaLabel}>Registros válidos</span>
            <strong style={styles.metaValue}>{filteredCount}</strong>
          </div>

          <div style={styles.metaCardWide}>
            <span style={styles.metaLabel}>Archivo cargado</span>
            <strong style={styles.fileName}>{fileName}</strong>
          </div>
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

        <button type="button" style={styles.secondaryButton} onClick={onExportExcel}>
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

        <button type="button" style={styles.secondaryButton} onClick={onOpenSettings}>
          Configuración
        </button>
      </div>
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  hero: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(260px, 360px)",
    gap: 16,
    alignItems: "center",
    background: "var(--jd-gradient-container)",
    color: "var(--jd-text-main)",
    borderRadius: 22,
    padding: 18,
    border: "1px solid var(--jd-border-accent)",
    borderTop: "4px solid var(--jd-accent-main)",
    boxShadow: "var(--jd-shadow-card)",
    position: "relative",
    overflow: "hidden",
  },

  mainColumn: {
    display: "grid",
    gap: 12,
    minWidth: 0,
  },

  eyebrow: {
    display: "inline-flex",
    alignItems: "center",
    width: "fit-content",
    minHeight: 28,
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
    gap: 16,
    minWidth: 0,
  },

  brandIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    display: "grid",
    placeItems: "center",
    fontWeight: 900,
    background: "var(--jd-gradient-brand-dark)",
    color: "#FFFFFF",
    boxShadow: "0 12px 26px rgba(61, 44, 141, 0.22)",
    flex: "0 0 auto",
  },

  titleBlock: {
    minWidth: 0,
  },

  brandTitle: {
    margin: 0,
    fontSize: 30,
    lineHeight: 1.02,
    fontWeight: 950,
    letterSpacing: "-0.05em",
    color: "var(--jd-text-main)",
  },

  brandSubtitle: {
    margin: "6px 0 0",
    color: "var(--jd-text-secondary)",
    fontSize: 14,
    lineHeight: 1.4,
    fontWeight: 650,
  },

  metaGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 150px)) minmax(200px, 1fr)",
    gap: 8,
    alignItems: "stretch",
  },

  metaCard: {
    display: "grid",
    gap: 3,
    padding: "10px 12px",
    borderRadius: 16,
    background: "rgba(255,255,255,0.86)",
    border: "1px solid var(--jd-border-accent-soft)",
    minWidth: 0,
  },

  metaCardWide: {
    display: "grid",
    gap: 3,
    padding: "10px 12px",
    borderRadius: 16,
    background: "rgba(255,255,255,0.86)",
    border: "1px solid var(--jd-border-accent-soft)",
    minWidth: 0,
  },

  metaLabel: {
    color: "var(--jd-text-muted)",
    fontSize: 12,
    fontWeight: 750,
  },

  metaValue: {
    color: "var(--jd-text-main)",
    fontSize: 16,
    fontWeight: 900,
  },

  fileName: {
    color: "var(--jd-text-main)",
    fontSize: 13,
    fontWeight: 850,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  actionsPanel: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 8,
    alignSelf: "center",
    padding: 10,
    borderRadius: 20,
    background: "var(--jd-gradient-table-surface)",
    border: "1px solid var(--jd-border-accent-soft)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.72)",
  },

  primaryButton: {
    gridColumn: "1 / -1",
    background: "var(--jd-gradient-accent)",
    color: "#FFFFFF",
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: 14,
    minHeight: 40,
    padding: "0 14px",
    fontWeight: 900,
    fontSize: 13,
    cursor: "pointer",
    boxShadow: "var(--jd-shadow-button)",
  },

  secondaryButton: {
    background: "#FFFFFF",
    color: "var(--jd-brand-secondary)",
    border: "1px solid var(--jd-border-accent-soft)",
    borderRadius: 14,
    minHeight: 38,
    padding: "0 12px",
    fontWeight: 850,
    fontSize: 12,
    cursor: "pointer",
    boxShadow: "0 8px 18px rgba(15, 23, 42, 0.04)",
  },

  planButton: {
    background: "var(--jd-gradient-brand-dark)",
    color: "#FFFFFF",
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: 14,
    minHeight: 38,
    padding: "0 12px",
    fontWeight: 900,
    fontSize: 12,
    cursor: "pointer",
    boxShadow: "0 10px 22px rgba(46, 13, 79, 0.16)",
  },
};