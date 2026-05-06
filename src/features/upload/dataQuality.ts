import type { ConfirmedMapping } from "@/core/mapping/types";

export type DataQualityStatus = "good" | "warning" | "blocked";

export interface DataQualityIssue {
  type: "error" | "warning";
  message: string;
}

export interface DataQualityReport {
  score: number;
  status: DataQualityStatus;
  recommendation: string;
  totalRows: number;
  emptyRows: number;
  duplicateRows: number;
  mappedColumns: number;
  unmappedColumns: string[];
  missingRequiredFields: string[];
  invalidDateRows: number;
  negativeQuantityRows: number;
  negativePriceRows: number;
  negativeStockRows: number;
  rowsWithMissingRequiredValues: number;
  issues: DataQualityIssue[];
}

const REQUIRED_FIELDS = [
  "fecha",
  "sucursal",
  "producto",
  "cantidad",
  "precio_unitario",
];

const FIELD_LABELS: Record<string, string> = {
  fecha: "Fecha",
  sucursal: "Sucursal / Local",
  producto: "Producto",
  cantidad: "Cantidad vendida",
  precio_unitario: "Precio unitario",
  stock: "Stock disponible",
};
function formatColumnDisplayName(value: string): string {
  const customLabels: Record<string, string> = {
    sku: "Código del producto",
    categoria: "Categoría",
    precio_unitario: "Precio unitario",
    costo_unitario: "Costo unitario",
    tipo_movimiento: "Tipo de movimiento",
    bodega: "Bodega",
    canal_venta: "Canal de venta",
    ciudad: "Ciudad",
    provincia: "Provincia",
    pais: "País",
  };

  const normalizedValue = value.trim().toLowerCase();

  if (customLabels[normalizedValue]) {
    return customLabels[normalizedValue];
  }

  return value
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
function isEmptyValue(value: unknown): boolean {
  return value === undefined || value === null || String(value).trim() === "";
}

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const raw = value.trim();
    if (!raw) return null;

    const cleaned = raw.replace(/\s/g, "");
    const hasComma = cleaned.includes(",");
    const hasDot = cleaned.includes(".");

    if (hasComma && hasDot) {
      const normalized = cleaned.replace(/\./g, "").replace(",", ".");
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : null;
    }

    if (hasComma && !hasDot) {
      const normalized = cleaned.replace(",", ".");
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : null;
    }

    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  if (typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value !== "string") return null;

  const raw = value.trim();
  if (!raw) return null;

  const direct = new Date(raw);
  if (!Number.isNaN(direct.getTime())) return direct;

  const dateMatch = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (!dateMatch) return null;

  const day = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const yearRaw = Number(dateMatch[3]);
  const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;

  const parsed = new Date(year, month - 1, day);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
}

function buildCanonicalRow(
  rawRow: Record<string, unknown>,
  mappings: ConfirmedMapping[]
): Record<string, unknown> {
  const mappingMap = new Map<string, string>();

  for (const mapping of mappings) {
    mappingMap.set(mapping.sourceColumn, mapping.targetField);
  }

  const canonicalRow: Record<string, unknown> = {};

  for (const [sourceColumn, value] of Object.entries(rawRow)) {
    const targetField = mappingMap.get(sourceColumn);
    if (!targetField) continue;

    canonicalRow[targetField] = value;
  }

  return canonicalRow;
}

function isEmptyRow(row: Record<string, unknown>): boolean {
  return Object.values(row).every(isEmptyValue);
}

function buildDuplicateKey(row: Record<string, unknown>): string {
  return [
    normalizeText(row.fecha),
    normalizeText(row.sucursal),
    normalizeText(row.producto),
    normalizeText(row.cantidad),
    normalizeText(row.precio_unitario),
  ].join("|");
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function calculateDataQualityReport(params: {
  rawRows: Record<string, unknown>[];
  columns: string[];
  mappings: ConfirmedMapping[];
}): DataQualityReport {
  const { rawRows, columns, mappings } = params;

  const mappedSourceColumns = new Set(mappings.map((mapping) => mapping.sourceColumn));
  const mappedTargetFields = new Set(mappings.map((mapping) => mapping.targetField));

  const unmappedColumns = columns.filter((column) => !mappedSourceColumns.has(column));

  const missingRequiredFields = REQUIRED_FIELDS.filter(
    (field) => !mappedTargetFields.has(field)
  );

  let emptyRows = 0;
  let invalidDateRows = 0;
  let negativeQuantityRows = 0;
  let negativePriceRows = 0;
  let negativeStockRows = 0;
  let rowsWithMissingRequiredValues = 0;
  let duplicateRows = 0;

  const seenDuplicateKeys = new Set<string>();

  for (const rawRow of rawRows) {
    if (isEmptyRow(rawRow)) {
      emptyRows += 1;
      continue;
    }

    const row = buildCanonicalRow(rawRow, mappings);

    const hasMissingRequiredValue = REQUIRED_FIELDS.some((field) =>
      isEmptyValue(row[field])
    );

    if (hasMissingRequiredValue) {
      rowsWithMissingRequiredValues += 1;
    }

    if (!isEmptyValue(row.fecha) && !toDate(row.fecha)) {
      invalidDateRows += 1;
    }

    const cantidad = toNumber(row.cantidad);
    if (cantidad !== null && cantidad < 0) {
      negativeQuantityRows += 1;
    }

    const precio = toNumber(row.precio_unitario);
    if (precio !== null && precio < 0) {
      negativePriceRows += 1;
    }

    const stock = toNumber(row.stock);
    if (stock !== null && stock < 0) {
      negativeStockRows += 1;
    }

    const duplicateKey = buildDuplicateKey(row);

    if (duplicateKey.replace(/\|/g, "").trim()) {
      if (seenDuplicateKeys.has(duplicateKey)) {
        duplicateRows += 1;
      } else {
        seenDuplicateKeys.add(duplicateKey);
      }
    }
  }

  const totalRows = rawRows.length;
  const effectiveRows = Math.max(totalRows - emptyRows, 1);

  const missingRequiredPenalty = missingRequiredFields.length * 18;
  const missingValuesPenalty =
    (rowsWithMissingRequiredValues / effectiveRows) * 30;
  const invalidDatesPenalty = (invalidDateRows / effectiveRows) * 18;
  const negativeValuesPenalty =
    ((negativeQuantityRows + negativePriceRows + negativeStockRows) /
      effectiveRows) *
    18;
  const duplicatePenalty = (duplicateRows / effectiveRows) * 12;
  const unmappedPenalty =
    columns.length > 0 ? (unmappedColumns.length / columns.length) * 8 : 0;
  const emptyRowsPenalty = totalRows > 0 ? (emptyRows / totalRows) * 8 : 20;

  const score = clampScore(
    100 -
      missingRequiredPenalty -
      missingValuesPenalty -
      invalidDatesPenalty -
      negativeValuesPenalty -
      duplicatePenalty -
      unmappedPenalty -
      emptyRowsPenalty
  );

  const issues: DataQualityIssue[] = [];

  if (missingRequiredFields.length > 0) {
    issues.push({
      type: "error",
      message: `Faltan campos obligatorios: ${missingRequiredFields
        .map((field) => FIELD_LABELS[field] ?? field)
        .join(", ")}.`,
    });
  }

  if (totalRows === 0) {
    issues.push({
      type: "error",
      message: "El archivo no contiene filas para analizar.",
    });
  }

  if (rowsWithMissingRequiredValues > 0) {
    issues.push({
      type: "warning",
      message: `${rowsWithMissingRequiredValues} filas tienen valores obligatorios vacíos.`,
    });
  }

  if (invalidDateRows > 0) {
    issues.push({
      type: "warning",
      message: `${invalidDateRows} filas tienen fechas inválidas o no reconocidas.`,
    });
  }

  if (negativeQuantityRows > 0) {
    issues.push({
      type: "warning",
      message: `${negativeQuantityRows} filas tienen cantidades negativas.`,
    });
  }

  if (negativePriceRows > 0) {
    issues.push({
      type: "warning",
      message: `${negativePriceRows} filas tienen precios negativos.`,
    });
  }

  if (negativeStockRows > 0) {
    issues.push({
      type: "warning",
      message: `${negativeStockRows} filas tienen stock negativo.`,
    });
  }

  if (duplicateRows > 0) {
    issues.push({
      type: "warning",
      message: `${duplicateRows} filas parecen duplicadas según fecha, sucursal, producto, cantidad y precio.`,
    });
  }

if (unmappedColumns.length > 0) {
  const readableColumns = unmappedColumns
    .map(formatColumnDisplayName)
    .join(", ");

  issues.push({
    type: "warning",
    message: `${unmappedColumns.length} columnas no fueron mapeadas y no se usarán en el análisis: ${readableColumns}.`,
  });
}
  let status: DataQualityStatus = "good";

  if (missingRequiredFields.length > 0 || totalRows === 0 || score < 70) {
    status = "blocked";
  } else if (score < 90 || issues.some((issue) => issue.type === "warning")) {
    status = "warning";
  }
let recommendation =
  "Puedes continuar con el análisis. El archivo cumple las condiciones necesarias para generar el panel comercial.";

if (status === "warning") {
  const details: string[] = [];

  if (unmappedColumns.length > 0) {
details.push(
  `revisar las columnas no mapeadas: ${unmappedColumns
    .map(formatColumnDisplayName)
    .join(", ")}`
);
  }

  if (rowsWithMissingRequiredValues > 0) {
    details.push("corregir filas con datos obligatorios vacíos");
  }

  if (invalidDateRows > 0) {
    details.push("revisar fechas inválidas o no reconocidas");
  }

  if (duplicateRows > 0) {
    details.push("validar posibles filas duplicadas");
  }

  recommendation =
    details.length > 0
      ? `Puedes continuar con el análisis, pero se recomienda ${details.join(
          "; "
        )}.`
      : "Puedes continuar con el análisis, pero conviene revisar las observaciones para mejorar la precisión.";
}

if (status === "blocked") {
  if (missingRequiredFields.length > 0) {
    recommendation = `No generes el panel todavía. Primero asigna o corrige los campos obligatorios faltantes: ${missingRequiredFields
      .map((field) => FIELD_LABELS[field] ?? field)
      .join(", ")}.`;
  } else if (score < 70) {
    recommendation =
      "No generes el panel todavía. El archivo tiene demasiadas inconsistencias y podría producir indicadores poco confiables.";
  } else {
    recommendation =
      "No generes el panel todavía. Corrige los errores críticos detectados antes de continuar.";
  }
}

return {
  score,
  status,
  recommendation,
  totalRows,
  emptyRows,
  duplicateRows,
  mappedColumns: mappedSourceColumns.size,
  unmappedColumns,
  missingRequiredFields,
  invalidDateRows,
  negativeQuantityRows,
  negativePriceRows,
  negativeStockRows,
  rowsWithMissingRequiredValues,
  issues,
};
}