"use client";

import type { CSSProperties, ReactNode } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
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
        title={`Productos con pocas unidades • Mínimo configurado: ${defaultStockMin}`}
        subtitle="Aquí ves qué productos necesitan revisión porque podrían quedarse sin unidades para vender."
        action={
  <button
    type="button"
    style={styles.viewAllButton}
    onClick={onOpenStockDetails}
  >
    Ver todo
  </button>
}
        fullHeight
      >
        <div style={{ overflowX: "auto" }}>
          <table style={styles.tableCompact}>
            <thead>
              <tr>
               <th style={styles.thCompact}>Producto</th>
<th style={styles.thCompact}>Unidades disponibles</th>
<th style={styles.thCompact}>Mínimo esperado</th>
<th style={styles.thCompact}>Situación</th>
<th style={styles.thCompact}>Días estimados</th>
              </tr>
            </thead>
            <tbody>
              {stockRiskRows.length === 0 ? (
                <tr>
                  <td style={styles.tdCompact}>Sin datos</td>
                  <td style={styles.tdCompact}>No Disponible</td>
                  <td style={styles.tdCompact}>{defaultStockMin}</td>
                  <td style={styles.tdCompact}>
                    <span
                      style={{
                        ...styles.statusPill,
                        background: "rgba(148,163,184,0.18)",
                        color: "#CBD5E1",
                      }}
                    >
                      Sin inventario cargado
                    </span>
                  </td>
                  <td style={styles.tdCompact}>-</td>
                </tr>
              ) : (
                stockRiskRows.map((row, index) => (
  <tr key={`${row.producto}-${index}`}>
                    <td style={styles.tdCompact}>{row.producto}</td>
                    <td style={styles.tdCompact}>{row.stock}</td>
                    <td style={styles.tdCompact}>{row.minimo}</td>
                    <td style={styles.tdCompact}>
                      <div
                        style={{
                          ...styles.stockStatusBar,
                          background:
                            row.estado === "Crítico" || row.estado === "Sin inventario"
                              ? "rgba(126, 34, 54, 0.55)"
                              : row.estado === "En riesgo"
                              ? "rgba(120, 53, 15, 0.55)"
                              : "rgba(20, 83, 45, 0.55)",
                        }}
                      >
                        <div
                          style={{
                            ...styles.stockStatusFill,
                            width:
                              row.estado === "Crítico" || row.estado === "Sin inventario"
                                ? "64%"
                                : row.estado === "En riesgo"
                                ? "78%"
                                : "58%",
                            background:
                              row.estado === "Crítico" || row.estado === "Sin inventario"
                                ? "linear-gradient(90deg, #ef4444 0%, #b91c1c 100%)"
                                : row.estado === "En riesgo"
                                ? "linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)"
                                : "linear-gradient(90deg, #22c55e 0%, #4ade80 100%)",
                          }}
                        />
                        <span
                          style={{
                            ...styles.stockStatusText,
                            color:
                              row.estado === "Crítico" || row.estado === "Sin inventario"
                                ? "#ffe4e6"
                                : row.estado === "En riesgo"
                                ? "#fff7ed"
                                : "#ecfdf5",
                          }}
                        >
                          {row.estado}
                        </span>
                      </div>
                    </td>
                    <td style={styles.tdCompact}>{row.diasCobertura} días</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>

      <Card
        title="Ventas por canal"
        subtitle="Distribución por fecha y canal"
        action={
  <button
    type="button"
    style={styles.viewAllButton}
    onClick={onOpenChannelDetails}
  >
    Ver todo
  </button>
}
      >
        <div style={styles.channelBadgeRow}>
          <span style={styles.channelBadge}>Canales activos: {activeChannelsCount}/3</span>
          <span style={styles.channelBadgeText}>{activeChannelsLabel}</span>
        </div>

        {activeChannelsCount === 0 ? (
          <div style={styles.channelEmptyState}>
            No hay canales habilitados. Activa al menos uno desde Configuración del negocio.
          </div>
        ) : !channelResult.hasChannelData ? (
          <div style={styles.channelEmptyState}>
            El archivo filtrado no contiene una columna de canal mapeada.
          </div>
        ) : (
          <div style={{ width: "100%", height: 340 }}>
            <ResponsiveContainer>
              <AreaChart
                data={channelResult.data}
                margin={{ top: 22, right: 18, left: 24, bottom: 1 }}
              >
                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis
                  dataKey="fecha"
                  stroke="#B9C2FF"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  dy={1}
                />
                <YAxis
                  stroke="#B9C2FF"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  width={axisWidth}
                  tickFormatter={(v) => formatCompactMoney(v)}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value) => formatMoney(Number(value ?? 0))}
                />
                <Legend verticalAlign="top" height={36} />
                {channelResult.channels.map((channel, index) => (
                  <Area
                    key={channel}
                    type="monotone"
                    dataKey={channel}
                    stackId="1"
                    stroke={colors[index % colors.length]}
                    fill={colors[index % colors.length]}
                    fillOpacity={0.55}
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
    gap: 12,
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
  tableCompact: {
    width: "100%",
    borderCollapse: "collapse",
    color: "#FFFFFF",
    fontSize: 13,
  },
  thCompact: {
    textAlign: "left",
    padding: "12px 14px",
    color: "#C7D2FE",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    fontWeight: 700,
    background: "rgba(255,255,255,0.04)",
    fontSize: 13,
  },
  tdCompact: {
    padding: "14px 14px",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    color: "#FFFFFF",
    verticalAlign: "middle",
    fontSize: 14,
    fontWeight: 600,
  },
  statusPill: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 26,
    borderRadius: 999,
    padding: "0 10px",
    fontWeight: 800,
    fontSize: 12,
  },
  stockStatusBar: {
    position: "relative",
    width: 250,
    height: 30,
    borderRadius: 10,
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
  },
  stockStatusFill: {
    position: "absolute",
    top: 0,
    left: 0,
    height: "100%",
    borderRadius: 10,
  },
  stockStatusText: {
    position: "relative",
    zIndex: 1,
    fontSize: 13,
    fontWeight: 800,
    paddingLeft: 12,
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
    background: "rgba(127,178,255,0.12)",
    border: "1px solid rgba(127,178,255,0.22)",
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: 800,
  },
  channelBadgeText: {
    color: "#C6CFFF",
    fontSize: 13,
    fontWeight: 600,
  },
  channelEmptyState: {
    color: "#C6CFFF",
    fontSize: 14,
    lineHeight: 1.5,
    padding: "10px 0 6px",
  },
};
