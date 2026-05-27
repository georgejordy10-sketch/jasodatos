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
        <div>
          <span style={styles.eyebrow}>Datos de respaldo</span>

          <h3 style={styles.title}>Detalle de registros</h3>

          <p style={styles.subtitle}>
            Mostrando {Math.min(pageSize, paginatedRows.length)} de{" "}
            {searchedRowsCount} filas procesadas.
          </p>
        </div>

        <div style={styles.detailTopRight}>
          <input
            style={styles.searchInput}
            placeholder="Buscar registro..."
            value={searchTerm}
            onChange={(event) => onSearchTermChange(event.target.value)}
          />

          <span style={styles.detailTopLabel}>Filas</span>

          <select
            style={styles.pageSizeSelect}
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
          >
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>

          <button
            type="button"
            style={{
              ...styles.pageGhostButton,
              ...(currentPage === 1 ? styles.disabledButton : null),
            }}
            onClick={onPrevPage}
            disabled={currentPage === 1}
          >
            Anterior
          </button>

          <span style={styles.pageIndicator}>
            Página {currentPage} de {totalPages}
          </span>

          <button
            type="button"
            style={{
              ...styles.pagePrimaryButton,
              ...(currentPage === totalPages ? styles.disabledButton : null),
            }}
            onClick={onNextPage}
            disabled={currentPage === totalPages}
          >
            Siguiente
          </button>
        </div>
      </div>

      <div style={styles.detailTableShell}>
        <div style={styles.detailTableScroller}>
          <table style={styles.dataTablePro}>
            <thead>
              <tr>
<th style={styles.dataTh}>Fecha</th>
<th style={styles.dataTh}>Local</th>
<th style={styles.dataTh}>Bodega</th>
<th style={styles.dataTh}>Código</th>
<th style={styles.dataTh}>Producto</th>
<th style={styles.dataTh}>Movimiento</th>
<th style={styles.dataTh}>Cantidad</th>
<th style={styles.dataTh}>Costo unitario</th>
<th style={styles.dataTh}>Precio unitario</th>
<th style={styles.dataTh}>Canal</th>
<th style={styles.dataTh}>Inventario</th>
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
                  <td style={styles.dataTdStrong}>{toText(row.producto)}</td>
                  <td style={styles.dataTd}>{toText(row.tipo_movimiento, "-")}</td>
                  <td style={styles.dataTd}>{formatInt(toNumber(row.cantidad))}</td>
                  <td style={styles.dataTd}>
                    {formatMoney(toNumber(row.costo_unitario))}
                  </td>
                  <td style={styles.dataTd}>
                    {formatMoney(toNumber(row.precio_unitario))}
                  </td>
                  <td style={styles.dataTd}>{toText(row.canal, "-")}</td>
                  <td style={styles.dataTd}>
                    {row.stock === undefined || row.stock === null || row.stock === ""
                      ? "No disponible"
                      : formatInt(toNumber(row.stock))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={styles.detailBottomBar}>
          Mostrando {start}-{end} de {searchedRowsCount} filas.
        </div>
      </div>
    </section>
  );
}
const styles: Record<string, CSSProperties> = {
  detailCardPro: {
    background:
      "linear-gradient(135deg, #4F66F2 0%, #3F55D8 45%, #2563EB 100%)",
    color: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    border: "1px solid rgba(56,189,248,0.95)",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.16), 0 18px 42px rgba(15,23,42,0.18)",
  },

  detailTopBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 14,
    marginBottom: 10,
    flexWrap: "wrap",
  },

  eyebrow: {
    display: "none",
  },

title: {
  margin: 0,
  fontSize: 13,
  fontWeight: 600,
  color: "#FFFFFF",
  letterSpacing: "-0.01em",
  lineHeight: 1.1,
},

subtitle: {
  margin: "2px 0 0",
  color: "rgba(255,255,255,0.86)",
  fontSize: 12,
  fontWeight: 400,
  lineHeight: 1.3,
},

  detailTopRight: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    flexWrap: "wrap",
  },

detailTopLabel: {
  color: "#FFFFFF",
  fontSize: 12,
  fontWeight: 500,
},

  searchInput: {
    minWidth: 220,
    minHeight: 34,
    borderRadius: 9,
    border: "1px solid rgba(255,255,255,0.22)",
    background: "rgba(255,255,255,0.14)",
    color: "#FFFFFF",
    padding: "0 12px",
    outline: "none",
    fontSize: 12,
    fontWeight: 400,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10)",
  },

  pageSizeSelect: {
    background: "#0F172A",
    color: "#FFFFFF",
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: 999,
    minHeight: 34,
    padding: "0 12px",
    fontSize: 12,
    fontWeight: 500,
    outline: "none",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10)",
  },

  pageGhostButton: {
    background: "rgba(255,255,255,0.18)",
    color: "#FFFFFF",
    border: "1px solid rgba(255,255,255,0.28)",
    borderRadius: 999,
    minHeight: 34,
    padding: "0 13px",
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10)",
  },

  pagePrimaryButton: {
    background:
      "linear-gradient(135deg, #3B82F6 0%, #2563EB 45%, #1E1B4B 100%)",
    color: "#FFFFFF",
    border: "1px solid rgba(255,255,255,0.28)",
    borderRadius: 999,
    minHeight: 34,
    padding: "0 13px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "0 10px 18px rgba(15,23,42,0.22)",
  },

  disabledButton: {
    opacity: 0.38,
    cursor: "not-allowed",
    boxShadow: "none",
  },

  pageIndicator: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: 500,
    whiteSpace: "nowrap",
  },

  detailTableShell: {
    background: "#0B1238",
    borderRadius: 12,
    overflow: "hidden",
    border: "1px solid rgba(255,255,255,0.12)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10)",
  },

  detailTableScroller: {
    overflowX: "auto",
    maxHeight: 620,
    overflowY: "auto",
    scrollbarColor: "rgba(255,255,255,0.55) rgba(15,23,42,0.42)",
    scrollbarWidth: "thin",
  },

  dataTablePro: {
    width: "100%",
    minWidth: 1200,
    borderCollapse: "collapse",
    color: "#FFFFFF",
    fontSize: 13,
    background: "transparent",
  },

  dataTh: {
    textAlign: "left",
    padding: "10px 10px",
    background: "#091033",
    color: "#FFFFFF",
    borderRight: "1px solid rgba(255,255,255,0.10)",
    borderBottom: "1px solid rgba(255,255,255,0.10)",
    fontWeight: 600,
    fontSize: 12,
    whiteSpace: "nowrap",
    position: "sticky",
    top: 0,
    zIndex: 2,
  },

  dataTd: {
    padding: "9px 10px",
    color: "#FFFFFF",
    borderRight: "1px solid rgba(255,255,255,0.08)",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    whiteSpace: "nowrap",
    fontWeight: 400,
    background: "transparent",
    letterSpacing: 0.06,
  },

  dataTdStrong: {
    padding: "9px 10px",
    color: "#FFFFFF",
    borderRight: "1px solid rgba(255,255,255,0.08)",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    whiteSpace: "nowrap",
    fontWeight: 600,
    background: "transparent",
    letterSpacing: 0.06,
  },

  detailBottomBar: {
    padding: "10px 12px",
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: 500,
    background: "rgba(8, 47, 73, 0.82)",
    borderTop: "1px solid rgba(255,255,255,0.10)",
  },

  dataRowEven: {
    background: "rgba(30, 58, 138, 0.74)",
  },

  dataRowOdd: {
    background: "rgba(28, 80, 125, 0.78)",
  },

  dataRowHover: {
    background: "rgba(56, 189, 248, 0.22)",
  },
};