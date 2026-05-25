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
    "var(--jd-gradient-container)",
  color: "var(--jd-text-main)",
  borderRadius: 22,
  padding: 18,
  border: "1px solid rgba(109,126,219,0.16)",
  boxShadow: "0 10px 24px rgba(46,13,79,0.04)",
},

  detailTopBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 14,
    marginBottom: 14,
    flexWrap: "wrap",
  },

  eyebrow: {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 24,
    padding: "0 10px",
    borderRadius: 999,
    background: "rgba(40,53,147,0.10)",
    color: "#283593",
    border: "1px solid rgba(61,44,141,0.18)",
    fontSize: 11,
    fontWeight: 900,
    marginBottom: 8,
  },

  title: {
    margin: 0,
    fontSize: 21,
    fontWeight: 950,
    color: "var(--jd-text-main)",
    letterSpacing: "-0.04em",
    lineHeight: 1.08,
  },

  subtitle: {
    margin: "4px 0 0",
    color: "var(--jd-text-secondary)",
    fontSize: 13,
    fontWeight: 650,
    lineHeight: 1.35,
  },

  detailTopRight: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    flexWrap: "wrap",
  },

  detailTopLabel: {
    color: "var(--jd-text-secondary)",
    fontSize: 12,
    fontWeight: 850,
  },

  searchInput: {
    minWidth: 220,
    minHeight: 38,
    borderRadius: 999,
    border: "1px solid rgba(61,44,141,0.12)",
    background: "rgba(255,255,255,0.92)",
    color: "var(--jd-text-main)",
    padding: "0 14px",
    outline: "none",
    fontWeight: 750,
    boxShadow: "0 6px 14px rgba(46,13,79,0.04)",
  },

  pageSizeSelect: {
    background: "rgba(255,255,255,0.92)",
    color: "var(--jd-text-main)",
    border: "1px solid rgba(61,44,141,0.12)",
    borderRadius: 999,
    minHeight: 38,
    padding: "0 12px",
    fontWeight: 850,
    outline: "none",
    boxShadow: "0 6px 14px rgba(46,13,79,0.04)",
  },

  pageGhostButton: {
    background: "rgba(255,255,255,0.08)",
    color: "#5B5AA6",
    border: "1px solid rgba(61,44,141,0.10)",
    borderRadius: 999,
    minHeight: 38,
    padding: "0 13px",
    fontWeight: 900,
    cursor: "pointer",
  },

  pagePrimaryButton: {
    background:
      "linear-gradient(135deg, #4F46E5 0%, #3D2C8D 65%, #2E0D4F 100%)",
    color: "#FFFFFF",
    border: "1px solid rgba(61,44,141,0.18)",
    borderRadius: 999,
    minHeight: 38,
    padding: "0 13px",
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: "0 10px 18px rgba(61,44,141,0.14)",
  },

  disabledButton: {
    opacity: 0.45,
    cursor: "not-allowed",
    boxShadow: "none",
  },

  pageIndicator: {
    color: "var(--jd-text-secondary)",
    fontSize: 12,
    fontWeight: 850,
  },

detailTableShell: {
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.88) 0%, rgba(244,246,255,0.96) 100%)",
  borderRadius: 18,
  overflow: "hidden",
  border: "1px solid rgba(109,126,219,0.12)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10)",
},

  detailTableScroller: {
    overflowX: "auto",
    maxHeight: 620,
    overflowY: "auto",
  },

  dataTablePro: {
    width: "100%",
    minWidth: 1200,
    borderCollapse: "collapse",
    color: "var(--jd-text-main)",
    fontSize: 13,
    background: "transparent",
  },

dataTh: {
  textAlign: "left",
  padding: "11px 10px",
  background:
    "linear-gradient(135deg, #6d7edb 0%, #6271d1 42%, #5965c3 72%, #5657b2 100%)",
  color: "#F8FAFC",
  borderRight: "1px solid rgba(255,255,255,0.14)",
  borderBottom: "1px solid rgba(61,44,141,0.08)",
  fontWeight: 850,
  fontSize: 12,
  whiteSpace: "nowrap",
  position: "sticky",
  top: 0,
  zIndex: 2,
},

  dataTd: {
    padding: "10px 10px",
    color: "var(--jd-text-secondary)",
    borderRight: "1px solid rgba(61,44,141,0.05)",
    borderBottom: "1px solid rgba(61,44,141,0.06)",
    whiteSpace: "nowrap",
    fontWeight: 650,
    background: "transparent",
    letterSpacing: 0.08,
  },

  dataTdStrong: {
    padding: "10px 10px",
    color: "var(--jd-text-main)",
    borderRight: "1px solid rgba(61,44,141,0.05)",
    borderBottom: "1px solid rgba(61,44,141,0.06)",
    whiteSpace: "nowrap",
    fontWeight: 850,
    background: "transparent",
    letterSpacing: 0.08,
  },

detailBottomBar: {
  padding: "10px 12px",
  color: "var(--jd-text-secondary)",
  fontSize: 12,
  fontWeight: 800,
  background:
    "var(--jd-gradient-table-surface)",
},

dataRowEven: {
  background: "rgba(255,255,255,0.78)",
},

dataRowOdd: {
  background: "rgba(241,244,255,0.82)",
},

dataRowHover: {
  background: "rgba(228,234,255,0.92)",
},
};