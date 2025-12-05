'use client';

import { useMemo } from 'react';
import DonutEtiquetasExternas from '@/components/DonutEtiquetasExternas';
import AreaApiladaPorCanal from '@/components/AreaApiladaPorCanal';
import TrendLine from '@/components/TrendLine';

// Re-export para mantener tu API externa
export { AreaApiladaPorCanal, TrendLine };

/* ===== Paleta JasoDatos ===== */
const BRAND = {
  blue: '#2563EB',
  green: '#10B981',
  orange: '#F59E0B',
  red: '#EF4444',
  violet: '#8B5CF6',
  teal: '#14B8A6',
  gray: '#64748B',
  palette: ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#14B8A6'],
};

/* ===== Helpers ===== */
export function fmtMoney(n: number) {
  try {
    return n.toLocaleString('es-EC', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
  } catch {
    return `$ ${Number(n ?? 0).toFixed(2)}`;
  }
}

function toNumber(x: unknown): number {
  if (typeof x === 'number') return Number.isFinite(x) ? x : 0;
  const s = String(x ?? '').trim();
  if (!s) return 0;
  const compact = s.replace(/\s/g, '');
  if (/^\d{1,3}(\.\d{3})+,\d+$/.test(compact)) return Number(compact.replace(/\./g, '').replace(',', '.')) || 0;
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(compact)) return Number(compact.replace(/,/g, '')) || 0;
  return Number(compact.replace(',', '.')) || 0;
}

/* Formateo del eje Y (limpio) */
const fmtMoneyAxis = (n: number) =>
  new Intl.NumberFormat('es-EC', { maximumFractionDigits: 0 }).format(n);

/* ========================================================================== */
/* KPI con delta                                                              */
/* ========================================================================== */
export function Kpi({
  label, value, prev = 0, money = true,
}: { label: string; value: number; prev?: number; money?: boolean; }) {
  const delta = prev > 0 ? (value - prev) / prev : 0;
  const isUp = delta >= 0;
  return (
    <div style={{
      border: '1px solid #e5e7eb', borderRadius: 12, padding: 12,
      boxShadow: '0 1px 2px rgba(16,24,40,0.04)'
    }}>
      <div style={{ fontSize: 12, color: '#666' }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800 }}>
        {money ? fmtMoney(value) : value.toLocaleString('es-EC')}
      </div>
      <div style={{
        display: 'inline-block', marginTop: 6, fontSize: 12, fontWeight: 700,
        color: isUp ? '#065f46' : '#991b1b',
        background: isUp ? '#ecfdf5' : '#fee2e2',
        border: `1px solid ${isUp ? '#a7f3d0' : '#fecaca'}`, borderRadius: 999, padding: '2px 8px'
      }}>
        {isUp ? '▲' : '▼'} {(delta * 100).toFixed(1)}%
      </div>
    </div>
  );
}

/* ========================================================================== */
/* Donut: Participación por producto — con LabelList tipo “badge”             */
/* ========================================================================== */
type DonutItemFlex = { key?: string; total?: number; name?: string; value?: number };

function normalizeDonut(items: DonutItemFlex[]) {
  return items.map((it) => ({
    key: String(it.key ?? it.name ?? '—'),
    total: toNumber(it.total ?? it.value ?? 0),
  }));
}

function buildDonutData(pairs: { key: string; total: number }[], topN: number) {
  const top = pairs.slice(0, topN);
  const otros = pairs.slice(topN).reduce((s, x) => s + x.total, 0);
  return otros > 0 ? [...top, { key: 'Otros', total: otros }] : top;
}

function shorten(s: string, max = 28) {
  if (!s) return '—';
  if (s.length <= max) return s;
  const cut = s.lastIndexOf(' ', max);
  return (cut > 2 ? s.slice(0, cut) : s.slice(0, max - 1)) + '…';
}

const PALETTE = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#14B8A6'];

function colorFor(idx: number, total: number) {
  if (idx < PALETTE.length) return PALETTE[idx];
  const h = (idx * 360) / Math.max(total, 1);
  return `hsl(${Math.round(h)} 70% 50%)`;
}

/** Etiqueta exterior (en 2 líneas) como “badge” simple; se usa en <LabelList content={...} /> */
const RADIAN = Math.PI / 180;

function makePieLabel(minPct: number, fontSize = 10, gap = 10) {
  // memorias por lado para evitar que las etiquetas se monten entre sí
  let lastY = { left: -1e9, right: -1e9 };

  return function Render(props: any) {
    const payload = props.payload ?? {};
    const cx = props.cx ?? payload.cx;
    const cy = props.cy ?? payload.cy;
    const outerRadius = props.outerRadius ?? payload.outerRadius;
    const midAngle = props.midAngle ?? payload.midAngle;
    const percent = props.percent ?? payload.percent ?? 0;

    if (percent < minPct) return null;

    // nombre y % (usamos solo % aquí)
    const rawName = String(props.value ?? payload.key ?? payload.name ?? '—');
    const name = shorten(rawName, 18);
    const pctText = `${(percent * 100).toFixed(1)}%`;

    // posición de la etiqueta (un poco fuera de la dona)
    const rLabel = outerRadius + 26;
    const xLabel = cx + rLabel * Math.cos(-midAngle * RADIAN);
    let yLabel = cy + rLabel * Math.sin(-midAngle * RADIAN);

    // evitar que se monten verticalmente
    const side: 'left' | 'right' = xLabel > cx ? 'right' : 'left';
    const minGap = 14;
    if (yLabel - lastY[side] < minGap) yLabel = lastY[side] + minGap;
    lastY[side] = yLabel;

    const textAnchor = side === 'right' ? 'start' : 'end';

    // punto de salida de la línea en el borde de la dona
    const rEdge = outerRadius + 4;
    const xEdge = cx + rEdge * Math.cos(-midAngle * RADIAN);
    const yEdge = cy + rEdge * Math.sin(-midAngle * RADIAN);

    const strokeColor = payload.fill ?? '#F5F5F5';

    return (
      <g>
        {/* Línea conectora del mismo color que el segmento */}
        <line
          x1={xEdge}
          y1={yEdge}
          x2={xLabel}
          y2={yLabel - 10}
          stroke={strokeColor}
          strokeWidth={1.2}
        />

        {/* Etiqueta en blanco F5F5F5 */}
        <text
          x={xLabel}
          y={yLabel}
          textAnchor={textAnchor}
          dominantBaseline="central"
          fill="#F5F5F5"
        >
          <tspan fontSize={fontSize} fontWeight={700}>
            {name}
          </tspan>
          <tspan
            x={xLabel}
            dy={gap}
            fontSize={fontSize}
            fontWeight={600}
            fill="#F5F5F5"
          >
            {pctText}
          </tspan>
        </text>
      </g>
    );
  };
}
// DonutProductos (con default “Ventas”)
export function DonutProductos({
  data,
  topN = 12,
  minPercentForLabel = 0.008,
  centerTopLabel = 'Ventas',
  centerLabel,
}: {
  data: Array<{ key?: string; total?: number; name?: string; value?: number }>;
  topN?: number;
  minPercentForLabel?: number;
  centerTopLabel?: string;
  centerLabel?: string;
}) {
  const normalized = useMemo(() => normalizeDonut(data), [data]);
  const donut = useMemo(() => buildDonutData(normalized, topN), [normalized, topN]);
  const total = useMemo(() => donut.reduce((s, d) => s + d.total, 0), [donut]);
  const items = useMemo(() => donut.map(d => ({ name: d.key, value: d.total })), [donut]);

return (
  <DonutEtiquetasExternas
    data={items}
    minLabelPct={minPercentForLabel}
    centerTopLabel={centerTopLabel}
    centerLabel={centerLabel ?? fmtMoney(total)}
    colors={BRAND?.palette}
    // 🔹 Dona más grande
    innerRadius={100}
    outerRadius={160}
    animate={false}
    // 🔹 Etiquetas externas más grandes
    externalLabelFontSize={10}
  />
);
}
/* ========================================================================== */
/* TrendVentasCard: calcula la serie { fecha, ventas, ma7 } y renderiza línea */
/* ========================================================================== */
type Row = Record<string, unknown>;

export function TrendVentasCard({
  rows,
  xLabel = 'Fecha',
  yLabel = 'Ventas (USD)',
  ventanaMA = 7,
  soloVentas = false,
  height = 320,
  title = 'Tendencia de ventas', // lo dejamos por si en el futuro lo quieres usar
}: {
  rows: Row[];
  xLabel?: string;
  yLabel?: string;
  ventanaMA?: number;
  soloVentas?: boolean;
  height?: number;
  title?: string;
}) {
   // Construcción robusta sin dependencias externas
const serieFinal = useMemo(() => {
  const byDay = new Map<string, number>();

  for (const r of (rows as any[]) ?? []) {
    const fecha = String(r?.fecha ?? r?.date ?? '').slice(0, 10);
    if (!fecha) continue;

    // Filtra solo movimientos de venta/salida si se pide
    const tipo = String(r?.tipo_movimiento ?? '').toLowerCase();
    if (soloVentas && !['venta', 'salida', 'egreso'].includes(tipo)) continue;

    const cantidad = toNumber(r?.cantidad);
    const precio = toNumber(r?.precio_unitario);
    const monto = cantidad * precio;

    if (Number.isFinite(monto) && monto > 0) {
      byDay.set(fecha, (byDay.get(fecha) ?? 0) + monto);
    }
  }

  type PuntoSerie = { fecha: string; ventas: number; ma7?: number };
  const dias = [...byDay.keys()].sort();
  const serie: PuntoSerie[] = dias.map((d) => ({
    fecha: d,
    ventas: byDay.get(d)!,
  }));

  // Media móvil simple
  const win = Math.max(1, ventanaMA | 0);
  const buf: number[] = [];
  let acc = 0;
  for (let i = 0; i < serie.length; i++) {
    acc += serie[i].ventas;
    buf.push(serie[i].ventas);
    if (buf.length > win) acc -= buf.shift()!;
    serie[i].ma7 = acc / buf.length;
  }

  return serie;
}, [rows, ventanaMA, soloVentas]);

// 🔹 Si no hay datos, no renderizamos nada
if (!Array.isArray(serieFinal) || serieFinal.length === 0) {
  return null;
}

// 🔹 Solo devolvemos el gráfico, sin tarjeta blanca extra
return (
  <TrendLine
    data={serieFinal}
    xKey="fecha"
    yKey="ventas"
    avgKey="ma7"
    xLabel={xLabel}
    yLabel={yLabel}
    height={height}
  />
);
}
