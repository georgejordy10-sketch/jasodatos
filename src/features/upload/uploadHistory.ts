import {
  getCommercialEffectiveQuantity,
  getCommercialNetSales,
} from "@/core/commercial/classifyCommercialMovement";
import { isCommercialSaleRow } from "@/core/commercial/isCommercialSaleRow";
export type ComparisonMode = "previous" | "day" | "week" | "month" | "year";

export type UploadHistoryItem = {
  id: string;
  fileName: string;
  uploadedAt: string;
  totalRows: number;
  totalSales: number;
  totalUnits: number;
  productsCount: number;
  localsCount: number;
  channelsCount: number;
  periodStart?: string | null;
  periodEnd?: string | null;
};

export const UPLOAD_HISTORY_STORAGE_KEY = "jasodatos_upload_history_v1";

function getCleanText(value: unknown) {
  return String(value ?? "").trim();
}

function toValidDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function getHistoryReferenceDate(item: UploadHistoryItem): Date {
  const periodDate = item.periodEnd
    ? new Date(item.periodEnd)
    : null;

  if (periodDate && !Number.isNaN(periodDate.getTime())) {
    return periodDate;
  }

  return new Date(item.uploadedAt);
}

export function buildUploadHistoryItem(
  processedData: {
    validRows: Record<string, unknown>[];
  },
  fileName: string
): UploadHistoryItem {
  let totalUnits = 0;
  let totalSales = 0;

  const products = new Set<string>();
  const locals = new Set<string>();
  const channels = new Set<string>();

  let periodStart: Date | null = null;
  let periodEnd: Date | null = null;

  for (const row of processedData.validRows) {
    const rowDate = toValidDate(row.fecha);

    if (rowDate) {
      if (!periodStart || rowDate < periodStart) {
        periodStart = rowDate;
      }

      if (!periodEnd || rowDate > periodEnd) {
        periodEnd = rowDate;
      }
    }

    if (!isCommercialSaleRow(row)) {
      continue;
    }

    const effectiveQuantity =
      getCommercialEffectiveQuantity(row);
    const netSales = getCommercialNetSales(row);

    totalUnits += effectiveQuantity;
    totalSales += netSales;

    const producto = getCleanText(row.producto);
    const sucursal = getCleanText(row.sucursal || "Local principal");
    const canal = getCleanText(row.canal);

    if (producto) products.add(producto);
    if (sucursal) locals.add(sucursal);
    if (canal) channels.add(canal);
  }

  return {
    id: `${Date.now()}-${fileName}`,
    fileName,
    uploadedAt: new Date().toISOString(),
    totalRows: processedData.validRows.length,
    totalSales,
    totalUnits,
    productsCount: products.size,
    localsCount: locals.size,
    channelsCount: channels.size,
    periodStart: periodStart?.toISOString() ?? null,
    periodEnd: periodEnd?.toISOString() ?? null,
  };
}

export function getComparisonModeLabel(mode: ComparisonMode) {
  const labels: Record<ComparisonMode, string> = {
    previous: "Carga anterior",
    day: "Día anterior",
    week: "Semana anterior",
    month: "Mes anterior",
    year: "Año anterior",
  };

  return labels[mode];
}

export function getComparisonUnavailableMessage(mode: ComparisonMode) {
  const messages: Record<ComparisonMode, string> = {
    previous:
      "Aún no hay una carga anterior disponible. Procesa al menos dos archivos para activar esta comparación.",
    day:
      "Para comparar contra el día anterior, carga al menos un archivo de una fecha previa.",
    week:
      "Para comparar contra la semana anterior, carga archivos en diferentes semanas o con varios días de diferencia.",
    month:
      "Para comparar contra el mes anterior, carga al menos un archivo de un mes previo.",
    year:
      "Para comparar contra el año anterior, carga al menos un archivo de un año previo.",
  };

  return messages[mode];
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function findComparisonReference(
  current: UploadHistoryItem,
  history: UploadHistoryItem[],
  mode: ComparisonMode
) {
  const previousItems = history.filter((item) => item.id !== current.id);

  if (mode === "previous") {
    return previousItems[0] ?? null;
  }

  const currentDate = getHistoryReferenceDate(current);

  if (mode === "day") {
    const targetDate = new Date(currentDate);
    targetDate.setDate(targetDate.getDate() - 1);

    return (
      previousItems.find((item) =>
        isSameDay(getHistoryReferenceDate(item), targetDate)
      ) ?? null
    );
  }

  if (mode === "week") {
    const fromDate = new Date(currentDate);
    fromDate.setDate(fromDate.getDate() - 7);

    return (
      previousItems.find((item) => {
        const itemDate = getHistoryReferenceDate(item);
        return itemDate >= fromDate && itemDate < currentDate;
      }) ?? null
    );
  }

  if (mode === "month") {
    const previousMonth = new Date(currentDate);
    previousMonth.setMonth(previousMonth.getMonth() - 1);

    return (
      previousItems.find((item) => {
        const itemDate = getHistoryReferenceDate(item);
        return (
          itemDate.getFullYear() === previousMonth.getFullYear() &&
          itemDate.getMonth() === previousMonth.getMonth()
        );
      }) ?? null
    );
  }

  const previousYear = new Date(currentDate);
  previousYear.setFullYear(previousYear.getFullYear() - 1);

  return (
    previousItems.find((item) => {
      const itemDate = getHistoryReferenceDate(item);
      return itemDate.getFullYear() === previousYear.getFullYear();
    }) ?? null
  );
}

export function calculatePercentChange(current: number, previous: number) {
  if (previous === 0 && current === 0) return "0.0%";
  if (previous === 0) return "+100.0%";

  const change = ((current - previous) / previous) * 100;
  return `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`;
}

export function getUploadDateLabel(uploadedAt: string) {
  const uploadedDate = new Date(uploadedAt);
  const today = new Date();

  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const startOfUploadedDate = new Date(
    uploadedDate.getFullYear(),
    uploadedDate.getMonth(),
    uploadedDate.getDate()
  );

  const diffInDays = Math.floor(
    (startOfToday.getTime() - startOfUploadedDate.getTime()) /
      (1000 * 60 * 60 * 24)
  );

  if (diffInDays === 0) return "Hoy";
  if (diffInDays === 1) return "Ayer";
  if (diffInDays > 1 && diffInDays <= 7) return "Esta semana";

  const isCurrentMonth =
    uploadedDate.getFullYear() === today.getFullYear() &&
    uploadedDate.getMonth() === today.getMonth();

  if (isCurrentMonth) return "Este mes";

  const previousMonth = new Date(today);
  previousMonth.setMonth(previousMonth.getMonth() - 1);

  const isPreviousMonth =
    uploadedDate.getFullYear() === previousMonth.getFullYear() &&
    uploadedDate.getMonth() === previousMonth.getMonth();

  if (isPreviousMonth) return "Mes anterior";

  const isPreviousYear = uploadedDate.getFullYear() === today.getFullYear() - 1;

  if (isPreviousYear) return "Año anterior";

  return uploadedDate.toLocaleDateString("es-EC", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}