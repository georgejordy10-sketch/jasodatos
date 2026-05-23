"use client";

import { useState, type CSSProperties } from "react";

type KpiItem = {
  title: string;
  value: string;
  badge: string;
  subtitle: string;
  helpText?: string;
  accent?: "default" | "danger";
};

type Props = {
  items: KpiItem[];
  isExportingPdf?: boolean;
};

function KpiCard({
  title,
  value,
  badge,
  subtitle,
  helpText,
  accent = "default",
  isExportingPdf = false,
}: KpiItem & { isExportingPdf?: boolean }) {
  const [showHelp, setShowHelp] = useState(false);
  const isDanger = accent === "danger";

  return (
    <article style={styles.kpiCard}>

      <div style={styles.kpiTopRow}>
        <div>
          <div style={styles.kpiTitle}>{title}</div>
        </div>

        {helpText && !isExportingPdf ? (
          <button
            type="button"
            style={styles.kpiHelpButton}
            onMouseEnter={() => setShowHelp(true)}
            onMouseLeave={() => setShowHelp(false)}
            onFocus={() => setShowHelp(true)}
            onBlur={() => setShowHelp(false)}
            onClick={() => setShowHelp((current) => !current)}
            aria-label={`Cómo leer este dato: ${title}`}
          >
            Cómo leer

            {showHelp ? (
              <span style={styles.kpiTooltip}>{helpText}</span>
            ) : null}
          </button>
        ) : null}
      </div>

      <div style={styles.kpiValue}>{value}</div>

      <div style={styles.kpiFooter}>
        <span
          style={{
            ...styles.kpiBadge,
            ...(isDanger ? styles.kpiBadgeDanger : styles.kpiBadgeSuccess),
          }}
        >
          {badge}
        </span>

        <span style={styles.kpiSubtitle}>{subtitle}</span>
      </div>
    </article>
  );
}

export default function KpiSection({ items, isExportingPdf = false }: Props) {
  return (
    <section style={styles.kpiGrid} aria-label="Indicadores principales">
      {items.map((item) => (
        <KpiCard key={item.title} {...item} isExportingPdf={isExportingPdf} />
      ))}
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 14,
  },

  kpiCard: {
    position: "relative",
    background: "var(--jd-gradient-container)",
    color: "var(--jd-text-main)",
    borderRadius: 22,
    padding: 18,
    border: "1px solid var(--jd-border-accent)",
    boxShadow: "var(--jd-shadow-card)",
    overflow: "visible",
    minHeight: 146,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },

  kpiTopRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 8,
  },

  kpiTitle: {
    color: "var(--jd-text-secondary)",
    fontSize: 13,
    fontWeight: 850,
    lineHeight: 1.25,
  },

  kpiHelpButton: {
    position: "relative",
    border: "1px solid var(--jd-border-accent-soft)",
    background: "#FFFFFF",
    color: "var(--jd-brand-secondary)",
    borderRadius: 999,
    padding: "5px 9px",
    fontSize: 11,
    fontWeight: 800,
    lineHeight: 1,
    cursor: "help",
    whiteSpace: "nowrap",
    boxShadow: "0 8px 18px rgba(15, 23, 42, 0.04)",
  },

  kpiTooltip: {
    position: "absolute",
    right: 0,
    top: "calc(100% + 8px)",
    zIndex: 40,
    width: 300,
    padding: "11px 13px",
    borderRadius: 14,
    background: "#FFFFFF",
    border: "1px solid var(--jd-border-accent-soft)",
    boxShadow: "0 18px 42px rgba(15,23,42,0.18)",
    color: "var(--jd-text-main)",
    fontSize: 13,
    fontWeight: 550,
    lineHeight: 1.45,
    textAlign: "left",
    whiteSpace: "normal",
  },

  kpiValue: {
    fontSize: 30,
    fontWeight: 950,
    marginBottom: 14,
    lineHeight: 1.08,
    letterSpacing: "-0.045em",
    color: "var(--jd-text-main)",
  },

  kpiFooter: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    flexWrap: "wrap",
    paddingTop: 10,
    borderTop: "1px solid var(--jd-border-table)",
  },

  kpiBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 26,
    borderRadius: 999,
    padding: "0 10px",
    fontSize: 12,
    fontWeight: 900,
    border: "1px solid transparent",
  },

  kpiBadgeSuccess: {
    background: "var(--jd-success-soft)",
    color: "var(--jd-success)",
    borderColor: "rgba(22, 163, 74, 0.18)",
  },

  kpiBadgeDanger: {
    background: "var(--jd-danger-soft)",
    color: "var(--jd-danger)",
    borderColor: "rgba(220, 38, 38, 0.18)",
  },

  kpiSubtitle: {
    color: "var(--jd-text-muted)",
    fontSize: 12,
    fontWeight: 650,
    lineHeight: 1.25,
  },
};
