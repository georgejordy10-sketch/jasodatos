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
                    background: "rgba(255,255,255,0.94)",
                    border: "1px solid #E2E8F0",
                    color: "#111827",
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
              <div style={{ width: "100%", height: 260 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={topProductos}
                      dataKey="ventas"
                      nameKey="producto"
                      innerRadius={72}
                      outerRadius={114}
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
    minHeight: 20,
    padding: "0 8px",
    borderRadius: 999,
    background: "var(--jd-info-soft)",
    color: "var(--jd-info)",
    border: "1px solid var(--jd-border-accent-soft)",
    fontSize: 9,
    fontWeight: 900,
    marginBottom: 5,
  },

  sectionTitle: {
    margin: 0,
    fontSize: 18,
    fontWeight: 900,
    color: "var(--jd-text-main)",
    letterSpacing: "-0.03em",
    lineHeight: 1.05,
  },

  sectionSubtitle: {
    margin: "3px 0 0",
    color: "var(--jd-text-secondary)",
    fontSize: 11,
    lineHeight: 1.25,
    fontWeight: 650,
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
    fontSize: 11,
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
    gap: 1,
    minWidth: 102,
    justifyItems: "center",
    padding: "6px 9px",
    borderRadius: 12,
    background: "rgba(255,255,255,0.86)",
    color: "var(--jd-text-main)",
    fontSize: 10,
    fontWeight: 750,
    border: "1px solid var(--jd-border-accent-soft)",
    boxShadow: "0 8px 18px rgba(46, 13, 79, 0.04)",
  },

  chartBox: {
    width: "100%",
    height: 230,
    borderRadius: 14,
    background: "var(--jd-gradient-table-surface)",
    border: "1px solid var(--jd-border-accent-soft)",
    padding: "6px 6px 2px",
  },

pieLayout: {
  display: "grid",
  gridTemplateColumns: "270px minmax(0, 1fr)",
  gap: 10,
  alignItems: "center",
  minHeight: 0,
},
pieBox: {
  position: "relative",
  width: 270,
  height: 260,
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
    fontSize: 11,
    fontWeight: 800,
  },

  pieCenterValue: {
    color: "var(--jd-text-main)",
    fontSize: 17,
    fontWeight: 950,
    lineHeight: 1.05,
  },

  pieCenterSub: {
    color: "var(--jd-text-muted, #64748B)",
    fontSize: 10,
    fontWeight: 800,
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
  gridTemplateColumns: "9px minmax(180px, auto) 42px",
  alignItems: "center",
  justifyContent: "start",
  gap: 8,
  color: "var(--jd-text-main)",
  fontSize: 12,
},
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },

  legendLabel: {
    color: "var(--jd-text-secondary, #475569)",
    fontSize: 12,
    fontWeight: 650,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

legendPct: {
  color: "var(--jd-text-main)",
  fontSize: 12,
  fontWeight: 900,
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
    minHeight: 30,
    borderRadius: 999,
    border: "1px solid var(--jd-border-accent-soft)",
    background: "rgba(255,255,255,0.94)",
    color: "var(--jd-brand-secondary)",
    padding: "0 11px",
    fontSize: 11,
    fontWeight: 900,
    cursor: "pointer",
    whiteSpace: "nowrap",
    boxShadow: "0 8px 18px rgba(46, 13, 79, 0.04)",
  },

  viewAllButton: {
    minHeight: 30,
    padding: "0 11px",
    borderRadius: 999,
    border: "1px solid var(--jd-border-accent-soft)",
    background: "rgba(255,255,255,0.94)",
    color: "var(--jd-brand-secondary)",
    fontSize: 11,
    fontWeight: 900,
    cursor: "pointer",
    whiteSpace: "nowrap",
    boxShadow: "0 8px 18px rgba(46, 13, 79, 0.04)",
  },
};