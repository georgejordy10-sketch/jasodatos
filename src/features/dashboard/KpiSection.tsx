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

  return (
    <div style={styles.kpiCard}>
      <div style={styles.kpiTopRow}>
        <div style={styles.kpiTitle}>{title}</div>

        {helpText && !isExportingPdf ? (
  <button
            type="button"
            style={styles.kpiHelpButton}
            onMouseEnter={() => setShowHelp(true)}
            onMouseLeave={() => setShowHelp(false)}
            onFocus={() => setShowHelp(true)}
            onBlur={() => setShowHelp(false)}
            onClick={() => setShowHelp((current) => !current)}
            aria-label={`Cómo leer este dato ${title}`}
          >
            Cómo leer este dato

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
            background:
              accent === "danger"
                ? "rgba(239,68,68,0.18)"
                : "rgba(34,197,94,0.18)",
            color: accent === "danger" ? "#FCA5A5" : "#86EFAC",
          }}
        >
          {badge}
        </span>

        <span style={styles.kpiSubtitle}>{subtitle}</span>
      </div>
    </div>
  );
}

export default function KpiSection({ items, isExportingPdf = false }: Props) {
  return (
    <section style={styles.kpiGrid}>
      {items.map((item) => (
        <KpiCard
          key={item.title}
          {...item}
          isExportingPdf={isExportingPdf}
        />
      ))}
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 12,
  },
  kpiCard: {
    position: "relative",
    background: "linear-gradient(135deg, #202969 0%, #2B2F86 100%)",
    color: "#FFFFFF",
    borderRadius: 18,
    padding: 20,
    border: "1px solid rgba(255,255,255,0.12)",
    boxShadow: "0 10px 20px rgba(17,24,39,0.10)",
    overflow: "visible",
  },
  kpiTopRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 10,
  },
  kpiTitle: {
    color: "#D3DAFF",
    fontSize: 15,
    fontWeight: 650,
    marginBottom: 0,
  },
kpiHelpButton: {
  position: "relative",
  border: "0",
  background: "transparent",
  color: "rgba(191,219,254,0.78)",
  borderRadius: 999,
  padding: "2px 0",
  fontSize: 10.5,
  fontWeight: 500,
  lineHeight: 1,
  cursor: "help",
  whiteSpace: "nowrap",
},
kpiTooltip: {
  position: "absolute",
  right: 0,
  top: "calc(100% + 8px)",
  zIndex: 40,
  width: 300,
  padding: "11px 13px",
  borderRadius: 14,
  background: "linear-gradient(135deg, #172554 0%, #312E81 100%)",
  border: "1px solid rgba(147,197,253,0.34)",
  boxShadow: "0 18px 42px rgba(15,23,42,0.38)",
  color: "#F8FAFC",
  fontSize: 13,
  fontWeight: 500,
  lineHeight: 1.45,
  textAlign: "left",
  whiteSpace: "normal",
},
  kpiValue: {
    fontSize: 30,
    fontWeight: 800,
    marginBottom: 12,
    lineHeight: 1.1,
  },
  kpiFooter: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    flexWrap: "wrap",
  },
  kpiBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 28,
    borderRadius: 999,
    padding: "0 10px",
    fontSize: 12,
    fontWeight: 800,
  },
  kpiSubtitle: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    fontWeight: 500,
    lineHeight: 1.25,
  },
};