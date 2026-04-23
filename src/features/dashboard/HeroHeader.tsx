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
      <div>
        <div style={styles.brandRow}>
          <div style={styles.brandIcon}>{initials}</div>

          <div>
            <h1 style={styles.brandTitle}>{safeBusinessName}</h1>
            <p style={styles.brandSubtitle}>
              Inteligencia comercial que impulsa decisiones
            </p>

            <div style={styles.brandPlanRow}>
              <span style={styles.brandPlanBadge}>Plan actual: {planLabel}</span>
              <span style={styles.brandMeta}>
                Registros válidos: {filteredCount} · Archivo: {fileName}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div style={styles.heroActions}>
        <button style={styles.primaryButton} onClick={() => onSelectAnotherFile?.()}>
          Seleccionar archivo
        </button>

        <button style={styles.secondaryButton} onClick={onExportExcel}>
          Exportar Excel
        </button>

        <button style={styles.secondaryButton} onClick={() => onClearFile?.()}>
          Limpiar archivo
        </button>

        <button style={styles.planHeroButton} onClick={onOpenPlans}>
          Ver planes · {planLabel}
        </button>

        <button style={styles.secondaryButton} onClick={onOpenSettings}>
          Configuración
        </button>
      </div>
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  hero: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 18,
    background: "linear-gradient(135deg, #1E2670 0%, #2D2D92 100%)",
    color: "#FFFFFF",
    borderRadius: 22,
    padding: "22px 24px",
    border: "1px solid rgba(255,255,255,0.12)",
    boxShadow: "0 14px 28px rgba(17,24,39,0.12)",
    flexWrap: "wrap",
  },
  brandRow: {
    display: "flex",
    alignItems: "center",
    gap: 14,
  },
  brandIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    display: "grid",
    placeItems: "center",
    fontWeight: 800,
    background: "linear-gradient(135deg, #7C3AED 0%, #3B82F6 100%)",
    color: "#FFFFFF",
  },
  brandTitle: {
    margin: 0,
    fontSize: 36,
    lineHeight: 1,
    fontWeight: 800,
  },
  brandSubtitle: {
    margin: "6px 0 4px",
    color: "#D6DCFF",
    fontSize: 15,
  },
  brandMeta: {
    margin: 0,
    color: "#B7C2FF",
    fontSize: 13,
  },
  brandPlanRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    marginTop: 4,
  },
  brandPlanBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 26,
    padding: "0 12px",
    borderRadius: 999,
    background: "rgba(34,197,94,0.16)",
    border: "1px solid rgba(34,197,94,0.28)",
    color: "#86EFAC",
    fontSize: 12,
    fontWeight: 800,
  },
  heroActions: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    alignItems: "center",
  },
  primaryButton: {
    background: "#4460FF",
    color: "#FFFFFF",
    border: "1px solid rgba(255,255,255,0.16)",
    borderRadius: 14,
    minHeight: 48,
    padding: "0 20px",
    fontWeight: 800,
    fontSize: 15,
    cursor: "pointer",
    boxShadow: "0 10px 22px rgba(68,96,255,0.22)",
  },
  secondaryButton: {
    background: "transparent",
    color: "#FFFFFF",
    border: "1px solid rgba(255,255,255,0.24)",
    borderRadius: 14,
    minHeight: 48,
    padding: "0 20px",
    fontWeight: 700,
    fontSize: 15,
    cursor: "pointer",
  },
  planHeroButton: {
    background: "rgba(127,178,255,0.12)",
    color: "#FFFFFF",
    border: "1px solid rgba(127,178,255,0.24)",
    borderRadius: 14,
    minHeight: 48,
    padding: "0 20px",
    fontWeight: 800,
    fontSize: 15,
    cursor: "pointer",
    boxShadow: "0 10px 22px rgba(68,96,255,0.16)",
  },
};