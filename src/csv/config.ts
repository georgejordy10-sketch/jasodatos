// src/csv/config.ts

// Columnas OBLIGATORIAS mínimas (plantilla base)
export const REQUIRED_COLUMNS = [
  'fecha',
  'sucursal',
  'bodega',
  'sku',
  'producto',
  'tipo_movimiento',   // ingreso | salida | ajuste | devolucion | merma | transferencia
  'cantidad',
  'costo_unitario',
  'precio_unitario',
  'canal',             // tienda | whatsapp | web | llamada | marketplace | mayorista
  'origen_registro',   // csv | ocr | qr | whatsapp | manual
] as const;

// Reglas condicionales (según tipo_movimiento)
export const CONDITIONAL_REQUIRED: Record<string, string[]> = {
  ingreso: ['proveedor', 'doc_referencia'],
  salida: ['cliente_id', 'cliente_tipo', 'medio_pago'],
  devolucion: ['doc_referencia'],
  transferencia: ['bodega_origen', 'bodega_destino', 'doc_referencia'],
  ajuste: ['motivo_ajuste'],
  merma: ['motivo_merma'],
};

// Enums permitidos (dominios)
export const ENUMS: Record<string, string[]> = {
  tipo_movimiento: ['ingreso', 'salida', 'ajuste', 'devolucion', 'merma', 'transferencia'],
  canal: ['tienda', 'whatsapp', 'web', 'llamada', 'marketplace', 'mayorista'],
  cliente_tipo: ['nuevo', 'recurrente', 'empresa'],
  medio_pago: ['efectivo', 'tarjeta', 'transferencia', 'credito'],
  origen_registro: ['csv', 'ocr', 'qr', 'whatsapp', 'manual'],
};

// Columnas OPCIONALES de la plantilla
const OPTIONAL_COLUMNS = [
  'doc_referencia', 'observaciones',
  'cliente_id', 'cliente_nombre', 'cliente_tipo',
  'proveedor',
  'bodega_origen', 'bodega_destino', 'ubicacion', 'lote', 'vencimiento',
  'vendedor', 'medio_pago', 'descuento', 'impuesto', 'costo_envio',
  'qr_id',
];

// TODAS las columnas aceptadas por la plantilla (obligatorias + opcionales)
export const ALL_COLUMNS: string[] = Array.from(
  new Set<string>([...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS])
);

// Columnas numéricas (para validación/formateo)
export const columnasNumericas = [
  'cantidad',
  'costo_unitario',
  'precio_unitario',
  'descuento',
  'impuesto',
  'costo_envio',
] as const;

