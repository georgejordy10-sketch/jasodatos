// src/app/api/plantilla-csv/route.ts
import { NextResponse } from 'next/server';
import { ALL_COLUMNS, ENUMS } from '@/csv/config';

// Util para CSV seguro
function escapeCSV(v: unknown) {
  const s = String(v ?? '');
  const needsQuotes = /[",\n;]/.test(s);
  const out = s.replace(/"/g, '""');
  return needsQuotes ? `"${out}"` : out;
}

// Genera una fila de ejemplo con valores válidos (opcional)
function buildExampleRow(headers: string[]) {
  // Valores de ejemplo simples y válidos
  const today = new Date();
  const iso = today.toISOString().slice(0, 10); // YYYY-MM-DD

  // Picks “bonitos” desde ENUMS
  const pick = <K extends keyof typeof ENUMS>(k: K) => ENUMS[k][0];

  const samples: Record<string, string | number> = {
    fecha: iso,                 // ISO
    sucursal: 'Matriz',
    bodega: 'Principal',
    sku: 'SKU-001',
    producto: 'Producto demo',
    tipo_movimiento: pick('tipo_movimiento'), // ingreso
    cantidad: 10,
    costo_unitario: 5.25,
    precio_unitario: 8.99,
    canal: pick('canal'),       // tienda
    origen_registro: pick('origen_registro'), // csv
    doc_referencia: 'DOC-123',
    observaciones: 'Observación demo',
    cliente_id: 'C-001',
    cliente_nombre: 'Cliente Demo',
    cliente_tipo: pick('cliente_tipo'), // nuevo
    proveedor: 'Proveedor Demo',
    bodega_origen: 'Principal',
    bodega_destino: 'Secundaria',
    ubicacion: 'Estante A1',
    lote: 'L2025-001',
    vencimiento: '2026-12-31',
    vendedor: 'Vendedor Demo',
    medio_pago: pick('medio_pago'), // efectivo
    descuento: 0,
    impuesto: 0.0,
    costo_envio: 0.0,
    qr_id: 'QR-XYZ',
    empresa: 'JasoDatos S.A.',
  };

  return headers.map((h) => escapeCSV(samples[h] ?? '')).join(',');
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const withExamples = url.searchParams.get('withExamples') === 'true';

  // Headers desde la fuente única de verdad
  const HEADERS = Array.from(new Set(ALL_COLUMNS));
  const headerLine = HEADERS.join(',');

  // Fila de ejemplo opcional
  const sample = withExamples ? buildExampleRow(HEADERS) : HEADERS.map(() => '').join(',');

  // CSV con BOM para Excel
  const csv = `\uFEFF${headerLine}\n${sample}\n`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="plantilla_inventario${withExamples ? '_ejemplo' : ''}.csv"`,
      // Cache agresivo si quieres (opcional):
      // 'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=60',
    },
  });
}
