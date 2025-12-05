// src/utils/helpers.ts

/** Tipado genérico de fila */
export type Row = Record<string, unknown>;

/** Normaliza encabezados para matching robusto:
 * - minúsculas
 * - quita tildes
 * - espacios/guiones -> _
 * - remueve símbolos raros
 */
export function normalizeHeader(h: unknown) {
  return String(h ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .trim().toLowerCase()
    .replace(/\s+/g, '_').replace(/-+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

/** Normaliza texto libre para comparación (filtros):
 * - minúsculas
 * - quita tildes
 * - colapsa espacios
 * - preserva letras/números/espacio/._ y quita el resto
 */
export function normalizeText(v: unknown) {
  return String(v ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .trim().toLowerCase()
    .replace(/\s+/g, ' ').replace(/-+/g, ' ')
    .replace(/[^\p{L}\p{N}\s._]/gu, '');
}

/** Número robusto (LATAM/US):
 * Soporta:
 *  - $ 1.234,56   → 1234.56
 *  - 1,234.56     → 1234.56
 *  - 1234,56      → 1234.56 (cuando hay 2 decimales al final)
 *  - (1.234,56)   → -1234.56
 *  - -1 234,56    → -1234.56
 *  - 1 234.56     → 1234.56
 * Quita símbolos de moneda y decide separador decimal por heurística.
 */
export function toNumber(x: unknown): number {
  // 1) Si ya es number y finito, devuélvelo
  if (typeof x === 'number' && Number.isFinite(x)) return x;

  // 2) Normaliza a string
  let s = String(x ?? '').trim();
  if (!s) return 0;

  // 3) Maneja negativos estilo paréntesis o con '-'
  let sign = 1;
  if (/^\(.*\)$/.test(s)) {
    sign = -1;
    s = s.slice(1, -1).trim();
  } else if (s.startsWith('-')) {
    sign = -1;
    s = s.slice(1).trim();
  }

  // 4) Quita todo menos dígitos, coma, punto y guion (por si quedan)
  s = s.replace(/[^\d,.\-]/g, '');
  if (!s) return 0;

  // 5) Determina separador decimal
  const hasComma = s.includes(',');
  const hasDot = s.includes('.');
  let decimalSep: ',' | '.' | '' = '';

  if (hasComma && hasDot) {
    // El decimal será el que aparezca MÁS a la derecha
    decimalSep = s.lastIndexOf(',') > s.lastIndexOf('.') ? ',' : '.';
  } else if (hasComma) {
    // Solo coma: si hay exactamente 2 dígitos al final, trátala como decimal
    const idx = s.lastIndexOf(',');
    const digitsAfter = s.length - idx - 1;
    decimalSep = digitsAfter === 2 ? ',' : '';
  } else if (hasDot) {
    // Solo punto: si hay exactamente 2 dígitos al final, trátalo como decimal
    const idx = s.lastIndexOf('.');
    const digitsAfter = s.length - idx - 1;
    decimalSep = digitsAfter === 2 ? '.' : '';
  }

  // 6) Normaliza: quita separadores de miles y deja '.' como decimal
  if (decimalSep === ',') {
    // quitar puntos de miles y convertir coma a punto
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (decimalSep === '.') {
    // quitar comas de miles
    s = s.replace(/,/g, '');
  } else {
    // sin decimal claro: quita ambos
    s = s.replace(/[.,]/g, '');
  }

  const n = Number(s);
  return Number.isFinite(n) ? sign * n : 0;
}

/** Fechas: ISO/DMY, aplana a medianoche local */
export function parseDateLike(s: unknown): Date | null {
  const raw = String(s ?? '').trim();
  if (!raw) return null;

  // ISO (YYYY-MM-DD o con hora)
  if (/^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2})?)?/.test(raw)) {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return null;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  // DMY con / o -
  const dmy = /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/;
  const m1 = raw.match(dmy);
  if (m1) {
    const dd = Number(m1[1]), mm = Number(m1[2]) - 1, yyyy = Number(m1[3]);
    const d = new Date(yyyy, mm, dd);
    return isNaN(d.getTime()) ? null : d;
  }

  // Último intento: Date nativo
  const d = new Date(raw);
  if (isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Rango seguro: últimos N días (incluye hoy/hasta) */
export function safeDateRange(end: Date, days: number) {
  const hasta = new Date(end); hasta.setHours(23, 59, 59, 999);
  const desde = new Date(hasta); desde.setDate(desde.getDate() - (days - 1)); desde.setHours(0, 0, 0, 0);
  return { desde, hasta };
}

/** Delta % limpio (0 si prev=0). Ojo: retorna PORCENTAJE, no ratio. */
export function computeDelta(cur: number, prev: number) {
  if (!prev) return 0;
  return ((cur - prev) / prev) * 100;
}

/** Copiar al portapapeles (seguro en navegador) */
export function copyToClipboard(t: string) {
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    navigator.clipboard.writeText(t).catch(() => {});
  }
}

/** Stock por SKU robusto (soporta sinónimos y cantidades negativas como ventas) */
export function buildStockPorSku(rows: Row[]) {
  const m = new Map<string, { producto: string; entradas: number; ventas: number; stock: number; stockMinimo?: number }>();

  for (const r of rows) {
    const sku = String((r as any).sku ?? '').trim();
    if (!sku) continue;

    const producto = String((r as any).producto ?? '').trim();
    const tipo = String((r as any).tipo_movimiento ?? '').trim().toLowerCase();
    const qraw = toNumber((r as any).cantidad);
    const q = qraw < 0 ? -qraw : qraw;

    // Sinónimos
    const isEntrada = ['entrada', 'compra', 'ingreso'].includes(tipo) || (tipo === '' && qraw >= 0);
    const isVenta   = ['venta', 'salida', 'egreso'].includes(tipo)  || (qraw < 0);

    const stockMin = (r as any).stock_minimo != null ? toNumber((r as any).stock_minimo) : undefined;

    if (!m.has(sku)) m.set(sku, { producto, entradas: 0, ventas: 0, stock: 0, stockMinimo: stockMin });
    const it = m.get(sku)!;

    if (stockMin != null && (it.stockMinimo == null || stockMin > (it.stockMinimo ?? 0))) {
      it.stockMinimo = stockMin;
    }

    if (isEntrada && !isVenta) it.entradas += q;
    else if (isVenta) it.ventas += q;
  }

  for (const it of m.values()) it.stock = it.entradas - it.ventas;
  return m;
}

/** CSV download (BOM para Excel-friendly) */
export function downloadCSV(filename: string, rows: Array<Record<string, unknown>>) {
  if (!rows.length || typeof window === 'undefined') return;

  const headers = Object.keys(rows[0]);
  const escapeCSV = (v: unknown) => {
    const s = String(v ?? '');
    const needsQuotes = /[",\n;]/.test(s);
    const out = s.replace(/"/g, '""');
    return needsQuotes ? `"${out}"` : out;
    };

  const csv = [headers.join(',')]
    .concat(rows.map(r => headers.map(h => escapeCSV((r as any)[h])).join(',')))
    .join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

/** === Helpers de tendencia (ADD-ON, no rompe nada) ======================= */
export type VentasRow = Row & {
  fecha?: unknown;              // "YYYY-MM-DD" o dd/mm/yyyy
  date?: unknown;               // alias aceptado
  tipo_movimiento?: unknown;    // 'venta' | 'salida' | 'egreso' | 'entrada' | ...
  cantidad?: unknown;
  qty?: unknown;                // alias
  precio_unitario?: unknown;
  price?: unknown;              // alias
};

type TrendOpts = {
  /** si true, usa solo movimientos de salida/venta/egreso (o cantidad negativa) */
  soloVentas?: boolean;
  /** ventana del promedio móvil (default 7) */
  ventanaMA?: number;
};

/** Resuelve el valor de una clave intentando sinónimos en orden (case-insensitive) */
function pick<T = unknown>(r: Row, keys: string[], fallback?: T): T | undefined {
  const dict: Record<string, string> = {};
  for (const k of Object.keys(r)) dict[k.toLowerCase()] = k;
  for (const k of keys) {
    const real = dict[k.toLowerCase()];
    if (real != null) {
      const v = (r as any)[real];
      if (v !== undefined && v !== null && String(v).trim() !== '') return v as T;
    }
  }
  return fallback;
}

/** Convierte a fecha ISO yyyy-mm-dd (si puede) */
function toIsoDay(v: unknown): string | null {
  const d = parseDateLike(v);
  if (!d) return null;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Construye serie diaria de ventas:
 *  - ventas = cantidad * precio_unitario agregadas por día
 *  - ma7 = promedio móvil de n días (ventanaMA)
 * Acepta sinónimos de columnas: fecha|date, cantidad|qty, precio_unitario|price
 */
export function buildTrend(rows: VentasRow[], opts: TrendOpts = {}) {
  const { soloVentas = false, ventanaMA = 7 } = opts;

  const byDay = new Map<string, number>();

  for (const r of rows) {
    // fecha (soporta 'fecha' o 'date', y varios formatos)
    const iso = toIsoDay(pick(r, ['fecha', 'date']));
    if (!iso) continue;

    // cantidad y precio (acepta alias y formatos con comas/moneda)
    const q = toNumber(pick(r, ['cantidad', 'qty'], 0));
    const p = toNumber(pick(r, ['precio_unitario', 'price'], 0));

    // tipo de movimiento
    const tipo = normalizeText(pick(r, ['tipo_movimiento'], '')).trim();

    // ¿filtramos solo ventas?
    if (soloVentas) {
      const esSalida = ['venta', 'salida', 'egreso'].includes(tipo) || q < 0;
      if (!esSalida) continue;
    }

    // si la cantidad llega negativa, la tratamos como venta (valor positivo de importe)
    const qtyAbs = Math.abs(q);
    const importe = qtyAbs * p;

    byDay.set(iso, (byDay.get(iso) ?? 0) + importe);
  }

  // serie ordenada
  const dias = [...byDay.keys()].sort();
  const serie = dias.map(d => ({ fecha: d, ventas: byDay.get(d)! }));

  // promedio móvils
  const win = Math.max(1, ventanaMA | 0);
  let acc = 0;
  const buf: number[] = [];
  for (let i = 0; i < serie.length; i++) {
    acc += serie[i].ventas;
    buf.push(serie[i].ventas);
    if (buf.length > win) acc -= buf.shift()!;
    (serie as any)[i].ma7 = acc / buf.length;
  }

  return serie as Array<{ fecha: string; ventas: number; ma7: number }>;
}

/** (Opcional) formateadores de ticks para Recharts */
export const fmtTickMiles = (n: number) => Number(n).toLocaleString('es-EC');
export const fmtTickDDMM = (isoLike: string) =>
  typeof isoLike === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(isoLike)
    ? `${isoLike.slice(8, 10)}/${isoLike.slice(5, 7)}`
    : String(isoLike);
