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
      <select style={styles.filterSelect} value={value} onChange={(e) => onChange(e.target.value)}>
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
        style={styles.filterDateInput}
        value={value}
        onChange={(e) => onChange(e.target.value)}
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
    <section style={styles.filterBar}>
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

      <button style={styles.filterButton} onClick={onClearFilters}>
        Limpiar filtros
      </button>
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  filterBar: {
    display: "grid",
    gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
    gap: 12,
    background: "linear-gradient(135deg, #232D82 0%, #2C318E 100%)",
    borderRadius: 18,
    padding: 16,
    border: "1px solid rgba(255,255,255,0.12)",
  },
  filterBox: {
    display: "grid",
    gap: 8,
  },
  filterLabel: {
    color: "#D9E0FF",
    fontSize: 13,
    fontWeight: 600,
  },
  filterSelect: {
    background: "rgba(255,255,255,0.96)",
    color: "#111827",
    borderRadius: 12,
    minHeight: 44,
    padding: "0 14px",
    fontWeight: 600,
    border: "none",
    outline: "none",
  },
  filterDateInput: {
    background: "rgba(255,255,255,0.96)",
    color: "#111827",
    borderRadius: 12,
    minHeight: 44,
    padding: "0 14px",
    fontWeight: 600,
    border: "none",
    outline: "none",
  },
  filterButton: {
    alignSelf: "end",
    minHeight: 44,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "#365BFF",
    color: "#FFFFFF",
    fontWeight: 700,
    cursor: "pointer",
  },
};