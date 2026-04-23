"use client";

import type { CSSProperties } from "react";

type KpiItem = {
  title: string;
  value: string;
  badge: string;
  subtitle: string;
  accent?: "default" | "danger";
};

type Props = {
  items: KpiItem[];
};

function KpiCard({
  title,
  value,
  badge,
  subtitle,
  accent = "default",
}: KpiItem) {
  return (
    <div style={styles.kpiCard}>
      <div style={styles.kpiTitle}>{title}</div>
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

export default function KpiSection({ items }: Props) {
  return (
    <section style={styles.kpiGrid}>
      {items.map((item) => (
        <KpiCard key={item.title} {...item} />
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
    background: "linear-gradient(135deg, #202969 0%, #2B2F86 100%)",
    color: "#FFFFFF",
    borderRadius: 18,
    padding: 20,
    border: "1px solid rgba(255,255,255,0.12)",
    boxShadow: "0 10px 20px rgba(17,24,39,0.10)",
  },
  kpiTitle: {
    color: "#D3DAFF",
    fontSize: 15,
    fontWeight: 700,
    marginBottom: 10,
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
    color: "#C0C9FF",
    fontSize: 13,
    fontWeight: 600,
  },
};