"use client";

import type { CSSProperties, ReactNode } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type SalesPoint = {
  fecha: string;
  ventas: number;
  comparativo: number;
};

type PiePoint = {
  producto: string;
  ventas: number;
};

type Props = {
  tendenciaVentas: SalesPoint[];
  topProductos: PiePoint[];
  ventasTotales: number;
  axisWidth: number;
  tooltipStyle: CSSProperties;
  colors: string[];
  formatCompactMoney: (value: number) => string;
  formatMoney: (value: number) => string;
  onOpenProductDetails?: () => void;
  onCompareProducts?: () => void;
  isExportingPdf?: boolean;
};

function Card({
  title,
  subtitle,
  action,
  children,
  fullHeight = false,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  fullHeight?: boolean;
}) {
  return (
    <article
      style={{
        ...styles.card,
        height: fullHeight ? "100%" : undefined,
      }}
    >
      <div style={styles.cardHeader}>
        <div>
          <span style={styles.eyebrow}>Análisis comercial</span>
          <h3 style={styles.sectionTitle}>{title}</h3>
          {subtitle ? <p style={styles.sectionSubtitle}>{subtitle}</p> : null}
        </div>

        {action ? <div>{action}</div> : null}
      </div>

      {children}
    </article>
  );
}

export default function SalesChartsSection({
  tendenciaVentas,
  topProductos,
  ventasTotales,
  axisWidth,
  tooltipStyle,
  colors,
  formatCompactMoney,
  formatMoney,
  onOpenProductDetails,
  onCompareProducts,
  isExportingPdf = false,
}: Props) {
  return (
    <section style={styles.mainCharts}>
      <div id="tendencia-ventas" style={{ height: "100%" }}>
        <Card
          title="Movimiento de ventas"
          subtitle="Evolución del período frente a la referencia anterior."
          fullHeight
        >
          <div style={styles.chartTopBar}>
            <div style={styles.customLegend}>
              <div style={styles.customLegendItem}>
                <span style={styles.legendLineSolid} />
                <span>Actual</span>
              </div>

              <div style={styles.customLegendItem}>
                <span style={styles.legendLineDashed} />
                <span>Referencia</span>
              </div>
            </div>

            <div style={styles.totalPill}>
              <span>Total ventas</span>
              <strong>{formatMoney(ventasTotales)}</strong>
            </div>
          </div>

<div style={styles.chartBox}>
  <ResponsiveContainer>
    <AreaChart
      data={tendenciaVentas}
      margin={{ top: 18, right: 18, left: 8, bottom: 4 }}
    >
      <defs>
        <linearGradient id="ventasFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#60A5FA" stopOpacity={0.34} />
          <stop offset="55%" stopColor="#60A5FA" stopOpacity={0.16} />
          <stop offset="100%" stopColor="#60A5FA" stopOpacity={0.03} />
        </linearGradient>
      </defs>
<XAxis
  dataKey="fecha"
  stroke="rgba(255,255,255,0.58)"
  tickLine={false}
  axisLine={false}
  tickMargin={12}
  fontSize={14}
/>
<YAxis
  stroke="rgba(255,255,255,0.58)"
  tickLine={false}
  axisLine={false}
  width={axisWidth}
  tickMargin={10}
  fontSize={14}
  tickFormatter={(value) => formatCompactMoney(value)}
/>

<Tooltip
  contentStyle={{
    ...tooltipStyle,
    background: "rgba(22, 30, 84, 0.96)",
    border: "1px solid rgba(255,255,255,0.30)",
    color: "#FFFFFF",
    borderRadius: 14,
    boxShadow: "0 18px 42px rgba(0, 0, 0, 0.38)",
  }}
  labelStyle={{
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: 500,
    marginBottom: 8,
  }}
  itemStyle={{
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: 400,
  }}
  formatter={(value) => formatMoney(Number(value ?? 0))}
/>
                  <Area
  type="monotone"
  dataKey="ventas"
  name="Actual"
  stroke="#93C5FD"
  fill="url(#ventasFill)"
  fillOpacity={1}
  strokeWidth={3}
  dot={{
    r: 4,
    fill: "#93C5FD",
    stroke: "rgba(255,255,255,0.42)",
    strokeWidth: 2,
  }}
  activeDot={{
    r: 6,
    fill: "#BFDBFE",
    stroke: "#FFFFFF",
    strokeWidth: 2,
  }}
/>
<Line
  type="monotone"
  dataKey="comparativo"
  name="Referencia"
  stroke="#D8B4FE"
  strokeDasharray="4 5"
  strokeWidth={2}
  dot={false}
  activeDot={{
    r: 4,
    fill: "#D8B4FE",
    stroke: "#FFFFFF",
    strokeWidth: 2,
  }}
/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

    <div
  id="participacion-producto"
  style={{ height: "100%", scrollMarginTop: 120 }}
>
        <Card
          title="Participación por producto"
          subtitle="Productos que concentran mayor venta."
          action={
            !isExportingPdf ? (
              <div style={styles.productActions}>
                <button
                  type="button"
                  style={styles.compareButton}
                  onClick={onCompareProducts}
                >
                  Comparar productos
                </button>

                <button
                  type="button"
                  style={styles.viewAllButton}
                  onClick={onOpenProductDetails}
                >
                  Ver detalle
                </button>
              </div>
            ) : null
          }
          fullHeight
        >
          <div style={styles.pieLayout}>
            <div style={styles.pieBox}>
              <div style={{ width: "100%", height: 300 }}>
                <ResponsiveContainer>
                  <PieChart>
        <Pie
  data={topProductos}
  dataKey="ventas"
  nameKey="producto"
  innerRadius={88}
  outerRadius={140}
                    >
                      {topProductos.map((_, index) => (
                        <Cell key={index} fill={colors[index % colors.length]} />
                      ))}
                    </Pie>

                    <Tooltip
                      contentStyle={{
                        ...tooltipStyle,
                        background: "rgba(255,255,255,0.94)",
                        border: "1px solid #E2E8F0",
                        color: "#111827",
                        boxShadow: "0 18px 42px rgba(15, 23, 42, 0.14)",
                      }}
                      formatter={(value) => formatMoney(Number(value ?? 0))}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div style={styles.pieCenterOverlay}>
                <span style={styles.pieCenterLabel}>Ventas</span>
                <strong style={styles.pieCenterValue}>{formatMoney(ventasTotales)}</strong>
                <span style={styles.pieCenterSub}>Total</span>
              </div>
            </div>

            <div style={styles.legendColumn}>
              {topProductos.map((item, index) => {
                const pct =
                  ventasTotales > 0
                    ? ((item.ventas / ventasTotales) * 100).toFixed(1)
                    : "0.0";

                return (
                  <div key={item.producto} style={styles.legendItem}>
                    <span
                      style={{
                        ...styles.legendDot,
                        background: colors[index % colors.length],
                      }}
                    />
                    <span style={styles.legendLabel}>{item.producto}</span>
                    <span style={styles.legendPct}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}
const styles: Record<string, CSSProperties> = {
  mainCharts: {
    display: "grid",
    gridTemplateColumns: "1.15fr 1fr",
    gap: 10,
    alignItems: "stretch",
  },

  card: {
    background: "var(--jd-gradient-container)",
    color: "var(--jd-text-main)",
    borderRadius: 18,
    padding: "12px 14px",
    border: "1px solid var(--jd-border-accent)",
    boxShadow: "var(--jd-shadow-card)",
  },

  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 7,
    gap: 8,
    flexWrap: "wrap",
  },

eyebrow: {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 32,
  width: "fit-content",
  padding: "0 14px",
  borderRadius: 999,
  background: "rgba(56, 189, 248, 0.18)",
  border: "1px solid rgba(255,255,255,0.86)",
  color: "#7DD3FC",
  fontSize: 14,
  fontWeight: 700,
  lineHeight: 1,
  whiteSpace: "nowrap",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.14), 0 0 10px rgba(56,189,248,0.08)",
},

sectionTitle: {
  margin: "10px 0 3px",
  color: "var(--jd-text-main)",
  fontSize: 24,
  fontWeight: 800,
  lineHeight: 1.12,
  letterSpacing: "-0.025em",
},

sectionSubtitle: {
  margin: 0,
  color: "var(--jd-text-secondary)",
  fontSize: 15,
  fontWeight: 500,
  lineHeight: 1.48,
},

  chartTopBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
    gap: 8,
    flexWrap: "wrap",
  },

  customLegend: {
    display: "flex",
    gap: 10,
    alignItems: "center",
  },

  customLegendItem: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    color: "var(--jd-text-secondary, #475569)",
    fontSize: 14,
    fontWeight: 800,
  },

  legendLineSolid: {
    width: 18,
    height: 3,
    borderRadius: 999,
    background: "var(--jd-accent-main)",
  },

  legendLineDashed: {
    width: 18,
    height: 0,
  },

totalPill: {
  display: "grid",
  gap: 2,
  minWidth: 132,
  justifyItems: "center",
  padding: "8px 12px",
  borderRadius: 14,
  background: "rgba(56, 189, 248, 0.18)",
  color: "#FFFFFF",
  fontSize: 13,
  fontWeight: 650,
  border: "1px solid rgba(255,255,255,0.86)",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.14), 0 0 10px rgba(56,189,248,0.08)",
},

chartBox: {
  position: "relative",
  height: 300,
  borderRadius: 16,
  border: "1px solid rgba(255,255,255,0.10)",
  background:
    "linear-gradient(180deg, rgba(37, 50, 126, 0.42) 0%, rgba(27, 36, 104, 0.30) 100%)",
  padding: "16px 18px 14px",
  overflow: "hidden",
},

pieLayout: {
  display: "grid",
  gridTemplateColumns: "minmax(340px, 0.95fr) minmax(260px, 1fr)",
  alignItems: "center",
  gap: 22,
  minHeight: 330,
},
pieBox: {
  position: "relative",
  minHeight: 330,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "visible",
},

  pieCenterOverlay: {
    position: "absolute",
    inset: 0,
    display: "grid",
    placeContent: "center",
    textAlign: "center",
    pointerEvents: "none",
  },

  pieCenterLabel: {
    color: "var(--jd-text-secondary, #475569)",
    fontSize: 13,
    fontWeight: 850,
  },

  pieCenterValue: {
    color: "var(--jd-text-main)",
    fontSize: 21,
    fontWeight: 950,
    lineHeight: 1.05,
  },

  pieCenterSub: {
    color: "var(--jd-text-muted, #64748B)",
    fontSize: 12,
    fontWeight: 850,
  },

  legendColumn: {
    display: "grid",
    gap: 7,
    alignContent: "center",
    alignSelf: "stretch",
    paddingLeft: 0,
  },

legendItem: {
  display: "grid",
  gridTemplateColumns: "10px minmax(210px, auto) 54px",
  alignItems: "center",
  justifyContent: "start",
  gap: 10,
  color: "#FFFFFF",
  fontSize: 16,
},
legendDot: {
  width: 9,
  height: 9,
  borderRadius: 999,
},

legendLabel: {
  color: "#FFFFFF",
  fontSize: 16,
  fontWeight: 550,
  lineHeight: 1.42,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
},

legendPct: {
  color: "#FFFFFF",
  fontSize: 16,
  fontWeight: 700,
  lineHeight: 1.42,
  textAlign: "left",
  justifySelf: "start",
},
  productActions: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },

compareButton: {
  minHeight: 40,
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.86)",
  background: "rgba(56, 189, 248, 0.18)",
  color: "#FFFFFF",
  padding: "0 15px",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  whiteSpace: "nowrap",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.14), 0 0 10px rgba(56,189,248,0.08)",
},

viewAllButton: {
  minHeight: 40,
  padding: "0 15px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.86)",
  background: "rgba(56, 189, 248, 0.18)",
  color: "#FFFFFF",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  whiteSpace: "nowrap",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.14), 0 0 10px rgba(56,189,248,0.08)",
},
};