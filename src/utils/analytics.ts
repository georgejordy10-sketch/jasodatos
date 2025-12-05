// src/utils/analytics.ts
import type { Row } from '@/utils/helpers';
import {
  toNumber,
  parseDateLike,
  safeDateRange,    // ✅ usa el centralizado
  computeDelta,     // ✅ usa el centralizado (devuelve %)
} from '@/utils/helpers';

/** Serie { fecha, total } para TrendLine (respeta orden ascendente) */
export function ventasPorFecha(rows: Row[]) {
  const byDay = new Map<string, number>();
  for (const r of rows) {
    const d = parseDateLike((r as any).fecha);
    if (!d) continue;
    const fecha = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const v = toNumber((r as any).cantidad) * toNumber((r as any).precio_unitario);
    byDay.set(fecha, (byDay.get(fecha) ?? 0) + v);
  }
  return [...byDay.entries()]
    .map(([fecha, total]) => ({ fecha, total }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

/** Serie larga { fecha, canal, total } (útil si pivotas dentro del chart) */
export function ventasPorFechaYCanal(rows: Row[]) {
  const map = new Map<string, number>(); // key = YYYY-MM-DD|canal
  for (const r of rows) {
    const d = parseDateLike((r as any).fecha);
    if (!d) continue;
    const fecha = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const canal = String((r as any).canal ?? '—');
    const total = toNumber((r as any).cantidad) * toNumber((r as any).precio_unitario);
    const key = `${fecha}|${canal}`;
    map.set(key, (map.get(key) ?? 0) + total);
  }
  return [...map.entries()]
    .map(([k, total]) => {
      const [fecha, canal] = k.split('|');
      return { fecha, canal, total };
    })
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

/** Donut: participación por producto */
export function participacionPorProducto(rows: Row[]) {
  const totalGeneral = rows.reduce(
    (acc, r) => acc + toNumber((r as any).cantidad) * toNumber((r as any).precio_unitario),
    0
  );
  const by = new Map<string, number>();
  for (const r of rows) {
    const p = String((r as any).producto ?? '—');
    const v = toNumber((r as any).cantidad) * toNumber((r as any).precio_unitario);
    by.set(p, (by.get(p) ?? 0) + v);
  }
  const items = [...by.entries()]
    .map(([producto, total]) => ({ producto, total, pct: totalGeneral ? (total / totalGeneral) * 100 : 0 }))
    .sort((a, b) => b.total - a.total);
  return { totalGeneral, items };
}

/** KPIs: últimos 7 días vs 7 días previos (usa helpers centralizados) */
export function kpisUlt7VsPrev(rows: Row[], ref: Date = new Date()) {
  const { desde, hasta } = safeDateRange(ref, 7);
  const prevHasta = new Date(desde); prevHasta.setDate(prevHasta.getDate() - 1);
  const prevDesde = new Date(prevHasta); prevDesde.setDate(prevDesde.getDate() - 6);

  const inRange = (r: Row, a: Date, b: Date) => {
    const d = parseDateLike((r as any).fecha);
    return !!(d && d >= a && d <= b);
  };

  const cur = rows.filter((r) => inRange(r, desde, hasta));
  const prev = rows.filter((r) => inRange(r, prevDesde, prevHasta));

  const ventas = (xs: Row[]) =>
    xs.reduce((t, r) => t + toNumber((r as any).cantidad) * toNumber((r as any).precio_unitario), 0);
  const unidades = (xs: Row[]) => xs.reduce((t, r) => t + toNumber((r as any).cantidad), 0);

  const vCur = ventas(cur);
  const vPrev = ventas(prev);
  const uCur = unidades(cur);

  return {
    rangoActual: { desde, hasta },
    rangoPrevio: { desde: prevDesde, hasta: prevHasta },
    ventasTotales: vCur,
    unidades: uCur,
    filasVisibles: rows.length,
    deltaVentasPct: computeDelta(vCur, vPrev), // porcentaje
  };
}

/** Producto estrella: top por monto en últimos 7 días + delta vs previo (en %) */
export function productoEstrella(rows: Row[], ref: Date = new Date()) {
  const { desde, hasta } = safeDateRange(ref, 7);
  const prevHasta = new Date(desde); prevHasta.setDate(prevHasta.getDate() - 1);
  const prevDesde = new Date(prevHasta); prevDesde.setDate(prevDesde.getDate() - 6);

  const inRange = (r: Row, a: Date, b: Date) => {
    const d = parseDateLike((r as any).fecha);
    return !!(d && d >= a && d <= b);
  };

  const agg = (subset: Row[]) => {
    const m = new Map<string, { monto: number; unidades: number }>();
    for (const r of subset) {
      const p = String((r as any).producto ?? '—');
      const q = toNumber((r as any).cantidad);
      const v = q * toNumber((r as any).precio_unitario);
      const it = m.get(p) ?? { monto: 0, unidades: 0 };
      it.monto += v; it.unidades += q;
      m.set(p, it);
    }
    return m;
  };

  const curMap = agg(rows.filter((r) => inRange(r, desde, hasta)));
  const prevMap = agg(rows.filter((r) => inRange(r, prevDesde, prevHasta)));

  const top = [...curMap.entries()]
    .map(([producto, cur]) => {
      const prev = prevMap.get(producto) ?? { monto: 0, unidades: 0 };
      return {
        producto,
        monto: cur.monto,
        unidades: cur.unidades,
        deltaPct: computeDelta(cur.monto, prev.monto),
      };
    })
    .sort((a, b) => b.monto - a.monto)[0];

  return top ?? { producto: '—', monto: 0, unidades: 0, deltaPct: 0 };
}

/** Stock en riesgo: usa stock_minimo si existe; si no, umbralGlobal */
export function stockEnRiesgo(
  stockMap: Map<string, { producto: string; entradas: number; ventas: number; stock: number; stockMinimo?: number }>,
  umbralGlobal = 5
) {
  const out: { sku: string; producto: string; stock: number; stockMinimo?: number }[] = [];
  stockMap.forEach((it, sku) => {
    const min = it.stockMinimo ?? umbralGlobal;
    if (it.stock <= min) out.push({ sku, producto: it.producto, stock: it.stock, stockMinimo: it.stockMinimo });
  });
  return out.sort((a, b) => a.stock - b.stock);
}

/** Link/Texto para WhatsApp de promo */
export function buildWhatsAppPromo({
  producto,
  descuentoPct,
  url,
  precio,
  telefono,
  copiar = false,
}: {
  producto: string;
  descuentoPct: number;
  url?: string;
  precio?: number;
  telefono?: string;
  copiar?: boolean;
}) {
  const mensaje = `🔥 Promo ${descuentoPct}% en ${producto}${precio != null ? ` a $${precio.toFixed(2)}` : ''}. ${url ?? ''}`.trim();
  const wa = `https://wa.me/${telefono ?? ''}?text=${encodeURIComponent(mensaje)}`;
  if (copiar && typeof navigator !== 'undefined' && navigator.clipboard) {
    navigator.clipboard.writeText(mensaje).catch(() => {});
  }
  return { url: wa, mensaje };
}
