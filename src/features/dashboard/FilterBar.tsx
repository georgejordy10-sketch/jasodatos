"use client";

import type { CSSProperties } from "react";

type Props = {
  selectedSucursal: string;
  selectedProducto: string;
  sucursalOptions: string[];
  productoOptions: string[];
  fromDate: string;
  toDate: string;
  onChangeSucursal: (value: string) => void;
  onChangeProducto: (value: string) => void;
  onChangeFromDate: (value: string) => void;
  onChangeToDate: (value: string) => void;
  onClearFilters: () => void;
};

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div style={styles.filterBox}>
      <span style={styles.filterLabel}>{label}</span>

      <select
        style={styles.filterControl}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function FilterDate({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div style={styles.filterBox}>
      <span style={styles.filterLabel}>{label}</span>

      <input
        type="date"
        style={styles.filterControl}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export default function FilterBar({
  selectedSucursal,
  selectedProducto,
  sucursalOptions,
  productoOptions,
  fromDate,
  toDate,
  onChangeSucursal,
  onChangeProducto,
  onChangeFromDate,
  onChangeToDate,
  onClearFilters,
}: Props) {
  return (
    <section style={styles.filterBar} aria-label="Filtros del análisis">
      <div style={styles.header}>
        <div style={styles.titleWrap}>
          <span style={styles.accentDot} />
          <h2 style={styles.title}>Filtros</h2>
        </div>

        <button type="button" style={styles.clearButtonTop} onClick={onClearFilters}>
          Limpiar filtros
        </button>
      </div>

      <div style={styles.controlsGrid}>
        <FilterSelect
          label="Sucursal"
          value={selectedSucursal}
          options={sucursalOptions}
          onChange={onChangeSucursal}
        />

        <FilterSelect
          label="Producto"
          value={selectedProducto}
          options={productoOptions}
          onChange={onChangeProducto}
        />

        <FilterDate label="Desde" value={fromDate} onChange={onChangeFromDate} />
        <FilterDate label="Hasta" value={toDate} onChange={onChangeToDate} />
      </div>
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  filterBar: {
    display: "grid",
    gap: 12,
    background:
      "linear-gradient(135deg, #FFFFFF 0%, rgba(239, 246, 255, 0.92) 100%)",
    borderRadius: 20,
    padding: 16,
    border: "1px solid rgba(147, 197, 253, 0.42)",
    boxShadow: "0 12px 30px rgba(37, 99, 235, 0.08)",
    borderLeft: "5px solid var(--jd-action-primary, #2563EB)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  titleWrap: {
    display: "inline-flex",
    alignItems: "center",
    gap: 9,
  },
  accentDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    background:
      "linear-gradient(135deg, var(--jd-action-primary, #2563EB) 0%, var(--jd-action-premium, #7C3AED) 100%)",
    boxShadow: "0 0 0 5px rgba(37, 99, 235, 0.10)",
  },
  title: {
    margin: 0,
    color: "var(--jd-text-main, #0F172A)",
    fontSize: 18,
    fontWeight: 900,
    lineHeight: 1.1,
    letterSpacing: "-0.03em",
  },
  controlsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 10,
  },
  filterBox: {
    display: "grid",
    gap: 6,
    minWidth: 0,
  },
  filterLabel: {
    color: "var(--jd-text-secondary, #475569)",
    fontSize: 12,
    fontWeight: 850,
  },
  filterControl: {
    width: "100%",
    background: "#FFFFFF",
    color: "var(--jd-text-main, #0F172A)",
    borderRadius: 13,
    minHeight: 42,
    padding: "0 13px",
    fontWeight: 750,
    border: "1px solid var(--jd-border, #E2E8F0)",
    outline: "none",
    boxShadow: "0 7px 16px rgba(15, 23, 42, 0.04)",
  },
  clearButtonTop: {
    minHeight: 36,
    borderRadius: 999,
    border: "1px solid rgba(61, 44, 141, 0.18)",
    background: "#FFFFFF",
    color: "var(--jd-brand-secondary, #3D2C8D)",
    fontWeight: 900,
    fontSize: 12,
    cursor: "pointer",
    padding: "0 14px",
    whiteSpace: "nowrap",
    boxShadow: "0 8px 18px rgba(15, 23, 42, 0.05)",
  },
};