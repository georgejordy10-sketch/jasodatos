"use client";

import type { CSSProperties } from "react";

type Props = {
  businessName?: string;
  filteredCount: number;
  fileName: string;
  planLabel: string;
  onAdjustMapping?: () => void;
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
  onAdjustMapping,
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
        <div style={styles.brandIcon} aria-hidden="true">
  <svg
    width="25"
    height="25"
    viewBox="0 0 24 24"
    fill="none"
  >
    <path
      d="M4 20V9.5L12 4L20 9.5V20"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M8 20V12H16V20"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M10 9.5H14"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>

  <span style={styles.brandIconInitial}>{initials.slice(0, 1)}</span>
</div>

        <div style={styles.titleBlock}>
          <h1 style={styles.brandTitle}>{safeBusinessName}</h1>

          <p style={styles.brandSubtitle}>
            Detecta oportunidades, riesgos y decisiones importantes para tu negocio.
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
  {onAdjustMapping ? (
    <button
      type="button"
      onClick={onAdjustMapping}
      style={styles.secondaryButton}
    >
      Volver al mapeo
    </button>
  ) : null}

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
  width: 64,
  height: 64,
  borderRadius: 20,
  background:
    "linear-gradient(135deg, rgba(91,75,255,0.96) 0%, rgba(46,13,79,0.95) 100%)",
  color: "#FFFFFF",
  display: "grid",
  placeItems: "center",
  position: "relative",
  boxShadow:
    "0 16px 32px rgba(46,13,79,0.24), inset 0 1px 0 rgba(255,255,255,0.16)",
  flexShrink: 0,
},

brandIconInitial: {
  position: "absolute",
  right: 7,
  bottom: 6,
  width: 18,
  height: 18,
  borderRadius: 999,
  display: "grid",
  placeItems: "center",
  background: "rgba(255,255,255,0.16)",
  border: "1px solid rgba(255,255,255,0.28)",
  color: "#FFFFFF",
  fontSize: 10,
  fontWeight: 900,
  lineHeight: 1,
},
titleBlock: {
  minWidth: 0,
  flex: "1 1 240px",
},

brandTitle: {
  margin: 0,
  color: "#FFFFFF",
  fontSize: 58,
  fontWeight: 950,
  lineHeight: 0.95,
  letterSpacing: "-0.05em",
},

brandSubtitle: {
  margin: "10px 0 0",
  color: "rgba(255,255,255,0.88)",
  fontSize: 17,
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