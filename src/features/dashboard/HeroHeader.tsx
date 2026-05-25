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
  borderRadius: 18,
  padding: "18px",
  background: "var(--jd-gradient-container)",
  border: "1px solid var(--jd-border-accent)",
  boxShadow: "var(--jd-shadow-card)",
  display: "grid",
  gap: 16,
  overflow: "hidden",
},

bottomRow: {
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: 14,
  flexWrap: "wrap",
  minWidth: 0,
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
  minWidth: 0,
  flexWrap: "wrap",
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
  flex: "1 1 240px",
},

brandTitle: {
  margin: 0,
  color: "#FFFFFF",
  fontSize: 46,
  fontWeight: 800,
  lineHeight: 1,
  letterSpacing: "-0.045em",
},

brandSubtitle: {
  margin: "7px 0 0",
  color: "rgba(255,255,255,0.88)",
  fontSize: 15,
  fontWeight: 500,
  lineHeight: 1.35,
  maxWidth: "100%",
},

actionsPanel: {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 10,
  flexWrap: "wrap",
  minWidth: 0,
  flex: "1 1 320px",
},
primaryButton: {
  background: "rgba(56, 189, 248, 0.18)",
  color: "#FFFFFF",
  border: "1px solid rgba(255,255,255,0.86)",
  borderRadius: 12,
  minHeight: 42,
  minWidth: 140,
  maxWidth: "100%",
  padding: "0 16px",
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
  whiteSpace: "nowrap",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.14), 0 0 10px rgba(56,189,248,0.08)",
},

secondaryButton: {
  background: "rgba(80, 96, 220, 0.22)",
  color: "#FFFFFF",
  border: "1px solid rgba(255,255,255,0.86)",
  borderRadius: 12,
  minHeight: 42,
  minWidth: 120,
  maxWidth: "100%",
  padding: "0 14px",
  fontWeight: 500,
  fontSize: 12,
  cursor: "pointer",
  whiteSpace: "nowrap",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10)",
},

planButton: {
  background: "rgba(37, 99, 235, 0.62)",
  color: "#FFFFFF",
  border: "1px solid rgba(255,255,255,0.90)",
  borderRadius: 12,
  minHeight: 42,
  minWidth: 110,
  maxWidth: "100%",
  padding: "0 14px",
  fontWeight: 600,
  fontSize: 12,
  cursor: "pointer",
  whiteSpace: "nowrap",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.16), 0 0 14px rgba(37,99,235,0.22)",
},

metaGrid: {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
  gap: 10,
  minWidth: 0,
  flex: "1 1 220px",
},

planMetaCard: {
  borderRadius: 14,
  padding: "12px 16px",
  minHeight: 60,
  minWidth: 260,
  display: "grid",
  alignContent: "center",
  background:
    "linear-gradient(135deg, rgba(88, 101, 242, 0.20) 0%, rgba(61, 44, 141, 0.13) 100%)",
  border: "1px solid rgba(255,255,255,0.42)",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.10), 0 0 10px rgba(56,189,248,0.04)",
},
metaLabel: {
  color: "rgba(255,255,255,0.82)",
  fontSize: 12,
  fontWeight: 500,
  lineHeight: 1,
},

planMetaValue: {
  color: "#FFFFFF",
  fontSize: 21,
  fontWeight: 700,
  lineHeight: 1.05,
  letterSpacing: "-0.02em",
},
};