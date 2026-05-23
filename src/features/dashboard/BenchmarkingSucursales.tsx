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
    "linear-gradient(180deg, rgba(109,126,219,0.10) 0%, rgba(241,244,255,0.96) 42%, #FFFFFF 100%)",
  color: "#0F172A",
  borderRadius: 22,
  padding: 18,
  border: "1px solid rgba(109,126,219,0.16)",
  boxShadow: "0 10px 24px rgba(46,13,79,0.04)",
},
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 14,
    flexWrap: "wrap",
  },
eyebrow: {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 24,
  padding: "0 10px",
  borderRadius: 999,
  background: "rgba(109,126,219,0.10)",
  color: "#4F5FC1",
  border: "1px solid rgba(109,126,219,0.18)",
  fontSize: 11,
  fontWeight: 900,
  marginBottom: 8,
},
  title: {
    margin: 0,
    fontSize: 21,
    fontWeight: 950,
    color: "var(--jd-text-main, #0F172A)",
    letterSpacing: "-0.04em",
    lineHeight: 1.08,
  },
  subtitle: {
    margin: "4px 0 0",
    color: "var(--jd-text-secondary, #475569)",
    fontSize: 13,
    fontWeight: 650,
    lineHeight: 1.35,
  },
  headerBadges: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 30,
    borderRadius: 999,
    padding: "0 12px",
    background: "rgba(22, 163, 74, 0.10)",
    border: "1px solid rgba(22, 163, 74, 0.18)",
    color: "#15803D",
    fontWeight: 900,
    fontSize: 12,
  },
  badgeMuted: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 30,
    borderRadius: 999,
    padding: "0 12px",
    background: "rgba(245, 158, 11, 0.12)",
    border: "1px solid rgba(245, 158, 11, 0.22)",
    color: "#B45309",
    fontWeight: 900,
    fontSize: 12,
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
  borderRadius: 18,
  border: "1px solid rgba(109,126,219,0.12)",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.88) 0%, rgba(244,246,255,0.96) 100%)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.72)",
},
  table: {
    width: "100%",
    borderCollapse: "collapse",
    color: "var(--jd-text-main, #0F172A)",
    fontSize: 13,
  },
th: {
  textAlign: "left",
  padding: "11px 12px",
  background:
    "linear-gradient(135deg, #6d7edb 0%, #6271d1 42%, #5965c3 72%, #5657b2 100%)",
  color: "#F8FAFC",
  borderRight: "1px solid rgba(255,255,255,0.14)",
  borderBottom: "1px solid rgba(61,44,141,0.08)",
  fontWeight: 850,
  fontSize: 12,
  whiteSpace: "nowrap",
},
td: {
  padding: "12px 12px",
  borderRight: "1px solid rgba(61,44,141,0.05)",
  borderBottom: "1px solid rgba(61,44,141,0.06)",
  color: "#1E293B",
  verticalAlign: "middle",
  fontSize: 13,
  fontWeight: 700,
  whiteSpace: "nowrap",
},
tdStrong: {
  padding: "12px 12px",
  borderRight: "1px solid rgba(61,44,141,0.05)",
  borderBottom: "1px solid rgba(61,44,141,0.06)",
  color: "#0F172A",
  verticalAlign: "middle",
  fontSize: 13,
  fontWeight: 900,
  whiteSpace: "nowrap",
},
  rank: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
    borderRadius: 999,
    background: "rgba(100, 116, 139, 0.10)",
    color: "var(--jd-text-secondary, #475569)",
    fontSize: 12,
    fontWeight: 900,
  },
rankFirst: {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 28,
  height: 28,
  borderRadius: 999,
  background:
    "linear-gradient(135deg, #6d7edb 0%, #6271d1 42%, #5965c3 72%, #5657b2 100%)",
  color: "#FFFFFF",
  fontSize: 12,
  fontWeight: 900,
  boxShadow: "0 8px 18px rgba(89,101,195,0.18)",
},
  shareCell: {
    display: "grid",
    gap: 6,
    minWidth: 120,
  },
  shareTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sharePct: {
    color: "var(--jd-text-main, #0F172A)",
    fontSize: 12,
    fontWeight: 900,
  },
  shareTrack: {
    width: "100%",
    height: 8,
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