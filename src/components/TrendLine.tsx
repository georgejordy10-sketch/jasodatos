'use client';

import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,   // 👈 en lugar de LineChart
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';

type TrendLineProps = {
  data: any[];
  xKey: string;
  yKey: string;
  avgKey?: string;
  upperKey?: string;
  lowerKey?: string;
  smooth?: boolean;
  currency?: string;
  regression?: string; // compatibilidad
  xLabel?: string;
  yLabel?: string;
  height?: number;
};

function formatCurrency(value: number, currency = 'USD') {
  if (typeof value !== 'number' || !Number.isFinite(value)) return value;
  try {
    return value.toLocaleString('es-EC', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    });
  } catch {
    return `$${value.toFixed(2)}`;
  }
}

export default function TrendLine({
  data = [],
  xKey,
  yKey,
  avgKey,
  upperKey,
  lowerKey,
  smooth = true,
  currency = 'USD',
  xLabel,
  yLabel,
  height = 320,
}: TrendLineProps) {
  // ticks del eje Y: 0, 100, 200, ... hasta el máximo redondeado
  const values = (data ?? [])
    .map((d) => Number(d?.[yKey] ?? 0))
    .filter((v) => Number.isFinite(v) && v >= 0);

  const maxVal = values.length ? Math.max(...values) : 0;
  const maxTick = Math.max(100, Math.ceil(maxVal / 100) * 100);
  const yTicks: number[] = [];
  for (let t = 0; t <= maxTick; t += 100) yTicks.push(t);

  const fmtMoneyLocal = (n: number) =>
    new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    }).format(n ?? 0);

  // etiquetas para tooltip (sin “total”)
  const seriesLabels: Record<string, string> = {
    ...(lowerKey ? { [lowerKey]: 'Banda inferior' } : {}),
    ...(upperKey ? { [upperKey]: 'Banda superior' } : {}),
    ...(avgKey ? { [avgKey]: 'Tendencia' } : {}),
    [yKey]: 'Ventas',
  };

  const renderTooltip = (props: any) => {
    const { active, payload, label } = props;
    if (!active || !payload || !payload.length) return null;

    return (
      <div
        style={{
          background: '#020617',
          color: '#E5E7EB',
          padding: '10px 12px',
          borderRadius: 10,
          boxShadow: '0 10px 30px rgba(0,0,0,0.45)',
          border: '1px solid #4B5563',
          minWidth: 170,
          fontSize: 11,
        }}
      >
        <div style={{ fontWeight: 800, marginBottom: 6 }}>{label}</div>
        {payload.map((entry: any, idx: number) => {
          const dk = entry.dataKey as string;
          const labelTxt = seriesLabels[dk];
          if (!labelTxt) return null; // 👈 ignoramos series sin label (ningún “total”)

          const val = Number(entry.value ?? 0);

          const color =
            dk === lowerKey
              ? '#FACC15'
              : dk === upperKey
              ? '#EAB308'
              : dk === avgKey
              ? '#22C55E'
              : '#60A5FA';

          return (
            <div
              key={`${dk}-${idx}`}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 8,
                marginTop: 2,
              }}
            >
              <span style={{ color }}>{labelTxt}:</span>
              <span style={{ fontWeight: 700 }}>{fmtMoneyLocal(val)}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart
        data={data}
        margin={{ top: 30, right: 10, bottom: 30, left: 10 }}
      >
        {/* Gradiente blanco para el área bajo la curva de Ventas */}
        <defs>
          <linearGradient id="ventasBand" x1="0" y1="0" x2="0" y2="1">
            {/* más fuerte cerca de la curva, se desvanece hacia el eje X */}
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.45} />
            <stop offset="40%" stopColor="#FFFFFF" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* Eje X */}
        <XAxis
          dataKey={xKey}
          tick={{ fill: '#FFFFFF', fontSize: 11 }}
          axisLine={{ stroke: '#FFFFFF', strokeWidth: 1 }}
          tickLine={{ stroke: '#FFFFFF', strokeWidth: 1 }}
          tickMargin={3}
          label={
            xLabel
              ? {
                  value: xLabel,
                  position: 'insideBottom',
                  offset: -2,
                  fill: '#FFFFFF',
                  fontSize: 15,
                }
              : undefined
          }
        />

        {/* Eje Y */}
        <YAxis
          ticks={yTicks}
          tick={{
            fill: '#FFFFFF',
            fontSize: 11,
          }}
          tickFormatter={(v: number) => fmtMoneyLocal(v).replace(',00', '')}
          axisLine={{ stroke: '#FFFFFF', strokeWidth: 1 }}
          tickLine={{ stroke: '#FFFFFF', strokeWidth: 1 }}
          tickMargin={5}
          label={
            yLabel
              ? {
                  value: yLabel,
                  angle: -90,
                  position: 'insideLeft',
                  fill: '#FFFFFF',
                  fontSize: 15,
                  dx: -10,
                  dy: 50,
                }
              : undefined
          }
        />

        <Tooltip content={renderTooltip} />

        {/* Área blanca difuminada bajo la curva de Ventas */}
        <Area
          type={smooth ? 'monotone' : 'linear'}
          dataKey={yKey}
          stroke="none"
          fill="url(#ventasBand)"
          fillOpacity={1}
          isAnimationActive={false}
          name={undefined}      // no sale en la leyenda
          legendType="none"
        />

        {/* Leyenda */}
        <Legend
          verticalAlign="bottom"
          align="center"
          wrapperStyle={{ marginTop: 18 }}
          iconType="plainline"
          formatter={(value: string, entry: any) => {
            if (!value) return null;
            return (
              <span
                style={{
                  fontSize: 11,
                  color: entry?.color || '#FFFFFF',
                }}
              >
                {value}
              </span>
            );
          }}
        />

        {/* Bandas */}
        {lowerKey && (
          <Line
            type="monotone"
            dataKey={lowerKey}
            stroke="#FACC15"
            strokeDasharray="6 9"
            dot={false}
            name="Banda inferior"
          />
        )}
        {upperKey && (
          <Line
            type="monotone"
            dataKey={upperKey}
            stroke="#EAB308"
            strokeDasharray="6 9"
            dot={false}
            name="Banda superior"
          />
        )}

        {/* Tendencia */}
        {avgKey && (
          <Line
            type="monotone"
            dataKey={avgKey}
            stroke="#16A34A"
            strokeWidth={3.5}
            dot={false}
            name="Tendencia"
          />
        )}

        {/* Ventas (línea principal sobre el área blanca) */}
        <Line
          type={smooth ? 'monotone' : 'linear'}
          dataKey={yKey}
          stroke="#F5F5F5"
          strokeWidth={3}
          dot={{ r: 4, stroke: '#d7fc04ff', strokeWidth: 1, fill: '#1D4ED8' }}
          activeDot={{ r: 9 }}
          name="Ventas"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
