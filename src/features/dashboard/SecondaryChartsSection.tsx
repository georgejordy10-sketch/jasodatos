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
  stockSucursalOptions: string[];
  selectedStockSucursal: string;
  onChangeStockSucursal: (value: string) => void;
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

function getStockStateBarStyle(estado: string): CSSProperties {
  const normalized = normalizeStockState(estado);

  if (normalized === "Crítico" || normalized === "Sin inventario") {
    return {
      width: "64%",
      background: "linear-gradient(90deg, #DC2626 0%, #B91C1C 100%)",
      color: "#FFFFFF",
    };
  }

  if (normalized === "En riesgo") {
    return {
      width: "78%",
      background: "linear-gradient(90deg, #FACC15 0%, #F59E0B 100%)",
      color: "#FFFFFF",
    };
  }

  return {
    width: "58%",
    background: "linear-gradient(90deg, #22C55E 0%, #16A34A 100%)",
    color: "#FFFFFF",
  };
}

export default function SecondaryChartsSection({
  defaultStockMin,
  stockRiskRows,
  stockSucursalOptions,
  selectedStockSucursal,
  onChangeStockSucursal,
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
          title="Stock en riesgo"
          subtitle={`Productos bajo seguimiento · mínimo configurado: ${defaultStockMin}`}
action={
  <div style={styles.stockActions}>
    <button type="button" style={styles.viewAllButton} onClick={onOpenStockDetails}>
      Ver stock
    </button>

    <select
      value={selectedStockSucursal}
      onChange={(event) => onChangeStockSucursal(event.target.value)}
      style={styles.stockBranchSelect}
      aria-label="Filtrar stock por sucursal"
    >
      {stockSucursalOptions.map((sucursal) => (
        <option key={sucursal} value={sucursal}>
          {sucursal === "Todas" ? "Todas las sucursales" : sucursal}
        </option>
      ))}
    </select>
  </div>
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
                     <div style={styles.stockStateTrack}>
  <div style={{ ...styles.stockStateBar, ...getStockStateBarStyle("Sin inventario") }}>
    Sin inventario cargado
  </div>
</div>
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
<div style={styles.stockStateTrack}>
  <div style={{ ...styles.stockStateBar, ...getStockStateBarStyle(row.estado) }}>
    {state}
  </div>
</div>
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

<div id="ventas-por-canal" style={{ scrollMarginTop: 120 }}>
  <Card
    title="Ventas por canal"
    subtitle="Identifica dónde se está generando la venta."
    action={
      <button type="button" style={styles.viewAllButton} onClick={onOpenChannelDetails}>
        Ver canales
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
                  fontSize={14}
                />

                <YAxis
                  stroke="#64748B"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  width={axisWidth}
                  fontSize={14}
                  tickFormatter={(value) => formatCompactMoney(value)}
                />
                <Tooltip
  contentStyle={{
    ...tooltipStyle,
    background: "rgba(15, 23, 42, 0.96)",
    border: "1px solid rgba(255,255,255,0.18)",
    color: "#F8FAFC",
    boxShadow: "0 18px 42px rgba(0, 0, 0, 0.35)",
  }}
  labelStyle={{
    color: "#F8FAFC",
    fontWeight: 700,
  }}
  itemStyle={{
    color: "#E2E8F0",
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
      </div>
    </section>
  );
}
const styles: Record<string, CSSProperties> = {
secondaryCharts: {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))",
  gap: 12,
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
    marginBottom: 8,
    gap: 8,
    flexWrap: "wrap",
  },

  eyebrow: {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 28,
    padding: "0 12px",
    borderRadius: 999,
    background: "var(--jd-info-soft)",
    color: "var(--jd-info)",
    border: "1px solid var(--jd-border-accent-soft)",
    fontSize: 12,
    fontWeight: 900,
    marginBottom: 5,
  },

  sectionTitle: {
    margin: 0,
    fontSize: 23,
    fontWeight: 900,
    color: "var(--jd-text-main)",
    letterSpacing: "-0.03em",
    lineHeight: 1.12,
  },

  sectionSubtitle: {
    margin: "3px 0 0",
    color: "var(--jd-text-secondary)",
    fontSize: 15,
    lineHeight: 1.45,
    fontWeight: 650,
  },

viewAllButton: {
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.08)",
  color: "#E2E8F0",
  borderRadius: 999,
  padding: "10px 18px",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
},
stockActions: {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
},

stockBranchSelect: {
  minHeight: 36,
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.42)",
  background: "rgba(255,255,255,0.08)",
  color: "#FFFFFF",
  padding: "0 12px",
  fontSize: 12,
  fontWeight: 800,
  outline: "none",
},
  tableShell: {
    overflowX: "auto",
    borderRadius: 14,
    border: "1px solid var(--jd-border-accent-soft)",
    background: "var(--jd-gradient-table-surface)",
  },

  tableCompact: {
    width: "100%",
    borderCollapse: "collapse",
    color: "var(--jd-text-main)",
    fontSize: 14,
  },

thCompact: {
  padding: "12px 14px",
  textAlign: "left",
  fontSize: 13,
  fontWeight: 700,
  color: "#F8FAFC",
  background: "rgba(99, 102, 241, 0.72)",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
},
tdCompact: {
  padding: "12px 14px",
  fontSize: 13,
  fontWeight: 500,
  color: "#F8FAFC",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
  verticalAlign: "middle",
},

  productCell: {
    padding: "12px 14px",
    borderBottom: "1px solid var(--jd-border-table)",
    color: "var(--jd-text-main)",
    verticalAlign: "middle",
    fontSize: 14,
    fontWeight: 850,
    whiteSpace: "nowrap",
  },

  statusPill: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 28,
    borderRadius: 999,
    padding: "0 9px",
    fontWeight: 850,
    fontSize: 12,
    whiteSpace: "nowrap",
  },

  channelBadgeRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 8,
  },

  channelBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 30,
    padding: "0 10px",
    borderRadius: 999,
    background: "var(--jd-info-soft)",
    border: "1px solid var(--jd-border-accent-soft)",
    color: "var(--jd-info)",
    fontSize: 13,
    fontWeight: 900,
  },

  channelBadgeText: {
    color: "var(--jd-text-secondary)",
    fontSize: 14,
    fontWeight: 650,
  },

  channelEmptyState: {
    color: "var(--jd-text-secondary)",
    fontSize: 15,
    lineHeight: 1.5,
    padding: "6px 0 4px",
    fontWeight: 650,
  },

chartBox: {
  width: "100%",
  height: 280,
    borderRadius: 14,
    background: "var(--jd-gradient-table-surface)",
    border: "1px solid var(--jd-border-accent-soft)",
    padding: "10px 12px 6px",
  },
  stockStateTrack: {
  width: "100%",
  maxWidth: 210,
  height: 30,
  borderRadius: 999,
  background: "rgba(15, 23, 42, 0.38)",
  border: "1px solid rgba(255,255,255,0.08)",
  overflow: "hidden",
},

stockStateBar: {
  height: "100%",
  minWidth: 118,
  borderRadius: 999,
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  padding: "0 14px",
  fontSize: 12,
  fontWeight: 700,
  lineHeight: 1,
  whiteSpace: "nowrap",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.20)",
},
};