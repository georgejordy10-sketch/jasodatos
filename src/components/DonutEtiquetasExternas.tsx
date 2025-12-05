'use client';

import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Tooltip,
  Cell,
} from 'recharts';

type Item = { name: string; value: number; color?: string };

type Props = {
  data: Item[];
  centerLabel?: string;
  centerTopLabel?: string;
  colors?: string[];
  innerRadius?: number;
  outerRadius?: number;
  minLabelPct?: number;
  animate?: boolean;
  externalLabelFontSize?: number;
  externalPillHeight?: number;
  innerPctRadial?: number;
};

const BRAND = {
  ORANGE: '#F78636',
  BLACK: '#121211',
  WHITE: '#F5f5f5',
};

const FALLBACK_PALETTE = [
  '#2563EB',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#14B8A6',
];

// === Label externa simple (texto en 2 líneas) ===
const RADIAN = Math.PI / 180;

function makeExternalLabel(minPct: number, fontSize = 10) {
  return function ExternalLabel(props: any) {
    const {
      cx,
      cy,
      midAngle,
      outerRadius,
      percent,
      name,
      value,
    } = props;

    if ((percent ?? 0) < minPct) return null;

    const r = outerRadius + 24;
    const x = cx + r * Math.cos(-midAngle * RADIAN);
    const y = cy + r * Math.sin(-midAngle * RADIAN);
    const anchor: 'start' | 'end' = x > cx ? 'start' : 'end';

    return (
      <text
        x={x}
        y={y}
        textAnchor={anchor}
        dominantBaseline="central"
        fill="#F5F5F5"
      >
        {/* Nombre del producto */}
        <tspan fontSize={fontSize} x={x}>
          {name}
        </tspan>
        {/* Valor en dólares */}
        <tspan
          x={x}
          dy={12}
          fontSize={fontSize}
          fill="#F5F5F5"
        >
          {value?.toLocaleString('es-EC', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 2,
          })}
        </tspan>
      </text>
    );
  };
}

/** Porcentaje dentro de cada porción de la dona (texto blanco) */
function makeInnerPercentLabel(minPct: number) {
  return function InnerPercentLabel(props: any) {
    const {
      cx,
      cy,
      midAngle,
      innerRadius,
      outerRadius,
      percent,
    } = props;

    if ((percent ?? 0) < minPct) return null;

    // Punto intermedio dentro de la porción
    const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        fill="#F5F5F5"
        fontSize={11}
        fontWeight={700}
      >
        {((percent ?? 0) * 100).toFixed(1)}%
      </text>
    );
  };
}

export default function DonutEtiquetasExternas({
  data,
  centerLabel,
  centerTopLabel,
  colors,
  innerRadius = 110,
  outerRadius = 210,
  minLabelPct = 0.011,
  animate = false,
  externalLabelFontSize = 9,
  externalPillHeight = 7, // compatibilidad
  innerPctRadial = 0.45,  // compatibilidad
}: Props) {
  const palette =
    colors && colors.length
      ? colors
      : data.map(
          (d, i) => d.color || FALLBACK_PALETTE[i % FALLBACK_PALETTE.length],
        );

  const ExternalLabel = makeExternalLabel(minLabelPct, externalLabelFontSize);
  const InnerPercentLabel = makeInnerPercentLabel(minLabelPct);

  return (
    // Contenedor transparente
    <div
      style={{
        width: '100%',
        height: 390,
        padding: 0,
        margin: 0,
        background: 'transparent',
        borderRadius: 0,
        border: 'none',
        boxShadow: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          {/* Dona principal con labels externos (nombre + USD) */}
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            // ⬅ centramos la dona y usamos los radios grandes
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={1.3}
            isAnimationActive={animate}
            labelLine
            label={ExternalLabel}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-main-${index}`}
                fill={palette[index % palette.length]}
                stroke="#FFFFFF"
                strokeWidth={1.5}
              />
            ))}
          </Pie>

          {/* Segundo Pie invisible SOLO para porcentaje dentro de cada color */}
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={1.2}
            isAnimationActive={false}
            fill="none"
            stroke="none"
            labelLine={false}
            label={InnerPercentLabel}
          />

          {/* Tooltip en tarjetita blanca */}
          <Tooltip
            cursor={{ fill: 'rgba(15,23,42,0.06)' }}
            content={({ active, payload }) => {
              if (!active || !payload || !payload.length) return null;
              const p = payload[0] || {};
              const name = p.name ?? p.payload?.name ?? '';
              const value =
                typeof p.value === 'number'
                  ? p.value
                  : Number(p.value ?? 0);

              return (
                <div
                  style={{
                    background: '#fff',
                    color: '#0f172a',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    padding: '8px 10px',
                    boxShadow: '0 6px 18px rgba(15,23,42,.12)',
                    fontSize: 13,
                    lineHeight: 1.25,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      marginBottom: 4,
                    }}
                  >
                    {name}
                  </div>
                  <div>
                    {value.toLocaleString('es-EC', {
                      style: 'currency',
                      currency: 'USD',
                      maximumFractionDigits: 2,
                    })}
                  </div>
                </div>
              );
            }}
          />

          {/* Centro: Ventas + monto en blanco */}
          {(centerTopLabel || centerLabel) && (
            <>
              {centerTopLabel && (
                <text
                  x="50%"
                  y="45%"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontWeight={1000}
                  fontSize={30}
                  fill={BRAND.WHITE}
                >
                  {centerTopLabel}
                </text>
              )}
              {centerLabel && (
                <text
                  x="50%"
                  y="55%"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontWeight={1000}
                  fontSize={20}
                  fill={BRAND.WHITE}
                >
                  {centerLabel}
                </text>
              )}
            </>
          )}
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
