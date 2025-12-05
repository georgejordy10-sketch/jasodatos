'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback, type ChangeEvent } from 'react';
import Papa, { type ParseError, type ParseResult } from 'papaparse';
import dynamic from 'next/dynamic';
import { fmtMoney } from '@/components/Charts';
import {
  REQUIRED_COLUMNS as REQ_MIN,
  ALL_COLUMNS,
  columnasNumericas,
  ENUMS,
  CONDITIONAL_REQUIRED,
} from '@/csv/config';
import JasoBotQA from '@/components/JasoBotQA';

// ===== Alias de encabezados (canonización) =====
const HEADER_ALIASES: Record<string, string> = {
  fecha_emision: 'fecha',
  fecha_doc: 'fecha',
  tienda: 'sucursal',
  almacen: 'bodega',
  codigo: 'sku',
  descripcion: 'producto',
  producto_nombre: 'producto',
  movimiento: 'tipo_movimiento',
  tipo: 'tipo_movimiento',
  cant: 'cantidad',
  cantidad_total: 'cantidad',
  precio: 'precio_unitario',
  precio_total: 'precio_unitario',
  costo: 'costo_unitario',
  canal_venta: 'canal',
  fuente: 'origen_registro',
};

// Tipado base
type Row = Record<string, unknown>;
type MiniBarsProps = {
  data?: { key: string; total: number }[];
  currency?: boolean;
};

// === Helpers visuales (arriba para evitar choques con JSX al final) ===
function MiniBars({ data = [], currency = false }: MiniBarsProps) {
  const UI_FONT: React.CSSProperties = {
    fontFamily:
      '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
    letterSpacing: '-0.01em',
    lineHeight: 1.5,
    fontWeight: 500,
    fontSize: 14,
  };

  if (!data.length) {
    return <div style={{ ...UI_FONT, color: '#666' }}>Sin datos suficientes.</div>;
  }

  const MAX_LABEL = 40;
  const nums = data.map((d) => (Number.isFinite(d.total) ? Number(d.total) : 0));
  const max = Math.max(1, ...nums);

  const format = (n: number) =>
    currency
      ? n.toLocaleString('es-EC', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
      : n.toLocaleString('es-EC');

  return (
    <div style={{ ...UI_FONT, display: 'grid', gridTemplateColumns: '1fr', gap: 6 }}>
      {data.map((d) => {
        const total = Number.isFinite(d.total) ? Number(d.total) : 0;
        const pct = Math.max(0, total / max);
        const label = d.key?.slice(0, MAX_LABEL) ?? '—';

        return (
          <div
            key={d.key}
            style={{
              ...UI_FONT,
              display: 'grid',
              gridTemplateColumns: '140px 1fr 100px',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {/* Etiqueta */}
            <span style={{ ...UI_FONT, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {label}
            </span>

            {/* Barra */}
            <div style={{ height: 8, borderRadius: 6, background: '#e5e7eb', overflow: 'hidden' }}>
              <div style={{ width: `${pct * 100}%`, height: '100%', background: '#1D4ED8' }} />
            </div>

            {/* Valor */}
            <span style={{ ...UI_FONT, fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
              {format(total)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
// ===== Stock en Riesgo =====
function LowStockBars({
  items = [],
  threshold = 20,
  maxItems = 9,
  showLegend = true,
  scaleMode = 'threshold',  // 'threshold' | 'max'
  riskBufferPct = 0.30,     // % por encima del umbral que todavía cuenta como "en riesgo"
}: {
  items?: { sku: string; producto: string; stock: number }[];
  threshold?: number;
  maxItems?: number;
  showLegend?: boolean;
  scaleMode?: 'threshold' | 'max';
  riskBufferPct?: number;
}) {
  // Datos base
  const data = Array.isArray(items) ? items.slice(0, maxItems) : [];
  const stocks: number[] = data.map((d) => {
    const v = Number((d as any)?.stock ?? 0);
    return Number.isFinite(v) ? v : 0;
  });

  // Utils
  const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
  const coveragePct = (s: number) => clamp01(s / Math.max(1, threshold));

  // Escala visual de la barra
  const barDen = (() => {
    if (scaleMode === 'max') {
      const maxSeen = Math.max(...stocks, threshold);
      return Math.max(1, maxSeen);
    }
    // Escala centrada en umbral con un pequeño colchón
    return Math.max(1, threshold * (1 + Math.max(0, riskBufferPct) * 0.35));
  })();
  const barPct = (s: number) => clamp01(s / barDen);

  // Namespace local para evitar colisiones
  const LSB = {
    UI: {
      CRITICO: '#EF4444',           // rojo intenso
      RIESGO: '#F59E0B',            // amarillo intenso
      BIEN: '#16A34A',              // verde
      TRACK: 'rgba(15,23,42,0.24)', // riel
      TICK: 'rgba(255,255,255,0.65)',
      TXT: '#F9FAFB',
    },
    statusFor(s: number): 'critico' | 'riesgo' | 'bien' {
      if (s <= 0 || s < threshold * 0.25) return 'critico'; // <25% del umbral
      if (s < threshold) return 'riesgo';                   // por debajo del umbral
      if (s < threshold * (1 + Math.max(0, riskBufferPct))) return 'riesgo'; // levemente sobre umbral
      return 'bien';
    },
    colorFor(st: 'critico' | 'riesgo' | 'bien') {
      return st === 'critico'
        ? this.UI.CRITICO
        : st === 'riesgo'
        ? this.UI.RIESGO
        : this.UI.BIEN;
    },
  };

  // Conteos para la leyenda
  const stockCounts = stocks.reduce(
    (acc, s) => {
      const st = LSB.statusFor(s);
      if (st === 'critico') acc.crit++;
      else if (st === 'riesgo') acc.risk++;
      else acc.ok++;
      return acc;
    },
    { crit: 0, risk: 0, ok: 0 },
  );

  // KPI global
  const medianPct = (() => {
    if (!stocks.length) return 0;
    const arr = stocks.map(coveragePct).sort((a, b) => a - b);
    const mid = Math.floor(arr.length / 2);
    return Math.round(
      (arr.length % 2 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2) * 100,
    );
  })();

  // posición del marcador de umbral en la barra (0–100)
  const markerPct = clamp01(threshold / Math.max(1, barDen)) * 100;

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {/* Leyenda + resumen en 3 líneas */}
      {showLegend && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: 4,
            color: LSB.UI.TXT,
            fontSize: 12,
          }}
        >
          {/* Línea 1: chips de estado */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <i
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: LSB.UI.CRITICO,
                }}
              />
              Críticos {stockCounts.crit}
            </span>

            <span
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <i
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: LSB.UI.RIESGO,
                }}
              />
              En riesgo {stockCounts.risk}
            </span>

            <span
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <i
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: LSB.UI.BIEN,
                }}
              />
              Bien {stockCounts.ok}
            </span>
          </div>

          {/* Línea 2: título compacto + regla */}
          <div style={{ fontWeight: 700, fontSize: 12 }}>
            Stock en riesgo · Regla: mínimo {threshold} unidades
          </div>

          {/* Línea 3: Nivel típico, más suave */}
          <div style={{ fontSize: 11, opacity: 0.9 }}>
            Nivel típico: {medianPct}%
          </div>
        </div>
      )}
      {/* Encabezado de la grilla */}
<div
  style={{
    display: 'grid',
    gridTemplateColumns: 'minmax(180px,1fr) 1.7fr 80px',
    gap: 10,
    color: LSB.UI.TXT,
    fontSize: 11,
  }}
>
  {/* Columna producto (vacía en header) */}
  <div />

  {/* Columna barras: eje de porcentajes + título */}
  <div
    style={{
      position: 'relative',
      height: 22,
    }}
  >
    {/* Título Cobertura centrado sobre la barra */}
    <div
      style={{
        position: 'absolute',
        top: -14,
        left: '50%',
        transform: 'translateX(-50%)',
        fontWeight: 700,
      }}
    >
      Cobertura
    </div>

    {/* Ticks 0–100% */}
    {[0, 20, 40, 60, 80, 100].map((t) => (
      <span
        key={t}
        style={{
          position: 'absolute',
          left: `${t}%`,
          top: 4,
          transform: 'translateX(-50%)',
          color: LSB.UI.TICK,
          fontWeight: 700,
          fontSize: 9,
          lineHeight: 1,
        }}
      >
        {t}%
      </span>
    ))}
  </div>

  {/* Título Stock centrado en su columna, sin irse a la derecha */}
  <div
    style={{
      alignSelf: 'end',
      justifySelf: 'center',
      textAlign: 'center',
      fontSize: 11,
      fontWeight: 700,
      color: LSB.UI.TXT,
    }}
  >
    Stock
  </div>
</div>
      {/* Filas */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(180px,1fr) 1.7fr 96px',
          columnGap: 10,
          rowGap: 6,
          alignItems: 'center',
          fontSize: 11,
          color: LSB.UI.TXT,
        }}
      >
           {/* Cuerpo de filas */}
      {data.map((item, idx) => {
        const s = stocks[idx] ?? 0;
        const pctCover = coveragePct(s) * 100;
        const pctBar   = barPct(s) * 100;
        const status   = LSB.statusFor(s);
        const barColor = LSB.colorFor(status);

        const stockFmt = Number.isFinite(s)
          ? s.toLocaleString('es-EC')
          : String(s ?? 0);

        const rightMsg =
          status === 'critico'
            ? 'Sin unidades'
            : `Hay ${stockFmt} unidades`;

        const stockTxtColor =
          status === 'critico'
            ? LSB.UI.CRITICO
            : status === 'riesgo'
            ? LSB.UI.RIESGO
            : LSB.UI.BIEN;

        return (
          <React.Fragment
            key={item.sku || item.producto || `stock-row-${idx}`}
          >
            {/* Columna producto */}
            <div
              style={{
                fontSize: 11,
                color: LSB.UI.TXT,
                paddingRight: 4,
                textAlign: 'left',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={`${item.producto} (${item.sku})`}
            >
              {item.producto}
            </div>

            {/* Columna barra de cobertura */}
            <div style={{ position: 'relative', height: 18 }}>
              {/* riel */}
              <div
                style={{
                  position: 'absolute',
                  inset: '50% 0 auto 0',
                  transform: 'translateY(-50%)',
                  height: 8,
                  borderRadius: 999,
                  background: LSB.UI.TRACK,
                }}
              />

              {/* barra de progreso */}
              <div
                style={{
                  position: 'absolute',
                  inset: '50% auto auto 0',
                  transform: 'translateY(-50%)',
                  height: 8,
                  width: `${pctBar}%`,
                  maxWidth: '100%',
                  borderRadius: 999,
                  background: barColor,
                }}
              />

              {/* marcador de umbral */}
              <div
                style={{
                  position: 'absolute',
                  left: `${markerPct}%`,
                  top: 1,
                  bottom: 1,
                  width: 1,
                  background: 'rgba(255,255,255,0.9)',
                }}
              />

              {/* etiqueta “Umbral (20)” centrada arriba de la línea blanca */}
              <div
                style={{
                  position: 'absolute',
                  left: `${markerPct}%`,
                  top: -11,
                  transform: 'translateX(-50%)',
                  fontSize: 9,
                  color: LSB.UI.TICK,
                  whiteSpace: 'nowrap',
                }}
              >
                Umbral ({threshold})
              </div>

              {/* % actual al final de la barra */}
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: -2,
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#FFFFFF',
                }}
              >
                {Math.round(pctCover)}%
              </div>
            </div>

            {/* Columna Stock: etiqueta tipo “pill” en blanco */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-start', // 🔹 pegado más a la izquierda
              }}
            >
<div
  style={{
    textAlign: 'right',
    fontWeight: 900,
    fontSize: 12,                // 🔹 un pelín más grande
    lineHeight: 1.1,
    whiteSpace: 'nowrap',
    color: stockTxtColor,        // rojo / naranja / verde
    textShadow:
      '0 0 4px rgba(0,0,0,0.55),' + // 🔹 halo oscuro suave
      '0 0 1px rgba(0,0,0,0.9)',   // micro-contraste
  }}
>
  {rightMsg}
</div>
            </div>
          </React.Fragment>
        );
      })}
      </div>
    </div>
  );
}
// === Constantes top-level (fuera del componente) ===
const BIG_FILE_THRESHOLD = 300 * 1024 * 1024;   // 300MB
const PREVIEW_BUFFER_MAX = 50_000;              // máx filas en buffer previo (solo vista)
const STREAMING = true;                         // agrega filas mientras parsea
const CHUNK_SIZE = 1024 * 1024 * 2;             // ~2MB por chunk (puedes subir si tu máquina aguanta)
const FLUSH_MS = 150;                           // flush cada ~150ms (120–200ms recomendado)
const FLUSH_ROWS = 5_000;                       // filas por flush (2k–10k razonable)

// 💡 Tope de filas para la UI (evita reventar RAM con gigas)
const MAX_ROWS_IN_MEMORY = 100_000;             // vista UI segura; KPIs/gráficas usan 100% del archivo
// === BRAND (paleta Cassini) ===
const BRAND = {
  ORANGE: '#F78636',
  BLACK: '#121211',
  WHITE: '#FFFFFF',
  BLUE: '#4f46e5',       
  BLUE_DARK: '#00B8C9',  
};

// Carga de charts en CSR (evita mismatches por SSR)
const DonutProductos = dynamic(() => import('@/components/Charts').then(m => m.DonutProductos), { ssr: false });
const AreaApiladaPorCanal = dynamic(() => import('@/components/Charts').then(m => m.AreaApiladaPorCanal), { ssr: false });
const Kpi = dynamic(() => import('@/components/Charts').then(m => m.Kpi), { ssr: false });
const TrendLine = dynamic(() => import('@/components/Charts').then(m => m.TrendLine), { ssr: false });

/* ===== ErrorBoundary local (opcional, no usado abajo) ===== */
function SectionFallback({ onRetry, error }: { onRetry?: () => void; error?: unknown }) {
  return (
    <div
      style={{
        padding: 12,
        border: '1px solid #f59e0b',
        background: '#fff7ed',
        color: '#7c2d12',
        borderRadius: 10,
        marginTop: 12,
      }}
    >
      <strong>Ups, esta sección no pudo renderizarse.</strong>
      <div style={{ fontSize: 12, marginTop: 6 }}>
        {error ? String((error as any)?.message ?? error) : 'Intenta nuevamente.'}
      </div>
      <div style={{ marginTop: 10 }}>
        <button
          onClick={onRetry}
          style={{
            padding: '6px 10px',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            background: '#fff',
            cursor: 'pointer',
          }}
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: any; version: number }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: undefined, version: 0 };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, info: any) {
    console.error('SafeSection error:', error, info);
  }
  private reset = () => {
    this.setState((s) => ({ hasError: false, error: undefined, version: s.version + 1 }));
  };
  render() {
    if (this.state.hasError) {
      return <SectionFallback onRetry={this.reset} error={this.state.error} />;
    }
    return <React.Fragment key={this.state.version}>{this.props.children}</React.Fragment>;
  }
}

/* =======================
   Helpers
======================= */

function copyToClipboard(t: string) {
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    navigator.clipboard.writeText(t).catch(() => { });
  }
}

function normalizeHeader(h: unknown) {
  return String(h ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .trim().toLowerCase()
    .replace(/\s+/g, '_').replace(/-+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

function normalizeText(v: unknown) {
  return String(v ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .trim().toLowerCase()
    .replace(/\s+/g, ' ').replace(/-+/g, ' ')
    .replace(/[^\p{L}\p{N}\s._]/gu, '');
}

function toNumber(x: unknown): number {
  if (typeof x === 'number') return Number.isFinite(x) ? x : 0;
  const s = String(x ?? '').trim();
  if (!s) return 0;
  const compact = s.replace(/\s/g, '');

  // ES: 1.234,56 -> 1234.56
  if (/^\d{1,3}(\.\d{3})+,\d+$/.test(compact)) {
    const normalized = compact.replace(/\./g, '').replace(',', '.');
    const n = Number(normalized);
    return Number.isFinite(n) ? n : 0;
  }
  // EN: 1,234.56 -> 1234.56
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(compact)) {
    const n = Number(compact.replace(/,/g, ''));
    return Number.isFinite(n) ? n : 0;
  }
  const n = Number(compact.replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function parseDateLike(s: unknown): Date | null {
  const raw = String(s ?? '').trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  }
  const m = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (m) {
    const dd = Number(m[1]), mm = Number(m[2]) - 1, yyyy = Number(m[3]);
    const d = new Date(yyyy, mm, dd);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

function ventasMonto(rows: Row[]) {
  let total = 0;
  for (const r of rows) {
    if (String((r as any).tipo_movimiento ?? '').toLowerCase() === 'venta') {
      const q = toNumber((r as any).cantidad);
      const p = toNumber((r as any).precio_unitario);
      total += q * p;
    }
  }
  return total;
}

function buildStockPorSku(rows: Row[]) {
  const m = new Map<string, { producto: string; entradas: number; ventas: number; stock: number }>();
  for (const r of rows) {
    const sku = String((r as any).sku ?? '').trim();
    if (!sku) continue;
    const prod = String((r as any).producto ?? '').trim();
    const tipo = String((r as any).tipo_movimiento ?? '').toLowerCase();
    const q = toNumber((r as any).cantidad);

    if (!m.has(sku)) m.set(sku, { producto: prod, entradas: 0, ventas: 0, stock: 0 });
    const it = m.get(sku)!;
    if (tipo === 'entrada') it.entradas += q;
    else if (tipo === 'venta') it.ventas += q;
  }
  for (const it of m.values()) it.stock = it.entradas - it.ventas;
  return m;
}

function groupSum<T extends Record<string, unknown>>(data: T[], key: string, valueMapper: (row: T) => number) {
  const map = new Map<string, number>();
  for (const r of data) {
    const k = String((r as any)[key] ?? (r as any)[normalizeHeader(key)] ?? '—') || '—';
    const add = valueMapper(r);
    map.set(k, (map.get(k) ?? 0) + add);
  }
  return [...map.entries()]
    .map(([k, total]) => ({ key: k, total }))
    .sort((a, b) => b.total - a.total);
}

// Exportador genérico con headers opcionales y BOM
function downloadCSV(
  filename: string,
  rows: Array<Record<string, unknown>>,
  headers?: string[]
) {
  if (typeof window === 'undefined') return;

  const cols = headers && headers.length
    ? headers
    : (rows[0] ? Object.keys(rows[0]) : []);

  const esc = (v: unknown) => {
    const s = String(v ?? '');
    const needsQuotes = /[",\n;]/.test(s);
    const out = s.replace(/"/g, '""');
    return needsQuotes ? `"${out}"` : out;
  };

  const lines: string[] = [];
  lines.push(cols.join(','));
  for (const r of rows) {
    lines.push(cols.map((h) => esc((r as any)[h])).join(','));
  }
  const csv = lines.join('\r\n');

  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

// Plantilla canónica JasoDatos (solo encabezados)
function descargarPlantillaCsv() {
  const cols = [
    'fecha','sucursal','bodega','sku','producto','tipo_movimiento',
    'cantidad','costo_unitario','precio_unitario','canal','origen_registro'
  ];
  downloadCSV('plantilla_jasodatos.csv', [], cols);
}

/* =======================
   Componente principal
======================= */
export default function CsvUploader({
  onRows,
}: {
  onRows?: (rows: Row[], headers?: string[]) => void;
}) {
  console.log('✅ CsvUploader montado');
  const [rows, setRows] = useState<Row[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [firstFlushDone, setFirstFlushDone] = useState(false);
  const SHOW_INVALID_BANNER = false;

  // Chat assistant (mantengo tu estado)
  const [qInput, setQInput] = useState('');
  const [reply, setReply] = useState('');
  const [loadingChat, setLoadingChat] = useState(false);
  const [heavyMode, setHeavyMode] = useState(false); // muestra banner "modo pesado"
  const [uiCapped, setUiCapped] = useState(false);   // avisa si la UI está limitada por tope de filas
  const SHOW_WA_PROMO = false;
  const [sendingWA, setSendingWA] = useState(false);
  const MAX_WA_CHARS = 900;
  const SHOW_UPLOAD_IN_HEADER = true;

  // Vista: Preview -> Análisis
  const [showAnalysis, setShowAnalysis] = useState(false);

  // === Filtros UI ===
  const [fEmpresa,  setFEmpresa]  = useState<string>('');
  const [fProducto, setFProducto] = useState<string>('');
  const [fDesde,    setFDesde]    = useState<string>(''); // YYYY-MM-DD
  const [fHasta,    setFHasta]    = useState<string>('');

  // === Badge dinámico para el donut (debajo de fDesde / fHasta)
const RANGE_BADGE = useMemo(() => {
  const now = new Date();
  const start = fDesde ? new Date(fDesde) : new Date(now.getFullYear(), 0, 1); // si no hay "desde" → YTD
  const end = fHasta ? new Date(fHasta) : now;
  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000));
  return days <= 8 ? '7D' : days <= 31 ? '30D' : 'YTD';
}, [fDesde, fHasta]);

  // ===== estilos reutilizables (VAN AQUÍ) =====
  const controlShell: React.CSSProperties = {
    borderRadius: 0,
    background: 'transparent',
    padding: 0,
    border: 'none',
    boxShadow: 'none',
  };

  const slot: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    padding: 0,
  };

  // 🔹 Añade ESTO justo debajo
  const pillBlue: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    padding: '10px 14px',
    borderRadius: 10,
    background: 'linear-gradient(180deg, #1E40AF 0%, #1D4ED8 100%)',
    color: '#FFFFFF',
    fontWeight: 800,
    border: '1px solid #1E40AF',
    boxShadow: '0 2px 6px rgba(59,130,246,0.25)',
  };

  const ellipsisText: React.CSSProperties = {
    maxWidth: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  // ===== Filtrado =====
  const filteredRows = useMemo(() => {
    if (!rows.length) return [];
    const dDesde = fDesde ? new Date(fDesde) : null;
    const dHasta = fHasta ? new Date(fHasta) : null;
    if (dHasta) dHasta.setHours(23, 59, 59, 999);

    return rows.filter((r: any) => {
      const okEmp   = !fEmpresa  || String(r.sucursal ?? r.empresa ?? '').toLowerCase() === String(fEmpresa).toLowerCase();
      const okProd  = !fProducto || String(r.producto ?? '').toLowerCase() === String(fProducto).toLowerCase();
      const fecha   = r.fecha ? new Date(r.fecha) : null;
      const okDesde = !fDesde || (fecha && dDesde && fecha >= dDesde);
      const okHasta = !fHasta || (fecha && dHasta && fecha <= dHasta);
      return okEmp && okProd && okDesde && okHasta;
    });
  }, [rows, fEmpresa, fProducto, fDesde, fHasta]);
  const HAS_DATA = (firstFlushDone && (filteredRows.length > 0 || rows.length > 0));
  const SHOW_FIRST_SCREEN = !HAS_DATA;

  async function openWhatsAppSafe(raw: string) {
    if (sendingWA) return;
    setSendingWA(true);

    const msg = (raw ?? '').trim().slice(0, MAX_WA_CHARS);
    const enc = encodeURIComponent(msg);

    const isMobile = (typeof navigator !== 'undefined')
      ? /Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent)
      : false;

    const urlMobileDeep = `whatsapp://send?text=${enc}`;
    const urlMobileHttp = `https://api.whatsapp.com/send?text=${enc}`;
    const urlDesktopWeb = `https://web.whatsapp.com/send?text=${enc}`;

    const primary = isMobile ? urlMobileDeep : urlDesktopWeb;
    const fallback = urlMobileHttp;

    try {
      const a = document.createElement('a');
      a.href = primary;
      a.target = '_blank';
      a.rel = 'noopener';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setTimeout(async () => {
        try {
          if (document.hasFocus()) {
            window.location.href = fallback;
          }
        } catch {
          try { await navigator.clipboard.writeText(msg); } catch { }
          alert('No pude abrir WhatsApp. El mensaje fue copiado; pégalo en WhatsApp.');
        }
      }, 300);
    } finally {
      setTimeout(() => setSendingWA(false), 900);
    }
  }

  // Progreso / worker (streaming)
  const parserRef = useRef<Papa.Parser | null>(null);
  const [parsedRowsCounter, setParsedRowsCounter] = useState(0);

  // agregados (si decides mostrarlos en vivo)
  const [agg, setAgg] = useState(() => ({
    totalRows: 0,
    ventas: 0,
    unidades: 0,
    porProducto: new Map<string, number>(),
    porEmpresa: new Map<string, number>(),
    porFecha: new Map<string, number>(),
  }));

  // === Tabla: paginación y columnas visibles ===
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const pageSizeOptions = [25, 50, 100, 200, 500];

  const visibleCols = useMemo(() => {
    if (Array.isArray(ALL_COLUMNS) && ALL_COLUMNS.length) return ALL_COLUMNS;
    if (headers?.length) return headers;
    if (filteredRows.length) return Object.keys(filteredRows[0] as Record<string, unknown>);
    return [];
  }, [headers, filteredRows]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredRows.length / pageSize)),
    [filteredRows.length, pageSize]
  );

  useEffect(() => {
    setPage(1);
  }, [pageSize, filteredRows.length]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  const hasTipoMovimiento = useMemo(() => {
    const hdrs = (Array.isArray(headers) && headers.length > 0)
      ? headers
      : Object.keys(rows?.[0] ?? {});
    const norm = (s: string) => normalizeHeader(s);
    return hdrs.map(norm).includes('tipo_movimiento');
  }, [headers, rows]);

const missingColumns = useMemo<string[]>(() => {
  const hdrs = (Array.isArray(headers) && headers.length > 0)
    ? headers
    : Object.keys(rows?.[0] ?? {});
  const norm = (s: string) => normalizeHeader(s);
  const normalizedHeaders = new Set(hdrs.map(norm));
  return (REQ_MIN ?? []).map(norm).filter((col) => !normalizedHeaders.has(col));
}, [headers, rows]);

// ✅ Mostrar “Columnas faltantes” solo tras carga real con faltantes
const SHOW_MISSING = !!firstFlushDone && (missingColumns?.length ?? 0) > 0;

// Nuevo: solo se puede explorar si NO hay columnas faltantes
const CAN_EXPLORE = HAS_DATA && !SHOW_MISSING;

// Pantalla 1: mostrar preview (tabla + CTA)
const SHOW_PREVIEW =
  firstFlushDone && !SHOW_MISSING && !showAnalysis && filteredRows.length > 0;

// (opcional) resets de navegación
useEffect(() => { if (SHOW_MISSING) setShowAnalysis(false); }, [SHOW_MISSING]);
useEffect(() => { if (firstFlushDone) setShowAnalysis(false); }, [firstFlushDone]);

// Resets de la vista (añádelos aquí, después de las flags):
useEffect(() => {
  if (SHOW_MISSING) setShowAnalysis(false);
}, [SHOW_MISSING]);

useEffect(() => {
  if (firstFlushDone) setShowAnalysis(false);
}, [firstFlushDone]);

  const unknownColumns = useMemo<string[]>(() => {
    const hdrs = (Array.isArray(headers) && headers.length > 0)
      ? headers
      : Object.keys(rows?.[0] ?? {});
    const norm = (s: string) => normalizeHeader(s);
    const allowed = new Set(
      (ALL_COLUMNS?.length ? ALL_COLUMNS : hdrs).map(norm)
    );
    return [...hdrs].filter((h) => !allowed.has(norm(h)));
  }, [headers, rows]);

  const coll = useMemo(() => new Intl.Collator('es', { sensitivity: 'base' }), []);
  const _key = (s: string) =>
    s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

  const empresas = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) {
      const raw = String((r as any).sucursal ?? (r as any).empresa ?? '').trim();
      if (!raw) continue;
      const k = _key(raw);
      if (!map.has(k)) map.set(k, raw);
    }
    return [...map.values()].sort(coll.compare);
  }, [rows, coll]);

  const productos = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) {
      const raw = String((r as any).producto ?? '').trim();
      if (!raw) continue;
      const k = _key(raw);
      if (!map.has(k)) map.set(k, raw);
    }
    return [...map.values()].sort(coll.compare);
  }, [rows, coll]);

  const resumen = useMemo(() => {
    const base = filteredRows;
    if (!base.length) {
      return {
        totalFilas: 0,
        totalUnidades: 0,
        totalVentas: 0,
        porProducto: [] as { key: string; total: number }[],
        porEmpresa: [] as { key: string; total: number }[],
        porFecha: [] as { key: string; total: number }[],
      };
    }
    let totalUnidades = 0, totalVentas = 0;
    for (const r of base) {
      const cantidad = toNumber((r as any)['cantidad']);
      const precio = toNumber((r as any)['precio_unitario']);
      totalUnidades += cantidad;
      totalVentas += cantidad * precio;
    }
    const porProducto = groupSum(base, 'producto', (r) => {
      const cantidad = toNumber((r as any)['cantidad']);
      const precio = toNumber((r as any)['precio_unitario']);
      return cantidad * precio;
    });
    const porEmpresa = groupSum(base, 'empresa', (r) => {
      const cantidad = toNumber((r as any)['cantidad']);
      const precio = toNumber((r as any)['precio_unitario']);
      return cantidad * precio;
    });
    const porFecha = groupSum(base, 'fecha', (r) => {
      const cantidad = toNumber((r as any)['cantidad']);
      const precio = toNumber((r as any)['precio_unitario']);
      return cantidad * precio;
    });
    return { totalFilas: base.length, totalUnidades, totalVentas, porProducto, porEmpresa, porFecha };
  }, [filteredRows]);

  // === Previos derivados de prevTotals (para delta y badges) ===
  const prevTotals = useMemo(() => {
    const base = filteredRows;
    if (!base.length) return { ventas: 0, unidades: 0 };

    const mitad = Math.max(1, Math.floor(base.length / 2));
    const anterior = base.slice(0, mitad);

    let ventas = 0, unidades = 0;
    for (const r of anterior) {
      const cantidad = toNumber((r as any).cantidad);
      const precio   = toNumber((r as any).precio_unitario);
      if (Number.isFinite(cantidad)) unidades += cantidad;
      if (Number.isFinite(cantidad * precio)) ventas += cantidad * precio;
    }
    return { ventas, unidades };
  }, [filteredRows]);

  const areaData = useMemo(() => {
    const acc = new Map<string, Record<string, number>>();
    for (const r of filteredRows) {
      if (hasTipoMovimiento) {
        if (String((r as any).tipo_movimiento ?? '').toLowerCase() !== 'venta') continue;
      }

      const canal = normalizeText((r as any).canal ?? 'canal');
      const fechaRaw = String((r as any).fecha ?? '').slice(0, 10);
      const fecha = fechaRaw || 'sin_fecha';
      const q = toNumber((r as any).cantidad);
      const p = toNumber((r as any).precio_unitario);
      const monto = q * p;

      if (!acc.has(fecha)) acc.set(fecha, {});
      acc.get(fecha)![canal] = (acc.get(fecha)![canal] ?? 0) + (Number.isFinite(monto) ? monto : 0);
    }
    const fechas = Array.from(acc.keys()).sort();
    const canales = new Set<string>();
    for (const f of fechas) Object.keys(acc.get(f)!).forEach((c) => canales.add(c));
    return fechas.map((f) => {
      const base: Record<string, number | string> = { fecha: f };
      for (const c of canales) base[c] = acc.get(f)![c] ?? 0;
      return base;
    });
  }, [filteredRows, hasTipoMovimiento]);

  const trendData = useMemo(() => {
    const source = filteredRows.length ? filteredRows : rows;
    if (!source.length) return [];

    const byDay = new Map<string, number>();
    for (const r of source) {
      if (hasTipoMovimiento) {
        const tipo = String((r as any).tipo_movimiento ?? '').toLowerCase();
        if (!['venta', 'salida', 'egreso'].includes(tipo)) continue;
      }
      const f = String((r as any).fecha ?? '').slice(0, 10);
      if (!f) continue;

      const q = toNumber((r as any).cantidad);
      const p = toNumber((r as any).precio_unitario);
      const monto = q * p;
      if (Number.isFinite(monto)) byDay.set(f, (byDay.get(f) ?? 0) + monto);
    }

    const dias = [...byDay.keys()].sort();
    const serie = dias.map((d) => ({ fecha: d, total: byDay.get(d)! }));
    if (serie.length === 0) return serie;

    // Regresión lineal simple
    const n = serie.length;
    let sumT = 0, sumY = 0, sumTT = 0, sumTY = 0;
    for (let t = 0; t < n; t++) {
      const y = serie[t].total;
      sumT += t; sumY += y; sumTT += t * t; sumTY += t * y;
    }
    const denom = n * sumTT - sumT * sumT || 1;
    const b = (n * sumTY - sumT * sumY) / denom;
    const a = (sumY - b * sumT) / n;

    let sse = 0;
    for (let t = 0; t < n; t++) {
      const yhat = a + b * t;
      const err = serie[t].total - yhat;
      (serie as any)[t].trend = yhat;
      sse += err * err;
    }
    const sigma = Math.sqrt(sse / Math.max(1, n - 2));
    for (let t = 0; t < n; t++) {
      const yhat = (serie as any)[t].trend;
      (serie as any)[t].upper = yhat + 1.96 * sigma;
      (serie as any)[t].lower = yhat - 1.96 * sigma;
    }

    return serie;
  }, [filteredRows, rows, hasTipoMovimiento]);

  const trendReady = trendData.map((d: any) => ({
    fecha: String(d.fecha ?? '').slice(0, 10),
    total: Number(d.total ?? 0),
    trend: Number((d as any).trend ?? 0),
    upper: Number((d as any).upper ?? 0),
    lower: Number((d as any).lower ?? 0),
  }));

  // === Helper: columnas numéricas para la tabla (debe ir ANTES del return) ===
  const isNumericCol = useCallback((col: string) => {
    const k = normalizeHeader(col);
    if (Array.isArray(columnasNumericas) && columnasNumericas.includes(k)) return true;
    return /^(cantidad|precio_unitario|costo_unitario|monto|total|stock|unidades)$/i.test(k);
  }, []);

  /* ===== Calidad de filas ===== */
  type RowIssue = { index: number; errors: string[]; invalidFields: Set<string> };

  const rowIssues: RowIssue[] = useMemo(() => {
    if (!rows.length) return [];
    const issues: RowIssue[] = [];

    const hasValue = (v: unknown) => v !== null && v !== undefined && String(v).trim() !== '';
    const norm = (s: unknown) => String(s ?? '').trim().toLowerCase();

    rows.forEach((r, idx) => {
      const errs: string[] = [];
      const bad = new Set<string>();

      const d = parseDateLike((r as any)['fecha']);
      if (!d) { errs.push('Fecha inválida'); bad.add('fecha'); }

      const cant = toNumber((r as any)['cantidad']);
      if (!Number.isFinite(cant) || cant < 0) {
        errs.push('Cantidad inválida (no numérica o < 0)');
        bad.add('cantidad');
      }

      const pu = toNumber((r as any)['precio_unitario']);
      if (!Number.isFinite(pu) || pu < 0) {
        errs.push('Precio unitario inválido (no numérico o < 0)');
        bad.add('precio_unitario');
      }

      for (const c of columnasNumericas) {
        if (!Object.prototype.hasOwnProperty.call(r as any, c)) continue;
        const v = toNumber((r as any)[c]);
        if (!Number.isFinite(v)) {
          errs.push(`Columna numérica inválida: ${c}`);
          bad.add(c);
        }
      }

      for (const col of Object.keys(ENUMS)) {
        const allowed = (ENUMS as any)[col] as string[];
        const cur = norm((r as any)[col]);
        if (hasValue(cur) && !allowed.includes(cur)) {
          errs.push(`Valor inválido en ${col}: "${String((r as any)[col])}" (válidos: ${allowed.join(', ')})`);
          bad.add(col);
        }
      }

      const tipoMov = norm((r as any)['tipo_movimiento']);
      if (tipoMov && Object.prototype.hasOwnProperty.call(CONDITIONAL_REQUIRED, tipoMov)) {
        const cond = (CONDITIONAL_REQUIRED as any)[tipoMov] as string[];
        for (const need of cond) {
          const val = (r as any)[need];
          if (!hasValue(val)) {
            errs.push(`Falta "${need}" porque tipo_movimiento="${tipoMov}"`);
            bad.add(need);
          }
        }
      }

      if (errs.length) issues.push({ index: idx, errors: errs, invalidFields: bad });
    });

    return issues;
  }, [rows]);

  /* ===== Insights 7 días + low stock ===== */
  const insights = useMemo(() => {
    if (!filteredRows.length) {
      return {
        ventas7: 0,
        deltaVentas7: 0,
        topProd: { name: '', share: 0, monto: 0 },
        lowStock: [] as { sku: string; producto: string; stock: number }[],
        rango: { desde: '', hasta: '' },
      };
    }
    let maxDate = new Date(0);
    for (const r of filteredRows) {
      const d = parseDateLike((r as any).fecha);
      if (d && d > maxDate) maxDate = d;
    }
    const hasta = new Date(maxDate);
    const desde = new Date(maxDate); desde.setDate(desde.getDate() - 6);

    const win7: Row[] = [];
    const prev7: Row[] = [];
    const prevDesde = new Date(desde); prevDesde.setDate(prevDesde.getDate() - 7);
    const prevHasta = new Date(desde); prevHasta.setDate(prevHasta.getDate() - 1);

    for (const r of filteredRows) {
      const d = parseDateLike((r as any).fecha);
      if (!d) continue;
      const dd = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      if (dd >= desde && dd <= hasta) win7.push(r);
      else if (dd >= prevDesde && dd <= prevHasta) prev7.push(r);
    }

    const v7 = ventasMonto(win7);
    const v7prev = ventasMonto(prev7);
    const delta = v7prev > 0 ? (v7 - v7prev) / v7prev : 1;

    const prodMap = new Map<string, number>();
    for (const r of win7) {
      if (String((r as any).tipo_movimiento ?? '').toLowerCase() !== 'venta') continue;
      const name = String((r as any).producto ?? '—');
      const q = toNumber((r as any).cantidad);
      const p = toNumber((r as any).precio_unitario);
      prodMap.set(name, (prodMap.get(name) ?? 0) + q * p);
    }
    let topName = '', topMonto = 0;
    prodMap.forEach((val, k) => { if (val > topMonto) { topMonto = val; topName = k; } });
    const share = v7 > 0 ? topMonto / v7 : 0;

    const stock = buildStockPorSku(rows);
    const all = [...stock.entries()]
      .map(([sku, it]) => ({ sku, producto: it.producto, stock: it.stock }))
      .sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0));

    const THRESH = 20;
    const under = all.filter(x => (x.stock ?? 0) <= THRESH);
    const over = all.filter(x => (x.stock ?? 0) > THRESH);

    const low = [
      ...under.slice(0, 9),
      ...over.slice(0, Math.max(0, 9 - under.length)),
    ].slice(0, 9);

    const fmt = (d: Date) => d.toLocaleDateString('es-EC', { year: 'numeric', month: '2-digit', day: '2-digit' });
    return {
      ventas7: v7,
      deltaVentas7: delta,
      topProd: { name: topName, share, monto: topMonto },
      lowStock: low,
      rango: { desde: fmt(desde), hasta: fmt(hasta) },
    };
  }, [filteredRows, rows]);

  // === Previos derivados de prevTotals (para delta y badges) ===
  const kpiVentasPrev   = prevTotals.ventas ?? 0;
  const kpiUnidadesPrev = prevTotals.unidades ?? 0;

  /* ===== KPIs ===== */
  const kpiVentas = resumen.totalVentas;
  const kpiUnidades = resumen.totalUnidades;

  const EPS = 0.003; // ±0.3% = "se mantiene"

  type Estado = 'up' | 'flat' | 'down';
  const colorCfg = (estado: Estado) =>
    estado === 'up'
      ? { fg: '#065f46', bg: '#ecfdf5', bd: '#a7f3d0' }   // verde
      : estado === 'down'
      ? { fg: '#991b1b', bg: '#fee2e2', bd: '#fecaca' }   // rojo
      : { fg: '#92400e', bg: '#fff7ed', bd: '#fed7aa' };  // amarillo

  const safeDiv = (num: number, den: number) =>
    Number.isFinite(num) && Number.isFinite(den) && den !== 0 ? num / Math.abs(den) : 0;

  const ventasDelta = kpiVentasPrev ? (kpiVentas - kpiVentasPrev) / Math.abs(kpiVentasPrev) : 0;
  const ventasEstado: Estado = ventasDelta > EPS ? 'up' : ventasDelta < -EPS ? 'down' : 'flat';
  const ventasCfg = colorCfg(ventasEstado);

  // === Parser helpers ===
  function formatPapaError(err: ParseError): string {
    const row =
      typeof err?.row === 'number' && Number.isFinite(err.row)
        ? `fila ${err.row}`
        : 'fila ?';
    const code = err?.code ? ` [${err.code}]` : '';
    const type = err?.type ? ` (${err.type})` : '';
    const msg  = err?.message || 'Error de parseo';
    return `${msg}${code}${type} — ${row}`;
  }

  const unidadesDelta = kpiUnidadesPrev ? (kpiUnidades - kpiUnidadesPrev) / Math.abs(kpiUnidadesPrev) : 0;
  const unidadesEstado: Estado = unidadesDelta > EPS ? 'up' : unidadesDelta < -EPS ? 'down' : 'flat';
  const unidadesCfg = colorCfg(unidadesEstado);

  // === Donut: participación por producto (fuente única) ===
  const donutData: Array<{ name: string; value: number }> = useMemo(() => {
    if (Array.isArray(resumen?.porProducto) && resumen.porProducto.length > 0) {
      return resumen.porProducto.map(({ key, total, name }: any) => ({
        name: String((name ?? key ?? '—')).trim(),
        value: Number(total ?? 0),
      }));
    }
    const map = new Map<string, number>();
    for (const r of filteredRows) {
      const k = String((r as any).producto ?? '—').trim();
      const v = toNumber((r as any).cantidad) * toNumber((r as any).precio_unitario);
      const add = Number.isFinite(v) ? v : 0;
      map.set(k, (map.get(k) ?? 0) + add);
    }
    return [...map.entries()].map(([name, value]) => ({ name, value }));
  }, [resumen?.porProducto, filteredRows]);

  // Handler de archivo CSV (streaming + vista parcial + agregados)
  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setErrors(['El archivo debe ser .csv']);
      setRows([]); setHeaders([]); return;
    }

    setFileName(file.name);
    setErrors([]);
    setLoading(true);

    const normH = (h: unknown) => {
      const base = normalizeHeader(String(h ?? '').replace(/^\uFEFF/, ''));
      return HEADER_ALIASES[base] ?? base;
    };

    const HEAVY = file.size >= 1_000_000_000; // 1 GB
    setHeavyMode(HEAVY);
    const CHUNK_SIZE_LOCAL = HEAVY ? 1024 * 1024 * 4 : 1024 * 1024 * 2;
    const FLUSH_MS_LOCAL   = HEAVY ? 180 : 150;
    const FLUSH_ROWS_LOCAL = HEAVY ? 3000 : 5000;

    let delimiterOpt: '' | ';' | ',' = '';
    try {
      const headText = await file.slice(0, 4096).text();
      const firstLine = headText.split(/\r?\n/)[0] ?? '';
      const semi  = (firstLine.match(/;/g) || []).length;
      const comma = (firstLine.match(/,/g) || []).length;
      delimiterOpt = semi > comma ? ';' : (comma > semi ? ',' : '');
    } catch {
      delimiterOpt = '';
    }

    const mProd = new Map<string, number>();
    const mEmp  = new Map<string, number>();
    const mFecha= new Map<string, number>();
    let totalRows = 0, ventas = 0, unidades = 0;

    const preview: Row[] = [];
    let lastFlush = 0;
    let flushedDuringParse = false;

    Papa.parse<Row>(file, {
      header: true,
      skipEmptyLines: 'greedy',
      worker: true,
      dynamicTyping: false,
      fastMode: true,
      chunkSize: CHUNK_SIZE_LOCAL,
      delimiter: delimiterOpt,

      chunk: (result: ParseResult<Row>) => {
        const batchIn: Row[] = Array.isArray(result?.data) ? (result.data as Row[]) : [];

        for (const r of batchIn) {
          totalRows++;

          const q = toNumber((r as any)['cantidad']);
          const p = toNumber((r as any)['precio_unitario']);
          if (Number.isFinite(q)) unidades += q;
          if (Number.isFinite(q) && Number.isFinite(p)) ventas += q * p;

          const prod = String((r as any)['producto'] ?? '—');
          const emp  = String((r as any)['empresa']  ?? '—');
          const f    = String((r as any)['fecha']    ?? '').slice(0, 10) || 'sin_fecha';
          const monto = (Number.isFinite(q) && Number.isFinite(p)) ? q * p : 0;

          mProd.set(prod, (mProd.get(prod) ?? 0) + monto);
          mEmp.set(emp,   (mEmp.get(emp)   ?? 0) + monto);
          mFecha.set(f,   (mFecha.get(f)   ?? 0) + monto);
        }

        if (preview.length < PREVIEW_BUFFER_MAX && batchIn.length) {
          const remaining = PREVIEW_BUFFER_MAX - preview.length;
          if (remaining > 0) preview.push(...batchIn.slice(0, remaining));
        }

        setParsedRowsCounter((n) => n + batchIn.length);
        setAgg({
          totalRows,
          ventas,
          unidades,
          porProducto: new Map(mProd),
          porEmpresa:  new Map(mEmp),
          porFecha:    new Map(mFecha),
        });

        if (!headers.length) {
          const metaFields = Array.isArray(result?.meta?.fields)
            ? (result.meta.fields as string[])
            : [];
          if (metaFields.length) {
            setHeaders(metaFields.map((h) => normH(h)));
          } else {
            const sample = (batchIn[0] ?? preview[0]) as Row | undefined;
            if (sample) {
              const firstNorm: Row = {};
              for (const [k, v] of Object.entries(sample)) {
                (firstNorm as any)[normH(k)] = v as any;
              }
              setHeaders(Object.keys(firstNorm as Record<string, unknown>));
            }
          }
        }

        const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        const shouldFlush =
          !headers.length ||
          preview.length >= FLUSH_ROWS_LOCAL ||
          (now - lastFlush) >= FLUSH_MS_LOCAL;

        const batch: Row[] = batchIn;

        if (shouldFlush && (preview.length || batch.length)) {
          lastFlush = now;
          flushedDuringParse = true;

          if (!headers.length) {
            const sample = (preview[0] ?? batch[0]) as Row | undefined;
            if (sample) {
              const firstNorm: Row = {};
              for (const [k, v] of Object.entries(sample)) {
                (firstNorm as any)[normH(k)] = v as any;
              }
              setHeaders(Object.keys(firstNorm as Record<string, unknown>));
            }
          }

          const source = preview.length ? preview : batch;
          const takeCount = Math.min(source.length, FLUSH_ROWS);
          const take = source === preview ? source.splice(0, takeCount) : source.slice(0, takeCount);

          const normalizedBatch: Row[] = take.map((row) => {
            const out: Row = {};
            for (const [k, v] of Object.entries(row)) {
              (out as any)[normH(k)] = v as any;
            }
            return out;
          });

          if (normalizedBatch.length) {
            setRows((prev) => {
              if (prev.length >= MAX_ROWS_IN_MEMORY) {
                if (!uiCapped) setUiCapped(true);
                return prev;
              }
              const room = MAX_ROWS_IN_MEMORY - prev.length;
              const next = room >= normalizedBatch.length
                ? [...prev, ...normalizedBatch]
                : [...prev, ...normalizedBatch.slice(0, room)];
              if (next.length >= MAX_ROWS_IN_MEMORY && !uiCapped) setUiCapped(true);
              return next;
            });

            if (!firstFlushDone) {
              setFirstFlushDone(true);
              setLoading(false);
            }
          }
        }
      },

      complete: (final?: ParseResult<Row>) => {
        setLoading(false);

        const finalData = Array.isArray((final as any)?.data)
          ? ((final as any).data as Row[])
          : [];

        if (!flushedDuringParse) {
          const source = preview.length ? preview : finalData;

          const fieldsFromMeta = Array.isArray((final as any)?.meta?.fields)
            ? ((final as any).meta.fields as string[])
            : [];
          const parsedFieldsRaw = (fieldsFromMeta.length
            ? fieldsFromMeta
            : (source[0] ? Object.keys(source[0]) : []))
            .map(normH);
          setHeaders(parsedFieldsRaw);

          const normalized: Row[] = source.map((row) => {
            const out: Row = {};
            for (const [k, v] of Object.entries(row)) {
              (out as any)[normH(k)] = v as any;
            }
            return out;
          });
          setRows(normalized);

          if (onRows) onRows(normalized, parsedFieldsRaw);
        } else {
          setHeaders((cur) =>
            cur.length ? cur : (rows[0] ? Object.keys(rows[0] as Record<string, unknown>) : []),
          );
          if (onRows) onRows(rows, headers);
        }

        const errs = (final as any)?.errors as ParseError[] | undefined;
        if (Array.isArray(errs) && errs.length) {
          setErrors(errs.slice(0, 5).map(formatPapaError));
        }
      },

      error: (err) => {
        setLoading(false);
        setErrors([String(err?.message ?? err)]);
      },
    });
  }
  // Builder de copy para WhatsApp
  function buildSmartPromoText(
    insights: any,
    resumen: any,
    donutData: Array<{ name: string; value: number }>
  ) {
    const topName = insights?.topProd?.name || donutData?.[0]?.name || 'nuestro producto estrella';
    const share = (insights?.topProd?.share ?? 0) * 100;
    const desde = insights?.rango?.desde || '';
    const hasta = insights?.rango?.hasta || '';

    const ventas = typeof resumen?.totalVentas === 'number' ? resumen.totalVentas : 0;
    const unidades = typeof resumen?.totalUnidades === 'number' ? resumen.totalUnidades : 0;

    const kpi = [
      `Ventas: ${fmtMoney(ventas)}`,
      `Unidades: ${unidades.toLocaleString('es-EC')}`,
      share > 0 ? `Top contribuye: ${share.toFixed(1)}%` : null,
    ].filter(Boolean).join(' · ');

    return `🚀 Promo inteligente – JasoDatos
${topName} en combo especial por tiempo limitado.
Válida ${desde && hasta ? `del ${desde} al ${hasta}` : 'por tiempo limitado'}.

${kpi}

Responde a este mensaje para más info. #JasoDatos`;
  }

  const descargarResumen = useCallback(() => {
    if (!resumen) return;

    const porEmpresa  = Array.isArray(resumen.porEmpresa)  ? resumen.porEmpresa  : [];
    const porProducto = Array.isArray(resumen.porProducto) ? resumen.porProducto : [];
    const porFecha    = Array.isArray(resumen.porFecha)    ? resumen.porFecha    : [];

    const secciones: Array<{ titulo: string; data: { key: string; total: number }[] }> = [
      { titulo: 'Ventas por empresa',  data: porEmpresa  },
      { titulo: 'Ventas por producto', data: porProducto },
      { titulo: 'Ventas por fecha',    data: porFecha    },
    ];

    const filas: Array<Record<string, unknown>> = [];
    filas.push({ Seccion: 'KPIs', Metrica: 'Filas visibles',   Valor: resumen.totalFilas    ?? 0 });
    filas.push({ Seccion: 'KPIs', Metrica: 'Unidades totales', Valor: resumen.totalUnidades ?? 0 });
    filas.push({ Seccion: 'KPIs', Metrica: 'Ventas totales',   Valor: resumen.totalVentas   ?? 0 });

    for (const s of secciones) {
      filas.push({ Seccion: s.titulo, Metrica: '', Valor: '' });
      for (const it of s.data) {
        filas.push({
          Seccion: s.titulo,
          Metrica: String(it?.key ?? ''),
          Valor: Number(it?.total ?? 0),
        });
      }
    }

    downloadCSV('resumen_filtrado.csv', filas);
  }, [resumen]);

  const descargarTablaFiltrada = useCallback(() => {
    if (!filteredRows?.length) return;

    const firstRow = filteredRows[0] as Record<string, unknown>;
    const baseCols: string[] = (Array.isArray(visibleCols) && visibleCols.length)
      ? (visibleCols as string[])
      : (headers?.length ? headers : Object.keys(firstRow));

    const cols = baseCols.filter((c) => Object.prototype.hasOwnProperty.call(firstRow, c));
    if (!cols.length) return;

    downloadCSV('tabla_filtrada.csv', filteredRows as Array<Record<string, unknown>>, cols);
  }, [filteredRows, visibleCols, headers]);

  const descargarErrores = useCallback(() => {
    if (!Array.isArray(rowIssues) || rowIssues.length === 0) return;

    const filas: Array<Record<string, unknown>> = rowIssues.map(
      (ri: { index: number; errors: string[] }) => ({
        Tipo: 'Fila inválida',
        Fila: typeof ri?.index === 'number' ? ri.index + 2 : '',
        Detalle: Array.isArray(ri?.errors) ? ri.errors.join(' | ') : '',
      })
    );

    downloadCSV('reporte_errores.csv', filas);
  }, [rowIssues]);

  // Limpia archivo y vista
  function limpiarArchivo() {
    try { parserRef.current?.abort?.(); } catch {}

    // Datos y meta
    setRows([]);
    setHeaders([]);
    setFileName('');
    setErrors([]);
    setParsedRowsCounter(0);
    setFirstFlushDone(false);

    // UI/flags
    setUiCapped(false);
    setLoading(false);
    setHeavyMode(false);

    // Filtros y paginación
    setFEmpresa('');
    setFProducto('');
    setFDesde('');
    setFHasta('');
    setPage(1);

    // Agregados (tipado explícito)
    setAgg({
      totalRows: 0,
      ventas: 0,
      unidades: 0,
      porProducto: new Map<string, number>(),
      porEmpresa:  new Map<string, number>(),
      porFecha:    new Map<string, number>(),
    });
  }

    function TablaPreview() {
    return (
      <div
        id="tabla-preview"
        style={{
          marginTop: 16,
          padding: 16,
          borderRadius: 24,
          background: `linear-gradient(180deg, ${BRAND?.BLUE ?? '#4f46e5'} 0%, ${
            BRAND?.BLUE_DARK ?? '#00B8C9'
          } 100%)`,
          boxShadow: '0 18px 40px rgba(15,23,42,0.25)',
          color: '#F9FAFB',
        }}
      >
        {/* Cabecera y controles */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ fontWeight: 700, color: '#F9FAFB', fontSize: 13 }}>
            Tabla (previa) — mostrando {pageRows.length.toLocaleString('es-EC')}{' '}
            de {filteredRows.length.toLocaleString('es-EC')} filas
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ fontSize: 12, color: '#E5E7EB' }}>Filas por página</label>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              style={{
                padding: '6px 10px',
                border: '1px solid rgba(248,250,252,0.5)',
                borderRadius: 999,
                background: '#4f46e5',
                fontSize: 12,
              }}
            >
              {[10, 20, 50, 100, 200].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>

            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              style={{
                padding: '6px 10px',
                borderRadius: 999,
                border: '1px solid rgba(248,250,252,0.6)',
                background: 'rgba(15,23,42,0.25)',
                color: '#F9FAFB',
                fontSize: 12,
                cursor: page <= 1 ? 'not-allowed' : 'pointer',
                opacity: page <= 1 ? 0.5 : 1,
              }}
              type="button"
              aria-label="Página anterior"
            >
              ◀︎ Anterior
            </button>

            <div style={{ fontSize: 12, color: '#E5E7EB' }}>
              Página {page} de {totalPages}
            </div>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              style={{
                padding: '6px 10px',
                borderRadius: 999,
                border: '1px solid rgba(248,250,252,0.6)',
                background: 'rgba(15,23,42,0.25)',
                color: '#F9FAFB',
                fontSize: 12,
                cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                opacity: page >= totalPages ? 0.5 : 1,
              }}
              type="button"
              aria-label="Página siguiente"
            >
              Siguiente ▶︎
            </button>
          </div>
        </div>

        {/* Tabla */}
        <div
          style={{
            border: '1px solid rgba(248,250,252,0.45)',
            borderRadius: 18,
            overflow: 'hidden',
            background: 'rgba(15,23,42,0.20)',
          }}
        >
          <div style={{ maxHeight: 420, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {visibleCols.map((c) => (
                    <th
                      key={c}
                      style={{
                        position: 'sticky',
                        top: 0,
                        background: 'rgba(15,23,42,0.85)',
                        textAlign: 'left',
                        padding: '8px 10px',
                        borderBottom: '1px solid rgba(248,250,252,0.7)',
                        borderRight: '1px solid rgba(248,250,252,0.25)',
                        fontSize: 12,
                        color: '#E5E7EB',
                        fontWeight: 700,
                        zIndex: 1,
                      }}
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r, idx) => {
                  const globalIndex = (page - 1) * pageSize + idx;
                  const issue = rowIssues.find((x) => x.index === globalIndex);

                  return (
                    <tr
                      key={globalIndex}
                      style={{
                        background: issue
                          ? 'rgba(239,68,68,0.20)'
                          : globalIndex % 2 === 0
                          ? 'rgba(15,23,42,0.28)'
                          : 'rgba(15,23,42,0.18)',
                      }}
                      title={issue ? issue.errors.join(' | ') : undefined}
                    >
                      {visibleCols.map((col) => {
                        const v = (r as any)[col];
                        const num = isNumericCol(col);
                        return (
                          <td
                            key={col}
                            style={{
                              padding: '8px 10px',
                              borderBottom: '1px solid rgba(248,250,252,0.35)',
                              borderRight: '1px solid rgba(248,250,252,0.20)',
                              textAlign: num ? 'right' : 'left',
                              fontSize: 12,
                              color: '#F9FAFB',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {num
                              ? typeof v === 'number'
                                ? v.toLocaleString('es-EC', { maximumFractionDigits: 2 })
                                : String(v ?? '')
                              : String(v ?? '')}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredRows.length > 0 && (
            <div
              style={{
                padding: 8,
                fontSize: 12,
                color: '#E5E7EB',
                borderTop: '1px solid rgba(248,250,252,0.45)',
                background: 'rgba(15,23,42,0.40)',
              }}
            >
              Mostrando {((page - 1) * pageSize + 1).toLocaleString('es-EC')}–
              {Math.min(page * pageSize, filteredRows.length).toLocaleString('es-EC')}{' '}
              de {filteredRows.length.toLocaleString('es-EC')} filas.
            </div>
          )}
        </div>
      </div>
    );
  }
  /* ===== UI ===== */
  return (
    <div
      style={{
        padding: 16,
        maxWidth: 1200,
        margin: '0 auto',
        paddingTop: SHOW_FIRST_SCREEN ? 28 : 16,
      }}
    >
      {/* Header en card — único */}
      <div
        style={{
          background: `linear-gradient(180deg, ${(BRAND?.BLUE ?? '#4f46e5')} 0%, ${(BRAND?.BLUE_DARK ?? '#00B8C9')} 100%)`,
          borderRadius: 14,
          border: '1px solid rgba(255,255,255,0.20)',
          boxShadow: '0 0 0 2px #00B8C9, 0 0 0 6px #4f46e5',
          padding: 12,
          marginBottom: 15,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 100, fontWeight: 700, color: '#FFFFFF' }}>
          JasoDatos
        </h1>

        <p style={{ color: '#FFFFFF', margin: '6px 0 0 0', fontSize: 14 }}>
          {filteredRows.length
            ? `Registros visibles: ${filteredRows.length}`
            : rows.length
              ? `Registros cargados: ${rows.length} (ajusta filtros)`
              : 'Listo para cargar CSV'}
          {fileName ? ` — Archivo: ${fileName}` : ''}
        </p>
      </div>

      {/* Controles del header (SIEMPRE visibles) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 12,
          marginTop: 10,
          marginBottom: 15,
        }}
      >
        {/* ░ Seleccionar archivo ░ */}
        <div style={controlShell}>
          <div style={slot}>
            <input id="csv-input" type="file" accept=".csv" onChange={handleFile} style={{ display: 'none' }} />
            <label
              htmlFor="csv-input"
              style={{
                display: 'inline-block', width: '100%', textAlign: 'center',
                padding: '5px 6px', borderRadius: 10,
                background: 'linear-gradient(180deg, #1E40AF 0%, #1D4ED8 100%)',
                color: '#fff', fontWeight: 500, cursor: 'pointer', border: '1px solid #1E40AF',
              }}
            >
              Seleccionar archivo
            </label>
          </div>
        </div>

        {/* ░ Nombre de archivo (solo display) ░ */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 12,
            padding: '5px 6px',
            borderRadius: 12,
            background: 'linear-gradient(180deg, #1E40AF 0%, #1D4ED8 100%)',
            color: '#F5f5f5',
            fontWeight: 700,
            border: '1px solid #1E40AF',
            boxShadow: '0 2px 3px rgba(59,130,246,0.25)',
          }}
          title={fileName || 'Sin archivo seleccionado'}
        >
          <span style={ellipsisText}>
            {fileName || 'Ningún archivo seleccionado'}
          </span>
        </div>

        {/* ░ Descargar plantilla CSV ░ */}
        <div style={controlShell}>
          <div style={slot}>
            <button
              type="button"
              onClick={descargarPlantillaCsv}
              style={{
                display: 'inline-block', width: '100%', textAlign: 'center',
                padding: '5px 6px', borderRadius: 10,
                background: 'linear-gradient(180deg, #1E40AF 0%, #1D4ED8 100%)',
                color: '#f5f5f5', fontWeight: 500, cursor: 'pointer', border: '1px solid #1E40AF',
              }}
            >
              Descargar plantilla CSV
            </button>
          </div>
        </div>

        {/* ░ Limpiar archivo ░ */}
        <div style={controlShell}>
          <div style={slot}>
            <button
              type="button"
              onClick={limpiarArchivo}
              style={{
                display: 'inline-block', width: '100%', textAlign: 'center',
                padding: '5px 6px', borderRadius: 10,
                background: 'linear-gradient(180deg, #1E40AF 0%, #1D4ED8 100%)',
                color: '#f5f5f5', fontWeight: 500, cursor: 'pointer', border: '1px solid #1E40AF',
              }}
            >
              Limpiar archivo
            </button>
          </div>
        </div>
      </div>

      {/* ✅ Preview inicial: tabla y CTA para pasar al análisis */}
      {SHOW_PREVIEW && (
        <div style={{ marginTop: 12 }}>
          <TablaPreview />

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
            <button
              type="button"
              onClick={() => {
                setShowAnalysis(true);
                setTimeout(() => {
                  document.getElementById('analysis-root')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 30);
              }}
              style={{
                padding: '10px 14px',
                borderRadius: 12,
                background: `linear-gradient(180deg, ${BRAND?.BLUE ?? '#4f46e5'} 0%, ${BRAND?.BLUE_DARK ?? '#00B8C9'} 100%)`,
                color: '#FFFFFF',
                fontWeight: 800,
                border: '1px solid rgba(255,255,255,0.20)',
                boxShadow: '0 2px 6px rgba(59,130,246,0.25)',
                cursor: 'pointer',
              }}
              title="Ir al ambiente de análisis con KPIs y gráficas"
              aria-label="Vamos al análisis"
            >
              Vamos al análisis
            </button>
          </div>
        </div>
      )}

      {/* Filtros */}
      {CAN_EXPLORE && showAnalysis && (
        <div
          style={{
            marginTop: 10,
            borderRadius: 11,
            padding: 10,
            background: `linear-gradient(180deg, ${(BRAND?.BLUE ?? '#4f46e5')} 0%, ${(BRAND?.BLUE_DARK ?? '#00B8C9')} 100%)`,
            border: '1px solid rgba(255,255,255,0.20)',
            boxShadow: '0 0 0 2px #00B8C9, 0 0 0 6px #4f46e5',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 12,
            marginBottom: 12,
          }}
        >
          <div>
            <label style={{ fontSize: 14, color: BRAND?.WHITE ?? '#FFFFFF' }}>Sucursal</label>
            <select
              value={fEmpresa}
              onChange={(e) => setFEmpresa(e.target.value)}
              style={{
                width: '100%',
                padding: 8,
                borderRadius: 10,
                border: `1px solid ${(BRAND?.BLACK ?? '#111') + '20'}`,
                background: BRAND?.WHITE ?? '#FFFFFF',
                color: BRAND?.BLACK ?? '#111',
                fontSize: 11,
              }}
            >
              <option value="">Todas</option>
              {(Array.isArray(empresas) ? empresas : []).map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 14, color: BRAND?.WHITE ?? '#FFFFFF' }}>Producto</label>
            <select
              value={fProducto}
              onChange={(e) => setFProducto(e.target.value)}
              style={{
                width: '100%',
                padding: 8,
                borderRadius: 10,
                border: `1px solid ${(BRAND?.BLACK ?? '#111') + '20'}`,
                background: BRAND?.WHITE ?? '#FFFFFF',
                color: BRAND?.BLACK ?? '#111',
                fontSize: 11,
              }}
            >
              <option value="">Todos</option>
              {(Array.isArray(productos) ? productos : []).map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 14, color: BRAND?.WHITE ?? '#FFFFFF' }}>Desde</label>
            <input
              type="date"
              value={fDesde}
              onChange={(e) => setFDesde(e.target.value)}
              style={{
                width: '100%',
                padding: 8,
                borderRadius: 10,
                border: `1px solid ${(BRAND?.BLACK ?? '#111') + '20'}`,
                background: BRAND?.WHITE ?? '#FFFFFF',
                color: BRAND?.BLACK ?? '#111',
                fontSize: 11,
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 14, color: BRAND?.WHITE ?? '#FFFFFF' }}>Hasta</label>
            <input
              type="date"
              value={fHasta}
              onChange={(e) => setFHasta(e.target.value)}
              style={{
                width: '100%',
                padding: 8,
                borderRadius: 10,
                border: `1px solid ${(BRAND?.BLACK ?? '#111') + '20'}`,
                background: BRAND?.WHITE ?? '#FFFFFF',
                color: BRAND?.BLACK ?? '#111',
                fontSize: 11,
              }}
            />
          </div>

          {/* Botón limpiar filtros */}
          <div
            style={{
              display: 'grid',
              gridAutoFlow: 'column',
              gridAutoColumns: 'max-content',
              gap: 8,
              alignItems: 'center',
              justifyContent: 'start',
              marginTop: 8,
            }}
          >
          </div>
        </div>
      )}

      {/* 🔵 Botonera azul: SOLO con datos */}
      {CAN_EXPLORE && showAnalysis && (
        <div
          style={{
            display: 'grid',
            gridAutoFlow: 'column',
            gridAutoColumns: 'max-content',
            gap: 8,
            alignItems: 'center',
            justifyContent: 'start',
            marginTop: 8,
            marginBottom: 12,
          }}
        >
          {(() => {
            const base: React.CSSProperties = {
              padding: '9px 12px',
              borderRadius: 10,
              border: '1px solid #1E40AF',
              background: 'linear-gradient(180deg, #3B82F6 0%, #1D4ED8 100%)',
              color: '#F5f5f5',
              fontWeight: 700,
              fontSize: 12,
              boxShadow: '0 2px 6px rgba(59,130,246,0.25)',
              cursor: 'pointer',
              transition: 'filter 150ms ease',
            };
            const hoverOn  = (e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.filter = 'brightness(0.96)'; };
            const hoverOff = (e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.filter = ''; };

            return (
              <>
                <button
                  onClick={() => { setFEmpresa(''); setFProducto(''); setFDesde(''); setFHasta(''); }}
                  style={base}
                  onMouseEnter={hoverOn}
                  onMouseLeave={hoverOff}
                  type="button"
                >
                  Limpiar filtros
                </button>

                <button
                  onClick={descargarResumen}
                  disabled={!filteredRows.length}
                  style={{
                    ...base,
                    cursor: filteredRows.length ? 'pointer' : 'not-allowed',
                    opacity: filteredRows.length ? 1 : 0.6,
                    filter: filteredRows.length ? '' : 'grayscale(25%)',
                  }}
                  onMouseEnter={filteredRows.length ? hoverOn : undefined}
                  onMouseLeave={filteredRows.length ? hoverOff : undefined}
                  type="button"
                >
                  Descargar resumen CSV
                </button>

                <button
                  onClick={descargarTablaFiltrada}
                  disabled={!filteredRows.length}
                  style={{
                    ...base,
                    cursor: filteredRows.length ? 'pointer' : 'not-allowed',
                    opacity: filteredRows.length ? 1 : 0.6,
                    filter: filteredRows.length ? '' : 'grayscale(25%)',
                  }}
                  onMouseEnter={filteredRows.length ? hoverOn : undefined}
                  onMouseLeave={filteredRows.length ? hoverOff : undefined}
                  type="button"
                >
                  Descargar tabla filtrada
                </button>
              </>
            );
          })()}
        </div>
      )}

      {/* ✅ Columnas faltantes (solo post-carga) */}
      {SHOW_MISSING && (
        <div
          style={{
            marginTop: 10,
            marginBottom: 12,
            borderRadius: 14,
            padding: 12,
            background: `linear-gradient(180deg, ${BRAND?.BLUE ?? '#4f46e5'} 0%, ${BRAND?.BLUE_DARK ?? '#00B8C9'} 100%)`,
            border: '1px solid rgba(255,255,255,0.20)',
            boxShadow: '0 0 0 2px #00B8C9, 0 0 0 6px #4f46e5',
            color: '#FFFFFF',
            fontSize: 14,
            lineHeight: 1.45,
          }}
        >
          <strong>Columnas faltantes:</strong>{' '}
          <span style={{ opacity: 0.95 }}>{missingColumns.join(', ')}</span>
        </div>
      )}

      {/* Reporte de errores por fila (opcional) */}
      {SHOW_INVALID_BANNER && firstFlushDone && !SHOW_MISSING && !!rowIssues.length && rows.length > 0 && (
        <div
          style={{
            marginTop: 10,
            marginBottom: 10,
            borderRadius: 10,
            border: '1px solid #60A5FA',
            padding: 2,
          }}
        >
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 8,
              backgroundColor: '#DBEAFE',
              boxShadow: 'inset 0 0 0 1px #93C5FD',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              color: '#0f172a',
            }}
          >
            <strong>Filas con datos inválidos:</strong> {rowIssues.length}

            <button
              onClick={descargarErrores}
              disabled={!rowIssues.length}
              style={{
                marginLeft: 'auto',
                padding: '8px 12px',
                borderRadius: 10,
                border: '1px solid #1E40AF',
                background: 'linear-gradient(180deg, #3B82F6 0%, #1D4ED8 100%)',
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: 12,
                cursor: rowIssues.length ? 'pointer' : 'not-allowed',
                opacity: rowIssues.length ? 1 : 0.6,
                boxShadow: '0 2px 6px rgba(59,130,246,0.25)',
                transition: 'filter 150ms ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(0.96)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.filter = ''; }}
              type="button"
            >
              Descargar reporte de errores
            </button>
          </div>
        </div>
      )}

      {/* Asistente Comercial – JasoBot (PRO) */}
      {CAN_EXPLORE && showAnalysis && (
        <section
          className="jaso-card"
          style={{
            border: `1px solid ${BRAND?.BLUE_DARK ?? '#F5F5F5'}`,
            borderRadius: 12,
            padding: 12,
            background: `linear-gradient(180deg, ${BRAND?.BLUE ?? '#4f46e5'} 0%, ${BRAND?.BLUE_DARK ?? '#00B8C9'} 100%)`,
            boxShadow: '0 6px 18px rgba(29,78,216,0.20)',
            display: 'grid',
            gap: 10,
            color: '#FFFFFF',
          }}
        >
          {/* Header con estado */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span className="jaso-title" style={{ fontSize: 40, fontWeight: 800, color: '#F5F5F5', letterSpacing: 0.2 }}>
                Asistente Comercial
              </span>

              <span
                className="badge-pro"
                style={{
                  fontSize: 19,
                  fontWeight: 800,
                  color: '#F5F5F5',
                  padding: '3px 10px',
                  borderRadius: 999,
                  background: `linear-gradient(180deg, ${BRAND?.BLUE ?? '#00B8C9'} 0%, ${BRAND?.BLUE_DARK ?? '#4f46e5'} 100%)`,
                  border: '2px solid #fff',
                  boxShadow: '0 0 10px rgba(255,255,255,0.4)',
                }}
              >
                PRO
              </span>
            </div>

            {(() => {
              const d = insights?.deltaVentas7 ?? 0;
              const label = Math.abs(d) < 0.1 ? 'estable' : d > 0 ? 'alza' : 'baja';
              const COLORS: Record<string, string> = { alza: '#16A34A', estable: '#60A5FA', baja: '#EF4444' };
              const dotColor = COLORS[label];

              return (
                <span
                  style={{
                    fontSize: 16,
                    fontWeight: 550,
                    color: '#F5F5F5',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                  title={`Tendencia 7d: ${(d * 100).toFixed(1)}%`}
                  aria-label={`Tendencia 7 días: ${label}`}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 8, height: 8, background: dotColor, borderRadius: 999, boxShadow: `0 0 6px ${dotColor}66`,
                    }}
                  />
                  {label}
                </span>
              );
            })()}
          </div>

          {/* Copy inteligente */}
          {(() => {
            const topName = insights?.topProd?.name || (donutData?.[0]?.name ?? 'Producto top');
            const bottom =
              (resumen?.porProducto?.length ?? 0) > 0
                ? resumen?.porProducto?.[(resumen?.porProducto?.length ?? 1) - 1] ?? null
                : null;
            const bottomName = bottom?.key ?? 'producto con baja rotación';

            return (
              <div style={{ fontSize: 18, color: '#F5F5F5', lineHeight: 1.35 }}>
                <div style={{ textAlign: 'center', marginBottom: 6 }}>
                  <span className="impact-flash" style={{ fontSize: 25, fontWeight: 900, lineHeight: 1.15 }}>
                    Mejora tus ventas
                  </span>
                </div>

                <div style={{ textAlign: 'center', fontSize: 18, color: '#F5F5F5' }}>
                  Combina <span className="promo-pill">{topName}</span> (líder) con{' '}
                  <span className="promo-pill alt">{bottomName}</span> y empaquétalo en combo especial por tiempo limitado.
                </div>
                <div style={{ textAlign: 'center', marginTop: 6 }}>
                  <span className="cta-glow" style={{ fontWeight: 800 }}>
                    ¡¡¡ Pásate esta promoción a tu WhatsApp !!!
                  </span>
                </div>
              </div>
            );
          })()}

          {/* CTA */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => { const msg = buildSmartPromoText(insights, resumen, donutData ?? []); openWhatsAppSafe(msg); }}
              disabled={sendingWA}
              style={{
                background: '#00B8C9',
                color: '#F5F5F5',
                fontWeight: 700,
                fontSize: 14,
                padding: '8px 12px',
                border: '1px solid #e5e7eb',
                borderRadius: 6,
                cursor: sendingWA ? 'not-allowed' : 'pointer',
                opacity: sendingWA ? 0.6 : 1,
                boxShadow: '0 2px 6px rgba(79,70,229,0.28)',
                transition: 'transform 120ms ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
              title="Generar copia promocional y abrir WhatsApp"
              aria-label="Generar promoción inteligente y abrir WhatsApp"
            >
              {sendingWA ? 'Generando…' : '💬 Mejora tus ventas envíalo a WhatsApp'}
            </button>

            <button
              type="button"
              onClick={() => alert('Función disponible en plan Ultra: envío automático de PDF/Dashboard a WhatsApp.')}
              style={{
                background: '#00B8C9',
                color: '#F5F5F5',
                fontWeight: 700,
                fontSize: 14,
                padding: '8px 12px',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                cursor: 'pointer',
              }}
              title="Disponible en plan Ultra"
              aria-label="Enviar dashboard a WhatsApp (Plan Ultra)"
            >
              Enviar dashboard a WhatsApp
            </button>
          </div>

          <JasoBotQA insights={insights} resumen={resumen} />
        </section>
      )}

      {/* 🔥 PRODUCTO MÁS VENDIDO – bloque independiente debajo */}
      {CAN_EXPLORE && showAnalysis && !!insights?.topProd?.name && (
        <section
          style={{
            marginTop: 12,
            borderRadius: 15,
            padding: 8,
            position: 'relative',
            border: '1px solid rgba(255,255,255,0.20)',
            background: `linear-gradient(180deg, ${BRAND?.BLUE ?? '#4f46e5'} 0%, ${BRAND?.BLUE_DARK ?? '#00B8C9'} 100%)`,
            boxShadow: '0 0 0 2px rgba(2,132,199,.25) inset, 0 6px 22px rgba(59,130,246,.25)',
            overflow: 'hidden',
          }}
          title={`Top aporta ${(insights.topProd.share * 100).toFixed(1)}% de las ventas en 7 días`}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 14,
              boxShadow: '0 0 32px rgba(249,115,22,.25) inset',
              animation: 'glowPulse 2.2s ease-in-out infinite',
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '32px 1fr max-content',
              gap: 10,
              alignItems: 'center',
              position: 'relative',
              zIndex: 1,
            }}
          >
            <div className="proFlame" aria-hidden />
            <div style={{ lineHeight: 1.15 }}>
              <div
                style={{
                  fontSize: 15,
                  letterSpacing: '.12em',
                  fontWeight: 700,
                  color: '#F5F5F5',
                  textTransform: 'uppercase',
                  textShadow: '0 1px 0 #0b1020',
                  animation: 'blinkWow 2s steps(1) infinite',
                }}
              >
                PRODUCTO MÁS VENDIDO
              </div>
              <div
                style={{
                  marginTop: 2,
                  fontSize: 25,
                  fontWeight: 700,
                  color: '#FFFFFF',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                }}
              >
                {insights.topProd.name}
                <span style={{ fontSize: 19, opacity: 0.95, marginLeft: 8 }}>
                  • {((insights.topProd.share ?? 0) * 100).toFixed(1)}% del total
                </span>
              </div>
            </div>
            <div
              style={{
                background: `linear-gradient(180deg, ${BRAND?.BLUE ?? '#4f46e5'} 0%, ${BRAND?.BLUE_DARK ?? '#00B8C9'} 100%)`,
                border: '1px solid rgba(255,255,255,0.20)',
                color: '#F5F5F5',
                fontWeight: 800,
                padding: '6px 10px',
                borderRadius: 10,
                fontVariantNumeric: 'tabular-nums',
                textAlign: 'right',
                minWidth: 140,
              }}
            >
              {fmtMoney(insights.topProd.monto || 0)}
            </div>
          </div>
        </section>
      )}
      {/* 🔷 LAYOUT FINAL: Indicadores (izq) | Donut (der)  ➜  Stock (izq) | Tendencia (der) */}
      {CAN_EXPLORE && showAnalysis && (
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1.1fr',
            columnGap: 18, // espacio horizontal entre columnas
            rowGap: 6, // menos aire vertical entre filas
            marginTop: 12, // mismo aire que entre Asistente Comercial PRO y Producto más vendido
          }}
        >
          {/* 1) INDICADORES DESEMPEÑO (izquierda) */}
          <div
            style={{
              borderRadius: 10,
              padding: 10,
              background: `linear-gradient(180deg, ${BRAND?.BLUE ?? '#3B86FF'} 0%, ${
                BRAND?.BLUE_DARK ?? '#0F3E8A'
              } 100%)`,
              border: '1px solid rgba(255,255,255,0.20)',
              boxShadow: '0 6px 18px rgba(29,78,216,0.18)',
              color: '#FFFFFF',
              display: 'grid',
              gap: 18,
              alignContent: 'start',
            }}
            aria-label="Indicadores de desempeño"
          >
            {/* Header + badge + tip */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                columnGap: 18,
                rowGap: 18,
                flexWrap: 'wrap',
              }}
            >
              {/* Título + badge de variación */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  flexWrap: 'wrap',
                }}
              >
                <span
                  className="jaso-title"
                  style={{
                    fontSize: 45,
                    fontWeight: 800,
                    letterSpacing: 0.2,
                    textShadow: '0 1px 0 rgba(0,0,0,0.15)',
                  }}
                >
                  Indicadores de desempeño 📊
                </span>

                {typeof kpiVentas === 'number' &&
                  typeof kpiVentasPrev === 'number' &&
                  (() => {
                    const pct = kpiVentasPrev
                      ? ((kpiVentas - kpiVentasPrev) / Math.abs(kpiVentasPrev)) * 100
                      : 0;
                    const up = pct > 0.5;
                    const down = pct < -0.5;
                    const color = up ? '#22c55e' : down ? '#ef4444' : '#9ca3af';
                    const label = up ? '↑ alza' : down ? '↓ baja' : '→ estable';
                    return (
                      <span
                        title={`Variación semanal: ${pct.toFixed(1)}%`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 9,
                          fontSize: 12,
                          fontWeight: 700,
                          padding: '4px 10px',
                          borderRadius: 999,
                          border: `1px solid ${color}`,
                          color,
                          background: 'rgba(255,255,255,0.06)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {label} {pct.toFixed(1)}%
                      </span>
                    );
                  })()}
              </div>

              {/* TIP a la derecha */}
              <div
                style={{
                  fontSize: 12,
                  opacity: 0.95,
                  background: 'rgba(255,255,255,0.08)',
                  padding: '6px 12px',
                  borderRadius: 999,
                  border: '1px solid rgba(255,255,255,0.15)',
                  whiteSpace: 'nowrap',
                }}
              >
                Tip: actualiza tu CSV para refrescar KPIs en segundos ⚡
              </div>
            </div>

            {/* KPIs apiladas */}
            <div style={{ display: 'grid', gap: 15 }}>
              {/* KPI Ventas */}
              <div style={{ color: '#FFFFFF' }}>
                <div
                  style={{
                    fontSize: 19,
                    fontWeight: 600,
                    marginBottom: 4,
                    color: '#FFFFFF',
                  }}
                >
                  Ventas
                </div>
                <Kpi label="" value={kpiVentas} prev={kpiVentasPrev} money />
              </div>

              {/* KPI Unidades */}
              <div style={{ color: '#FFFFFF' }}>
                <div
                  style={{
                    fontSize: 19,
                    fontWeight: 600,
                    marginBottom: 4,
                    color: '#FFFFFF',
                  }}
                >
                  Unidades
                </div>
                <Kpi label="" value={kpiUnidades} prev={kpiUnidadesPrev} money={false} />
              </div>
            </div>
          </div>

          {/* 2) DONUT (derecha) */}
          <div
            className="donut-card"
            style={{
              position: 'relative',
              borderRadius: 16,
              padding: 12,
              background: `linear-gradient(180deg, ${BRAND?.BLUE ?? '#3B86FF'} 0%, ${
                BRAND?.BLUE_DARK ?? '#0F3E8A'
              } 100%)`,
              border: '1px solid rgba(255,255,255,0.20)',
              boxShadow: '0 6px 18px rgba(29,78,216,0.18)',
              color: '#FFFFFF',
              overflow: 'hidden',
            }}
          >
            {/* Header: título + badge de rango */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                marginBottom: 8,
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: 35,
                  color: '#F5F5F5',
                  letterSpacing: '.2px',
                }}
              >
                Participación por producto
              </h3>

              <span
                title="Rango de fecha seleccionado"
                style={{
                  fontSize: 11,
                  padding: '2px 8px',
                  borderRadius: 999,
                  border: '1px solid rgba(255,255,255,.25)',
                  color: '#fff',
                  background: 'rgba(255,255,255,.12)',
                  letterSpacing: '.02em',
                  whiteSpace: 'nowrap',
                }}
              >
                {RANGE_BADGE}
              </span>
            </div>

            {/* Donut directo, sin contenedor blanco */}
      <div
  style={{
    height: 360,
    width: '100%',
    transform: 'translateX(-24px)', // 🔹 mueve TODO el chart a la izquierda
  }}
>
  <DonutProductos data={donutData} />
</div>
          </div>

          {/* 3) STOCK EN RIESGO (izquierda, segunda fila) */}
          <div
            style={{
              gridColumn: '1 / 2',
              borderRadius: 16,
              padding: 16,
              background: `linear-gradient(180deg, ${BRAND?.BLUE ?? '#3B86FF'} 0%, ${
                BRAND?.BLUE_DARK ?? '#0F3E8A'
              } 100%)`,
              border: '1px solid #E5E7EB',
              boxShadow: '0 2px 10px rgba(2,6,23,.04)',
              color: '#0F172A',
              display: 'grid',
              gap: 12,
            }}
          >
            <LowStockBars items={insights?.lowStock ?? []} threshold={20} scaleMode="max" />
          </div>

          {/* 4) TENDENCIA (línea) — derecha */}
          <div
            style={{
              gridColumn: '2 / 2',
              borderRadius: 29,
              padding: '18px 20px 16px 20px',
              background: `linear-gradient(180deg, ${BRAND?.BLUE ?? '#3B86FF'} 0%, ${
                BRAND?.BLUE_DARK ?? '#0F3E8A'
              } 100%)`,
              boxShadow: '0 18px 40px rgba(15,23,42,0.25)',
              color: '#F5F5F5',
              backdropFilter: 'blur(6px)',
            }}
          >
            {/* Header: título + descripción compacta */}
            <div style={{ marginBottom: 8 }}>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  marginBottom: 4,
                  letterSpacing: 0.2,
                }}
              >
                Tendencia de ventas
              </div>
              <div
                style={{
                  fontSize: 12,
                  opacity: 0.9,
                  lineHeight: 1.4,
                }}
              >
                Línea azul: ventas reales · Línea verde: tendencia · Líneas punteadas: rango típico
              </div>
            </div>

            {/* Gráfico directamente sobre el fondo azul */}
           <div
  style={{
    height: 320,
    width: '100%',
    margin: 0,           // ocupa todo el espacio disponible
    padding: 0,          // sin relleno interno
  }}
>
  <TrendLine
    data={trendReady ?? []}
    xKey="fecha"
    yKey="total"
    avgKey="trend"
    upperKey="upper"
    lowerKey="lower"
    smooth
    currency="USD"
    regression="quad"
    xLabel="Fecha"
    yLabel="Ventas (USD)"
    height={300}
  />
</div>
          </div>
        </section>
      )}
      {/* Ventas por canal (apilado) — full width, encima de la tabla */}
{CAN_EXPLORE && showAnalysis && (areaData?.length ?? 0) > 0 && (
  <div
    style={{
      marginTop: 12, // 🔹 mismo aire que el bloque de arriba
      border: '1px solid rgba(255,255,255,0.20)',
      borderRadius: 28,
      padding: 22,
      background: `linear-gradient(180deg, ${(BRAND?.BLUE ?? '#4f46e5')} 0%, ${(BRAND?.BLUE_DARK ?? '#00B8C9')} 100%)`,
    }}
  >
          <h3
            style={{
              margin: 0,
              marginBottom: 10,
              fontSize: 26,
              fontWeight: 800,
              color: '#F5F5F5',
            }}
          >
            Ventas por canal (apilado)
          </h3>
          <div style={{ height: 320, width: '100%' }}>
            <AreaApiladaPorCanal data={areaData} />
          </div>
        </div>
      )}

      {/* Estilos globales */}
      <style jsx>{`
        @keyframes blinkWow {
          0% { opacity: 1; filter: drop-shadow(0 0 6px rgba(250,204,21,.6)); }
          50% { opacity: .25; filter: drop-shadow(0 0 0 rgba(0,0,0,0)); }
          100% { opacity: 1; filter: drop-shadow(0 0 6px rgba(250,204,21,.6)); }
        }
        @keyframes glowPulse {
          0%,100% { box-shadow: 0 0 32px rgba(249,115,22,.25) inset; }
          50% { box-shadow: 0 0 48px rgba(249,115,22,.45) inset; }
        }

        @keyframes dotPulse {
          0%{transform:scale(1);opacity:1}
          50%{transform:scale(1.2);opacity:.7}
          100%{transform:scale(1);opacity:1}
        }
        .jaso-dot{
          width:8px;height:8px;border-radius:999px;
          background:#10b981;
          box-shadow:0 0 0 2px rgba(16,185,129,.15);
          animation:dotPulse 1.8s ease-in-out infinite;
          display:inline-block;
        }

        @keyframes titleGlow {
          0%,100%{text-shadow:0 0 0 rgba(79,70,229,0)}
          50%{text-shadow:0 0 8px rgba(79,70,229,.35)}
        }
        .jaso-title { animation: titleGlow 2.6s ease-in-out infinite; }

        @keyframes cardFade {
          from{opacity:0;transform:translateY(2px)}
          to{opacity:1;transform:translateY(0)}
        }
        .jaso-card {
          animation: cardFade .35s ease both;
          transition: box-shadow .2s ease, transform .12s ease;
        }
        .jaso-card:hover {
          box-shadow: 0 4px 18px rgba(79,70,229,.18);
          transform: translateY(-1px);
        }

        @keyframes impactFlashTri {
          0%{
            opacity:.75;color:#00B8C9;
            text-shadow:0 0 0 rgba(79,70,229,0)
          }
          33%{
            opacity:1;color:#4f46e5;
            text-shadow:0 0 10px rgba(79,70,229,.35)
          }
          66%{
            opacity:1;color:#F5F5F5;
            text-shadow:0 0 12px rgba(245,245,245,.75)
          }
          100%{
            opacity:.85;color:#00B8C9;
            text-shadow:0 0 0 rgba(79,70,229,0)
          }
        }
        .impact-flash {
          font-weight:900;
          letter-spacing:-0.01em;
          animation: impactFlashTri 2.8s ease-in-out infinite;
        }

        .promo-pill {
          display:inline-block;
          padding:2px 8px;
          border-radius:999px;
          background:rgba(255,255,255,.08);
          border:none;
          box-shadow:none;
        }
        .promo-pill.alt {
          background: rgba(0,184,201,.18);
          border:none;
          box-shadow:none;
        }

        :global(.kpi-gradient *[style*='border: 1px solid rgba(255,255,255'] ){
          border: none !important;
          box-shadow: none !important;
        }
        :global(.kpi-gradient),
        :global(.kpi-gradient span),
        :global(.kpi-gradient strong),
        :global(.kpi-gradient small) {
          color: #fff !important;
          opacity: 1 !important;
        }
        :global(.kpi-gradient *[style*='color:#64748b']),
        :global(.kpi-gradient *[style*='color: #64748b']) {
          color: #fff !important;
          opacity: 1 !important;
        }

        .donut-card{ position:relative; overflow:hidden; }
        .donut-card:hover{ transform: translateY(-1px); transition: transform .15s ease; }

        .donut-halo{
          position:absolute;
          inset: -18% -10% auto -10%;
          height: 54%;
          background:
            radial-gradient(60% 60% at 50% 40%, rgba(255,255,255,.35) 0%, rgba(255,255,255,0) 60%),
            radial-gradient(40% 40% at 70% 30%, rgba(0,184,201,.35) 0%, rgba(0,184,201,0) 70%),
            radial-gradient(50% 50% at 30% 60%, rgba(59,130,246,.30) 0%, rgba(59,130,246,0) 70%);
          filter: blur(22px);
          opacity:.32;
          pointer-events:none;
          animation: haloPulse 6s ease-in-out infinite;
        }

        @keyframes haloPulse{
          0%,100%{ opacity:.26; transform: translateY(0) }
          50%{ opacity:.42; transform: translateY(3px) }
        }
      `}</style>
    </div>
  );
}
