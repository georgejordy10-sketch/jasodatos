"use client";

import { useMemo } from "react";

type Props = {
  rows: Record<string, unknown>[];
};

type BranchRow = {
  sucursal: string;
  ventas: number;
  unidades: number;
  productoTop: string;
  participacion: number;
};

function toNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  if (typeof value === "string") {
    const raw = value.trim();
    if (!raw) return 0;

    const hasComma = raw.includes(",");
    const hasDot = raw.includes(".");

    if (hasComma && hasDot) {
      const normalized = raw.replace(/\./g, "").replace(",", ".");
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : 0;
    }

    if (hasComma && !hasDot) {
      const normalized = raw.replace(",", ".");
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : 0;
    }

    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function toText(value: unknown, fallback = "-"): string {
  if (typeof value === "string") return value.trim() || fallback;
  if (typeof value === "number") return String(value);
  return fallback;
}

function formatMoney(value: number): string {
  return value.toLocaleString("es-EC", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

function formatInt(value: number): string {
  return value.toLocaleString("es-EC", { maximumFractionDigits: 0 });
}

export default function BenchmarkingSucursales({ rows }: Props) {
  const benchmarkRows = useMemo<BranchRow[]>(() => {
    const branchSales = new Map<string, number>();
    const branchUnits = new Map<string, number>();
    const branchProducts = new Map<string, Map<string, number>>();

    for (const row of rows) {
      const sucursal = toText(row.sucursal, "Sin sucursal");
      const producto = toText(row.producto, "Sin producto");
      const cantidad = toNumber(row.cantidad);
      const venta = cantidad * toNumber(row.precio_unitario);

      branchSales.set(sucursal, (branchSales.get(sucursal) ?? 0) + venta);
      branchUnits.set(sucursal, (branchUnits.get(sucursal) ?? 0) + cantidad);

      const productMap = branchProducts.get(sucursal) ?? new Map<string, number>();
      productMap.set(producto, (productMap.get(producto) ?? 0) + venta);
      branchProducts.set(sucursal, productMap);
    }

    const totalSales = [...branchSales.values()].reduce((acc, value) => acc + value, 0);

    return [...branchSales.entries()]
      .map(([sucursal, ventas]) => {
        const units = branchUnits.get(sucursal) ?? 0;
        const productMap = branchProducts.get(sucursal) ?? new Map<string, number>();
        const productoTop = [...productMap.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "-";
        const participacion = totalSales > 0 ? (ventas / totalSales) * 100 : 0;

        return {
          sucursal,
          ventas,
          unidades: units,
          productoTop,
          participacion,
        };
      })
      .sort((a, b) => b.ventas - a.ventas);
  }, [rows]);

  const mejorSucursal = benchmarkRows[0]?.sucursal ?? "-";
  const sucursalRezagada = benchmarkRows[benchmarkRows.length - 1]?.sucursal ?? "-";

  return (
    <section style={styles.wrapper}>
      <div style={styles.header}>
        <div>
          <span style={styles.eyebrow}>Comparativo interno</span>

          <h3 style={styles.title}>Desempeño entre sucursales</h3>

          <p style={styles.subtitle}>
            Ranking comercial del período filtrado.
          </p>
        </div>

        <div style={styles.headerBadges}>
          <span style={styles.badge}>Mejor: {mejorSucursal}</span>
          <span style={styles.badgeMuted}>Rezagada: {sucursalRezagada}</span>
        </div>
      </div>

      {benchmarkRows.length === 0 ? (
        <div style={styles.empty}>No hay datos suficientes para comparar sucursales.</div>
      ) : (
        <div style={styles.tableShell}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>#</th>
                <th style={styles.th}>Sucursal</th>
                <th style={styles.th}>Ventas</th>
                <th style={styles.th}>Unidades</th>
                <th style={styles.th}>Participación</th>
                <th style={styles.th}>Producto top</th>
              </tr>
            </thead>

            <tbody>
              {benchmarkRows.map((row, index) => (
                <tr key={row.sucursal}>
                  <td style={styles.td}>
                    <span style={index === 0 ? styles.rankFirst : styles.rank}>{index + 1}</span>
                  </td>

                  <td style={styles.tdStrong}>{row.sucursal}</td>
                  <td style={styles.td}>{formatMoney(row.ventas)}</td>
                  <td style={styles.td}>{formatInt(row.unidades)}</td>

                  <td style={styles.td}>
                    <div style={styles.shareCell}>
                      <div style={styles.shareTop}>
                        <span style={styles.sharePct}>{row.participacion.toFixed(1)}%</span>
                      </div>

                      <div style={styles.shareTrack}>
                        <div
                          style={{
                            ...styles.shareFill,
                            width: `${Math.min(100, Math.max(6, row.participacion))}%`,
                          }}
                        />
                      </div>
                    </div>
                  </td>

                  <td style={styles.td}>{row.productoTop}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
wrapper: {
  background:
    "var(--jd-gradient-container)",
  color: "var(--jd-text-main)",
  borderRadius: 18,
  padding: "12px 14px",
  border: "1px solid rgba(109,126,219,0.16)",
  boxShadow: "0 10px 24px rgba(46,13,79,0.04)",
},
header: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 8,
  marginBottom: 8,
  flexWrap: "wrap",
},
eyebrow: {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 28,
  width: "fit-content",
  padding: "0 14px",
  borderRadius: 999,
  background: "rgba(56, 189, 248, 0.18)",
  border: "1px solid rgba(255,255,255,0.86)",
  color: "#7DD3FC",
  fontSize: 12,
  fontWeight: 600,
  lineHeight: 1,
  whiteSpace: "nowrap",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.14), 0 0 10px rgba(56,189,248,0.08)",
},
title: {
  margin: "8px 0 4px",
  color: "var(--jd-text-main)",
  fontSize: 20,
  fontWeight: 800,
  lineHeight: 1.15,
  letterSpacing: "-0.02em",
},
subtitle: {
  margin: 0,
  color: "var(--jd-text-secondary)",
  fontSize: 13,
  fontWeight: 600,
  lineHeight: 1.35,
},
headerBadges: {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 10,
  flexWrap: "wrap",
},
badge: {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 28,
  borderRadius: 999,
  padding: "0 14px",
  background: "rgba(34, 197, 94, 0.18)",
  border: "1px solid rgba(255,255,255,0.86)",
  color: "#86EFAC",
  fontWeight: 600,
  fontSize: 12,
  lineHeight: 1,
  whiteSpace: "nowrap",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.14), 0 0 10px rgba(34,197,94,0.08)",
},
badgeMuted: {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 28,
  borderRadius: 999,
  padding: "0 14px",
  background: "rgba(249, 115, 22, 0.16)",
  border: "1px solid rgba(255,255,255,0.86)",
  color: "#FDBA74",
  fontWeight: 600,
  fontSize: 12,
  lineHeight: 1,
  whiteSpace: "nowrap",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.14), 0 0 10px rgba(249,115,22,0.08)",
},
  empty: {
    color: "var(--jd-text-secondary, #475569)",
    fontSize: 14,
    fontWeight: 650,
    padding: 14,
    borderRadius: 16,
    background: "rgba(255,255,255,0.62)",
    border: "1px dashed rgba(148, 163, 184, 0.50)",
  },
tableShell: {
  overflowX: "auto",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(8, 13, 49, 0.42)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
},
table: {
  width: "100%",
  borderCollapse: "collapse",
  color: "var(--jd-text-main)",
  fontSize: 12,
},
th: {
  textAlign: "left",
  padding: "8px 10px",
  background:
    "linear-gradient(135deg, #6d7edb 0%, #6271d1 42%, #5965c3 72%, #5657b2 100%)",
  color: "#F8FAFC",
  borderRight: "1px solid rgba(255,255,255,0.14)",
  borderBottom: "1px solid rgba(61,44,141,0.08)",
  fontWeight: 850,
  fontSize: 10,
  whiteSpace: "nowrap",
},
td: {
  padding: "8px 10px",
  borderRight: "1px solid rgba(255,255,255,0.07)",
  borderBottom: "1px solid rgba(255,255,255,0.07)",
  color: "var(--jd-text-main)",
  verticalAlign: "middle",
  fontSize: 11,
  fontWeight: 650,
  whiteSpace: "nowrap",
},
tdStrong: {
  padding: "8px 10px",
  borderRight: "1px solid rgba(255,255,255,0.07)",
  borderBottom: "1px solid rgba(255,255,255,0.07)",
  color: "#FFFFFF",
  verticalAlign: "middle",
  fontSize: 11,
  fontWeight: 850,
  whiteSpace: "nowrap",
},
rank: {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 22,
  height: 22,
  borderRadius: 999,
  background: "rgba(255,255,255,0.10)",
  color: "var(--jd-text-secondary)",
  fontSize: 10,
  fontWeight: 850,
},
rankFirst: {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 22,
  height: 22,
  borderRadius: 999,
  background:
    "linear-gradient(135deg, #6d7edb 0%, #6271d1 42%, #5965c3 72%, #5657b2 100%)",
  color: "#FFFFFF",
  fontSize: 10,
  fontWeight: 850,
  boxShadow: "0 8px 18px rgba(89,101,195,0.18)",
},
shareCell: {
  display: "grid",
  gap: 4,
  minWidth: 100,
},
  shareTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
sharePct: {
  color: "var(--jd-text-main)",
  fontSize: 11,
  fontWeight: 850,
},
shareTrack: {
  width: "100%",
  height: 6,
  borderRadius: 999,
  background: "rgba(148, 163, 184, 0.18)",
  overflow: "hidden",
},  
shareFill: {
  height: "100%",
  borderRadius: 999,
  background:
    "linear-gradient(90deg, #6d7edb 0%, #6271d1 42%, #5965c3 72%, #5657b2 100%)",
},
};