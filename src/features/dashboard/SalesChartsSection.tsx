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
    <div
      style={{
        ...styles.card,
        height: fullHeight ? "100%" : undefined,
      }}
    >
      <div style={styles.cardHeader}>
        <div>
          <h3 style={styles.sectionTitle}>{title}</h3>
          {subtitle ? <p style={styles.sectionSubtitle}>{subtitle}</p> : null}
        </div>
        {action ? <div>{action}</div> : null}
      </div>
      {children}
    </div>
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
  title="Cómo se mueven tus ventas"
  subtitle="Te muestra si tus ventas suben, bajan o se mantienen en el período seleccionado."
  fullHeight
>
          <div style={styles.chartTopBar}>
            <div style={styles.customLegend}>
              <div style={styles.customLegendItem}>
                <span style={styles.legendLineSolid} />
                <span>2024</span>
              </div>
              <div style={styles.customLegendItem}>
                <span style={styles.legendLineDashed} />
                <span>2023</span>
              </div>
            </div>

            <div style={styles.totalPill}>
              <strong>{formatMoney(ventasTotales)}</strong>
              <span>Total</span>
            </div>
          </div>

          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <AreaChart
                data={tendenciaVentas}
                margin={{ top: 8, right: 12, left: 18, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="ventasFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7FB2FF" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#7FB2FF" stopOpacity={0.02} />
                  </linearGradient>
                </defs>

                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />

                <XAxis
                  dataKey="fecha"
                  stroke="#B9C2FF"
                  tickLine={false}
                  axisLine={false}
                />

                <YAxis
                  stroke="#B9C2FF"
                  tickLine={false}
                  axisLine={false}
                  width={axisWidth}
                  tickMargin={10}
                  tickFormatter={(v) => formatCompactMoney(v)}
                />

                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value) => formatMoney(Number(value ?? 0))}
                />

                <Area
                  type="monotone"
                  dataKey="ventas"
                  stroke="#7FB2FF"
                  fill="url(#ventasFill)"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#A8CCFF", stroke: "#7FB2FF" }}
                />

                <Line
                  type="monotone"
                  dataKey="comparativo"
                  stroke="#C9D2FF"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div id="participacion-producto" style={{ height: "100%" }}>
        <Card
          title="Participación por producto"
          subtitle="Distribución de ventas por producto (top)"
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
        Ver todo
      </button>
    </div>
  ) : null
}
          fullHeight
        >
          <div style={styles.pieLayout}>
            <div style={styles.pieBox}>
              <div style={{ width: "100%", height: 400 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={topProductos}
                      dataKey="ventas"
                      nameKey="producto"
                      innerRadius={95}
                      outerRadius={155}
                      paddingAngle={1.5}
                      stroke="#F3F4F6"
                      strokeWidth={0.005}
                    >
                      {topProductos.map((_, index) => (
                        <Cell key={index} fill={colors[index % colors.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={tooltipStyle}
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
                  ventasTotales > 0 ? ((item.ventas / ventasTotales) * 100).toFixed(1) : "0.0";

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
    gridTemplateColumns: "1.25fr 1fr",
    gap: 12,
    alignItems: "stretch",
  },
  card: {
    background: "linear-gradient(135deg, #202969 0%, #2B2F86 100%)",
    color: "#FFFFFF",
    borderRadius: 20,
    padding: 22,
    border: "1px solid rgba(255,255,255,0.12)",
    boxShadow: "0 12px 24px rgba(17,24,39,0.10)",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
    gap: 12,
  },
  sectionTitle: {
    margin: 0,
    fontSize: 20,
    fontWeight: 800,
    color: "#FFFFFF",
    letterSpacing: "-0.01em",
  },
  sectionSubtitle: {
    margin: "5px 0 0",
    color: "#C6CFFF",
    fontSize: 13,
    lineHeight: 1.45,
  },
  chartTopBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    gap: 12,
    flexWrap: "wrap",
  },
  customLegend: {
    display: "flex",
    gap: 18,
    alignItems: "center",
    marginLeft: "auto",
    marginRight: "auto",
  },
  customLegendItem: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    color: "#D8DEFF",
    fontSize: 13,
    fontWeight: 700,
  },
  legendLineSolid: {
    width: 22,
    height: 3,
    borderRadius: 999,
    background: "#7FB2FF",
  },
  legendLineDashed: {
    width: 22,
    height: 0,
    borderTop: "3px dashed #C9D2FF",
  },
  totalPill: {
    display: "grid",
    gap: 2,
    minWidth: 110,
    justifyItems: "center",
    padding: "10px 12px",
    borderRadius: 14,
    background: "rgba(255,255,255,0.10)",
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: 700,
  },
  pieLayout: {
    display: "grid",
    gridTemplateColumns: "380px 1fr",
    gap: 14,
    alignItems: "stretch",
    minHeight: 100,
  },
  pieBox: {
    position: "relative",
    width: 340,
    height: 400,
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
    color: "#D9E0FF",
    fontSize: 16,
    fontWeight: 700,
  },
  pieCenterValue: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: 800,
    lineHeight: 1.1,
  },
  pieCenterSub: {
    color: "#D9E0FF",
    fontSize: 13,
    fontWeight: 700,
  },
  legendColumn: {
    display: "grid",
    gap: 12,
    alignContent: "center",
    alignSelf: "stretch",
    paddingLeft: 0,
  },
  legendItem: {
    display: "grid",
    gridTemplateColumns: "12px 260px 80px",
    alignItems: "center",
    gap: 12,
    color: "#FFFFFF",
    fontSize: 18,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  legendLabel: {
    color: "#DDE3FF",
    fontSize: 18,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  legendPct: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: 800,
    textAlign: "right",
    justifySelf: "end",
  },
  viewAllButton: {
    minHeight: 40,
    padding: "0 14px",
    borderRadius: 999,
    border: "1px solid rgba(127,178,255,0.22)",
    background: "rgba(127,178,255,0.10)",
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.03)",
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
  border: "1px solid rgba(127,178,255,0.28)",
  background: "rgba(127,178,255,0.12)",
  color: "#FFFFFF",
  padding: "0 13px",
  fontSize: 12,
  fontWeight: 900,
  cursor: "pointer",
  whiteSpace: "nowrap",
},
};