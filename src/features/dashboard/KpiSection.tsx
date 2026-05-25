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
  gap: 10,
},

kpiCard: {
  position: "relative",
  background: "var(--jd-gradient-container)",
  color: "var(--jd-text-main)",
  borderRadius: 16,
  padding: "10px 12px",
  border: "1px solid var(--jd-border-accent)",
  boxShadow: "var(--jd-shadow-card)",
  overflow: "visible",
  minHeight: 82,
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
},
kpiTopRow: {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 6,
  marginBottom: 2,
},

kpiTitle: {
  color: "var(--jd-text-secondary)",
  fontSize: 10,
  fontWeight: 850,
  lineHeight: 1.1,
},

kpiHelpButton: {
  position: "relative",
  border: "1px solid var(--jd-border-accent-soft)",
  background: "var(--jd-gradient-table-surface)",
  color: "var(--jd-brand-secondary)",
  borderRadius: 999,
  padding: "3px 7px",
  fontSize: 9,
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
    background: "var(--jd-gradient-table-surface)",
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
  fontSize: 18,
  fontWeight: 900,
  marginBottom: 4,
  lineHeight: 1,
  letterSpacing: "-0.025em",
  color: "var(--jd-brand-secondary)",
},
kpiFooter: {
  display: "flex",
  gap: 5,
  alignItems: "center",
  flexWrap: "wrap",
  paddingTop: 5,
  borderTop: "1px solid var(--jd-border-table)",
},
kpiBadge: {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 18,
  borderRadius: 999,
  padding: "0 7px",
  fontSize: 9,
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
  fontSize: 9,
  fontWeight: 650,
  lineHeight: 1.1,
},
};
