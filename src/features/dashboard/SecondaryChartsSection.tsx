"use client";

import type { CSSProperties, ReactNode } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type StockRiskRow = {
  producto: string;
  stock: number;
  minimo: number;
  estado: string;
  diasCobertura: number;
};

type ChannelRow = Record<string, number | string>;

type Props = {
  defaultStockMin: number;
  stockRiskRows: StockRiskRow[];
  activeChannelsCount: number;
  activeChannelsLabel: string;
  channelResult: {
    data: ChannelRow[];
    channels: string[];
    hasChannelData: boolean;
  };
  axisWidth: number;
  tooltipStyle: CSSProperties;
  colors: string[];
  formatCompactMoney: (value: number) => string;
  formatMoney: (value: number) => string;
  onOpenStockDetails?: () => void;
  onOpenChannelDetails?: () => void;
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
          <span style={styles.eyebrow}>Análisis operativo</span>
          <h3 style={styles.sectionTitle}>{title}</h3>
          {subtitle ? <p style={styles.sectionSubtitle}>{subtitle}</p> : null}
        </div>

        {action ? <div>{action}</div> : null}
      </div>

      {children}
    </article>
  );
}

function getFriendlyChannelName(channel: string) {
  const normalized = channel.trim();

  const labels: Record<string, string> = {
    tiendaFisica: "Tienda física",
    ecommerce: "E-commerce",
    mayorista: "Mayorista",
  };

  return labels[normalized] ?? normalized;
}

function normalizeStockState(value: string) {
  const normalized = value.toLowerCase();

  if (normalized.includes("cr")) return "Crítico";
  if (normalized.includes("riesgo")) return "En riesgo";
  if (normalized.includes("inventario")) return "Sin inventario";
  return value;
}

function getStockStateStyle(estado: string): CSSProperties {
  const normalized = normalizeStockState(estado);

  if (normalized === "Crítico" || normalized === "Sin inventario") {
    return {
      background: "rgba(220, 38, 38, 0.10)",
      color: "#B91C1C",
      border: "1px solid rgba(220, 38, 38, 0.18)",
    };
  }

  if (normalized === "En riesgo") {
    return {
      background: "rgba(245, 158, 11, 0.12)",
      color: "#B45309",
      border: "1px solid rgba(245, 158, 11, 0.22)",
    };
  }

  return {
    background: "rgba(22, 163, 74, 0.10)",
    color: "#15803D",
    border: "1px solid rgba(22, 163, 74, 0.18)",
  };
}

export default function SecondaryChartsSection({
  defaultStockMin,
  stockRiskRows,
  activeChannelsCount,
  activeChannelsLabel,
  channelResult,
  axisWidth,
  tooltipStyle,
  colors,
  formatCompactMoney,
  formatMoney,
  onOpenStockDetails,
  onOpenChannelDetails,
}: Props) {
  return (
    <section style={styles.secondaryCharts}>
      <div id="stock-en-riesgo" style={{ scrollMarginTop: 120 }}>
        <Card
          title="Inventario en observación"
          subtitle={`Productos bajo seguimiento · mínimo configurado: ${defaultStockMin}`}
          action={
            <button type="button" style={styles.viewAllButton} onClick={onOpenStockDetails}>
              Ver todo
            </button>
          }
          fullHeight
        >
          <div style={styles.tableShell}>
            <table style={styles.tableCompact}>
              <thead>
                <tr>
                  <th style={styles.thCompact}>Producto</th>
                  <th style={styles.thCompact}>Stock</th>
                  <th style={styles.thCompact}>Mínimo</th>
                  <th style={styles.thCompact}>Situación</th>
                  <th style={styles.thCompact}>Cobertura</th>
                </tr>
              </thead>

              <tbody>
                {stockRiskRows.length === 0 ? (
                  <tr>
                    <td style={styles.tdCompact}>Sin datos</td>
                    <td style={styles.tdCompact}>No disponible</td>
                    <td style={styles.tdCompact}>{defaultStockMin}</td>
                    <td style={styles.tdCompact}>
                      <span style={{ ...styles.statusPill, ...getStockStateStyle("Sin inventario") }}>
                        Sin inventario cargado
                      </span>
                    </td>
                    <td style={styles.tdCompact}>-</td>
                  </tr>
                ) : (
                  stockRiskRows.map((row, index) => {
                    const state = normalizeStockState(row.estado);

                    return (
                      <tr key={`${row.producto}-${index}`}>
                        <td style={styles.productCell}>{row.producto}</td>
                        <td style={styles.tdCompact}>{row.stock}</td>
                        <td style={styles.tdCompact}>{row.minimo}</td>
                        <td style={styles.tdCompact}>
                          <span style={{ ...styles.statusPill, ...getStockStateStyle(row.estado) }}>
                            {state}
                          </span>
                        </td>
                        <td style={styles.tdCompact}>{row.diasCobertura} días</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card
        title="Ventas por canal"
        subtitle="Identifica dónde se está generando la venta."
        action={
          <button type="button" style={styles.viewAllButton} onClick={onOpenChannelDetails}>
            Ver todo
          </button>
        }
        fullHeight
      >
        <div style={styles.channelBadgeRow}>
          <span style={styles.channelBadge}>
            Medios: {channelResult.channels.length}
          </span>

          <span style={styles.channelBadgeText}>
            {channelResult.channels.length > 0
              ? channelResult.channels.map(getFriendlyChannelName).join(" · ")
              : "Sin medios detectados"}
          </span>
        </div>

        {activeChannelsCount === 0 ? (
          <div style={styles.channelEmptyState}>
            Aún no has seleccionado tus medios de venta. Puedes hacerlo en Datos del negocio.
          </div>
        ) : !channelResult.hasChannelData ? (
          <div style={styles.channelEmptyState}>
            No encontramos en tu archivo una columna que indique por dónde se realizó cada venta.
          </div>
        ) : (
          <div style={styles.chartBox}>
            <ResponsiveContainer>
              <AreaChart
                data={channelResult.data}
                margin={{ top: 16, right: 16, left: 16, bottom: 1 }}
              >
                <defs>
                  {channelResult.channels.map((channel, index) => (
                    <linearGradient
                      key={`gradient-${channel}`}
                      id={`channelGradient-${index}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor={colors[index % colors.length]}
                        stopOpacity={0.20}
                      />
                      <stop
                        offset="55%"
                        stopColor={colors[index % colors.length]}
                        stopOpacity={0.08}
                      />
                      <stop
                        offset="95%"
                        stopColor={colors[index % colors.length]}
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                  ))}
                </defs>

                <XAxis
                  dataKey="fecha"
                  stroke="#64748B"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  dy={1}
                  fontSize={12}
                />

                <YAxis
                  stroke="#64748B"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  width={axisWidth}
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
                  formatter={(value, name) => [
                    formatMoney(Number(value ?? 0)),
                    getFriendlyChannelName(String(name)),
                  ]}
                />

                {channelResult.channels.map((channel, index) => (
                  <Area
                    key={channel}
                    type="monotone"
                    dataKey={channel}
                    name={getFriendlyChannelName(channel)}
                    stroke={colors[index % colors.length]}
                    strokeWidth={2.4}
                    fill={`url(#channelGradient-${index})`}
                    fillOpacity={1}
                    dot={{
                      r: 2.8,
                      strokeWidth: 1.5,
                      fill: "#FFFFFF",
                      stroke: colors[index % colors.length],
                    }}
                    activeDot={{
                      r: 5,
                      strokeWidth: 2,
                      fill: "#FFFFFF",
                      stroke: colors[index % colors.length],
                    }}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  secondaryCharts: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 14,
  },
  card: {
    background:
      "linear-gradient(135deg, #FFFFFF 0%, rgba(239, 246, 255, 0.92) 100%)",
    color: "var(--jd-text-main, #0F172A)",
    borderRadius: 22,
    padding: 18,
    border: "1px solid rgba(147, 197, 253, 0.36)",
    boxShadow: "0 14px 34px rgba(37, 99, 235, 0.08)",
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
    background: "rgba(37, 99, 235, 0.08)",
    color: "#1D4ED8",
    border: "1px solid rgba(37, 99, 235, 0.14)",
    fontSize: 11,
    fontWeight: 900,
    marginBottom: 8,
  },
  sectionTitle: {
    margin: 0,
    fontSize: 21,
    fontWeight: 950,
    color: "var(--jd-text-main, #0F172A)",
    letterSpacing: "-0.04em",
    lineHeight: 1.08,
  },
  sectionSubtitle: {
    margin: "4px 0 0",
    color: "var(--jd-text-secondary, #475569)",
    fontSize: 13,
    lineHeight: 1.35,
    fontWeight: 650,
  },
  viewAllButton: {
    minHeight: 34,
    padding: "0 13px",
    borderRadius: 999,
    border: "1px solid rgba(37, 99, 235, 0.18)",
    background:
      "linear-gradient(135deg, rgba(37, 99, 235, 0.08) 0%, rgba(124, 58, 237, 0.10) 100%)",
    color: "var(--jd-brand-secondary, #3D2C8D)",
    fontSize: 12,
    fontWeight: 900,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  tableShell: {
    overflowX: "auto",
    borderRadius: 18,
    border: "1px solid rgba(226, 232, 240, 0.86)",
    background: "rgba(255, 255, 255, 0.62)",
  },
  tableCompact: {
    width: "100%",
    borderCollapse: "collapse",
    color: "var(--jd-text-main, #0F172A)",
    fontSize: 13,
  },
  thCompact: {
    textAlign: "left",
    padding: "11px 12px",
    color: "var(--jd-text-secondary, #475569)",
    borderBottom: "1px solid rgba(226, 232, 240, 0.92)",
    fontWeight: 900,
    background: "rgba(248, 250, 252, 0.82)",
    fontSize: 12,
  },
  tdCompact: {
    padding: "12px 12px",
    borderBottom: "1px solid rgba(226, 232, 240, 0.72)",
    color: "var(--jd-text-main, #0F172A)",
    verticalAlign: "middle",
    fontSize: 13,
    fontWeight: 700,
  },
  productCell: {
    padding: "12px 12px",
    borderBottom: "1px solid rgba(226, 232, 240, 0.72)",
    color: "var(--jd-text-main, #0F172A)",
    verticalAlign: "middle",
    fontSize: 13,
    fontWeight: 900,
  },
  statusPill: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 26,
    borderRadius: 999,
    padding: "0 10px",
    fontWeight: 900,
    fontSize: 12,
    whiteSpace: "nowrap",
  },
  channelBadgeRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 12,
  },
  channelBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 28,
    padding: "0 12px",
    borderRadius: 999,
    background: "rgba(37, 99, 235, 0.08)",
    border: "1px solid rgba(37, 99, 235, 0.14)",
    color: "#1D4ED8",
    fontSize: 12,
    fontWeight: 900,
  },
  channelBadgeText: {
    color: "var(--jd-text-secondary, #475569)",
    fontSize: 13,
    fontWeight: 650,
  },
  channelEmptyState: {
    color: "var(--jd-text-secondary, #475569)",
    fontSize: 14,
    lineHeight: 1.5,
    padding: "10px 0 6px",
    fontWeight: 650,
  },
  chartBox: {
    width: "100%",
    height: 320,
    borderRadius: 18,
    background: "rgba(255, 255, 255, 0.62)",
    border: "1px solid rgba(226, 232, 240, 0.86)",
    padding: "10px 8px 4px",
  },
};