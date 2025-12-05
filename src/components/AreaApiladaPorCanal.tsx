'use client';

import { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

// Reutiliza el tipo Row genérico
type Row = Record<string, unknown>;

// Construye data pivotada { fecha, canalA, canalB, ..., total }
function buildPorFechaCanal(base: Row[]) {
  const map = new Map<string, Record<string, number>>();

  for (const r of base) {
    const fecha = String((r as any).fecha ?? '').slice(0, 10) || '—';
    const canal = String((r as any).canal ?? '—');
    const q = Number((r as any).cantidad ?? 0);
    const p = Number((r as any).precio_unitario ?? 0);
    const v =
      (Number.isFinite(q) ? q : 0) * (Number.isFinite(p) ? p : 0);

    if (!map.has(fecha)) map.set(fecha, { total: 0 });
    const obj = map.get(fecha)!;
    obj[canal] = (obj[canal] ?? 0) + v;
    obj.total += v;
  }

  const fechas = [...map.keys()].sort();
  const canales = new Set<string>();

  map.forEach((o) => {
    Object.keys(o).forEach((k) => {
      if (k !== 'total') canales.add(k);
    });
  });

  const data = fechas.map((f) => ({ fecha: f, ...(map.get(f) as any) }));
  return { data, canales: [...canales] };
}

function AreaApiladaPorCanal({
  base,
  data,
  fmtMoney = (n: number) =>
    n.toLocaleString('es-EC', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }),
  // colores vivos
  colors = [
    '#2563EB', // azul fuerte
    '#10B981', // verde
    '#F59E0B', // naranja
    '#EF4444', // rojo
    '#8B5CF6', // violeta
    '#14B8A6', // teal
  ],
}: {
  base?: Row[];
  data?: Array<Record<string, unknown>>;
  fmtMoney?: (n: number) => string;
  colors?: string[];
}) {
  const computed = useMemo(() => {
    if (data && data.length) {
      const canales = new Set<string>();
      data.forEach((row) => {
        Object.keys(row).forEach((k) => {
          if (k !== 'fecha' && k !== 'total') canales.add(k);
        });
      });
      return { data, canales: [...canales] as string[] };
    }
    const src = base ?? [];
    return buildPorFechaCanal(src);
  }, [base, data]);

  const fmtMoneyAxis = (v: any) => {
    const n = Number(v) || 0;
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
    return String(n.toFixed(0));
  };

  return (
    <div style={{ height: 335, width: '100%' }}>
      <ResponsiveContainer>
        <AreaChart
          data={computed.data}
          margin={{ left: 16, right: 16, top: 20, bottom: 10 }}
        >
          {/* Grid muy suave */}
          <CartesianGrid
            vertical={false}
            stroke="rgba(255,255,255,0.08)"
            strokeDasharray="4 4"
          />

          {/* Eje X: fechas en blanco */}
          <XAxis
            dataKey="fecha"
            tick={{ fill: '#F5F5F5', fontSize: 11 }}
            axisLine={{ stroke: '#F5F5F5', strokeWidth: 1 }}
            tickLine={{ stroke: '#F5F5F5', strokeWidth: 1 }}
            tickMargin={8}
          />

          {/* Eje Y: valores 200,400,600,800 en blanco */}
   <YAxis
  width={80}
  tickFormatter={(v: any) =>
    `$${Number(v).toLocaleString('es-EC', {
      maximumFractionDigits: 0,
    })}`
  }
  tick={{ fill: '#F5F5F5', fontSize: 12 }}   // ← blanco f5f5f5
  axisLine={{ stroke: '#F5F5F5' }}          // ← línea eje blanca
  tickLine={{ stroke: '#F5F5F5' }}          // ← marcas blancas
/>
          {/* Tooltip oscuro elegante */}
          <Tooltip
            contentStyle={{
              background: '#020617',
              border: '1px solid #4B5563',
              borderRadius: 8,
              color: '#E5E7EB',
              fontSize: 11,
            }}
            formatter={(v) => fmtMoney(Number(v))}
            labelStyle={{ color: '#F5F5F5', fontWeight: 700 }}
          />

          {/* Leyenda en blanco */}
          <Legend
            verticalAlign="bottom"
            align="center"
            wrapperStyle={{ paddingTop: 8 }}
            formatter={(value) => (
              <span style={{ color: '#F5F5F5', fontSize: 11 }}>
                {value}
              </span>
            )}
          />

          {computed.canales.length === 0 ? (
            <Area
              type="monotone"
              dataKey="total"
              stroke="#F5F5F5"      // borde blanco
              strokeWidth={2}
              fill={colors[0]}
              fillOpacity={0.65}
            />
          ) : (
            computed.canales.map((c, i) => (
              <Area
                key={c}
                type="monotone"
                dataKey={c}
                stackId="1"
                // relleno vivo
                fill={colors[i % colors.length]}
                fillOpacity={0.65}
                // borde blanco para todos los canales
                stroke="#F5F5F5"
                strokeWidth={2}
              />
            ))
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default AreaApiladaPorCanal;
