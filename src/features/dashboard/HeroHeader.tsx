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
  background:
    "linear-gradient(135deg, #FFFFFF 0%, rgba(238, 242, 255, 0.88) 100%)",
  color: "var(--jd-text-main, #0F172A)",
  borderRadius: 22,
  padding: 18,
  border: "1px solid var(--jd-border, #E2E8F0)",
  boxShadow: "0 14px 34px rgba(15, 23, 42, 0.07)",
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
    background: "rgba(61, 44, 141, 0.08)",
    color: "var(--jd-brand-secondary, #3D2C8D)",
    border: "1px solid rgba(61, 44, 141, 0.14)",
    fontSize: 12,
    fontWeight: 800,
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
  background:
    "linear-gradient(135deg, var(--jd-brand-tertiary, #283593) 0%, var(--jd-brand-secondary, #3D2C8D) 100%)",
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
  fontWeight: 900,
  letterSpacing: "-0.05em",
  color: "var(--jd-text-main, #0F172A)",
},
brandSubtitle: {
  margin: "6px 0 0",
  color: "var(--jd-text-secondary, #475569)",
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
  background: "#FFFFFF",
  border: "1px solid var(--jd-border, #E2E8F0)",
  minWidth: 0,
},
metaCardWide: {
  display: "grid",
  gap: 3,
  padding: "10px 12px",
  borderRadius: 16,
  background: "#FFFFFF",
  border: "1px solid var(--jd-border, #E2E8F0)",
  minWidth: 0,
},
  metaLabel: {
    color: "var(--jd-text-muted, #64748B)",
    fontSize: 12,
    fontWeight: 750,
  },
  metaValue: {
    color: "var(--jd-text-main, #0F172A)",
    fontSize: 16,
    fontWeight: 900,
  },
  fileName: {
    color: "var(--jd-text-main, #0F172A)",
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
  background:
    "linear-gradient(135deg, rgba(46, 13, 79, 0.05) 0%, rgba(40, 53, 147, 0.07) 100%)",
  border: "1px solid rgba(61, 44, 141, 0.12)",
},
primaryButton: {
  gridColumn: "1 / -1",
  background:
    "linear-gradient(135deg, var(--jd-action-primary, #2563EB) 0%, var(--jd-action-premium, #7C3AED) 100%)",
  color: "#FFFFFF",
  border: "1px solid rgba(255,255,255,0.18)",
  borderRadius: 14,
  minHeight: 40,
  padding: "0 14px",
  fontWeight: 900,
  fontSize: 13,
  cursor: "pointer",
  boxShadow: "0 10px 22px rgba(37, 99, 235, 0.20)",
},
secondaryButton: {
  background: "#FFFFFF",
  color: "var(--jd-brand-secondary, #3D2C8D)",
  border: "1px solid var(--jd-border, #E2E8F0)",
  borderRadius: 14,
  minHeight: 38,
  padding: "0 12px",
  fontWeight: 850,
  fontSize: 12,
  cursor: "pointer",
  boxShadow: "0 8px 18px rgba(15, 23, 42, 0.04)",
},
planButton: {
  background:
    "linear-gradient(135deg, var(--jd-brand-secondary, #3D2C8D) 0%, var(--jd-action-premium, #7C3AED) 100%)",
  color: "#FFFFFF",
  border: "1px solid rgba(255,255,255,0.18)",
  borderRadius: 14,
  minHeight: 38,
  padding: "0 12px",
  fontWeight: 900,
  fontSize: 12,
  cursor: "pointer",
  boxShadow: "0 10px 22px rgba(124, 58, 237, 0.16)",
},
};