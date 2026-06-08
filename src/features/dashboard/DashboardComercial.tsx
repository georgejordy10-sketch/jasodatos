"use client";

import { parseFlexibleNumber } from "@/core/numbers/parseFlexibleNumber";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { ProcessDatasetResult } from "@/core/ingestion/readDataset";
import BenchmarkingSucursales from "@/features/dashboard/BenchmarkingSucursales";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { buildAlerts } from "@/features/alerts/buildAlerts";
import ProfileSettingsPanel from "@/features/settings/ProfileSettingsPanel";
import { useProfileSettings } from "@/features/settings/useProfileSettings";
import type { ChannelKey } from "@/features/settings/types";
import SubscriptionPlansPanel from "@/features/subscription/SubscriptionPlansPanel";
import { useBusinessPlan } from "@/features/subscription/useBusinessPlan";
import {
  PLAN_FEATURES,
  PLAN_LABELS,
  type PlanFeature,
  type SubscriptionPlan,
} from "@/features/subscription/types";
import HeroHeader from "@/features/dashboard/HeroHeader";
import KpiSection from "@/features/dashboard/KpiSection";
import AlertsSection from "@/features/dashboard/AlertsSection";
import FilterBar from "@/features/dashboard/FilterBar";
import DetailTableSection from "@/features/dashboard/DetailTableSection";
import SalesChartsSection from "@/features/dashboard/SalesChartsSection";
import SecondaryChartsSection from "@/features/dashboard/SecondaryChartsSection";
import UpgradeBanner from "@/features/subscription/UpgradeBanner";
import { buildCommercialRecommendations } from "@/features/recommendations/buildCommercialRecommendations";
import type { CommercialRecommendation } from "@/features/recommendations/types";
import RecommendedActionsSection from "@/features/dashboard/RecommendedActionsSection";
type DashboardUploadHistoryItem = {
  id: string;
  file_name: string;
  uploaded_at: string;
  total_rows: number;
  total_sales: number;
  total_units: number;
  products_count: number;
  locals_count: number;
  channels_count: number;
};
type Props = {
  processedData: ProcessDatasetResult;
  onClearFile?: () => void;
  onSelectAnotherFile?: () => void;
  onAdjustMapping?: () => void;
};
type StockRiskRow = {
  producto: string;
  sucursal: string;
  stock: number;
  minimo: number;
  estado: string;
  diasCobertura: number;
};

type SalesPoint = {
  fecha: string;
  ventas: number;
  comparativo: number;
};

type PiePoint = {
  producto: string;
  ventas: number;
};
type ComparisonMetric =
  | "ventas"
  | "unidades"
  | "participacion"
  | "precioPromedio"
  | "costoPromedio"
  | "margenEstimado"
  | "stock"
  | "rotacion"
  | "diasCobertura"
  | "rentabilidadPct"
  | "tendenciaPct";

type ProductComparisonRow = {
  producto: string;
  ventas: number;
  unidades: number;
  participacion: number;
  precioPromedio: number;
  costoPromedio: number;
  margenEstimado: number;
  stock: number;
  rotacion: number;
  diasCobertura: number;
  rentabilidadPct: number;
  tendenciaPct: number;
};
const COMPARISON_METRIC_OPTIONS: {
  key: ComparisonMetric;
  label: string;
}[] = [
  { key: "ventas", label: "Ventas" },
  { key: "unidades", label: "Unidades" },
  { key: "participacion", label: "participación %" },
  { key: "precioPromedio", label: "Precio promedio" },
  { key: "costoPromedio", label: "Costo promedio" },
  { key: "margenEstimado", label: "Margen estimado" },
  { key: "stock", label: "Inventario" },
  { key: "rotacion", label: "rotación" },
  { key: "diasCobertura", label: "días de cobertura" },
  { key: "rentabilidadPct", label: "Rentabilidad %" },
  { key: "tendenciaPct", label: "Tendencia %" },
];

function getComparisonMetricLabel(metric: ComparisonMetric): string {
  return (
    COMPARISON_METRIC_OPTIONS.find((item) => item.key === metric)?.label ??
    "Ventas"
  );
}

function getComparisonMetricValue(
  row: ProductComparisonRow,
  metric: ComparisonMetric
): number {
  return row[metric];
}
const COLORS = [
  "#5B6CFF",
  "#8B5CF6",
  "#22C55E",
  "#F59E0B",
  "#EC4899",
  "#06B6D4",
  "#94A3B8",
  "#14B8A6",
];
function slugifyFileName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}
function toNumber(value: unknown): number {
  return parseFlexibleNumber(value);
}

function toText(value: unknown, fallback = "-"): string {
  if (typeof value === "string") return value.trim() || fallback;
  if (typeof value === "number") return String(value);
  return fallback;
}
function resolveAxisCurrencySymbol(code: string): string {
  if (code === "COP") return "COP";
  if (code === "MXN") return "MXN";
  if (code === "PEN") return "S/";
  if (code === "EUR") return "";
  return "$";
}

function getAxisWidth(currencyCode: string): number {
  if (currencyCode === "COP") return 86;
  if (currencyCode === "MXN") return 78;
  if (currencyCode === "PEN") return 70;
  return 62;
}
function formatMoney(value: number, locale = "es-EC", currencyCode = "USD"): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return new Intl.NumberFormat("es-EC", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }
}

function formatInt(value: number, locale = "es-EC"): string {
  try {
    return new Intl.NumberFormat(locale, {
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return new Intl.NumberFormat("es-EC", {
      maximumFractionDigits: 0,
    }).format(value);
  }
}
function parseDateLike(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  if (typeof value === "string") {
    const raw = value.trim();
    if (!raw) return null;

    const d1 = new Date(raw);
    if (!Number.isNaN(d1.getTime())) return d1;

    const parts = raw.split(/[\/\-]/);
    if (parts.length === 3) {
      const [a, b, c] = parts;
      if (a.length === 4) {
        const d2 = new Date(`${a}-${b}-${c}`);
        if (!Number.isNaN(d2.getTime())) return d2;
      } else {
        const d2 = new Date(`${c}-${b}-${a}`);
        if (!Number.isNaN(d2.getTime())) return d2;
      }
    }
  }

  return null;
}

function toDateKey(value: unknown): string {
  const d = parseDateLike(value);
  if (!d) return toText(value, "Sin fecha");
  return d.toISOString().slice(0, 10);
}

function diffDays(start: Date, end: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const utcStart = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const utcEnd = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.floor((utcEnd - utcStart) / msPerDay);
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function formatDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function isWithinRange(value: unknown, fromDate: string, toDate: string): boolean {
  const key = toDateKey(value);
  if (fromDate && key < fromDate) return false;
  if (toDate && key > toDate) return false;
  return true;
}

function normalizeCommercialText(value: unknown): string {
  return toText(value, "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getChannelDisplayName(key: ChannelKey): string {
  if (key === "ecommerce") return "e-commerce";
  if (key === "mayorista") return "mayorista";
  return "tienda física";
}

function normalizeChannelKey(value: unknown): ChannelKey | null {
  const normalized = normalizeCommercialText(value);

  if (!normalized) return null;

  if (
    normalized === "e commerce" ||
    normalized === "ecommerce" ||
    normalized === "online" ||
    normalized === "canal online" ||
    normalized === "web" ||
    normalized === "digital" ||
    normalized === "tienda online" ||
    normalized === "venta online"
  ) {
    return "ecommerce";
  }

  if (
    normalized === "mayorista" ||
    normalized === "mayoreo" ||
    normalized === "wholesale" ||
    normalized === "distribuidor" ||
    normalized === "distribucion" ||
    normalized === "venta mayorista"
  ) {
    return "mayorista";
  }

  if (
    normalized === "tienda fisica" ||
    normalized === "fisico" ||
    normalized === "fisica" ||
    normalized === "presencial" ||
    normalized === "punto de venta" ||
    normalized === "mostrador" ||
    normalized === "sucursal" ||
    normalized === "retail" ||
    normalized === "local" ||
    normalized === "venta en tienda"
  ) {
    return "tiendaFisica";
  }

  return null;
}

function toDisplayChannelName(value: unknown): string | null {
  const normalized = normalizeCommercialText(value);

  if (!normalized) return null;

  const standardKey = normalizeChannelKey(normalized);

  if (standardKey) {
    return getChannelDisplayName(standardKey);
  }

  const specialLabels: Record<string, string> = {
    whatsapp: "WhatsApp",
    instagram: "Instagram",
    facebook: "Facebook",
    tiktok: "TikTok",
    marketplace: "Marketplace",
    mercadolibre: "Mercado Libre",
    "mercado libre": "Mercado Libre",
  };

  if (specialLabels[normalized]) {
    return specialLabels[normalized];
  }

  return normalized
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function isRowChannelEnabled(
  row: Record<string, unknown>,
  channelsEnabled: Record<ChannelKey, boolean>
): boolean {
  const key = normalizeChannelKey(row.canal);

  if (!key) return true;

  return channelsEnabled[key];
}

function buildTopProducts(rows: Record<string, unknown>[]): PiePoint[] {
  const map = new Map<string, number>();

  for (const row of rows) {
    const producto = toText(row.producto, "Sin producto");
    const venta = toNumber(row.cantidad) * toNumber(row.precio_unitario);
    map.set(producto, (map.get(producto) ?? 0) + venta);
  }

  return [...map.entries()]
    .map(([producto, ventas]) => ({ producto, ventas }))
    .sort((a, b) => b.ventas - a.ventas)
    .slice(0, 8);
}

function buildProductComparisonRows(
  rows: Record<string, unknown>[],
  selectedProducts: string[],
  ventasTotales: number
): ProductComparisonRow[] {
  const selectedSet = new Set(selectedProducts);

  const dateKeys = [...new Set(rows.map((row) => toDateKey(row.fecha)))].sort();
  const midpoint = Math.max(1, Math.floor(dateKeys.length / 2));
  const firstPeriodDates = new Set(dateKeys.slice(0, midpoint));

  const map = new Map<
    string,
    {
      ventas: number;
      unidades: number;
      costoTotal: number;
      stock: number;
      ventasPrimerPeriodo: number;
      ventasSegundoPeriodo: number;
    }
  >();

  for (const row of rows) {
    const producto = toText(row.producto, "Sin producto");

    if (!selectedSet.has(producto)) continue;

    const cantidad = toNumber(row.cantidad);
    const precioUnitario = toNumber(row.precio_unitario);
    const costoUnitario = toNumber(row.costo_unitario);
    const venta = cantidad * precioUnitario;
    const costoTotal = cantidad * costoUnitario;
    const stock = toNumber(row.stock);
    const dateKey = toDateKey(row.fecha);

    const current = map.get(producto) ?? {
      ventas: 0,
      unidades: 0,
      costoTotal: 0,
      stock: 0,
      ventasPrimerPeriodo: 0,
      ventasSegundoPeriodo: 0,
    };

    const next = {
      ventas: current.ventas + venta,
      unidades: current.unidades + cantidad,
      costoTotal: current.costoTotal + costoTotal,
      stock: stock > 0 ? stock : current.stock,
      ventasPrimerPeriodo:
        current.ventasPrimerPeriodo +
        (firstPeriodDates.has(dateKey) ? venta : 0),
      ventasSegundoPeriodo:
        current.ventasSegundoPeriodo +
        (!firstPeriodDates.has(dateKey) ? venta : 0),
    };

    map.set(producto, next);
  }

  const daysInPeriod = Math.max(1, dateKeys.length);

  return selectedProducts
    .map((producto) => {
      const value = map.get(producto) ?? {
        ventas: 0,
        unidades: 0,
        costoTotal: 0,
        stock: 0,
        ventasPrimerPeriodo: 0,
        ventasSegundoPeriodo: 0,
      };

      const precioPromedio =
        value.unidades > 0 ? value.ventas / value.unidades : 0;

      const costoPromedio =
        value.unidades > 0 ? value.costoTotal / value.unidades : 0;

      const margenEstimado = value.ventas - value.costoTotal;

      const rentabilidadPct =
        value.ventas > 0 ? (margenEstimado / value.ventas) * 100 : 0;

      const rotacion = value.stock > 0 ? value.unidades / value.stock : 0;

      const unidadesPromedioDia = value.unidades / daysInPeriod;

      const diasCobertura =
        unidadesPromedioDia > 0 && value.stock > 0
          ? value.stock / unidadesPromedioDia
          : 0;

      const tendenciaPct =
        value.ventasPrimerPeriodo > 0
          ? ((value.ventasSegundoPeriodo - value.ventasPrimerPeriodo) /
              value.ventasPrimerPeriodo) *
            100
          : value.ventasSegundoPeriodo > 0
          ? 100
          : 0;

      return {
        producto,
        ventas: value.ventas,
        unidades: value.unidades,
        participacion:
          ventasTotales > 0 ? (value.ventas / ventasTotales) * 100 : 0,
        precioPromedio,
        costoPromedio,
        margenEstimado,
        stock: value.stock,
        rotacion,
        diasCobertura,
        rentabilidadPct,
        tendenciaPct,
      };
    })
    .filter((row) => row.ventas > 0 || row.unidades > 0 || row.stock > 0);
}

function buildSalesTrend(rows: Record<string, unknown>[]): SalesPoint[] {
  const map = new Map<string, number>();

  for (const row of rows) {
    const fecha = toDateKey(row.fecha);
    const venta = toNumber(row.cantidad) * toNumber(row.precio_unitario);
    map.set(fecha, (map.get(fecha) ?? 0) + venta);
  }

  return [...map.entries()]
    .map(([fecha, ventas]) => ({
      fecha,
      ventas,
      comparativo: Number((ventas * 0.72).toFixed(2)),
    }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

function buildStockRisk(
  rows: Record<string, unknown>[],
  stockMin: number,
  selectedSucursal: string = "Todas"
): StockRiskRow[] {
  const minimo = Math.max(0, stockMin);
  const criticalThreshold = Math.max(1, Math.round(minimo * 0.5));

  const grouped = new Map<
    string,
    {
      producto: string;
      sucursal: string;
      stock: number;
    }
  >();

  for (const row of rows) {
    if (row.stock === undefined || row.stock === null || row.stock === "") {
      continue;
    }

    const producto = toText(row.producto, "Sin producto");
    const sucursal = toText(row.sucursal, "Sin sucursal");

    if (selectedSucursal !== "Todas" && sucursal !== selectedSucursal) {
      continue;
    }

    const stock = toNumber(row.stock);
    const key = `${sucursal}__${producto}`;
    const current = grouped.get(key);

    if (!current || stock < current.stock) {
      grouped.set(key, {
        producto,
        sucursal,
        stock,
      });
    }
  }

  return [...grouped.values()]
    .map((item) => {
      const diasCobertura =
        item.stock <= 0 ? 0 : Math.max(1, Math.round(item.stock / 5));

      let estado = "Óptimo";
      if (item.stock <= 0) estado = "Sin inventario";
      else if (item.stock <= criticalThreshold) estado = "Crítico";
      else if (item.stock < minimo) estado = "En riesgo";

      return {
        producto: item.producto,
        sucursal: item.sucursal,
        stock: item.stock,
        minimo,
        estado,
        diasCobertura,
      };
    })
    .filter((row) => row.stock < minimo)
    .sort(
      (a, b) =>
        a.stock - b.stock ||
        a.sucursal.localeCompare(b.sucursal) ||
        a.producto.localeCompare(b.producto)
    )
    .slice(0, 6);
}

function buildChannelData(rows: Record<string, unknown>[]) {
  const byDateAndChannel = new Map<string, Record<string, number | string>>();
  const channels = new Set<string>();

  for (const row of rows) {
    const channelName = toDisplayChannelName(row.canal);

    if (!channelName) continue;

    const fecha = toDateKey(row.fecha);
    const venta = toNumber(row.cantidad) * toNumber(row.precio_unitario);

    channels.add(channelName);

    const current = byDateAndChannel.get(fecha) ?? { fecha };
    current[channelName] = toNumber(current[channelName]) + venta;
    byDateAndChannel.set(fecha, current);
  }

  const channelList = [...channels].sort((a, b) => a.localeCompare(b, "es"));

  const data = [...byDateAndChannel.values()]
    .map((item) => {
      const normalizedItem: Record<string, number | string> = {
        fecha: String(item.fecha),
      };

      for (const channel of channelList) {
        normalizedItem[channel] = toNumber(item[channel]);
      }

      return normalizedItem;
    })
    .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));

  return {
    data,
    channels: channelList,
    hasChannelData: channelList.length > 0,
  };
}
function buildJasoBotInsights(
  rows: Record<string, unknown>[],
  stockMin: number,
  commercialRecommendations: CommercialRecommendation[] = []
) {
  if (!rows.length) {
    return {
      mensajePrincipal: "No hay suficiente información para generar recomendaciones comerciales.",
      insights: [
        "Carga un archivo para activar recomendaciones.",
        "JasoAlix analiza tus ventas, inventario y canales.",
        "Podrás detectar productos líderes y riesgos.",
        "También sugerirá acciones comerciales.",
      ],
      recomendaciones: [],
      promoWhatsApp:
        "Buen día. Tenemos promociones especiales disponibles. escríbenos para conocer disponibilidad para ti.",
      tipoPromo: "general",
    };
  }

  const ventasPorProducto = new Map<string, number>();
  const ventasPorSucursal = new Map<string, number>();
  const ventasPorCanal = new Map<string, number>();
  const productosConStock: { producto: string; stock: number }[] = [];

  for (const row of rows) {
    const producto = toText(row.producto, "Sin producto");
    const sucursal = toText(row.sucursal, "Sin sucursal");
    const canal = toText(row.canal, "Sin canal");
    const venta = toNumber(row.cantidad) * toNumber(row.precio_unitario);

    ventasPorProducto.set(producto, (ventasPorProducto.get(producto) ?? 0) + venta);
    ventasPorSucursal.set(sucursal, (ventasPorSucursal.get(sucursal) ?? 0) + venta);
    ventasPorCanal.set(canal, (ventasPorCanal.get(canal) ?? 0) + venta);

    if (row.stock !== undefined && row.stock !== null && row.stock !== "") {
      productosConStock.push({
        producto,
        stock: toNumber(row.stock),
      });
    }
  }

  const topProducto = [...ventasPorProducto.entries()].sort((a, b) => b[1] - a[1])[0];
  const topSucursal = [...ventasPorSucursal.entries()].sort((a, b) => b[1] - a[1])[0];
  const lowSucursal = [...ventasPorSucursal.entries()].sort((a, b) => a[1] - b[1])[0];
  const topCanal = [...ventasPorCanal.entries()].sort((a, b) => b[1] - a[1])[0];

  const productosCriticos = productosConStock
    .filter((item) => item.stock <= stockMin)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 3);

  const recomendaciones: string[] = commercialRecommendations.map(
    (item) => `${item.title}. ${item.message}`
  );
  const productosOrdenados = [...ventasPorProducto.entries()].sort((a, b) => b[1] - a[1]);

  let promoWhatsApp = "";
  let tipoPromo = "general";

  if (productosCriticos.length > 0) {
    const critico = productosCriticos[0].producto;
    tipoPromo = "liquidacion";
    promoWhatsApp = `Buen día. Oferta rápida: ${critico} con precio especial por liquidación de inventario. Disponible hasta agotar existencias. Responde QUIERO para reservar.`;
  } else if (lowSucursal && topProducto) {
    const top = topProducto[0];
    tipoPromo = "impulso_sucursal";

    promoWhatsApp = `Buen día. Estamos impulsando ${top} con una propuesta especial en ${lowSucursal[0]}. Disponible hasta agotar existencias. Responde QUIERO para reservar.`;
  } else if (productosOrdenados.length > 1) {
    const top = productosOrdenados[0][0];
    const bajo = productosOrdenados[productosOrdenados.length - 1][0];
    tipoPromo = "combo";

    promoWhatsApp = `Buen día. Te compartimos una promoción especial: lleva ${top} y combínalo con ${bajo}. Es una excelente oportunidad para aprovechar una compra más completa. Disponible hasta agotar existencias. Responde QUIERO para reservar.`;
  } else if (topProducto) {
    const top = topProducto[0];
    tipoPromo = "producto_estrella";

    promoWhatsApp = `Buen día. Hoy queremos recomendarte ${top}, uno de nuestros productos destacados. Si deseas conocer la promoción vigente, escríbenos y te compartimos la información.`;
  } else {
    promoWhatsApp =
      "Buen día. Tenemos promociones especiales disponibles. escríbenos para conocer las mejores opciones para ti.";
  }

  const nombreProductoTop = topProducto?.[0] ?? "tu producto líder";
  const nombreSucursalTop = topSucursal?.[0] ?? "tu mejor sucursal";
  const nombreSucursalBaja = lowSucursal?.[0] ?? "tu sucursal con menor participación";
  const nombreCanalTop = topCanal?.[0] ?? "tu canal principal";

  let mensajePrincipal = `Prioriza ${nombreProductoTop} como producto ancla y ejecútalo primero en ${nombreSucursalTop} para acelerar ventas en ${nombreCanalTop}.`;

  if (tipoPromo === "liquidacion" && productosCriticos.length > 0) {
    mensajePrincipal = `Detectamos presión de inventario en ${productosCriticos[0].producto}. La mejor jugada ahora es activar una salida comercial rápida antes de que el inventario siga perdiendo tracción.`;
  } else if (tipoPromo === "impulso_sucursal") {
    mensajePrincipal = `Existe una oportunidad clara para recuperar desempeño en ${nombreSucursalBaja}. Activa una promoción enfocada con ${nombreProductoTop} para levantar conversión en esa sucursal.`;
  } else if (tipoPromo === "combo" && productosOrdenados.length > 1) {
    const top = productosOrdenados[0][0];
    const bajo = productosOrdenados[productosOrdenados.length - 1][0];
    mensajePrincipal = `La mejor acción inmediata es empaquetar ${top} con ${bajo}. Ese combo puede aumentar ticket promedio y mover productos con menor tracción.`;
  } else if (tipoPromo === "producto_estrella") {
    mensajePrincipal = `Tu mejor palanca comercial hoy es ${nombreProductoTop}. Conviene destacarlo como producto ancla y usarlo para empujar más ventas en ${nombreCanalTop}.`;
  }

  const insights: string[] = [];

  insights.push(`Enfócate en: ${nombreProductoTop}`);
  insights.push(`Sucursal líder: ${nombreSucursalTop}`);
  insights.push(`Sucursal a reforzar: ${nombreSucursalBaja}`);
  if (nombreCanalTop && nombreCanalTop !== "tu canal principal") {
    insights.push(`Canal con mayor aporte: ${nombreCanalTop}`);
  }

  if (productosCriticos.length > 0) {
    const nombresCriticos = productosCriticos.map((p) => p.producto).join(", ");
    insights[1] = `Productos críticos: ${nombresCriticos}`;
  }

  return {
    mensajePrincipal,
    insights: insights.slice(0, 4),
    recomendaciones: recomendaciones.slice(0, 3),
    promoWhatsApp,
    tipoPromo,
  };
}
type DetailModalType = "products" | "stock" | "channels" | null;
type BusinessCrmData = {
  business_name: string | null;
  owner_name: string | null;
  commercial_email: string | null;
  commercial_whatsapp: string | null;
  ciudad: string | null;
  provincia: string | null;
  pais: string | null;
  commercial_notes: string | null;
  last_contact_at: string | null;
};
type DashboardSectionView =
  | "general"
  | "resumen"
  | "acciones"
  | "comparativo"
  | "alertas"
  | "ventas"
  | "inventario"
  | "productos"
  | "reportes"
  | "configuracion";
export default function DashboardComercial({
  processedData,
  onClearFile,
  onSelectAnotherFile,
  onAdjustMapping,
}: Props) {
  const [selectedSucursal, setSelectedSucursal] = useState("Todas");
  const [selectedStockSucursal, setSelectedStockSucursal] = useState("Todas");
  const [selectedProducto, setSelectedProducto] = useState("Todos");
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
const [selectedComparisonProducts, setSelectedComparisonProducts] = useState<string[]>([]);
const productComparisonRef = useRef<HTMLElement | null>(null);
const [highlightProductComparison, setHighlightProductComparison] = useState(false);
const highlightProductComparisonTimerRef = useRef<number | null>(null);
const [comparisonMetric, setComparisonMetric] = useState<ComparisonMetric>("ventas");
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionNotice, setActionNotice] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [plansOpen, setPlansOpen] = useState(false);
  useEffect(() => {
  function openPlansFromSidebar() {
    setPlansOpen(true);
  }

  window.addEventListener("jasodatos:open-plans", openPlansFromSidebar);

  return () => {
    window.removeEventListener("jasodatos:open-plans", openPlansFromSidebar);
  };
}, []);
  const [detailModal, setDetailModal] = useState<DetailModalType>(null);
  const [businessCrmData, setBusinessCrmData] = useState<BusinessCrmData | null>(
  null
);
  const {
    settings,
    updateSettings,
    updateThreshold,
    updateChannel,
    resetSettings,
  } = useProfileSettings();
const BUSINESS_SLUG_STORAGE_KEY = "jasodatos.currentBusinessSlug";

const [currentBusinessSlug, setCurrentBusinessSlug] = useState("");
const [dashboardUploadHistory, setDashboardUploadHistory] = useState<
  DashboardUploadHistoryItem[]
>([]);
const [showFullUploadHistory, setShowFullUploadHistory] = useState(false);
const [activeSectionView, setActiveSectionView] =
  useState<DashboardSectionView>("general");
const dashboardHistorySummary = useMemo(() => {
  const [latest, previous] = dashboardUploadHistory;

  if (!latest || !previous) {
    return null;
  }
const calculateChange = (current: number, before: number) => {
  if (before === 0 && current === 0) return "0.0%";
  if (before === 0) return "Sin base previa";

  const change = ((current - before) / before) * 100;

  if (Math.abs(change) > 999) {
    return "Carga anterior muy baja";
  }

  return `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`;
};

  const productDelta = latest.products_count - previous.products_count;
return {
  latest,
  previous,
  salesChange: calculateChange(
    Number(latest.total_sales),
    Number(previous.total_sales)
  ),
  unitsChange: calculateChange(
    Number(latest.total_units),
    Number(previous.total_units)
  ),
  productDelta,
  currentSales: Number(latest.total_sales),
  previousSales: Number(previous.total_sales),
  currentUnits: Number(latest.total_units),
  previousUnits: Number(previous.total_units),
  currentProducts: Number(latest.products_count),
  previousProducts: Number(previous.products_count),
};
}, [dashboardUploadHistory]);
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const businessSlugFromUrl = params.get("business")?.trim() ?? "";
  const businessSlugFromStorage =
    window.localStorage.getItem(BUSINESS_SLUG_STORAGE_KEY)?.trim() ?? "";

  if (businessSlugFromUrl) {
    setCurrentBusinessSlug(businessSlugFromUrl);
    window.localStorage.setItem(
      BUSINESS_SLUG_STORAGE_KEY,
      businessSlugFromUrl
    );
    return;
  }

  if (businessSlugFromStorage) {
    window.location.replace(
      `/cargas?business=${encodeURIComponent(businessSlugFromStorage)}`
    );
    return;
  }

  setCurrentBusinessSlug("");
}, []);
useEffect(() => {
  if (!currentBusinessSlug) {
    setDashboardUploadHistory([]);
    return;
  }

  let isMounted = true;

  async function loadDashboardUploadHistory() {
    try {
      const response = await fetch(
        `/api/businesses/by-slug/${encodeURIComponent(
          currentBusinessSlug
        )}/upload-history`
      );

      if (!response.ok) {
        setDashboardUploadHistory([]);
        return;
      }

      const result = await response.json();

      if (!isMounted) return;

      setDashboardUploadHistory(result.uploadHistory ?? []);
    } catch (error) {
      console.error("No se pudo cargar el historial de análisis:", error);

      if (isMounted) {
        setDashboardUploadHistory([]);
      }
    }
  }

  void loadDashboardUploadHistory();

  return () => {
    isMounted = false;
  };
}, [currentBusinessSlug]);
useEffect(() => {
function readSectionFromHash() {
  const hash = window.location.hash.replace("#", "");

  if (hash === "configuracion") {
    setSettingsOpen(true);
    setActiveSectionView("general");
    return;
  }

  if (
    hash === "resumen" ||
    hash === "acciones" ||
    hash === "comparativo" ||
    hash === "ventas" ||
    hash === "inventario" ||
    hash === "productos" ||
    hash === "alertas" ||
    hash === "reportes"
  ) {
    setActiveSectionView(hash);
    return;
  }

  setActiveSectionView("general");
}

readSectionFromHash();

window.addEventListener("hashchange", readSectionFromHash);
return () => window.removeEventListener("hashchange", readSectionFromHash);
}, []);
useEffect(() => {
  return () => {
if (highlightProductComparisonTimerRef.current !== null) {
  window.clearTimeout(highlightProductComparisonTimerRef.current);
}
  };
}, []);
function shouldShowSection(section: DashboardSectionView) {
  if (activeSectionView === "general") {
    return section !== "reportes";
  }

  return activeSectionView === section;
}
const isGeneralView = activeSectionView === "general";
useEffect(() => {
  let cancelled = false;

  if (!currentBusinessSlug) {
    setBusinessCrmData(null);
    return;
  }

  async function loadBusinessCrm() {
    try {
      const response = await fetch(
        `/api/businesses/by-slug/${encodeURIComponent(currentBusinessSlug)}/crm`
      );

      const result = await response.json();

    if (response.status === 404) {
  setBusinessCrmData(null);
  return;
}

if (!response.ok) {
  console.warn(
    result?.error || "No se pudo cargar la información CRM."
  );
  setBusinessCrmData(null);
  return;
}

      if (!cancelled) {
        setBusinessCrmData(result.business ?? null);
      }
    } catch (error) {
      console.error("Error cargando CRM del negocio:", error);
    }
  }

  loadBusinessCrm();

  return () => {
    cancelled = true;
  };
}, [currentBusinessSlug]);
const {
  data: businessPlan,
  loading: businessPlanLoading,
  error: businessPlanError,
} = useBusinessPlan(currentBusinessSlug || null);

const isLocalDemoUltra =
  typeof window !== "undefined" &&
  window.location.hostname === "localhost";

const businessPlanAny = businessPlan as
  | {
      plan?: SubscriptionPlan;
      currentPlan?: SubscriptionPlan;
      subscription_plan?: SubscriptionPlan;
      businessName?: string;
      business_name?: string;
      ciudad?: string;
      provincia?: string;
      pais?: string;
      business?: {
        plan?: SubscriptionPlan;
        businessName?: string;
        business_name?: string;
        ciudad?: string;
        provincia?: string;
        pais?: string;
      };
    }
  | null
  | undefined;
const currentPlan: SubscriptionPlan = isLocalDemoUltra
  ? "ultra"
  : (businessPlanAny?.plan ??
      businessPlanAny?.currentPlan ??
      businessPlanAny?.subscription_plan ??
      businessPlanAny?.business?.plan ??
      "basic");

const businessContextMessage = !currentBusinessSlug
  ? "Este dashboard no está vinculado a un negocio. Ingresa desde el botón generado al crear la prueba gratis."
  : businessPlanError
  ? "No se encontró el negocio vinculado a esta URL. Revisa que el enlace tenga el código correcto del negocio."
  : "";
const planLabel = PLAN_LABELS[currentPlan];

const businessDisplayName =
  businessCrmData?.business_name?.trim() ||
  businessPlanAny?.business?.business_name?.trim?.() ||
  businessPlanAny?.business?.businessName?.trim?.() ||
  businessPlanAny?.business_name?.trim?.() ||
  businessPlanAny?.businessName?.trim?.() ||
  settings.businessName?.trim() ||
  "JasoDatos";

useEffect(() => {
  window.dispatchEvent(
    new CustomEvent("jasodatos:business-name-updated", {
      detail: businessDisplayName,
    })
  );
}, [businessDisplayName]);

const businessLocationLabel = [
  businessPlanAny?.ciudad ?? businessPlanAny?.business?.ciudad,
  businessPlanAny?.provincia ?? businessPlanAny?.business?.provincia,
  businessPlanAny?.pais ?? businessPlanAny?.business?.pais,
]
  .map((value) => (typeof value === "string" ? value.trim() : ""))
  .filter(Boolean)
  .join("  ");

function hasFeature(feature: PlanFeature): boolean {
  if (isLocalDemoUltra) {
    return true;
  }

  return PLAN_FEATURES[currentPlan].includes(feature);
}

const canUseBenchmarking = hasFeature("benchmarking");
const canUseAssistant = hasFeature("assistant");
const canExportPdf = hasFeature("pdf_export");
const canUseWhatsappByPlan = hasFeature("whatsapp_actions");

function setCurrentPlan(_plan: SubscriptionPlan) {
  setPlansOpen(true);
}
const channelsEnabled: Record<ChannelKey, boolean> =
  "channelsEnabled" in settings &&
  typeof settings.channelsEnabled === "object" &&
  settings.channelsEnabled !== null
    ? (settings.channelsEnabled as Record<ChannelKey, boolean>)
    : {
        ecommerce: true,
        mayorista: true,
        tiendaFisica: true,
      };
const activeChannels = useMemo(() => {
  return (Object.entries(channelsEnabled) as [ChannelKey, boolean][])
    .filter(([, enabled]) => enabled)
    .map(([key]) => key);
}, [channelsEnabled]);

const activeChannelsLabel = activeChannels.length
  ? activeChannels.map(getChannelDisplayName).join("  ")
  : "Ninguno";
const safeLocale = (() => {
  const candidate = (settings.locale || "").trim();

  if (!candidate) return "es-EC";

  try {
    const supported = Intl.NumberFormat.supportedLocalesOf([candidate]);
    return supported.length ? supported[0] : "es-EC";
  } catch {
    return "es-EC";
  }
})();

const safeCurrencyCode = settings.currencyCode || "USD";
const axisCurrencySymbol = resolveAxisCurrencySymbol(safeCurrencyCode);
const axisWidth = getAxisWidth(safeCurrencyCode);
const formatInt = (value: number): string => {
  try {
    return new Intl.NumberFormat(safeLocale, {
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return new Intl.NumberFormat("es-EC", {
      maximumFractionDigits: 0,
    }).format(value);
  }
};
const formatCompactMoney = (value: number): string => {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (abs >= 1000) {
    return `${sign}${axisCurrencySymbol}${(abs / 1000).toFixed(abs % 1000 === 0 ? 0 : 1)}k`;
  }

  try {
    return `${sign}${axisCurrencySymbol}${Math.round(abs).toLocaleString(safeLocale)}`;
  } catch {
    return `${sign}${axisCurrencySymbol}${Math.round(abs).toLocaleString("es-EC")}`;
  }
};
  const sucursalOptions = useMemo(() => {
    return [
      "Todas",
      ...new Set(processedData.validRows.map((row) => toText(row.sucursal, "Sin sucursal"))),
    ];
  }, [processedData.validRows]);

  const productoOptions = useMemo(() => {
    return [
      "Todos",
      ...new Set(processedData.validRows.map((row) => toText(row.producto, "Sin producto"))),
    ];
  }, [processedData.validRows]);
const filteredRows = useMemo(() => {
  return processedData.validRows.filter((row) => {
    const sucursal = toText(row.sucursal, "Sin sucursal");
    const producto = toText(row.producto, "Sin producto");

    const matchSucursal = selectedSucursal === "Todas" || sucursal === selectedSucursal;
    const matchProducto = selectedProducto === "Todos" || producto === selectedProducto;
    const matchDate = isWithinRange(row.fecha, fromDate, toDate);
    const matchChannel = isRowChannelEnabled(row, channelsEnabled);

    return matchSucursal && matchProducto && matchDate && matchChannel;
  });
}, [
  processedData.validRows,
  selectedSucursal,
  selectedProducto,
  fromDate,
  toDate,
  channelsEnabled,
]);
const localCount = useMemo(() => {
  const locals = new Set(
    filteredRows
      .map((row) => String(row.sucursal || "Local principal").trim())
      .filter(Boolean)
  );

  return locals.size;
}, [filteredRows]);

const hasMultipleLocals = localCount > 1;
const benchmarkRows = useMemo(() => {
  return processedData.validRows.filter((row) => {
    const producto = toText(row.producto, "Sin producto");
    const matchProducto = selectedProducto === "Todos" || producto === selectedProducto;
    const matchDate = isWithinRange(row.fecha, fromDate, toDate);
    const matchChannel = isRowChannelEnabled(row, channelsEnabled);

    return matchProducto && matchDate && matchChannel;
  });
}, [
  processedData.validRows,
  selectedProducto,
  fromDate,
  toDate,
  channelsEnabled
]);
const topActiveChannel = useMemo(() => {
  const totals = new Map<string, number>();

  for (const row of filteredRows) {
    const key = normalizeChannelKey(row.canal);
    if (!key) continue;

    const venta = toNumber(row.cantidad) * toNumber(row.precio_unitario);
    totals.set(key, (totals.get(key) ?? 0) + venta);
  }

  const ordered = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  return ordered.length ? ordered[0][0] : null;
}, [filteredRows]);
const topActiveChannelLabel = topActiveChannel
  ? getChannelDisplayName(topActiveChannel as ChannelKey)
  : "Sin canales habilitados";
const whatsappDigits = normalizeWhatsappNumber(
  settings.businessWhatsapp,
  settings.locale
)
const hasValidWhatsapp = whatsappDigits.length >= 8 && whatsappDigits.length <= 15;
const canUseWhatsappInputs = activeChannels.length > 0 && hasValidWhatsapp;
const canUseWhatsappActions = canUseWhatsappByPlan && canUseWhatsappInputs;

const whatsappDisabledReason = !canUseWhatsappByPlan
  ? "Disponible en plan Control."
  : !hasValidWhatsapp
  ? "Configura un WhatsApp válido en Configuración del negocio."
  : activeChannels.length === 0
  ? "Activa al menos un canal para usar acciones de WhatsApp."
  : "";

const pdfDisabledReason = !canExportPdf
  ? "Disponible desde Crecimiento."
  : !hasValidWhatsapp
  ? "Configura un WhatsApp válido en Configuración del negocio."
  : activeChannels.length === 0
  ? "Activa al menos un canal para compartir."
  : "";
  const secondaryActiveChannels = activeChannels.filter(
  (channel) => channel !== topActiveChannel
);
const secondaryActiveChannelsLabel = secondaryActiveChannels.length
  ? secondaryActiveChannels.map(getChannelDisplayName).join("  ")
  : "";
const variationPct = useMemo(() => {
  const rowsWithDate = processedData.validRows.filter((row) => parseDateLike(row.fecha));

  if (rowsWithDate.length === 0) {
    return 0;
  }

  const sortedDates = rowsWithDate
    .map((row) => parseDateLike(row.fecha) as Date)
    .sort((a, b) => a.getTime() - b.getTime());

  const minDate = sortedDates[0];
  const maxDate = sortedDates[sortedDates.length - 1];

  const effectiveFrom = fromDate ? new Date(`${fromDate}T00:00:00`) : minDate;
  const effectiveTo = toDate ? new Date(`${toDate}T00:00:00`) : maxDate;

  const spanDays = Math.max(1, diffDays(effectiveFrom, effectiveTo) + 1);

  const previousFrom = addDays(effectiveFrom, -spanDays);
  const previousTo = addDays(effectiveTo, -spanDays);

  const currentSales = processedData.validRows
    .filter((row) => {
      const d = parseDateLike(row.fecha);
      if (!d) return false;
      const key = formatDateInput(d);
      return key >= formatDateInput(effectiveFrom) && key <= formatDateInput(effectiveTo);
    })
    .filter((row) => {
      const sucursal = toText(row.sucursal, "Sin sucursal");
      const producto = toText(row.producto, "Sin producto");
      const matchSucursal = selectedSucursal === "Todas" || sucursal === selectedSucursal;
      const matchProducto = selectedProducto === "Todos" || producto === selectedProducto;
      const matchChannel = isRowChannelEnabled(row, channelsEnabled);
      return matchSucursal && matchProducto && matchChannel;
    })
    .reduce((acc, row) => acc + toNumber(row.cantidad) * toNumber(row.precio_unitario), 0);

  const previousSales = processedData.validRows
    .filter((row) => {
      const d = parseDateLike(row.fecha);
      if (!d) return false;
      const key = formatDateInput(d);
      return key >= formatDateInput(previousFrom) && key <= formatDateInput(previousTo);
    })
    .filter((row) => {
      const sucursal = toText(row.sucursal, "Sin sucursal");
      const producto = toText(row.producto, "Sin producto");
      const matchSucursal = selectedSucursal === "Todas" || sucursal === selectedSucursal;
      const matchProducto = selectedProducto === "Todos" || producto === selectedProducto;
      const matchChannel = isRowChannelEnabled(row, channelsEnabled);
      return matchSucursal && matchProducto && matchChannel;
    })
    .reduce((acc, row) => acc + toNumber(row.cantidad) * toNumber(row.precio_unitario), 0);

  const variationAbs = currentSales - previousSales;
  return previousSales > 0 ? (variationAbs / previousSales) * 100 : 0;
}, [
  processedData.validRows,
  fromDate,
  toDate,
  selectedSucursal,
  selectedProducto,
  channelsEnabled,
]);

  const ventasTotales = useMemo(() => {
    return filteredRows.reduce(
      (acc, row) => acc + toNumber(row.cantidad) * toNumber(row.precio_unitario),
      0
    );
  }, [filteredRows]);

  const unidadesTotales = useMemo(() => {
    return filteredRows.reduce((acc, row) => acc + toNumber(row.cantidad), 0);
  }, [filteredRows]);

  const topProductos = useMemo(() => buildTopProducts(filteredRows), [filteredRows]);
 const productComparisonRows = useMemo(() => {
  const baseRows =
    filteredRows.length > 0 ? filteredRows : processedData.validRows;

  return buildProductComparisonRows(
    baseRows,
    selectedComparisonProducts,
    ventasTotales
  );
}, [
  filteredRows,
  processedData.validRows,
  selectedComparisonProducts,
  ventasTotales,
]);

const productComparisonTotal = useMemo(() => {
  const total = productComparisonRows.reduce(
    (acc, row) => ({
      ventas: acc.ventas + row.ventas,
      unidades: acc.unidades + row.unidades,
      costoTotal:
        acc.costoTotal + row.costoPromedio * row.unidades,
      margenEstimado: acc.margenEstimado + row.margenEstimado,
      stock: acc.stock + row.stock,
    }),
    {
      ventas: 0,
      unidades: 0,
      costoTotal: 0,
      margenEstimado: 0,
      stock: 0,
    }
  );

  const precioPromedio =
    total.unidades > 0 ? total.ventas / total.unidades : 0;

  const costoPromedio =
    total.unidades > 0 ? total.costoTotal / total.unidades : 0;

  const rentabilidadPct =
    total.ventas > 0 ? (total.margenEstimado / total.ventas) * 100 : 0;

  return {
    ...total,
    precioPromedio,
    costoPromedio,
    participacion:
      ventasTotales > 0 ? (total.ventas / ventasTotales) * 100 : 0,
    rentabilidadPct,
  };
}, [productComparisonRows, ventasTotales]);

function formatComparisonMetricValue(value: number): string {
  if (
    comparisonMetric === "ventas" ||
    comparisonMetric === "precioPromedio" ||
    comparisonMetric === "costoPromedio" ||
    comparisonMetric === "margenEstimado"
  ) {
    return formatMoney(value, settings.locale, settings.currencyCode);
  }

  if (
    comparisonMetric === "participacion" ||
    comparisonMetric === "rentabilidadPct" ||
    comparisonMetric === "tendenciaPct"
  ) {
    return `${value.toFixed(1)}%`;
  }

  if (comparisonMetric === "rotacion") {
    return value.toFixed(2);
  }

  if (comparisonMetric === "diasCobertura") {
    return `${value.toFixed(1)} días`;
  }

  return formatInt(value);
}

const productComparisonInsight = useMemo(() => {
  if (productComparisonRows.length < 2) {
    return "Selecciona al menos dos productos para generar una lectura comercial.";
  }

  const ordered = [...productComparisonRows].sort(
    (a, b) =>
      getComparisonMetricValue(b, comparisonMetric) -
      getComparisonMetricValue(a, comparisonMetric)
  );

  const leader = ordered[0];
  const second = ordered[1];

  if (!leader || !second) {
    return "No hay datos suficientes para generar una recomendación.";
  }

  const leaderValue = getComparisonMetricValue(leader, comparisonMetric);
  const secondValue = getComparisonMetricValue(second, comparisonMetric);

  if (leaderValue <= 0) {
    return "La variable seleccionada no tiene valores suficientes para comparar estos productos.";
  }

  if (comparisonMetric === "ventas") {
    if (secondValue <= 0) {
      return `${leader.producto} concentra la mayor venta. Conviene mantenerlo visible y usarlo como producto ancla en promociones.`;
    }

    const diffPct = ((leaderValue - secondValue) / secondValue) * 100;

    return `${leader.producto} es el producto con mejor venta. Está ${diffPct.toFixed(
      0
    )}% por encima de ${second.producto}, por lo que puede usarse como gancho comercial para impulsar productos de menor rotación.`;
  }

  if (comparisonMetric === "unidades") {
    return `${leader.producto} mueve más unidades. Es un buen candidato para promociones por volumen, combos o campañas de alta rotación.`;
  }

  if (comparisonMetric === "participacion") {
    return `${leader.producto} tiene mayor peso dentro de las ventas seleccionadas. Si depende demasiado de este producto, conviene diversificar la oferta para reducir concentración.`;
  }

  if (comparisonMetric === "precioPromedio") {
    return `${leader.producto} tiene el precio promedio más alto. Puede funcionar mejor como producto premium, mientras que los productos de menor precio pueden apoyar volumen o combos.`;
  }

  if (comparisonMetric === "costoPromedio") {
    return `${leader.producto} tiene el costo promedio más alto. Revisa si su precio de venta compensa adecuadamente el costo para no sacrificar margen.`;
  }

  if (comparisonMetric === "margenEstimado") {
    return `${leader.producto} aporta el mayor margen estimado. Priorizarlo puede mejorar la rentabilidad sin depender únicamente de vender más unidades.`;
  }

  if (comparisonMetric === "stock") {
    return `${leader.producto} tiene mayor inventario disponible. Si su venta no acompaña esa cantidad acumulada, conviene activar promoción antes de que se convierta en dinero detenido.`;
  }

  if (comparisonMetric === "rotacion") {
    return `${leader.producto} rota más rápido. Es un producto fuerte para mantener disponibilidad y evitar quedarse sin unidades para vender.`;
  }

  if (comparisonMetric === "diasCobertura") {
    return `${leader.producto} tiene más días de cobertura. Revisa si ese inventario está alineado con la demanda real o si requiere impulso comercial.`;
  }

  if (comparisonMetric === "rentabilidadPct") {
    return `${leader.producto} muestra la mejor rentabilidad porcentual. Puede ser más estratégico priorizarlo que vender solo el producto con mayor volumen.`;
  }

  if (comparisonMetric === "tendenciaPct") {
    return `${leader.producto} muestra la mejor tendencia reciente. Puede ser una oportunidad para reforzar exhibición, campaña o abastecimiento.`;
  }

  return `${leader.producto} lidera en la variable seleccionada. Revisa su comportamiento frente al resto para definir una acción comercial.`;
}, [productComparisonRows, comparisonMetric]);

function startProductComparison() {
  const initialProducts = topProductos.slice(0, 5).map((item) => item.producto);
  setSelectedComparisonProducts(initialProducts);
}
function focusProductComparison() {
  productComparisonRef.current?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });

if (highlightProductComparisonTimerRef.current !== null) {
  window.clearTimeout(highlightProductComparisonTimerRef.current);
}

  setHighlightProductComparison(true);

  highlightProductComparisonTimerRef.current = window.setTimeout(() => {
    setHighlightProductComparison(false);
    highlightProductComparisonTimerRef.current = null;
  }, 2600);
}
function removeComparisonProduct(producto: string) {
  setSelectedComparisonProducts((current) =>
    current.filter((item) => item !== producto)
  );
}

function clearProductComparison() {
  setSelectedComparisonProducts([]);
}
  const tendenciaVentas = useMemo(() => buildSalesTrend(filteredRows), [filteredRows]);
  const stockSucursalOptions = useMemo(() => {
  return [
    "Todas",
    ...Array.from(
      new Set(filteredRows.map((row) => toText(row.sucursal, "Sin sucursal")))
    ).sort((a, b) => a.localeCompare(b, "es")),
  ];
}, [filteredRows]);

const stockRiskRows = useMemo(() => {
  return buildStockRisk(
    filteredRows,
    settings.defaultStockMin,
    selectedStockSucursal
  );
}, [filteredRows, settings.defaultStockMin, selectedStockSucursal]);
  const channelResult = useMemo(() => buildChannelData(filteredRows), [filteredRows]);

const hasStockData = useMemo(() => {
  return filteredRows.some(
    (row) => row.stock !== undefined && row.stock !== null && row.stock !== ""
  );
}, [filteredRows]);

const stockCritico = useMemo(() => {
  if (!hasStockData) return null;

  return stockRiskRows.filter(
    (row) => row.estado === "Crítico" || row.estado === "Sin inventario"
  ).length;
}, [hasStockData, stockRiskRows]);

const searchedRows = useMemo(() => {
  const term = searchTerm.trim().toLowerCase();

  if (!term) return filteredRows;

  return filteredRows.filter((row) => {
    const values = [
      toDateKey(row.fecha),
      toText(row.sucursal),
      toText(row.bodega, "-"),
      toText(row.sku, "-"),
      toText(row.producto),
      toText(row.tipo_movimiento, "-"),
      formatInt(toNumber(row.cantidad)),
      formatMoney(toNumber(row.costo_unitario), settings.locale, settings.currencyCode),
      formatMoney(toNumber(row.precio_unitario), settings.locale, settings.currencyCode),
      toText(row.canal, "-"),
      row.stock === undefined || row.stock === null || row.stock === ""
        ? "No Disponible"
        : formatInt(toNumber(row.stock)),
    ];

    return values.some((value) => value.toLowerCase().includes(term));
  });
}, [filteredRows, searchTerm, settings.locale, settings.currencyCode]);


const totalPages = Math.max(1, Math.ceil(searchedRows.length / pageSize));

const paginatedRows = useMemo(() => {
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  return searchedRows.slice(start, end);
}, [searchedRows, currentPage, pageSize]);

useEffect(() => {
  setCurrentPage(1);
}, [selectedSucursal, selectedProducto, fromDate, toDate, pageSize, searchTerm]);
async function exportarExcel() {
  const filas = searchedRows;

  if (!filas.length) return;

  const ExcelJS = await import("exceljs");

  const workbook = new ExcelJS.Workbook();

  const businessName = settings.businessName || "JasoDatos";
  const locale = settings.locale || "es-EC";
  const currencyCode = settings.currencyCode || "USD";

  workbook.creator = "JasoDatos";
  workbook.lastModifiedBy = "JasoDatos";
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.subject = "Reporte comercial";
  workbook.title = `Reporte Comercial - ${businessName}`;

  const sheetNameBase = businessName.trim().slice(0, 28);
  const sheetName = sheetNameBase || "Reporte Comercial";

  const worksheet = workbook.addWorksheet(sheetName, {
    views: [{ state: "frozen", ySplit: 12 }],
  });

  const fechaGeneracion = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const metadataRows = [
  ["Reporte comercial"],
  ["Negocio", businessName],
  ["Fecha de generación", fechaGeneracion],
  ["Moneda", currencyCode],
  ["Formato regional", locale],
  ["Canales activos", activeChannelsLabel],
  ["Sucursal filtrada", selectedSucursal],
  ["Producto filtrado", selectedProducto],
  ["Desde", fromDate || "Sin filtro"],
  ["Hasta", toDate || "Sin filtro"],
  ["Registros exportados", searchedRows.length],
  [],
];

  metadataRows.forEach((row) => worksheet.addRow(row));

  const headers = [
    "Fecha",
    "Sucursal",
    "Bodega",
    "SKU",
    "Producto",
    "Tipo de movimiento",
    "Cantidad",
    "Costo unitario",
    "Precio unitario",
    "Canal",
    "Inventario",
  ];

  worksheet.addRow(headers);

  const data = filas.map((row) => [
    toDateKey(row.fecha),
    toText(row.sucursal),
    toText(row.bodega, "-"),
    toText(row.sku, "-"),
    toText(row.producto),
    toText(row.tipo_movimiento, "-"),
    toNumber(row.cantidad),
    toNumber(row.costo_unitario),
    toNumber(row.precio_unitario),
    toText(row.canal, "-"),
    row.stock === undefined || row.stock === null || row.stock === ""
      ? ""
      : toNumber(row.stock),
  ]);

  data.forEach((row) => worksheet.addRow(row));

  worksheet.mergeCells("A1:K1");

  worksheet.getRow(1).height = 28;

  const titleCell = worksheet.getCell("A1");
  titleCell.font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF202969" },
  };

  for (let row = 2; row <= 10; row++) {
    const labelCell = worksheet.getCell(`A${row}`);
    const valueCell = worksheet.getCell(`B${row}`);

    labelCell.font = { bold: true, color: { argb: "FF1F2937" } };
    labelCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE8EDFF" },
    };
    labelCell.border = {
      top: { style: "thin", color: { argb: "FFD1D5DB" } },
      bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
      left: { style: "thin", color: { argb: "FFD1D5DB" } },
      right: { style: "thin", color: { argb: "FFD1D5DB" } },
    };

    valueCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF8FAFC" },
    };
    valueCell.border = {
      top: { style: "thin", color: { argb: "FFE5E7EB" } },
      bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
      left: { style: "thin", color: { argb: "FFE5E7EB" } },
      right: { style: "thin", color: { argb: "FFE5E7EB" } },
    };
  }

  const tableHeaderRow = 12;

  worksheet.autoFilter = {
    from: { row: tableHeaderRow, column: 1 },
    to: { row: tableHeaderRow, column: headers.length },
  };

  const headerRow = worksheet.getRow(tableHeaderRow);
  headerRow.height = 22;

  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF2B2F86" },
    };
    cell.border = {
      top: { style: "thin", color: { argb: "FF1F2A6B" } },
      bottom: { style: "thin", color: { argb: "FF1F2A6B" } },
      left: { style: "thin", color: { argb: "FF1F2A6B" } },
      right: { style: "thin", color: { argb: "FF1F2A6B" } },
    };
  });

  const moneyNumFmt =
    currencyCode === "EUR"
      ? '#,##0.00'
      : currencyCode === "PEN"
      ? '"S/"#,##0.00'
      : currencyCode === "COP"
      ? '"COP$"#,##0.00'
      : currencyCode === "MXN"
      ? '"MX$"#,##0.00'
      : '"$"#,##0.00';

  for (let rowNumber = tableHeaderRow + 1; rowNumber <= worksheet.rowCount; rowNumber++) {
    const row = worksheet.getRow(rowNumber);
    const isEven = (rowNumber - tableHeaderRow) % 2 === 0;
    const fillColor = isEven ? "FFEEF2FF" : "FFF8FAFC";

    row.eachCell((cell, colNumber) => {
      cell.alignment = { vertical: "middle" };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: fillColor },
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE5E7EB" } },
        bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
        left: { style: "thin", color: { argb: "FFE5E7EB" } },
        right: { style: "thin", color: { argb: "FFE5E7EB" } },
      };

      if (colNumber === 8 || colNumber === 9) {
        cell.numFmt = moneyNumFmt;
      }
    });
  }

  worksheet.columns = [
    { width: 16 },
    { width: 20 },
    { width: 18 },
    { width: 16 },
    { width: 28 },
    { width: 20 },
    { width: 14 },
    { width: 18 },
    { width: 18 },
    { width: 16 },
    { width: 12 },
  ];
  if (dashboardUploadHistory.length > 0) {
    const historyWorksheet = workbook.addWorksheet("Historial de análisis", {
      views: [{ state: "frozen", ySplit: 1 }],
    });

    historyWorksheet.addRow([
      "Archivo",
      "Fecha de carga",
      "Filas",
      "Ventas",
      "Unidades",
      "Productos",
      "Locales",
      "Canales",
    ]);

    dashboardUploadHistory.forEach((item) => {
      historyWorksheet.addRow([
        item.file_name,
        new Date(item.uploaded_at).toLocaleString("es-EC"),
        Number(item.total_rows),
        Number(item.total_sales),
        Number(item.total_units),
        Number(item.products_count),
        Number(item.locals_count),
        Number(item.channels_count),
      ]);
    });

    historyWorksheet.getRow(1).height = 22;

    historyWorksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF2B2F86" },
      };
      cell.border = {
        top: { style: "thin", color: { argb: "FF1F2A6B" } },
        bottom: { style: "thin", color: { argb: "FF1F2A6B" } },
        left: { style: "thin", color: { argb: "FF1F2A6B" } },
        right: { style: "thin", color: { argb: "FF1F2A6B" } },
      };
    });

    for (
      let rowNumber = 2;
      rowNumber <= historyWorksheet.rowCount;
      rowNumber++
    ) {
      const row = historyWorksheet.getRow(rowNumber);
      const isEven = rowNumber % 2 === 0;
      const fillColor = isEven ? "FFF8FAFC" : "FFEEF2FF";

      row.eachCell((cell, colNumber) => {
        cell.alignment = { vertical: "middle" };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: fillColor },
        };
        cell.border = {
          top: { style: "thin", color: { argb: "FFE5E7EB" } },
          bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
          left: { style: "thin", color: { argb: "FFE5E7EB" } },
          right: { style: "thin", color: { argb: "FFE5E7EB" } },
        };

        if (colNumber === 4) {
          cell.numFmt = moneyNumFmt;
        }
      });
    }

    historyWorksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: 8 },
    };

    historyWorksheet.columns = [
      { width: 42 },
      { width: 24 },
      { width: 12 },
      { width: 16 },
      { width: 14 },
      { width: 14 },
      { width: 12 },
      { width: 12 },
    ];

    if (dashboardHistorySummary) {
      const comparisonWorksheet = workbook.addWorksheet("Comparativo histórico", {
        views: [{ state: "frozen", ySplit: 1 }],
      });

      comparisonWorksheet.addRow([
        "Indicador",
        "Valor actual",
        "Valor anterior",
        "Resultado",
        "Observación",
      ]);

      comparisonWorksheet.addRow([
        "Ventas",
        dashboardHistorySummary.currentSales,
        dashboardHistorySummary.previousSales,
        dashboardHistorySummary.salesChange,
        "Comparativo con ventas anteriores",
      ]);

      comparisonWorksheet.addRow([
        "Unidades",
        dashboardHistorySummary.currentUnits,
        dashboardHistorySummary.previousUnits,
        dashboardHistorySummary.unitsChange,
        "Comparativo con unidades anteriores",
      ]);

      comparisonWorksheet.addRow([
        "Productos",
        dashboardHistorySummary.currentProducts,
        dashboardHistorySummary.previousProducts,
        dashboardHistorySummary.productDelta,
        "Comparativo con productos anteriores",
      ]);

      comparisonWorksheet.getRow(1).height = 22;

      comparisonWorksheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF2B2F86" },
        };
        cell.border = {
          top: { style: "thin", color: { argb: "FF1F2A6B" } },
          bottom: { style: "thin", color: { argb: "FF1F2A6B" } },
          left: { style: "thin", color: { argb: "FF1F2A6B" } },
          right: { style: "thin", color: { argb: "FF1F2A6B" } },
        };
      });

      for (
        let rowNumber = 2;
        rowNumber <= comparisonWorksheet.rowCount;
        rowNumber++
      ) {
        const row = comparisonWorksheet.getRow(rowNumber);
        const fillColor = rowNumber % 2 === 0 ? "FFF8FAFC" : "FFEEF2FF";

        row.eachCell((cell, colNumber) => {
          cell.alignment = { vertical: "middle" };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: fillColor },
          };
          cell.border = {
            top: { style: "thin", color: { argb: "FFE5E7EB" } },
            bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
            left: { style: "thin", color: { argb: "FFE5E7EB" } },
            right: { style: "thin", color: { argb: "FFE5E7EB" } },
          };

          if (colNumber === 2 || colNumber === 3) {
            const indicator = String(row.getCell(1).value ?? "");

            if (indicator === "Ventas") {
              cell.numFmt = moneyNumFmt;
            }
          }
        });
      }

      comparisonWorksheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: 5 },
      };

      comparisonWorksheet.columns = [
        { width: 18 },
        { width: 18 },
        { width: 18 },
        { width: 24 },
        { width: 38 },
      ];
    }
  }
  const buffer = await workbook.xlsx.writeBuffer();

  const business = slugifyFileName(businessName);
  const fechaArchivo = fechaGeneracion.replace(/[^\d]/g, "-");

  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${business}_reporte_${fechaArchivo}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
async function exportarPDF() {
  const elemento = document.getElementById("dashboard-export");

  if (!elemento) return;

  const wasSettingsOpen = settingsOpen;

  try {
    if (wasSettingsOpen) {
      setSettingsOpen(false);
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
      await new Promise((resolve) => setTimeout(resolve, 80));
    }

    setIsExportingPdf(true);
    await new Promise((resolve) => setTimeout(resolve, 120));

    const canvas = await html2canvas(elemento, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#EEF2FF",
      scrollX: 0,
      scrollY: -window.scrollY,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.setProperties({
      title: `Reporte Comercial - ${settings.businessName || "JasoDatos"}`,
      subject: "Reporte comercial",
      author: "JasoDatos",
    });

    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    const business = slugifyFileName(settings.businessName || "JasoDatos");
    const fecha = new Intl.DateTimeFormat(settings.locale || "es-EC", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .format(new Date())
      .replace(/[^\d]/g, "-");

    pdf.save(`${business}_reporte_${fecha}.pdf`);
  } catch (error) {
    console.error("Error exportando PDF:", error);
  } finally {
    setIsExportingPdf(false);

    if (wasSettingsOpen) {
      setSettingsOpen(true);
    }
  }
}
const productoTop = topProductos[0];
const porcentajeTop =
  ventasTotales > 0 ? ((toNumber(productoTop?.ventas) / ventasTotales) * 100).toFixed(1) : "0.0";

const benchmarkSummary = useMemo(() => {
  const totals = new Map<string, number>();

  for (const row of benchmarkRows) {
    const sucursal = toText(row.sucursal, "Sin sucursal");
    const venta = toNumber(row.cantidad) * toNumber(row.precio_unitario);
    totals.set(sucursal, (totals.get(sucursal) ?? 0) + venta);
  }

  const entries = [...totals.entries()]
    .map(([sucursal, ventas]) => ({ sucursal, ventas }))
    .sort((a, b) => b.ventas - a.ventas);

  const total = entries.reduce((acc, item) => acc + item.ventas, 0);

  return entries.map((item) => ({
    sucursal: item.sucursal,
    ventas: item.ventas,
    participacion: total > 0 ? (item.ventas / total) * 100 : 0,
  }));
}, [benchmarkRows]);

const weakestBranch = benchmarkSummary.length
  ? benchmarkSummary[benchmarkSummary.length - 1]
  : null;

const alerts = useMemo(() => {
  return buildAlerts({
    stockCriticalCount: stockCritico,
    salesChangePct: variationPct,
    weakestBranchName: weakestBranch?.sucursal ?? null,
    weakestBranchSharePct: weakestBranch?.participacion ?? null,
    topProductSharePct: Number(porcentajeTop),
    topProductName: productoTop?.producto ?? null,
  });
}, [
  stockCritico,
  variationPct,
  settings.salesDropMediumPct,
  settings.salesDropHighPct,
  weakestBranch,
  porcentajeTop,
  productoTop,
]);
const kpiItems = [
  {
    title: "Ventas totales",
    value: formatMoney(ventasTotales, settings.locale, settings.currencyCode),
    badge: `${variationPct >= 0 ? "+" : ""}${variationPct.toFixed(1)}%`,
    subtitle: "vs. Período anterior",
    helpText:
      "Aquí ves cuánto vendiste en el período seleccionado, según la información cargada en tu archivo.",
  },
  {
    title: "Unidades totales",
    value: formatInt(unidadesTotales),
    badge: `${variationPct >= 0 ? "+" : ""}${variationPct.toFixed(1)}%`,
    subtitle: "vs. Período anterior",
    helpText:
      "Aquí ves cuántas unidades se vendieron en el período seleccionado.",
  },
  {
    title: "Producto más vendido",
    value: productoTop?.producto ?? "Sin datos",
    badge: `${porcentajeTop}%`,
    subtitle: "del total de ventas",
    helpText:
      "Aquí ves el producto que más aportó a tus ventas dentro de la información cargada.",
  },
  {
    title: "Inventario crítico",
    value: stockCritico === null ? "No Disponible" : formatInt(stockCritico),
    badge: "Reglas activas",
    subtitle: "Revisar inventario",
    accent: "danger" as const,
    helpText:
      "Aquí ves cuántos productos tienen pocas unidades disponibles y necesitan revisión.",
  },
];
const commercialRecommendations = useMemo<CommercialRecommendation[]>(() => {
  return buildCommercialRecommendations({
    rows: filteredRows,
    stockMin: settings.defaultStockMin,
  });
}, [filteredRows, settings.defaultStockMin]);
const jasoBot = useMemo(() => {
  return buildJasoBotInsights(
    filteredRows,
    settings.defaultStockMin,
    commercialRecommendations
  );
}, [filteredRows, settings.defaultStockMin, commercialRecommendations]);

const mainRecommendation = commercialRecommendations[0] ?? null;
const secondaryRecommendations = commercialRecommendations.slice(1, 3);
function normalizeWhatsappForShare(value?: string | null) {
  const digits = String(value ?? "").replace(/\D/g, "");

  if (!digits) return "";

  if (digits.startsWith("593")) {
    return digits;
  }

  if (digits.startsWith("0")) {
    return `593${digits.slice(1)}`;
  }

  return digits;
}

function shareJasoAlixByWhatsapp() {
  if (!canUseWhatsappByPlan) {
    setPlansOpen(true);
    return;
  }

  const settingsAny = settings as {
    commercialWhatsapp?: string;
    whatsapp?: string;
    ownerWhatsapp?: string;
  };

  const businessCrmAny = businessCrmData as
    | {
        commercial_whatsapp?: string;
        owner_whatsapp?: string;
      }
    | null
    | undefined;

  const whatsappNumber = normalizeWhatsappForShare(
    settingsAny.commercialWhatsapp ||
      settingsAny.whatsapp ||
      settingsAny.ownerWhatsapp ||
      businessCrmAny?.commercial_whatsapp ||
      businessCrmAny?.owner_whatsapp
  );

  if (!whatsappNumber) {
    setSettingsOpen(true);
    return;
  }

  const secondaryText =
    secondaryRecommendations.length > 0
      ? secondaryRecommendations
          .map((item, index) => `${index + 1}. ${item.title}: ${item.message}`)
          .join("\n")
      : "Sin acciones secundarias detectadas.";

  const message = [
    `JasoAlix - resumen comercial`,
    ``,
    `Negocio: ${businessDisplayName}`,
    ``,
    `Diagnóstico: ${jasoBot.mensajePrincipal}`,
    ``,
    mainRecommendation
      ? `Prioridad ahora: ${mainRecommendation.title}\n${mainRecommendation.message}`
      : `Prioridad ahora: no disponible`,
    ``,
    `Acciones secundarias:`,
    secondaryText,
  ].join("\n");

  window.open(
    `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`,
    "_blank",
    "noopener,noreferrer"
  );
}
function usarAccion(texto: string) {
  navigator.clipboard.writeText(texto);
  setActionNotice(`Campaña copiada. Puedes pegarla en WhatsApp, redes sociales o una lista de clientes: ${texto}`);
  setTimeout(() => {
    setActionNotice("");
  }, 3000);
}

function normalizeWhatsappNumber(value: string, locale: string): string {
  const rawValue = value.trim();
  const digits = rawValue.replace(/\D/g, "");

  if (!digits) return "";

  const dialCodes: Record<string, string> = {
    "es-EC": "593",
    "es-CO": "57",
    "es-MX": "52",
    "es-PE": "51",
    "es-ES": "34",
    "en-US": "1",
  };

  const dialCode = dialCodes[locale] ?? "593";

  if (rawValue.startsWith("+")) return digits;
  if (digits.startsWith(dialCode)) return digits;

  if (locale === "es-EC" && digits.startsWith("0") && digits.length === 10) {
    return `593${digits.slice(1)}`;
  }

  if (locale === "es-CO" && digits.length === 10) return `57${digits}`;
  if (locale === "es-MX" && digits.length === 10) return `52${digits}`;
  if (locale === "es-PE" && digits.length === 9) return `51${digits}`;
  if (locale === "es-ES" && digits.length === 9) return `34${digits}`;
  if (locale === "en-US" && digits.length === 10) return `1${digits}`;

  return digits;
}
function enviarWhatsApp() {
  const recomendaciones = jasoBot.recomendaciones?.length
    ? jasoBot.recomendaciones.map((item) => ` ${item}`).join("\n")
    : " No se identificaron acciones prioritarias en este momento.";

  const mensaje = encodeURIComponent(
    `Cmo ests.

Te comparto un breve resumen comercial generado en ${settings.businessName || "JasoDatos"}.

${jasoBot.mensajePrincipal}

Puntos clave:
${jasoBot.insights.map((item) => ` ${item}`).join("\n")}

Acciones sugeridas:
${recomendaciones}

El reporte PDF se descargó correctamente. Puedes adjuntarlo y compartirlo por WhatsApp.`
  );

const phone = normalizeWhatsappNumber(settings.businessWhatsapp, settings.locale);
  const url = phone
    ? `https://wa.me/${phone}?text=${mensaje}`
    : `https://wa.me/?text=${mensaje}`;

  window.open(url, "_blank");
}

function enviarPromoWhatsApp() {
  const mensaje = encodeURIComponent(
    jasoBot.promoWhatsApp ??
      `Hola, te escribimos desde ${settings.businessName || "JasoDatos"}. Tenemos promociones especiales disponibles. escríbenos para más información.`
  );

  const phone = normalizeWhatsappNumber(settings.businessWhatsapp, settings.locale);
  const url = phone
    ? `https://wa.me/${phone}?text=${mensaje}`
    : `https://wa.me/?text=${mensaje}`;

  window.open(url, "_blank");
}

function clearFilters() {
  setSelectedSucursal("Todas");
  setSelectedProducto("Todos");
  setFromDate("");
  setToDate("");
}
function openSalesWhatsapp() {
  const phone = "593997945350";
  const message = encodeURIComponent(
    "Hola, quiero mejorar mi plan de JasoDatos y conocer las opciones disponibles."
  );

  window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
}
return (
  <div id="dashboard-export">
    <div style={styles.page}>
{isGeneralView ? (
<HeroHeader
  businessName={businessDisplayName}
  filteredCount={filteredRows.length}
  fileName={processedData.fileName}
  planLabel={planLabel}
  onAdjustMapping={onAdjustMapping}
  onSelectAnotherFile={onSelectAnotherFile}
  onExportExcel={exportarExcel}
  onClearFile={onClearFile}
  onOpenPlans={() => setPlansOpen(true)}
  onOpenSettings={() => setSettingsOpen(true)}
/>
) : null}
{isGeneralView && businessLocationLabel ? (
  <div style={styles.businessLocationBar}>
    <span style={styles.businessLocationLabel}>Ubicación del negocio</span>
    <strong style={styles.businessLocationValue}>
      {businessLocationLabel}
    </strong>
  </div>
) : null}
{isGeneralView && !isExportingPdf ? (
  <UpgradeBanner
    currentPlan={currentPlan}
    planLabel={planLabel}
    onOpenPlans={() => setPlansOpen(true)}
  />
) : null}
{isGeneralView && businessContextMessage ? (
  <div style={styles.businessContextWarning}>
    {businessContextMessage}
  </div>
) : null}
{isGeneralView ? (
  <FilterBar
    selectedSucursal={selectedSucursal}
    selectedProducto={selectedProducto}
    sucursalOptions={sucursalOptions}
    productoOptions={productoOptions}
    fromDate={fromDate}
    toDate={toDate}
    onChangeSucursal={setSelectedSucursal}
    onChangeProducto={setSelectedProducto}
    onChangeFromDate={setFromDate}
    onChangeToDate={setToDate}
    onClearFilters={clearFilters}
  />
) : null}
<ProfileSettingsPanel
  open={settingsOpen}
  onClose={() => setSettingsOpen(false)}
  settings={settings}
  updateSettings={updateSettings}
  updateThreshold={updateThreshold}
  updateChannel={updateChannel}
  resetSettings={resetSettings}
  businessSlug={currentBusinessSlug}
  initialCrmData={businessCrmData}
    onSaveCrm={async (payload) => {
    if (!currentBusinessSlug) {
      throw new Error(
        "No se detectó el negocio activo. Ingresa desde el enlace del negocio para guardar la configuración."
      );
    }

    const response = await fetch(
      `/api/businesses/by-slug/${encodeURIComponent(currentBusinessSlug)}/crm`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result?.error || "No se pudo guardar la información CRM."
      );
    }

    setBusinessCrmData(result.business ?? null);
  }}
/>
<SubscriptionPlansPanel
  open={plansOpen}
  onClose={() => setPlansOpen(false)}
  currentPlan={currentPlan}
  setCurrentPlan={setCurrentPlan}
/>

{detailModal ? (
  <DetailModal
    type={detailModal}
    onClose={() => setDetailModal(null)}
    topProductos={topProductos}
    ventasTotales={ventasTotales}
    stockRiskRows={stockRiskRows}
    channelResult={channelResult}
    formatMoney={(value) =>
      formatMoney(value, settings.locale, settings.currencyCode)
    }
  />
) : null}
{shouldShowSection("resumen") ? (
  <div id="resumen" style={{ scrollMarginTop: 96 }}>
    <KpiSection items={kpiItems} isExportingPdf={isExportingPdf} />
  </div>
) : null}

{shouldShowSection("alertas") ? (
  <div id="alertas" style={{ scrollMarginTop: 96 }}>
    <AlertsSection alerts={alerts} isExportingPdf={isExportingPdf} />
  </div>
) : null}

{shouldShowSection("acciones") ? (
  <div id="acciones" style={{ scrollMarginTop: 96 }}>
    <RecommendedActionsSection
      recommendations={commercialRecommendations}
      isExportingPdf={isExportingPdf}
    />
  </div>
) : null}
{activeSectionView === "general" && dashboardUploadHistory.length > 0 ? (
<section
style={{
  width: "100%",
  maxWidth: "none",
  margin: "0",
  border: "1px solid rgba(255,255,255,0.42)",
  borderRadius: 18,
  padding: "18px",
  background: "var(--jd-gradient-container)",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.10), 0 0 10px rgba(56,189,248,0.04)",
  display: "grid",
  gap: 14,
}}
>
<div
  style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
    flexWrap: "wrap",
  }}
>
      <div>
        <h3
          style={{
            margin: 0,
            color: "var(--jd-text-main)",
            fontSize: 20,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            lineHeight: 1.05,
          }}
        >
          Historial reciente de análisis
        </h3>

        <p
          style={{
            margin: "2px 0 0",
            color: "var(--jd-text-secondary)",
            fontSize: 12,
            lineHeight: 1.25,
            fontWeight: 600,
          }}
        >
          Comparación rápida entre la carga actual y la carga anterior.
        </p>
      </div>

      {dashboardUploadHistory.length > 2 ? (
        <button
          type="button"
          onClick={() => setShowFullUploadHistory(true)}
style={{
  border: "1px solid rgba(255,255,255,0.86)",
  background: "rgba(56, 189, 248, 0.18)",
  color: "#7DD3FC",
  borderRadius: 999,
  padding: "7px 14px",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.14), 0 0 10px rgba(56,189,248,0.08)",
}}
        >
          Ver historial completo
        </button>
      ) : null}
    </div>
{dashboardHistorySummary ? (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
      gap: 7,
    }}
  >
    <div
style={{
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 14,
  padding: "10px 12px",
  background: "rgba(255,255,255,0.08)",
  display: "grid",
  gap: 4,
  minHeight: 74,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
}}
    >
      <span
style={{
  color: "#FFFFFF",
  fontSize: 12,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.035em",
  lineHeight: 1.15,
}}
      >
        Ventas vs anterior
      </span>

<strong
  style={{
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: 500,
    lineHeight: 1.05,
    letterSpacing: "-0.01em",
  }}
>
        {dashboardHistorySummary.salesChange}
      </strong>

<span
  style={{
    display: "block",
    color: "#86EFAC",
    fontSize: 13,
    fontWeight: 600,
    lineHeight: 1.25,
  }}
>
        Actual:{" "}
        {dashboardHistorySummary.currentSales.toLocaleString("es-EC", {
          style: "currency",
          currency: "USD",
        })}{" "}
        · Anterior:{" "}
        {dashboardHistorySummary.previousSales.toLocaleString("es-EC", {
          style: "currency",
          currency: "USD",
        })}
      </span>
    </div>

    <div
style={{
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 14,
  padding: "10px 12px",
  background: "rgba(255,255,255,0.08)",
  display: "grid",
  gap: 4,
  minHeight: 74,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
}}
    >
      <span
style={{
  color: "#FFFFFF",
  fontSize: 12,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.035em",
  lineHeight: 1.15,
}}
      >
        Unidades vs anterior
      </span>

<strong
  style={{
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: 500,
    lineHeight: 1.05,
    letterSpacing: "-0.01em",
  }}
>
        {dashboardHistorySummary.unitsChange}
      </strong>

<span
  style={{
    display: "block",
    color: "#86EFAC",
    fontSize: 13,
    fontWeight: 600,
    lineHeight: 1.25,
  }}
>
        Actual: {dashboardHistorySummary.currentUnits} · Anterior:{" "}
        {dashboardHistorySummary.previousUnits}
      </span>
    </div>

    <div
style={{
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 14,
  padding: "10px 12px",
  background: "rgba(255,255,255,0.08)",
  display: "grid",
  gap: 4,
  minHeight: 74,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
}}
    >
      <span
style={{
  color: "#FFFFFF",
  fontSize: 12,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.035em",
  lineHeight: 1.15,
}}
      >
        Productos vs anterior
      </span>

<strong
  style={{
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: 500,
    lineHeight: 1.05,
    letterSpacing: "-0.01em",
  }}
>
        {dashboardHistorySummary.productDelta >= 0 ? "+" : ""}
        {dashboardHistorySummary.productDelta}
      </strong>

      <span
        style={{
          display: "block",
color: "#7DD3FC",
fontSize: 12,
fontWeight: 500,
lineHeight: 1.25,
        }}
      >
        Actual: {dashboardHistorySummary.currentProducts} · Anterior:{" "}
        {dashboardHistorySummary.previousProducts}
      </span>
    </div>

    <div
style={{
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 14,
  padding: "10px 12px",
  background: "rgba(255,255,255,0.08)",
  display: "grid",
  gap: 4,
  minHeight: 74,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
}}
    >
      <span
style={{
  color: "#FFFFFF",
  fontSize: 12,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.035em",
  lineHeight: 1.15,
}}
      >
        Última carga de archivos
      </span>

      <span
style={{
  color: "#86EFAC",
  fontSize: 12,
  fontWeight: 600,
  lineHeight: 1.2,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
}}
        title={dashboardUploadHistory[0]?.file_name}
      >
        {dashboardUploadHistory[0]?.file_name}
      </span>

      <span
        style={{
          color: "var(--jd-text-secondary)",
          fontSize: 9,
          fontWeight: 500,
          lineHeight: 1.2,
        }}
      >
        {dashboardUploadHistory[0]
          ? new Date(dashboardUploadHistory[0].uploaded_at).toLocaleString(
              "es-EC"
            )
          : ""}
        {" · "}
        {dashboardUploadHistory[0]?.total_rows} filas
        {" · "}
        {dashboardUploadHistory[0]?.total_units} unidades
        {" · "}
        {dashboardUploadHistory[0]?.products_count} productos
      </span>

      {dashboardUploadHistory[1] ? (
        <span
style={{
  color: "rgba(255,255,255,0.72)",
  fontSize: 10,
  fontWeight: 400,
  lineHeight: 1.2,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
}}
          title={dashboardUploadHistory[1].file_name}
        >
          Anterior: {dashboardUploadHistory[1].file_name}
        </span>
      ) : null}
    </div>
  </div>
) : null}
</section>
) : null}
{showFullUploadHistory ? (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(15, 23, 42, 0.62)",
      zIndex: 80,
      display: "grid",
      placeItems: "center",
      padding: 20,
    }}
    role="dialog"
    aria-modal="true"
  >
    <div
      style={{
        width: "min(980px, 100%)",
        maxHeight: "85vh",
        overflow: "auto",
        background: "var(--jd-gradient-table-surface)",
        borderRadius: 22,
        border: "1px solid var(--jd-border-accent-soft)",
        boxShadow: "0 24px 70px rgba(15, 23, 42, 0.35)",
        padding: 18,
        display: "grid",
        gap: 14,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          
          flexWrap: "wrap",
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              color: "#FFFFFF",
fontSize: 18,
fontWeight: 600,
              letterSpacing: "-0.02em",
            }}
          >
            Historial completo de análisis
          </h3>

          <p
            style={{
              margin: "4px 0 0",
              color: "var(--jd-text-secondary)",
              fontSize: 13,
              lineHeight: 1.4,
            }}
          >
            Archivos procesados para este negocio, ordenados desde la carga más reciente.
          </p>
        </div>
          <div
  style={{
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  }}
>
  <button
    type="button"
    onClick={() => setShowFullUploadHistory(false)}
    style={{
border: "1px solid var(--jd-border-accent-soft)",
background: "rgba(109, 126, 219, 0.12)",
color: "#FFFFFF",
      borderRadius: 999,
      padding: "8px 12px",
      fontSize: 18,
      fontWeight: 600,
      cursor: "pointer",
    }}
  >
    Cerrar
  </button>
</div>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {dashboardUploadHistory.map((item) => (
          <article
            key={item.id}
            style={{
              border: "1px solid var(--jd-border-accent-soft)",
              borderRadius: 16,
              padding: 12,
              background: "var(--jd-gradient-table-surface)",
              display: "grid",
              gap: 8,
            }}
          >
            <div style={{ display: "grid", gap: 2 }}>
              <strong
                style={{
                  color: "var(--jd-text-main)",
                  fontSize: 14,
                  lineHeight: 1.25,
                }}
              >
                {item.file_name}
              </strong>

              <span
                style={{
                  color: "var(--jd-text-secondary)",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {new Date(item.uploaded_at).toLocaleString("es-EC")}
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                gap: 8,
              }}
            >
              <span style={{ color: "var(--jd-text-secondary)", fontSize: 12, fontWeight: 800 }}>
                Filas: {item.total_rows}
              </span>

              <span style={{ color: "var(--jd-text-secondary)", fontSize: 12, fontWeight: 800 }}>
                Ventas:{" "}
                {Number(item.total_sales).toLocaleString("es-EC", {
                  style: "currency",
                  currency: "USD",
                })}
              </span>

              <span style={{ color: "var(--jd-text-secondary)", fontSize: 12, fontWeight: 800 }}>
                Unidades: {item.total_units}
              </span>

              <span style={{ color: "var(--jd-text-secondary)", fontSize: 12, fontWeight: 800 }}>
                Productos: {item.products_count}
              </span>

              <span style={{ color: "var(--jd-text-secondary)", fontSize: 12, fontWeight: 800 }}>
                Locales: {item.locals_count}
              </span>

              <span style={{ color: "var(--jd-text-secondary)", fontSize: 12, fontWeight: 800 }}>
                Canales: {item.channels_count}
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  </div>
) : null}
{shouldShowSection("ventas") ? (
  <div id="ventas" style={{ scrollMarginTop: 96 }}>
    <SalesChartsSection
      tendenciaVentas={tendenciaVentas}
      topProductos={topProductos}
      ventasTotales={ventasTotales}
      axisWidth={axisWidth}
      tooltipStyle={tooltipStyle}
      colors={COLORS}
      formatCompactMoney={formatCompactMoney}
      formatMoney={(value) =>
        formatMoney(value, settings.locale, settings.currencyCode)
      }
      isExportingPdf={isExportingPdf}
     onCompareProducts={() => {
  startProductComparison();
  setActiveSectionView("productos");
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}${window.location.search}#comparar-productos`
  );

  window.setTimeout(() => {
    focusProductComparison();
  }, 80);
}}
      onOpenProductDetails={() => {
        setDetailModal("products");
      }}
    />
  </div>
) : null}
{shouldShowSection("productos") ? (
<section
  id="productos"
  ref={productComparisonRef}
  style={{
    ...styles.productComparisonCard,
    scrollMarginTop: 96,
    ...(highlightProductComparison ? styles.productComparisonHighlight : null),
  }}
>
  <div style={styles.productComparisonHeader}>
    <div>
      <div style={styles.productComparisonTitleRow}>
        <h3 style={styles.productComparisonTitle}>
          Compara tus productos
        </h3>
      </div>

      <p style={styles.productComparisonSubtitle}>
Compara productos por ventas, unidades, participación, precios, margen,
inventario, rotación, cobertura, rentabilidad y tendencia.
      </p>
    </div>

    <div style={styles.comparisonHeaderActions}>
      <label style={styles.metricSelectorLabel}>
        Variable en barras
        <select
          style={styles.metricSelector}
          value={comparisonMetric}
          onChange={(event) =>
            setComparisonMetric(event.target.value as ComparisonMetric)
          }
        >
          {COMPARISON_METRIC_OPTIONS.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label style={styles.metricSelectorLabel}>
  Agregar producto
  <select
    style={styles.metricSelector}
    value=""
    onChange={(event) => {
      const producto = event.target.value;

      if (!producto) return;

      setSelectedComparisonProducts((current) => {
        if (current.includes(producto)) return current;

        return [...current, producto].slice(0, 8);
      });
    }}
  >
    <option value="">Seleccionar...</option>
    {topProductos
      .filter((item) => !selectedComparisonProducts.includes(item.producto))
      .map((item) => (
        <option key={item.producto} value={item.producto}>
          {item.producto}
        </option>
      ))}
  </select>
</label>
      {selectedComparisonProducts.length > 0 ? (
        <button
          type="button"
          style={styles.clearComparisonButton}
          onClick={clearProductComparison}
        >
          Limpiar selección
        </button>
      ) : null}
    </div>
  </div>

{selectedComparisonProducts.length === 0 ? (
  <div style={styles.productComparisonEmpty}>
    <div>
      <h4 style={styles.emptyTitle}>Selecciona productos para comparar</h4>
      <p style={styles.emptyText}>
        Usa este módulo para revisar qué productos venden más, cuáles tienen mejor
        margen, cuáles rotan mejor y cuáles necesitan impulso comercial. Este bloque
        se exportará en el PDF.
      </p>
    </div>

    <button
      type="button"
      style={styles.emptyActionButton}
      onClick={() => {
  startProductComparison();
  focusProductComparison();
}}
    >
      Comparar productos líderes
    </button>
  </div>
) : null}
{selectedComparisonProducts.length > 0 ? (
  <div style={styles.productChipsRow}>
    {selectedComparisonProducts.map((producto, index) => (
      <div
        key={producto}
        role="button"
        tabIndex={0}
        style={{
          ...styles.productChip,
          borderColor: COLORS[index % COLORS.length],
        }}
        onClick={() => removeComparisonProduct(producto)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            removeComparisonProduct(producto);
          }
        }}
      >
        <span
          style={{
            ...styles.productChipDot,
            background: COLORS[index % COLORS.length],
          }}
        />
        {producto}
        <span style={styles.productChipClose}>×</span>
      </div>
    ))}
  </div>
) : null}
  {productComparisonRows.length > 0 ? (
    <div style={styles.productComparisonGrid}>
      <div style={styles.productComparisonChartBox}>
        <div>
          <h4 style={styles.productComparisonBlockTitle}>
            {getComparisonMetricLabel(comparisonMetric)} por producto
          </h4>
          <span style={styles.productComparisonMiniText}>
            Período filtrado
          </span>
        </div>

        <div style={styles.comparisonBars}>
          {productComparisonRows.map((row, index) => {
            const values = productComparisonRows.map((item) =>
              Math.abs(getComparisonMetricValue(item, comparisonMetric))
            );

            const maxValue = Math.max(...values, 1);
            const metricValue = getComparisonMetricValue(row, comparisonMetric);
            const height = Math.max(22, (Math.abs(metricValue) / maxValue) * 160);
            const isNegative = metricValue < 0;

            return (
              <div key={row.producto} style={styles.comparisonBarItem}>
                <span style={styles.comparisonBarValue}>
                  {formatComparisonMetricValue(metricValue)}
                </span>

                <div
                  style={{
                    ...styles.comparisonBar,
                    height,
                    background: isNegative
                      ? "#EF4444"
                      : COLORS[index % COLORS.length],
                  }}
                />

                <span style={styles.comparisonBarLabel}>{row.producto}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={styles.productComparisonTableBox}>
        <div style={styles.productComparisonTableScroll}>
          <table style={styles.productComparisonTable}>
            <thead>
              <tr>
              <th style={styles.productComparisonTh}>Producto</th>
<th style={styles.productComparisonTh}>Ventas</th>
<th style={styles.productComparisonTh}>Unidades vendidas</th>
<th style={styles.productComparisonTh}>Participación en ventas</th>
<th style={styles.productComparisonTh}>Precio promedio</th>
<th style={styles.productComparisonTh}>Costo promedio</th>
<th style={styles.productComparisonTh}>Ganancia estimada</th>
<th style={styles.productComparisonTh}>Inventario disponible</th>
<th style={styles.productComparisonTh}>Rotación</th>
<th style={styles.productComparisonTh}>Días disponibles</th>
<th style={styles.productComparisonTh}>Rentabilidad</th>
              </tr>
            </thead>

            <tbody>
              {productComparisonRows.map((row, index) => (
                <tr key={row.producto}>
<td style={styles.productComparisonTd}>
  <div style={styles.productCellInline}>
    <span
      style={{
        ...styles.productChipDot,
        background: COLORS[index % COLORS.length],
      }}
    />
    <span style={styles.productCellText}>{row.producto}</span>
  </div>
</td>
                  <td style={styles.productComparisonTd}>
                    {formatMoney(row.ventas, settings.locale, settings.currencyCode)}
                  </td>
                  <td style={styles.productComparisonTd}>
                    {formatInt(row.unidades)}
                  </td>
                  <td style={styles.productComparisonTd}>
                    {row.participacion.toFixed(1)}%
                  </td>
                  <td style={styles.productComparisonTd}>
                    {formatMoney(
                      row.precioPromedio,
                      settings.locale,
                      settings.currencyCode
                    )}
                  </td>
                  <td style={styles.productComparisonTd}>
                    {formatMoney(
                      row.costoPromedio,
                      settings.locale,
                      settings.currencyCode
                    )}
                  </td>
                  <td style={styles.productComparisonTd}>
                    {formatMoney(
                      row.margenEstimado,
                      settings.locale,
                      settings.currencyCode
                    )}
                  </td>
                  <td style={styles.productComparisonTd}>
                    {formatInt(row.stock)}
                  </td>
                  <td style={styles.productComparisonTd}>
                    {row.rotacion.toFixed(2)}
                  </td>
                  <td style={styles.productComparisonTd}>
                    {row.diasCobertura.toFixed(1)} días
                  </td>
                  <td style={styles.productComparisonTd}>
                    {row.rentabilidadPct.toFixed(1)}%
                  </td>
                </tr>
              ))}

              <tr>
                <td style={styles.productComparisonTotalTd}>
                  Total de productos seleccionados
                </td>
                <td style={styles.productComparisonTotalTd}>
                  {formatMoney(
                    productComparisonTotal.ventas,
                    settings.locale,
                    settings.currencyCode
                  )}
                </td>
                <td style={styles.productComparisonTotalTd}>
                  {formatInt(productComparisonTotal.unidades)}
                </td>
                <td style={styles.productComparisonTotalTd}>
                  {productComparisonTotal.participacion.toFixed(1)}%
                </td>
                <td style={styles.productComparisonTotalTd}>
                  {formatMoney(
                    productComparisonTotal.precioPromedio,
                    settings.locale,
                    settings.currencyCode
                  )}
                </td>
                <td style={styles.productComparisonTotalTd}>
                  {formatMoney(
                    productComparisonTotal.costoPromedio,
                    settings.locale,
                    settings.currencyCode
                  )}
                </td>
                <td style={styles.productComparisonTotalTd}>
                  {formatMoney(
                    productComparisonTotal.margenEstimado,
                    settings.locale,
                    settings.currencyCode
                  )}
                </td>
                <td style={styles.productComparisonTotalTd}>
                  {formatInt(productComparisonTotal.stock)}
                </td>
                <td style={styles.productComparisonTotalTd}>-</td>
                <td style={styles.productComparisonTotalTd}>-</td>
                <td style={styles.productComparisonTotalTd}>
                  {productComparisonTotal.rentabilidadPct.toFixed(1)}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        {productComparisonInsight ? (
          <div style={styles.productInsightBox}>
            <div style={styles.insightBadge}>Lectura comercial</div>
            <p style={styles.insightText}>{productComparisonInsight}</p>
          </div>
        ) : null}
      </div>
    </div>
  ) : null}
</section>
) : null}
{shouldShowSection("inventario") ? (
  <div id="inventario" style={{ scrollMarginTop: 96 }}>
<SecondaryChartsSection
  defaultStockMin={settings.defaultStockMin}
  stockRiskRows={stockRiskRows}
  stockSucursalOptions={stockSucursalOptions}
  selectedStockSucursal={selectedStockSucursal}
  onChangeStockSucursal={setSelectedStockSucursal}
      activeChannelsCount={activeChannels.length}
      activeChannelsLabel={activeChannelsLabel}
      channelResult={channelResult}
      axisWidth={axisWidth}
      tooltipStyle={tooltipStyle}
      colors={COLORS}
      formatCompactMoney={formatCompactMoney}
      formatMoney={(value) =>
        formatMoney(value, settings.locale, settings.currencyCode)
      }
      onOpenStockDetails={() => {
        console.log("ABRIR MODAL INVENTARIO");
        setDetailModal("stock");
      }}
      onOpenChannelDetails={() => {
        console.log("ABRIR MODAL CHANNELS");
        setDetailModal("channels");
      }}
    />
  </div>
) : null}
{isGeneralView && settings.showBenchmarking && hasMultipleLocals ? (
  canUseBenchmarking ? (
    <>
      {isExportingPdf ? <div style={styles.pdfSpacerBeforeBenchmarking} /> : null}

      <div id="benchmarking-sucursales" style={{ scrollMarginTop: 120 }}>
        <div style={styles.modulePlanRow}>
          {!isExportingPdf ? (
            <ActivePlanBadge tone="pro">Incluido en Crecimiento</ActivePlanBadge>
          ) : null}

          <span style={styles.modulePlanText}>
            Comparativo entre locales detectados en tu archivo
          </span>
        </div>

        <BenchmarkingSucursales rows={benchmarkRows} />
      </div>
    </>
  ) : (
    <LockedFeatureCard
      title="Comparativo por local"
      description="Detectamos varios locales en tu archivo. Puedes ver el análisis general; para comparar ventas, productos e inventario por local, activa un plan con desempeño entre sucursales."
      requiredPlan="pro"
      onOpenPlans={() => setPlansOpen(true)}
      onContactSales={openSalesWhatsapp}
    />
  )
) : null}
  {isGeneralView &&
  settings.showAssistant &&
  (canUseAssistant ? (
    <>
      {isExportingPdf ? (
        <div style={styles.pdfSpacerBeforeAssistant} />
      ) : null}

    <div style={styles.assistantCard}>
  <div style={styles.assistantTop}>
    <div>
      <div style={styles.assistantHeader}>
        <span style={styles.assistantTitle}>Asistente comercial JasoAlix</span>

        {!isExportingPdf ? (
          <>
            <ActivePlanBadge tone="pro">Incluido en Crecimiento</ActivePlanBadge>

{canUseWhatsappByPlan ? (
  <ActivePlanBadge tone="ultra">WhatsApp activo</ActivePlanBadge>
) : (
  <button
    type="button"
    style={styles.assistantPlanUpgradeButton}
    onClick={() => setPlansOpen(true)}
  >
    WhatsApp en plan Control
  </button>
)}

            <span style={styles.assistantPromoBadge}>
              {jasoBot.tipoPromo === "combo"
                ? "Combo sugerido"
                : jasoBot.tipoPromo === "liquidacion"
                ? "Inventario"
                : jasoBot.tipoPromo === "impulso_sucursal"
                ? "Sucursal"
                : jasoBot.tipoPromo === "producto_estrella"
                ? "Producto destacado"
                : "Sugerencia"}
            </span>
          </>
        ) : null}
      </div>

      <p style={styles.assistantText}>
        {jasoBot.mensajePrincipal}
      </p>

      <p style={styles.assistantHelperText}>
        JasoAlix resume las acciones recomendadas y te ayuda a preparar mensajes comerciales.
      </p>
    </div>

    <div style={styles.assistantChannelRow}>
      <span style={styles.assistantChannelBadge}>
        {activeChannels.length === 0
          ? "Sin canales habilitados"
          : `Canales activos: ${activeChannels.length}/3`}
      </span>

      <span style={styles.assistantChannelText}>
        {!hasValidWhatsapp
          ? "Configura un WhatsApp válido en Configuración del negocio para habilitar el envío."
          : activeChannels.length === 0
          ? "Activa al menos un canal desde Configuración del negocio."
          : secondaryActiveChannelsLabel
          ? `Canal prioritario activo: ${topActiveChannelLabel} · Otros canales activos: ${secondaryActiveChannelsLabel}`
          : `Canal prioritario activo: ${topActiveChannelLabel}`}
      </span>
    </div>
  </div>

  <div style={styles.assistantBody}>
    <div style={styles.assistantInsights}>
      {jasoBot.insights.slice(0, 4).map((item, index) => (
        <div key={`${item}-${index}`} style={styles.assistantInsightItem}>
          {item}
        </div>
      ))}
    </div>
    <div style={styles.actionsGrid}>
  {mainRecommendation ? (
    <div style={styles.priorityActionCard}>
      <div style={styles.priorityActionHeader}>
        <span style={styles.priorityNowBadge}>PRIORIDAD AHORA</span>
        <span style={styles.priorityActionType}>
          {mainRecommendation.type}
        </span>
      </div>

      <h3 style={styles.priorityActionTitle}>
        {mainRecommendation.title}
      </h3>

      <p style={styles.priorityActionText}>
        {mainRecommendation.message}
      </p>

      {!isExportingPdf ? (
        <button
          style={styles.priorityActionButton}
          onClick={() =>
            usarAccion(`${mainRecommendation.title}. ${mainRecommendation.message}`)
          }
        >
          Copiar
        </button>
      ) : null}
    </div>
  ) : null}

  {secondaryRecommendations.length > 0 ? (
    <div style={styles.secondaryActionsList}>
      {secondaryRecommendations.map((item) => (
        <div key={`${item.title}-${item.type}`} style={styles.secondaryActionCard}>
          <div>
            <strong style={styles.secondaryActionTitle}>{item.title}</strong>
            <p style={styles.secondaryActionText}>{item.message}</p>
          </div>

          {!isExportingPdf ? (
            <button
              style={styles.actionButton}
              onClick={() => usarAccion(`${item.title}. ${item.message}`)}
            >
              Copiar
            </button>
          ) : null}
        </div>
      ))}
    </div>
  ) : null}
      {!isExportingPdf && actionNotice ? (
    <div style={styles.actionNotice}>{actionNotice}</div>
  ) : null}
</div>
</div>

{!isExportingPdf ? (
  <div style={styles.assistantFooter}>
    <div style={styles.assistantFooterActions}>
      <button
        type="button"
        style={styles.assistantPdfButton}
        onClick={() => setPlansOpen(true)}
      >
        PDF en Plan Crecimiento
      </button>

      <button
        type="button"
        style={styles.assistantWhatsappButton}
        onClick={() => setPlansOpen(true)}
      >
        WhatsApp en plan Control
      </button>
    </div>

    <div style={styles.assistantFooterActions}>
<button
  type="button"
  style={
    currentPlan === "ultra"
      ? styles.assistantControlButtonActive
      : styles.assistantControlButton
  }
  onClick={
    currentPlan === "ultra"
      ? shareJasoAlixByWhatsapp
      : () => setPlansOpen(true)
  }
>
  {currentPlan === "ultra" ? "Enviar por WhatsApp" : "Disponible en plan Control"}
</button>

<button
  type="button"
  style={styles.assistantShareButton}
  onClick={exportarPDF}
>
  Compartir PDF
</button>
    </div>
  </div>
) : null}
</div>
    </>
  ) : (
    <LockedFeatureCard
      title="Asistente comercial JasoAlix"
      description="Recibe recomendaciones accionables, promociones sugeridas y apoyo de WhatsApp. Disponible desde Crecimiento."
      requiredPlan="pro"
      onOpenPlans={() => setPlansOpen(true)}
      onContactSales={openSalesWhatsapp}
    />
  ))}
{shouldShowSection("reportes") ? (
  <div id="reportes" style={{ scrollMarginTop: 96 }}>
    <DetailTableSection
      searchedRowsCount={searchedRows.length}
      paginatedRows={paginatedRows}
      pageSize={pageSize}
      currentPage={currentPage}
      totalPages={totalPages}
      searchTerm={searchTerm}
      onSearchTermChange={setSearchTerm}
      onPageSizeChange={setPageSize}
      onPrevPage={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
      onNextPage={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
      toDateKey={toDateKey}
      toText={toText}
      toNumber={toNumber}
      formatInt={(value) => formatInt(value)}
      formatMoney={(value) =>
        formatMoney(value, settings.locale, settings.currencyCode)
      }
    />
  </div>
) : null}
<style jsx global>{`
  input::placeholder {
    color: rgba(255, 255, 255, 0.88);
    opacity: 1;
  }

  select option {
    background: #1e2670;
    color: #ffffff;
  }
`}</style>
    </div>
  </div>
);
}
function LockedFeatureCard({
  title,
  description,
  requiredPlan,
  onOpenPlans,
  onContactSales,
}: {
  title: string;
  description: string;
  requiredPlan: SubscriptionPlan;
  onOpenPlans: () => void;
  onContactSales: () => void;
}) {
  return (
    <div style={styles.lockedFeatureCard}>
      <div style={styles.lockedFeatureTop}>
        <span style={styles.lockedFeatureBadge}>
          Disponible en {PLAN_LABELS[requiredPlan]}
        </span>
        <span style={styles.lockedFeatureMiniBadge}>Upgrade</span>
      </div>

      <h3 style={styles.lockedFeatureTitle}>{title}</h3>
      <p style={styles.lockedFeatureText}>{description}</p>

      <div style={styles.lockedFeatureFooter}>
        <span style={styles.lockedFeatureHint}>
          Mejora tu plan para desbloquear esta funcionalidad.
        </span>

        <div style={styles.lockedFeatureActions}>
          <button style={styles.lockedFeatureButton} onClick={onOpenPlans}>
            Ver planes
          </button>

          <button
            style={styles.lockedFeatureSalesButton}
            onClick={onContactSales}
          >
            Hablar con ventas
          </button>
        </div>
      </div>
    </div>
  );
}
type DetailModalProps = {
  type: "products" | "stock" | "channels";
  onClose: () => void;
  topProductos: { producto: string; ventas: number }[];
  ventasTotales: number;
  stockRiskRows: StockRiskRow[];
  channelResult: {
    data: Record<string, number | string>[];
    channels: string[];
    hasChannelData: boolean;
  };
  formatMoney: (value: number) => string;
};

function DetailModal({
  type,
  onClose,
  topProductos,
  ventasTotales,
  stockRiskRows,
  channelResult,
  formatMoney,
}: DetailModalProps) {
  const title =
    type === "products"
      ? "Ranking completo de productos"
      : type === "stock"
      ? "Detalle completo de inventario en riesgo"
      : "Detalle de ventas por canal";

  const channelTotals = channelResult.channels.map((channel) => {
    const ventas = channelResult.data.reduce((acc, row) => {
      const value = row[channel];
      return acc + (typeof value === "number" ? value : 0);
    }, 0);

    return {
      canal: channel,
      ventas,
      participacion: ventasTotales > 0 ? (ventas / ventasTotales) * 100 : 0,
      registros: channelResult.data.filter((row) => {
        const value = row[channel];
        return typeof value === "number" && value > 0;
      }).length,
    };
  });

  const dominantChannel = [...channelTotals].sort(
    (a, b) => b.ventas - a.ventas
  )[0];

  return (
    <div style={detailStyles.overlay} role="dialog" aria-modal="true">
      <div style={detailStyles.modal}>
        <div style={detailStyles.header}>
          <div>
            <p style={detailStyles.eyebrow}>Detalle del análisis</p>
            <h2 style={detailStyles.title}>{title}</h2>
          </div>

          <button type="button" style={detailStyles.closeButton} onClick={onClose}>
            Cerrar
          </button>
        </div>

        <div style={detailStyles.tableWrap}>
          {type === "products" ? (
            <table style={detailStyles.table}>
              <thead>
                <tr>
                  <th style={detailStyles.th}>Producto</th>
                  <th style={detailStyles.th}>Ventas</th>
                  <th style={detailStyles.th}>Participación en ventas</th>
                </tr>
              </thead>
              <tbody>
                {topProductos.map((item) => {
                  const pct =
                    ventasTotales > 0 ? (item.ventas / ventasTotales) * 100 : 0;

                  return (
                    <tr key={item.producto}>
                      <td style={detailStyles.td}>{item.producto}</td>
                      <td style={detailStyles.td}>{formatMoney(item.ventas)}</td>
                      <td style={detailStyles.td}>{pct.toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : null}

          {type === "stock" ? (
            <table style={detailStyles.table}>
              <thead>
                <tr>
                 <th style={detailStyles.th}>Producto</th>
<th style={detailStyles.th}>Unidades disponibles</th>
<th style={detailStyles.th}>Mínimo esperado</th>
<th style={detailStyles.th}>Situación</th>
<th style={detailStyles.th}>Días estimados</th>
<th style={detailStyles.th}>Qué hacer</th>
                </tr>
              </thead>
              <tbody>
                {stockRiskRows.map((row, index) => (
  <tr key={`${row.producto}-${index}`}>
                    <td style={detailStyles.td}>{row.producto}</td>
                    <td style={detailStyles.td}>{row.stock}</td>
                    <td style={detailStyles.td}>{row.minimo}</td>
                    <td style={detailStyles.td}>
  {row.estado === "Crítico"
    ? "Inventario bajo"
    : row.estado === "En riesgo"
    ? "Revisar pronto"
    : row.estado === "Sin inventario"
    ? "Sin inventario"
    : row.estado}
</td>
                    <td style={detailStyles.td}>{row.diasCobertura} días</td>
                    <td style={detailStyles.td}>
{row.estado === "Crítico"
  ? "Revisa este producto primero. Puede quedarse sin unidades para vender."
  : row.estado === "En riesgo"
  ? "Dale seguimiento y considera reponerlo pronto."
  : "Mantén este producto en observación."}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}

          {type === "channels" ? (
            <table style={detailStyles.table}>
              <thead>
                <tr>
                  <th style={detailStyles.th}>Canal</th>
                  <th style={detailStyles.th}>Ventas</th>
                  <th style={detailStyles.th}>participación</th>
                  <th style={detailStyles.th}>Registros</th>
                  <th style={detailStyles.th}>Canal dominante</th>
                </tr>
              </thead>
              <tbody>
                {channelTotals.map((item) => (
                  <tr key={item.canal}>
                    <td style={detailStyles.td}>{item.canal}</td>
                    <td style={detailStyles.td}>{formatMoney(item.ventas)}</td>
                    <td style={detailStyles.td}>
                      {item.participacion.toFixed(1)}%
                    </td>
                    <td style={detailStyles.td}>{item.registros}</td>
                    <td style={detailStyles.td}>
                      {dominantChannel?.canal === item.canal ? "S" : "No"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>
      </div>
    </div>
  );
}

const detailStyles: Record<string, CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 80,
    background: "rgba(15,23,42,0.62)",
    backdropFilter: "blur(8px)",
    display: "grid",
    placeItems: "center",
    padding: 24,
  },
  modal: {
    width: "min(1100px, 96vw)",
    maxHeight: "86vh",
    overflow: "hidden",
    borderRadius: 24,
    background: "#252B82",
    border: "1px solid rgba(255,255,255,0.18)",
    boxShadow: "0 30px 90px rgba(15,23,42,0.45)",
    color: "#FFFFFF",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    padding: 24,
    borderBottom: "1px solid rgba(255,255,255,0.12)",
  },
  eyebrow: {
    margin: 0,
    color: "#A7F3D0",
    fontSize: 12,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  title: {
    margin: "6px 0 0 0",
    fontSize: 24,
    fontWeight: 900,
  },
  closeButton: {
    border: "1px solid rgba(255,255,255,0.22)",
    background: "rgba(255,255,255,0.10)",
    color: "#FFFFFF",
    borderRadius: 16,
    padding: "10px 14px",
    fontSize: 13,
    fontWeight: 800,
    cursor: "pointer",
  },
  tableWrap: {
    overflow: "auto",
    maxHeight: "68vh",
    padding: 24,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 720,
  },
  th: {
    textAlign: "left",
    padding: "12px 14px",
    fontSize: 12,
    fontWeight: 900,
    color: "#C7D2FE",
    background: "rgba(255,255,255,0.08)",
    borderBottom: "1px solid rgba(255,255,255,0.12)",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "12px 14px",
    fontSize: 13,
    fontWeight: 800,
    color: "#FFFFFF",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    verticalAlign: "top",
  },
};
function ActivePlanBadge({
  children,
  tone = "pro",
}: {
  children: ReactNode;
  tone?: "basic" | "pro" | "ultra";
}) {
  return (
    <span
      style={{
        ...styles.activePlanBadge,
        ...(tone === "basic"
          ? styles.activePlanBadgeBasic
          : tone === "ultra"
          ? styles.activePlanBadgeUltra
          : styles.activePlanBadgePro),
      }}
    >
      {children}
    </span>
  );
}
const tooltipStyle = {
  background: "#1C2468",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 12,
  color: "#FFFFFF",
};

const styles: Record<string, CSSProperties> = {
  page: {
    display: "grid",
    gap: 16,
    padding: 16,
    background: "linear-gradient(180deg, #EEF2FF 0%, #E8EDFF 100%)",
  },
assistantCard: {
  background: "var(--jd-gradient-container)",
  color: "var(--jd-text-main)",
  borderRadius: 22,
  padding: 18,
  border: "1px solid var(--jd-border-accent-soft)",
  boxShadow: "var(--jd-shadow-card)",
  display: "grid",
  gap: 14,
},
assistantTop: {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
  gap: 14,
  alignItems: "start",
},
assistantBody: {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
  gap: 14,
  alignItems: "start",
  padding: 10,
  borderRadius: 18,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid var(--jd-border-accent-soft)",
},

lockedFeatureActions: {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
},

lockedFeatureSalesButton: {
  minHeight: 46,
  width: "fit-content",
  padding: "0 16px",
  borderRadius: 12,
  border: "1px solid rgba(110,231,183,0.65)",
  background:
    "linear-gradient(135deg, rgba(34,197,94,0.38) 0%, rgba(16,185,129,0.32) 100%)",
  color: "#FFFFFF",
  fontSize: 15,
  fontWeight: 850,
  cursor: "pointer",
  boxShadow: "0 10px 20px rgba(16,185,129,0.18)",
},
actionButton: {
  minHeight: 36,
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.78)",
  background: "rgba(80, 96, 220, 0.42)",
  color: "#FFFFFF",
  padding: "0 14px",
  fontSize: 13,
  fontWeight: 650,
  cursor: "pointer",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.12), 0 6px 14px rgba(0,0,0,0.10)",
  whiteSpace: "nowrap",
},
actionNotice: {
  marginTop: 10,
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.22)",
  background: "rgba(80, 96, 220, 0.22)",
  color: "#FFFFFF",
  fontSize: 14,
  fontWeight: 500,
  lineHeight: 1.5,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
},

assistantPromoBadge: {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 32,
  padding: "0 14px",
  borderRadius: 999,
  background: "rgba(56, 189, 248, 0.18)",
  border: "1px solid rgba(125, 211, 252, 0.36)",
  color: "#7DD3FC",
  fontSize: 14,
  fontWeight: 750,
  lineHeight: 1,
  whiteSpace: "nowrap",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.12), 0 0 10px rgba(56,189,248,0.08)",
},
actionsGrid: {
  display: "grid",
  gap: 10,
},
actionCard: {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: 10,
  alignItems: "center",
  padding: 14,
  borderRadius: 16,
  background: "#f3f6ff",
  border: "1px solid rgba(109,126,219,0.24)",
},

actionText: {
  color: "var(--jd-text-main)",
  fontSize: 13,
  lineHeight: 1.45,
  fontWeight: 500,
},
assistantHeader: {
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginBottom: 10,
  flexWrap: "wrap",
},

assistantTitle: {
  fontSize: 25,
  fontWeight: 850,
  color: "var(--jd-text-main)",
  lineHeight: 1.08,
  letterSpacing: "-0.035em",
},

assistantText: {
  color: "var(--jd-text-main)",
  fontSize: 16,
  lineHeight: 1.58,
  margin: 0,
  maxWidth: 760,
  fontWeight: 500,
},
assistantHelperText: {
  color: "var(--jd-text-secondary)",
  fontSize: 15,
  lineHeight: 1.5,
  margin: "8px 0 0",
  fontWeight: 500,
},
whatsappButton: {
  background: "linear-gradient(135deg, #16A34A 0%, #22C55E 100%)",
  color: "#FFFFFF",
  border: "1px solid rgba(34,197,94,0.26)",
  borderRadius: 999,
  minHeight: 42,
  padding: "0 14px",
  width: "fit-content",
  fontWeight: 850,
  fontSize: 14,
  cursor: "pointer",
  boxShadow: "0 10px 22px rgba(34,197,94,0.12)",
},

shareButton: {
  background: "var(--jd-gradient-accent)",
  color: "#FFFFFF",
  border: "1px solid rgba(255,255,255,0.18)",
  borderRadius: 999,
  minHeight: 42,
  padding: "0 14px",
  width: "fit-content",
  fontWeight: 850,
  fontSize: 14,
  cursor: "pointer",
  boxShadow: "var(--jd-shadow-button)",
},
assistantInsights: {
  display: "grid",
  gap: 8,
  padding: 12,
  borderRadius: 18,
  background: "var(--jd-gradient-table-surface)",
  border: "1px solid var(--jd-border-accent-soft)",
},
  th: {
    textAlign: "left",
    padding: "12px 14px",
    color: "#BFC8FF",
    borderBottom: "1px solid rgba(255,255,255,0.10)",
    fontWeight: 800,
  },
  td: {
    padding: "12px 14px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    color: "#FFFFFF",
    verticalAlign: "middle",
  },
assistantChannelRow: {
  minWidth: 0,
  width: "100%",
  maxWidth: "100%",
  boxSizing: "border-box",
  padding: "14px 16px",
  borderRadius: 18,
  background: "rgba(255,255,255,0.07)",
  border: "1px solid rgba(255,255,255,0.42)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10)",
  display: "grid",
  gap: 8,
  overflowWrap: "anywhere",
},

assistantChannelBadge: {
  width: "fit-content",
  minHeight: 28,
  padding: "0 12px",
  borderRadius: 999,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(34, 197, 94, 0.18)",
  border: "1px solid rgba(255,255,255,0.86)",
  color: "#86EFAC",
  fontSize: 13,
  fontWeight: 700,
  lineHeight: 1,
  whiteSpace: "nowrap",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.14), 0 0 10px rgba(255,255,255,0.05)",
},

assistantChannelText: {
  color: "var(--jd-text-main)",
  fontSize: 14,
  fontWeight: 650,
  lineHeight: 1.45,
  overflowWrap: "anywhere",
  wordBreak: "break-word",
},

disabledButton: {
  opacity: 0.52,
  cursor: "not-allowed",
  boxShadow: "none",
  filter: "grayscale(0.2)",
},
lockedFeatureCard: {
  background: "linear-gradient(135deg, #202969 0%, #2B2F86 100%)",
  color: "#FFFFFF",
  borderRadius: 20,
  padding: 22,
  border: "1px solid rgba(255,255,255,0.12)",
  boxShadow: "0 12px 24px rgba(17,24,39,0.10)",
  display: "grid",
},

lockedFeatureBadge: {
  width: "fit-content",
  padding: "4px 10px",
  borderRadius: 999,
  background: "rgba(245,158,11,0.16)",
  border: "1px solid rgba(245,158,11,0.28)",
  color: "#FCD34D",
  fontSize: 13,
  fontWeight: 850,
},

lockedFeatureTitle: {
  margin: 0,
  fontSize: 18,
  fontWeight: 850,
  color: "#FFFFFF",
},

lockedFeatureText: {
  margin: 0,
  color: "#DDE6FF",
  fontSize: 16,
  lineHeight: 1.55,
  fontWeight: 500,
},
lockedFeatureTop: {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  flexWrap: "wrap",
},

lockedFeatureMiniBadge: {
  padding: "4px 10px",
  borderRadius: 999,
  background: "rgba(127,178,255,0.12)",
  border: "1px solid rgba(127,178,255,0.22)",
  color: "#DDE6FF",
  fontSize: 13,
  fontWeight: 850,
},

lockedFeatureFooter: {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  
  flexWrap: "wrap",
},

lockedFeatureHint: {
  color: "#C6CFFF",
  fontSize: 15,
  lineHeight: 1.5,
  fontWeight: 600,
},

lockedFeatureButton: {
  minHeight: 46,
  width: "fit-content",
  padding: "0 16px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "linear-gradient(135deg, #4460FF 0%, #5B6CFF 100%)",
  color: "#FFFFFF",
  fontSize: 15,
  fontWeight: 850,
  cursor: "pointer",
  boxShadow: "0 10px 20px rgba(68,96,255,0.18)",
},
modulePlanRow: {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  gap: 12,
  flexWrap: "wrap",
  margin: "0 0 14px",
  padding: "12px 14px",
  width: "100%",
  borderRadius: 16,
  background: "rgba(224, 242, 254, 0.88)",
  border: "1px solid rgba(125, 211, 252, 0.46)",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.72), 0 10px 22px rgba(15,23,42,0.06)",
},
modulePlanText: {
  color: "#1E3A8A",
  fontSize: 16,
  fontWeight: 750,
  letterSpacing: "-0.01em",
},
activePlanBadge: {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 30,
  padding: "0 12px",
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 700,
  border: "1px solid rgba(255,255,255,0.42)",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.14), 0 0 10px rgba(255,255,255,0.05)",
  whiteSpace: "nowrap",
},

activePlanBadgeBasic: {
  background: "rgba(219, 234, 254, 0.72)",
  border: "1px solid rgba(30, 58, 138, 0.24)",
  color: "#1E3A8A",
},

activePlanBadgePro: {
  background: "rgba(80, 96, 220, 0.42)",
  border: "1px solid rgba(255,255,255,0.72)",
  color: "#FFFFFF",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.14), 0 0 10px rgba(80,96,220,0.16)",
},

activePlanBadgeUltra: {
  background: "rgba(34, 197, 94, 0.38)",
  border: "1px solid rgba(134, 239, 172, 0.54)",
  color: "#FFFFFF",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.14), 0 0 12px rgba(34,197,94,0.16)",
},
businessLocationBar: {
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  width: "fit-content",
  margin: "0 0 10px",
  padding: "8px 12px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.78)",
  border: "1px solid rgba(226,232,240,0.95)",
  boxShadow: "0 10px 24px rgba(15,23,42,0.08)",
},

businessLocationLabel: {
  color: "#64748B",
  fontSize: 13,
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
},

businessLocationValue: {
  color: "#172554",
  fontSize: 15,
  fontWeight: 900,
},
businessContextWarning: {
  margin: "8px 0 12px",
  padding: "12px 14px",
  borderRadius: 16,
  background: "rgba(251,191,36,0.16)",
  border: "1px solid rgba(245,158,11,0.28)",
  color: "#92400E",
  fontSize: 15,
  fontWeight: 800,
},
productComparisonCard: {
  borderRadius: 18,
  padding: "18px 20px",
  background: "var(--jd-gradient-container)",
  border: "1px solid var(--jd-border-accent)",
  boxShadow: "var(--jd-shadow-card)",
  display: "grid",
  gap: 16,
},
productComparisonHighlight: {
  border: "5px solid rgba(34, 197, 94, 1)",
  boxShadow:
    "0 0 0 5px rgba(34, 197, 94, 0.24), 0 0 28px rgba(34, 197, 94, 0.50)",
  transition: "border 180ms ease, box-shadow 180ms ease",
},
productComparisonHeader: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 10,
  flexWrap: "wrap",
},

productComparisonTitleRow: {
  display: "flex",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
},

productComparisonTitle: {
  margin: 0,
  color: "var(--jd-text-main)",
  fontSize: 25,
  fontWeight: 900,
  letterSpacing: "-0.03em",
  lineHeight: 1.08,
},

productComparisonSubtitle: {
  margin: "5px 0 0",
  color: "#FFFFFF",
  fontSize: 16,
  fontWeight: 500,
  maxWidth: 1080,
  lineHeight: 1.5,
},
comparisonHeaderActions: {
  display: "flex",
  alignItems: "flex-end",
  gap: 8,
  flexWrap: "wrap",
},

metricSelectorLabel: {
  display: "grid",
  gap: 5,
  color: "#FFFFFF",
  fontSize: 13,
  fontWeight: 700,
  lineHeight: 1.15,
},

metricSelector: {
  minHeight: 42,
  minWidth: 150,
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.42)",
  background: "rgba(93, 111, 219, 0.42)",
  color: "#FFFFFF",
  padding: "0 12px",
  fontSize: 14,
  fontWeight: 550,
  outline: "none",
  boxShadow:
    "0 0 0 1px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.18)",
},

clearComparisonButton: {
  minHeight: 42,
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.44)",
  background: "rgba(93, 111, 219, 0.48)",
  color: "#FFFFFF",
  padding: "0 16px",
  fontSize: 14,
  fontWeight: 650,
  cursor: "pointer",
  boxShadow:
    "0 0 0 1px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.20)",
},

productComparisonEmpty: {
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.86)",
  background: "rgba(80, 96, 220, 0.42)",
  padding: 22,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 18,
  flexWrap: "wrap",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.12), 0 10px 24px rgba(0,0,0,0.10)",
},

emptyTitle: {
  margin: 0,
  color: "#FFFFFF",
  fontSize: 18,
  fontWeight: 750,
  lineHeight: 1.25,
},

emptyText: {
  margin: "6px 0 0",
  color: "rgba(255,255,255,0.92)",
  fontSize: 15,
  fontWeight: 500,
  lineHeight: 1.55,
  maxWidth: 920,
},

emptyActionButton: {
  minHeight: 42,
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.86)",
  background: "rgba(34, 197, 94, 0.18)",
  color: "#86EFAC",
  padding: "0 18px",
  fontSize: 14,
  fontWeight: 650,
  cursor: "pointer",
  whiteSpace: "nowrap",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.14), 0 0 10px rgba(34,197,94,0.08)",
},

productChipsRow: {
  display: "flex",
  gap: 6,
  flexWrap: "wrap",
},
productChip: {
  minHeight: 32,
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.07)",
  color: "#FFFFFF",
  padding: "0 12px",
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  fontSize: 13,
  fontWeight: 800,
  cursor: "pointer",
},

productChipDot: {
  width: 9,
  height: 9,
  borderRadius: 999,
  display: "inline-block",
  flexShrink: 0,
},

productChipClose: {
  opacity: 0.82,
  fontSize: 16,
  lineHeight: 1,
},

productComparisonGrid: {
  display: "grid",
  gridTemplateColumns: "minmax(405px, 0.87fr) minmax(0, 1.16fr)",
  gap: 8,
  alignItems: "stretch",
},

productComparisonChartBox: {
  borderRadius: 16,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(8, 13, 49, 0.22)",
  padding: "18px 18px",
  display: "grid",
  gap: 14,
  minWidth: 0,
  overflow: "hidden",
},

productComparisonBlockTitle: {
  margin: 0,
  color: "var(--jd-text-main)",
  fontSize: 18,
  fontWeight: 900,
},

productComparisonMiniText: {
  color: "var(--jd-text-secondary)",
  fontSize: 13,
  fontWeight: 750,
},

comparisonBars: {
  minHeight: 285,
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "flex-start",
  gap: 22,
  padding: "44px 10px 16px",
  borderRadius: 14,
  background: "rgba(8, 13, 49, 0.30)",
  border: "1px solid rgba(255,255,255,0.08)",
  overflowX: "auto",
  overflowY: "hidden",
},

comparisonBarItem: {
  display: "grid",
  justifyItems: "center",
  alignItems: "end",
  gap: 8,
  minWidth: 76,
},

comparisonBarValue: {
  color: "#FFFFFF",
  fontSize: 13,
  fontWeight: 650,
  lineHeight: 1.15,
},

comparisonBar: {
  width: 42,
  borderRadius: "6px 6px 0 0",
  boxShadow: "0 10px 20px rgba(46,13,79,0.12)",
},
comparisonBarLabel: {
  color: "#FFFFFF",
  fontSize: 12,
  fontWeight: 500,
  lineHeight: 1.18,
  textAlign: "center",
  maxWidth: 96,
  minHeight: 34,
  overflow: "hidden",
},

productComparisonTableBox: {
  borderRadius: 16,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(8, 13, 49, 0.28)",
  padding: "12px",
  display: "grid",
  minWidth: 0,
  overflow: "hidden",
},

productComparisonTableScroll: {
  overflowX: "auto",
  maxWidth: "100%",
},
productComparisonTable: {
  width: "100%",
  minWidth: 980,
  borderCollapse: "collapse",
  background: "transparent",
},

productComparisonTh: {
  padding: "9px 10px",
  textAlign: "left",
  color: "#F8FAFC",
  fontSize: 10,
  fontWeight: 700,
  lineHeight: 1.2,
  letterSpacing: "0.01em",
  background: "rgba(109,126,219,0.42)",
  borderBottom: "1px solid rgba(255,255,255,0.12)",
  whiteSpace: "normal",
},

productComparisonTd: {
  padding: "8px 9px",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
  color: "#FFFFFF",
  fontSize: 11,
  fontWeight: 450,
  lineHeight: 1.2,
  verticalAlign: "middle",
  whiteSpace: "nowrap",
},
productComparisonTotalTd: {
  padding: "10px",
  color: "#FFFFFF",
  fontSize: 11,
  fontWeight: 700,
  borderBottom: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(109,126,219,0.18)",
},

productInsightBox: {
  borderRadius: 14,
  border: "1px solid rgba(34,197,94,0.26)",
  background: "rgba(20, 83, 45, 0.18)",
  color: "#FFFFFF",
  padding: "14px 16px",
  fontSize: 14,
  fontWeight: 600,
  display: "grid",
  gridTemplateColumns: "auto 1fr",
  alignItems: "start",
  gap: 8,
  lineHeight: 1.45,
},
insightIcon: {
  width: 28,
  height: 28,
  borderRadius: 999,
  display: "inline-grid",
  placeItems: "center",
  background: "rgba(34,197,94,0.18)",
  color: "#86EFAC",
  fontSize: 15,
  fontWeight: 900,
  flexShrink: 0,
},
insightTitle: {
  display: "block",
  color: "#D1FAE5",
  fontSize: 13,
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  marginBottom: 4,
},

insightText: {
  margin: 0,
  color: "var(--jd-text-main)",
  fontSize: 14,
  fontWeight: 600,
  lineHeight: 1.45,
},
productCellInline: {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
},

productCellText: {
  color: "var(--jd-text-main)",
  fontSize: 11,
  fontWeight: 500,
  lineHeight: 1.2,
},
productDot: {
  width: "8px",
  height: "8px",
  minWidth: "8px",
  borderRadius: "999px",
  display: "inline-block",
},

productComparisonInsight: {
  marginTop: "14px",
  borderRadius: "16px",
  border: "1px solid rgba(55, 211, 153, 0.28)",
  background:
    "linear-gradient(180deg, rgba(30, 110, 115, 0.18) 0%, rgba(19, 58, 102, 0.20) 100%)",
  padding: "14px 16px",
  display: "flex",
  flexDirection: "column",
  gap: "10px",
},

productComparisonInsightBadge: {
  alignSelf: "flex-start",
  padding: "6px 12px",
  borderRadius: "999px",
  background: "rgba(55, 211, 153, 0.14)",
  border: "1px solid rgba(55, 211, 153, 0.28)",
  color: "#C9FFE9",
  fontSize: "13px",
  fontWeight: 850,
  letterSpacing: "0.02em",
  textTransform: "uppercase" as const,
},

productComparisonInsightText: {
  color: "#F4F7FF",
  fontSize: "17px",
  lineHeight: 1.55,
  fontWeight: 600,
},
pdfSectionLabel: {
  color: "#1E2670",
  fontSize: 14,
  fontWeight: 900,
  margin: "8px 0",
},
pdfSpacerBeforeAssistant: {
  height: 160,
},
insightBadge: {
  width: "fit-content",
  borderRadius: 999,
  padding: "5px 10px",
  background: "rgba(34,197,94,0.16)",
  border: "1px solid rgba(34,197,94,0.30)",
  color: "#BBF7D0",
  fontSize: 12,
  fontWeight: 850,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
},
pdfSpacerBeforeBenchmarking: {
  height: 0,
},
assistantInsightItem: {
  display: "flex",
  alignItems: "center",
  minHeight: 64,
  padding: "0 14px",
  borderRadius: 14,
  background: "rgba(15, 23, 42, 0.14)",
  border: "1px solid rgba(255,255,255,0.88)",
  color: "#86EFAC",
  fontSize: 15,
  fontWeight: 550,
  lineHeight: 1.28,
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.14), 0 0 12px rgba(255,255,255,0.06)",
},
priorityActionCard: {
  display: "grid",
  gap: 8,
  padding: "14px 16px",
  borderRadius: 18,
  background: "rgba(255,255,255,0.08)",
  border: "1px solid var(--jd-border-accent-soft)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
},

priorityActionHeader: {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
},

priorityActionBadge: {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 24,
  padding: "0 10px",
  borderRadius: 999,
  background: "rgba(220,38,38,0.10)",
  color: "#B91C1C",
  border: "1px solid rgba(220,38,38,0.18)",
  fontSize: 11,
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
},

priorityActionType: {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 28,
  padding: "0 10px",
  borderRadius: 999,
  background: "rgba(34,211,238,0.14)",
  color: "#A5F3FC",
  border: "1px solid rgba(34,211,238,0.24)",
  fontSize: 13,
  fontWeight: 850,
},

priorityActionTitle: {
  margin: 0,
  color: "var(--jd-text-main)",
  fontSize: 21,
  fontWeight: 950,
  lineHeight: 1.14,
  letterSpacing: "-0.02em",
},

priorityActionText: {
  margin: 0,
  color: "var(--jd-text-secondary)",
  fontSize: 15,
  fontWeight: 600,
  lineHeight: 1.5,
},

priorityActionButton: {
  width: "fit-content",
  minHeight: 38,
  padding: "0 13px",
  borderRadius: 999,
  border: "1px solid rgba(91,104,255,0.22)",
  background: "var(--jd-gradient-accent)",
  color: "#FFFFFF",
  fontSize: 14,
  fontWeight: 900,
  cursor: "pointer",
  boxShadow: "0 10px 22px rgba(61,44,141,0.14)",
},

secondaryActionsList: {
  display: "grid",
  gap: 8,
},

secondaryActionCard: {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
  gap: 10,
  alignItems: "center",
  padding: "10px 12px",
  borderRadius: 14,
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(109,126,219,0.18)",
},

secondaryActionTitle: {
  display: "block",
  color: "var(--jd-text-main)",
  fontSize: 15,
  fontWeight: 850,
  lineHeight: 1.25,
},

secondaryActionText: {
  margin: "3px 0 0",
  color: "var(--jd-text-secondary)",
  fontSize: 14,
  fontWeight: 550,
  lineHeight: 1.45,
},
assistantFooter: {
  marginTop: 12,
  padding: "14px 16px",
  borderRadius: 16,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid var(--jd-border-accent-soft)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
},

assistantFooterActions: {
  display: "flex",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
},

assistantPdfButton: {
  minHeight: 40,
  padding: "0 18px",
  borderRadius: 999,
  border: "1px solid rgba(91,104,255,0.22)",
  background: "var(--jd-gradient-accent)",
  color: "#FFFFFF",
  fontSize: 14,
  fontWeight: 900,
  cursor: "pointer",
  boxShadow: "0 10px 22px rgba(61,44,141,0.16)",
  whiteSpace: "nowrap",
},

assistantWhatsappButton: {
  minHeight: 40,
  padding: "0 18px",
  borderRadius: 999,
  border: "1px solid rgba(34,197,94,0.22)",
  background: "linear-gradient(135deg, #16A34A 0%, #22C55E 100%)",
  color: "#FFFFFF",
  fontSize: 14,
  fontWeight: 900,
  cursor: "pointer",
  boxShadow: "0 10px 22px rgba(22,163,74,0.16)",
  whiteSpace: "nowrap",
},

assistantControlBadge: {
  minHeight: 40,
  padding: "0 18px",
  borderRadius: 999,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: "1px solid rgba(34,197,94,0.18)",
  background: "rgba(34,197,94,0.38)",
  color: "#FFFFFF",
  fontSize: 14,
  fontWeight: 900,
  whiteSpace: "nowrap",
},

assistantShareButton: {
  minHeight: 40,
  padding: "0 18px",
  borderRadius: 999,
  border: "1px solid rgba(91,104,255,0.22)",
  background: "var(--jd-gradient-accent)",
  color: "#FFFFFF",
  fontSize: 14,
  fontWeight: 900,
  cursor: "pointer",
  boxShadow: "0 10px 22px rgba(61,44,141,0.16)",
  whiteSpace: "nowrap",
},
assistantControlButton: {
  minHeight: 40,
  padding: "0 18px",
  borderRadius: 999,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: "1px solid rgba(34,197,94,0.22)",
  background: "linear-gradient(135deg, #16A34A 0%, #22C55E 100%)",
  color: "#FFFFFF",
  fontSize: 14,
  fontWeight: 900,
  whiteSpace: "nowrap",
  cursor: "pointer",
  boxShadow: "0 10px 22px rgba(22,163,74,0.16)",
},
assistantControlButtonActive: {
  minHeight: 40,
  padding: "0 18px",
  borderRadius: 999,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: "1px solid rgba(34,197,94,0.22)",
  background: "linear-gradient(135deg, rgba(34,197,94,0.72) 0%, rgba(16,185,129,0.88) 100%)",
  color: "#FFFFFF",
  fontSize: 14,
  fontWeight: 900,
  whiteSpace: "nowrap",
  cursor: "pointer",
  boxShadow: "0 10px 22px rgba(22,163,74,0.16)",
},
assistantPlanUpgradeButton: {
  minHeight: 34,
  padding: "0 13px",
  borderRadius: 999,
  border: "1px solid rgba(34,197,94,0.22)",
  background: "linear-gradient(135deg, #16A34A 0%, #22C55E 100%)",
  color: "#FFFFFF",
  fontSize: 13,
  fontWeight: 900,
  cursor: "pointer",
  whiteSpace: "nowrap",
  boxShadow: "0 8px 18px rgba(22,163,74,0.14)",
},
priorityNowBadge: {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 28,
  padding: "0 12px",
  borderRadius: 999,
  background: "rgba(34, 197, 94, 0.16)",
  border: "1px solid rgba(255,255,255,0.86)",
  color: "#86EFAC",
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.14), 0 0 10px rgba(255,255,255,0.05)",
},
};







