"use client";

import { useState, type CSSProperties } from "react";

type RowData = Record<string, unknown>;

type Props = {
  searchedRowsCount: number;
  paginatedRows: RowData[];
  pageSize: number;
  currentPage: number;
  totalPages: number;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  onPageSizeChange: (value: number) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  toDateKey: (value: unknown) => string;
  toText: (value: unknown, fallback?: string) => string;
  toNumber: (value: unknown) => number;
  formatInt: (value: number) => string;
  formatMoney: (value: number) => string;
};

export default function DetailTableSection({
  searchedRowsCount,
  paginatedRows,
  pageSize,
  currentPage,
  totalPages,
  searchTerm,
  onSearchTermChange,
  onPageSizeChange,
  onPrevPage,
  onNextPage,
  toDateKey,
  toText,
  toNumber,
  formatInt,
  formatMoney,
}: Props) {
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  const start = searchedRowsCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, searchedRowsCount);

  return (
    <section style={styles.detailCardPro}>
      <div style={styles.detailTopBar}>
        <div style={styles.detailTopLeft}>
          Detalle de registros — mostrando {Math.min(pageSize, paginatedRows.length)} de{" "}
          {searchedRowsCount} filas
        </div>

        <div style={styles.detailTopRight}>
          <input
            style={styles.searchInput}
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
          />

          <span style={styles.detailTopLabel}>Filas por página</span>

          <select
            style={styles.pageSizeSelect}
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
          >
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>

          <button
            style={styles.pageGhostButton}
            onClick={onPrevPage}
            disabled={currentPage === 1}
          >
            ◀ Anterior
          </button>

          <span style={styles.pageIndicator}>
            Página {currentPage} de {totalPages}
          </span>

          <button
            style={styles.pagePrimaryButton}
            onClick={onNextPage}
            disabled={currentPage === totalPages}
          >
            Siguiente ▶
          </button>
        </div>
      </div>

      <div style={styles.detailTableShell}>
        <div style={styles.detailTableScroller}>
          <table style={styles.dataTablePro}>
            <thead>
              <tr>
                <th style={styles.dataTh}>fecha</th>
                <th style={styles.dataTh}>sucursal</th>
                <th style={styles.dataTh}>bodega</th>
                <th style={styles.dataTh}>sku</th>
                <th style={styles.dataTh}>producto</th>
                <th style={styles.dataTh}>tipo_movimiento</th>
                <th style={styles.dataTh}>cantidad</th>
                <th style={styles.dataTh}>costo_unitario</th>
                <th style={styles.dataTh}>precio_unitario</th>
                <th style={styles.dataTh}>canal</th>
                <th style={styles.dataTh}>inventario</th>
              </tr>
            </thead>

            <tbody>
              {paginatedRows.map((row, index) => (
                <tr
                  key={`${toDateKey(row.fecha)}-${toText(row.producto)}-${index}`}
                  onMouseEnter={() => setHoveredRow(index)}
                  onMouseLeave={() => setHoveredRow(null)}
                  style={
                    hoveredRow === index
                      ? styles.dataRowHover
                      : index % 2 === 0
                      ? styles.dataRowEven
                      : styles.dataRowOdd
                  }
                >
                  <td style={styles.dataTd}>{toDateKey(row.fecha)}</td>
                  <td style={styles.dataTd}>{toText(row.sucursal)}</td>
                  <td style={styles.dataTd}>{toText(row.bodega, "-")}</td>
                  <td style={styles.dataTd}>{toText(row.sku, "-")}</td>
                  <td style={styles.dataTd}>{toText(row.producto)}</td>
                  <td style={styles.dataTd}>{toText(row.tipo_movimiento, "-")}</td>
                  <td style={styles.dataTd}>{formatInt(toNumber(row.cantidad))}</td>
                  <td style={styles.dataTd}>{formatMoney(toNumber(row.costo_unitario))}</td>
                  <td style={styles.dataTd}>{formatMoney(toNumber(row.precio_unitario))}</td>
                  <td style={styles.dataTd}>{toText(row.canal, "-")}</td>
                  <td style={styles.dataTd}>
                    {row.stock === undefined || row.stock === null || row.stock === ""
                      ? "No Disponible"
                      : formatInt(toNumber(row.stock))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={styles.detailBottomBar}>
          Mostrando {start}–{end} de {searchedRowsCount} filas.
        </div>
      </div>
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  detailCardPro: {
    background: "linear-gradient(180deg, #4F56E8 0%, #1BC3D9 100%)",
    borderRadius: 22,
    padding: 14,
    border: "1px solid rgba(255,255,255,0.10)",
    boxShadow: "0 14px 28px rgba(17,24,39,0.16)",
  },
  detailTopBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
    flexWrap: "wrap",
  },
  detailTopLeft: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: 700,
  },
  detailTopRight: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  detailTopLabel: {
    color: "#EAF0FF",
    fontSize: 12,
    fontWeight: 600,
  },
  pageSizeSelect: {
    background: "rgba(18, 27, 84, 0.92)",
    color: "#FFFFFF",
    border: "1px solid rgba(255,255,255,0.24)",
    borderRadius: 999,
    padding: "6px 12px",
    fontWeight: 700,
    outline: "none",
  },
  pageGhostButton: {
    background: "rgba(255,255,255,0.10)",
    color: "#D8DEFF",
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: 999,
    padding: "6px 12px",
    fontWeight: 700,
    cursor: "pointer",
    opacity: 1,
  },
  pagePrimaryButton: {
    background: "rgba(99,102,241,0.85)",
    color: "#FFFFFF",
    border: "1px solid rgba(255,255,255,0.24)",
    borderRadius: 999,
    padding: "6px 12px",
    fontWeight: 700,
    cursor: "pointer",
    opacity: 1,
  },
  pageIndicator: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: 700,
  },
  detailTableShell: {
    background: "linear-gradient(180deg, rgba(8,17,65,0.88) 0%, rgba(7,89,133,0.88) 100%)",
    borderRadius: 18,
    overflow: "hidden",
    border: "1px solid rgba(255,255,255,0.12)",
  },
  detailTableScroller: {
    overflowX: "auto",
    maxHeight: 720,
    overflowY: "auto",
  },
  dataTablePro: {
    width: "100%",
    minWidth: 1200,
    borderCollapse: "collapse",
    color: "#FFFFFF",
    fontSize: 13,
  },
  dataTh: {
    textAlign: "left",
    padding: "12px 10px",
    background: "rgba(7,16,54,0.96)",
    color: "#EAF0FF",
    borderRight: "1px solid rgba(255,255,255,0.16)",
    borderBottom: "1px solid rgba(255,255,255,0.18)",
    fontWeight: 800,
    fontSize: 12,
    textTransform: "none",
    whiteSpace: "nowrap",
    position: "sticky",
    top: 0,
    zIndex: 2,
  },
  dataTd: {
    padding: "10px 10px",
    color: "#F8FAFF",
    borderRight: "1px solid rgba(255,255,255,0.10)",
    borderBottom: "1px solid rgba(255,255,255,0.10)",
    whiteSpace: "nowrap",
    fontWeight: 600,
    background: "transparent",
    letterSpacing: 0.2,
  },
  detailBottomBar: {
    padding: "10px 12px",
    color: "#EAF0FF",
    fontSize: 12,
    fontWeight: 700,
    background: "rgba(0,0,0,0.12)",
  },
  searchInput: {
    minWidth: 220,
    minHeight: 42,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.20)",
    background: "rgba(255,255,255,0.10)",
    color: "#FFFFFF",
    padding: "0 12px",
    outline: "none",
    fontWeight: 700,
  },
  dataRowEven: {
    background: "rgba(255,255,255,0.04)",
  },
  dataRowOdd: {
    background: "rgba(255,255,255,0.08)",
  },
  dataRowHover: {
    background: "rgba(255,255,255,0.14)",
  },
};