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

        <button
          type="button"
          style={styles.clearButtonTop}
          onClick={onClearFilters}
        >
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

        <FilterDate
          label="Desde"
          value={fromDate}
          onChange={onChangeFromDate}
        />

        <FilterDate
          label="Hasta"
          value={toDate}
          onChange={onChangeToDate}
        />
      </div>
    </section>
  );
}
const styles: Record<string, CSSProperties> = {
  filterBar: {
    background: "var(--jd-gradient-container)",
    color: "var(--jd-text-main)",
    borderRadius: 16,
    padding: "10px 14px",
    border: "1px solid var(--jd-border-accent)",
    boxShadow: "var(--jd-shadow-card)",
    display: "grid",
    gap: 8,
  },

header: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 10,
},

  titleWrap: {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
  },

  accentDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    background: "var(--jd-gradient-accent)",
    boxShadow: "0 0 0 4px rgba(37, 99, 235, 0.10)",
  },

  title: {
    margin: 0,
    color: "var(--jd-text-main)",
    fontSize: 18,
    fontWeight: 900,
    lineHeight: 1.05,
    letterSpacing: "-0.02em",
  },

  controlsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 10,
  },

  filterBox: {
    display: "grid",
    gap: 5,
    minWidth: 0,
  },

filterLabel: {
  color: "rgba(255,255,255,0.86)",
  fontSize: 15,
  fontWeight: 500,
  lineHeight: 1.1,
  paddingLeft: 8,
  transform: "translateY(-2px)",
},
  filterControl: {
    width: "100%",
background: "rgba(255,255,255,0.92)",
color: "#111827",
    borderRadius: 10,
    minHeight: 40,
    padding: "0 12px",
    fontWeight: 750,
    fontSize: 14,
    border: "1px solid var(--jd-border-accent-soft)",
    outline: "none",
    boxShadow: "0 5px 12px rgba(15, 23, 42, 0.025)",
  },

clearButtonTop: {
  minHeight: 36,
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.86)",
  background: "rgba(56, 189, 248, 0.18)",
  color: "#FFFFFF",
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
  padding: "0 18px",
  whiteSpace: "nowrap",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.14), 0 0 10px rgba(56,189,248,0.08)",
},
};