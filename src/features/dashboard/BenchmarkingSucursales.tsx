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
          <h3 style={styles.title}>Desempeño entre sucursales</h3>
          <p style={styles.subtitle}>Comparativo comercial interno del período filtrado</p>
        </div>

        <div style={styles.headerBadges}>
          <span style={styles.badge}>Mejor: {mejorSucursal}</span>
          <span style={styles.badgeMuted}>Rezagada: {sucursalRezagada}</span>
        </div>
      </div>

      {benchmarkRows.length === 0 ? (
        <div style={styles.empty}>No hay datos suficientes para comparar sucursales.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
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
                  <td style={styles.td}>{index + 1}</td>
                  <td style={styles.tdStrong}>{row.sucursal}</td>
                  <td style={styles.td}>{formatMoney(row.ventas)}</td>
                  <td style={styles.td}>{formatInt(row.unidades)}</td>
                  <td style={styles.td}>
                    <div style={styles.shareCell}>
                      <span>{row.participacion.toFixed(1)}%</span>
                      <div style={styles.shareTrack}>
                        <div
                          style={{
                            ...styles.shareFill,
                            width: `${Math.max(6, row.participacion)}%`,
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
    background: "linear-gradient(135deg, #202969 0%, #2B2F86 100%)",
    color: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    border: "1px solid rgba(255,255,255,0.12)",
    boxShadow: "0 10px 20px rgba(17,24,39,0.10)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
    flexWrap: "wrap",
  },
  title: {
    margin: 0,
    fontSize: 18,
    fontWeight: 800,
    color: "#FFFFFF",
  },
  subtitle: {
    margin: "4px 0 0",
    color: "#C6CFFF",
    fontSize: 13,
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
    background: "rgba(34,197,94,0.18)",
    color: "#86EFAC",
    fontWeight: 800,
    fontSize: 12,
  },
  badgeMuted: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 30,
    borderRadius: 999,
    padding: "0 12px",
    background: "rgba(245,158,11,0.18)",
    color: "#FCD34D",
    fontWeight: 800,
    fontSize: 12,
  },
  empty: {
    color: "#C6CFFF",
    fontSize: 14,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    color: "#FFFFFF",
    fontSize: 14,
  },
  th: {
    textAlign: "left",
    padding: "12px 14px",
    color: "#BFC8FF",
    borderBottom: "1px solid rgba(255,255,255,0.10)",
    fontWeight: 700,
  },
  td: {
    padding: "12px 14px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    color: "#FFFFFF",
    verticalAlign: "middle",
  },
  tdStrong: {
    padding: "12px 14px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    color: "#FFFFFF",
    verticalAlign: "middle",
    fontWeight: 700,
  },
  shareCell: {
    display: "grid",
    gap: 6,
  },
  shareTrack: {
    width: "100%",
    height: 8,
    borderRadius: 999,
    background: "rgba(255,255,255,0.10)",
    overflow: "hidden",
  },
  shareFill: {
    height: "100%",
    borderRadius: 999,
    background: "linear-gradient(90deg, #5B6CFF 0%, #8B5CF6 100%)",
  },
};
