"use client";

import type { CSSProperties, ReactNode } from "react";
import {
  Area,
  AreaChart,
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
                margin={{ top: 8, right: 12, left: 18, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="ventasFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6D7EDB" stopOpacity={0.24} />
<stop offset="100%" stopColor="#6D7EDB" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="fecha"
                  stroke="#64748B"
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                />

                <YAxis
                  stroke="#64748B"
                  tickLine={false}
                  axisLine={false}
                  width={axisWidth}
                  tickMargin={10}
                  fontSize={12}
                  tickFormatter={(value) => formatCompactMoney(value)}
                />

                <Tooltip
                  contentStyle={{
                    ...tooltipStyle,
                    background: "#FFFFFF",
                    border: "1px solid #E2E8F0",
                    color: "#0F172A",
                    boxShadow: "0 18px 42px rgba(15, 23, 42, 0.14)",
                  }}
                  formatter={(value) => formatMoney(Number(value ?? 0))}
                />

                <Area
                  type="monotone"
                  dataKey="ventas"
                  stroke="#6D7EDB"
                  fill="url(#ventasFill)"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#FFFFFF", stroke: "#6D7EDB", strokeWidth: 2 }}
                />

                <Line
                  type="monotone"
                  dataKey="comparativo"
                  stroke="#3D2C8D"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  dot={false}
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
              <div style={{ width: "100%", height: 330 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={topProductos}
                      dataKey="ventas"
                      nameKey="producto"
                      innerRadius={78}
                      outerRadius={128}
                      paddingAngle={1.5}
                      stroke="#FFFFFF"
                      strokeWidth={2}
                    >
                      {topProductos.map((_, index) => (
                        <Cell key={index} fill={colors[index % colors.length]} />
                      ))}
                    </Pie>

                    <Tooltip
                      contentStyle={{
                        ...tooltipStyle,
                        background: "#FFFFFF",
                        border: "1px solid #E2E8F0",
                        color: "#0F172A",
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
    gap: 14,
    alignItems: "stretch",
  },
card: {
  background: "var(--jd-gradient-container)",
  color: "var(--jd-text-main)",
  borderRadius: 22,
  padding: 18,
  border: "1px solid var(--jd-border-accent)",
  boxShadow: "var(--jd-shadow-card)",
},
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 12,
    flexWrap: "wrap",
  },
eyebrow: {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 24,
  padding: "0 10px",
  borderRadius: 999,
  background: "var(--jd-info-soft)",
  color: "var(--jd-info)",
  border: "1px solid var(--jd-border-accent-soft)",
  fontSize: 11,
  fontWeight: 900,
  marginBottom: 8,
},
sectionTitle: {
  margin: 0,
  fontSize: 21,
  fontWeight: 950,
  color: "var(--jd-text-main)",
  letterSpacing: "-0.04em",
  lineHeight: 1.08,
},
sectionSubtitle: {
  margin: "4px 0 0",
  color: "var(--jd-text-secondary)",
  fontSize: 13,
  lineHeight: 1.35,
  fontWeight: 650,
},
  chartTopBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
    gap: 12,
    flexWrap: "wrap",
  },
  customLegend: {
    display: "flex",
    gap: 14,
    alignItems: "center",
  },
  customLegendItem: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    color: "var(--jd-text-secondary, #475569)",
    fontSize: 12,
    fontWeight: 800,
  },
legendLineSolid: {
  width: 22,
  height: 3,
  borderRadius: 999,
  background: "var(--jd-accent-main)",
},
  legendLineDashed: {
    width: 22,
    height: 0,
  },
totalPill: {
  display: "grid",
  gap: 2,
  minWidth: 112,
  justifyItems: "center",
  padding: "8px 11px",
  borderRadius: 14,
  background: "rgba(255,255,255,0.86)",
  color: "var(--jd-text-main)",
  fontSize: 11,
  fontWeight: 750,
  border: "1px solid var(--jd-border-accent-soft)",
  boxShadow: "0 8px 18px rgba(46, 13, 79, 0.04)",
},
chartBox: {
  width: "100%",
  height: 300,
  borderRadius: 18,
  background: "var(--jd-gradient-table-surface)",
  border: "1px solid var(--jd-border-accent-soft)",
  padding: "10px 8px 4px",
},
  pieLayout: {
    display: "grid",
    gridTemplateColumns: "310px minmax(0, 1fr)",
    gap: 14,
    alignItems: "center",
    minHeight: 100,
  },
  pieBox: {
    position: "relative",
    width: 300,
    height: 330,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
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
    fontWeight: 800,
  },
  pieCenterValue: {
    color: "var(--jd-text-main, #0F172A)",
    fontSize: 20,
    fontWeight: 950,
    lineHeight: 1.1,
  },
  pieCenterSub: {
    color: "var(--jd-text-muted, #64748B)",
    fontSize: 12,
    fontWeight: 800,
  },
  legendColumn: {
    display: "grid",
    gap: 10,
    alignContent: "center",
    alignSelf: "stretch",
    paddingLeft: 0,
  },
  legendItem: {
    display: "grid",
    gridTemplateColumns: "10px minmax(0, 1fr) 52px",
    alignItems: "center",
    gap: 10,
    color: "var(--jd-text-main, #0F172A)",
    fontSize: 14,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 999,
  },
  legendLabel: {
    color: "var(--jd-text-secondary, #475569)",
    fontSize: 14,
    fontWeight: 650,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  legendPct: {
    color: "var(--jd-text-main, #0F172A)",
    fontSize: 13,
    fontWeight: 900,
    textAlign: "right",
    justifySelf: "end",
  },
  productActions: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
compareButton: {
  minHeight: 34,
  borderRadius: 999,
  border: "1px solid var(--jd-border-accent-soft)",
  background: "#FFFFFF",
  color: "var(--jd-brand-secondary)",
  padding: "0 13px",
  fontSize: 12,
  fontWeight: 900,
  cursor: "pointer",
  whiteSpace: "nowrap",
  boxShadow: "0 8px 18px rgba(46, 13, 79, 0.04)",
},
viewAllButton: {
  minHeight: 34,
  padding: "0 13px",
  borderRadius: 999,
  border: "1px solid var(--jd-border-accent-soft)",
  background: "#FFFFFF",
  color: "var(--jd-brand-secondary)",
  fontSize: 12,
  fontWeight: 900,
  cursor: "pointer",
  whiteSpace: "nowrap",
  boxShadow: "0 8px 18px rgba(46, 13, 79, 0.04)",
},
};