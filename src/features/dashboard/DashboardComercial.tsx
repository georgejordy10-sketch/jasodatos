"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
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
type Props = {
  processedData: ProcessDatasetResult;
  onClearFile?: () => void;
  onSelectAnotherFile?: () => void;
};
type StockRiskRow = {
  producto: string;
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
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  if (typeof value === "string") {
    const raw = value.trim();
    if (!raw) return 0;

    const hasComma = raw.includes(",");
    const hasDot = raw.includes(".");

    if (hasComma && hasDot) {
      const normalized = raw.replace(/\./g, "").replace(",", ".");
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : 0;
    }

    if (hasComma && !hasDot) {
      const normalized = raw.replace(",", ".");
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : 0;
    }

    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
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
  if (code === "EUR") return "€";
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
function getChannelDisplayName(key: ChannelKey): string {
  if (key === "ecommerce") return "e-commerce";
  if (key === "mayorista") return "mayorista";
  return "tienda física";
}
function normalizeChannelKey(value: unknown): ChannelKey | null {
  const raw = toText(value, "").trim().toLowerCase();

  if (!raw) return null;

  const normalized = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (
    normalized === "e-commerce" ||
    normalized === "ecommerce" ||
    normalized === "online" ||
    normalized === "canal online" ||
    normalized === "web"
  ) {
    return "ecommerce";
  }

  if (normalized === "mayorista" || normalized === "wholesale") {
    return "mayorista";
  }

  if (
    normalized === "tienda fisica" ||
    normalized === "fisico" ||
    normalized === "retail" ||
    normalized === "local"
  ) {
    return "tiendaFisica";
  }

  return null;
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
  stockMin: number
): StockRiskRow[] {
  const rowsWithStock = rows.filter(
    (row) => row.stock !== undefined && row.stock !== null && row.stock !== ""
  );

  const minimo = Math.max(0, stockMin);
  const criticalThreshold = Math.max(1, Math.round(minimo * 0.5));

  return rowsWithStock
    .map((row) => {
      const stock = toNumber(row.stock);
      const producto = toText(row.producto, "Sin producto");
      const diasCobertura = stock <= 0 ? 0 : Math.max(1, Math.round(stock / 5));

      let estado = "Óptimo";
      if (stock <= 0) estado = "Sin stock";
      else if (stock <= criticalThreshold) estado = "Crítico";
      else if (stock <= minimo) estado = "En riesgo";

      return {
        producto,
        stock,
        minimo,
        estado,
        diasCobertura,
      };
    })
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 6);
}
function buildChannelData(rows: Record<string, unknown>[]) {
  const validRows = rows.filter((row) => {
    const channelKey = normalizeChannelKey(row.canal);
    return channelKey !== null;
  });

  const byDateAndChannel = new Map<string, Record<string, number | string>>();
  const channels = new Set<string>();

  for (const row of validRows) {
    const fecha = toDateKey(row.fecha);
    const channelKey = normalizeChannelKey(row.canal);

    if (!channelKey) continue;

    const venta = toNumber(row.cantidad) * toNumber(row.precio_unitario);

    channels.add(channelKey);

    const current = byDateAndChannel.get(fecha) ?? { fecha };
    current[channelKey] = toNumber(current[channelKey]) + venta;
    byDateAndChannel.set(fecha, current);
  }

  const data = [...byDateAndChannel.values()].sort((a, b) =>
    String(a.fecha).localeCompare(String(b.fecha))
  );

  return {
    data,
    channels: [...channels],
    hasChannelData: validRows.length > 0,
  };
}
function buildJasoBotInsights(
  rows: Record<string, unknown>[],
  stockMin: number
) {
  if (!rows.length) {
    return {
      mensajePrincipal: "No hay suficiente información para generar recomendaciones comerciales.",
      insights: [
        "Carga un archivo para activar recomendaciones.",
        "JasoBot analizará ventas, canales y stock.",
        "Podrás detectar productos líderes y riesgos.",
        "También sugerirá acciones comerciales.",
      ],
      recomendaciones: [],
      promoWhatsApp:
        "Buen día. Tenemos promociones especiales disponibles. Escríbenos para conocer disponibilidad para ti.",
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

  const recomendaciones: string[] = [];
  const productosOrdenados = [...ventasPorProducto.entries()].sort((a, b) => b[1] - a[1]);

  let promoWhatsApp = "";
  let tipoPromo = "general";

  if (productosCriticos.length > 0) {
    const critico = productosCriticos[0].producto;
    tipoPromo = "liquidacion";
s
    promoWhatsApp = `Buen día. Oferta rápida: ${critico} con precio especial por liquidación de stock. Disponible hasta agotar existencias. Responde “QUIERO” para reservar.`;
  } else if (lowSucursal && topProducto) {
    const top = topProducto[0];
    tipoPromo = "impulso_sucursal";

    promoWhatsApp = `Buen día. Estamos impulsando ${top} con una propuesta especial en ${lowSucursal[0]}. Disponible hasta agotar existencias. Responde “QUIERO” para reservar.`;
  } else if (productosOrdenados.length > 1) {
    const top = productosOrdenados[0][0];
    const bajo = productosOrdenados[productosOrdenados.length - 1][0];
    tipoPromo = "combo";

    promoWhatsApp = `Buen día. Te compartimos una promoción especial: lleva ${top} y combínalo con ${bajo}. Es una excelente oportunidad para aprovechar una compra más completa. Disponible hasta agotar existencias. Responde “QUIERO” para reservar.`;
  } else if (topProducto) {
    const top = topProducto[0];
    tipoPromo = "producto_estrella";

    promoWhatsApp = `Buen día. Hoy queremos recomendarte ${top}, uno de nuestros productos destacados. Si deseas conocer la promoción vigente, escríbenos y te compartimos la información.`;
  } else {
    promoWhatsApp =
      "Buen día. Tenemos promociones especiales disponibles. Escríbenos para conocer las mejores opciones para ti.";
  }

  if (productosOrdenados.length > 1) {
    const top = productosOrdenados[0][0];
    const bajo = productosOrdenados[productosOrdenados.length - 1][0];
    recomendaciones.push(`Crea combo: ${top} + ${bajo}`);
  }

  if (productosCriticos.length > 0) {
    recomendaciones.push(`Liquida stock: ${productosCriticos[0].producto}`);
  }

  if (lowSucursal) {
    recomendaciones.push(`Activa promoción en ${lowSucursal[0]}`);
  }

if (topCanal && topCanal[0]) {
  recomendaciones.push(`Potencia ventas en canal ${topCanal[0]}`);
}

  const nombreProductoTop = topProducto?.[0] ?? "tu producto líder";
  const nombreSucursalTop = topSucursal?.[0] ?? "tu mejor sucursal";
  const nombreSucursalBaja = lowSucursal?.[0] ?? "tu sucursal con menor participación";
  const nombreCanalTop = topCanal?.[0] ?? "tu canal principal";

  let mensajePrincipal = `Prioriza ${nombreProductoTop} como producto ancla y ejecútalo primero en ${nombreSucursalTop} para acelerar ventas en ${nombreCanalTop}.`;

  if (tipoPromo === "liquidacion" && productosCriticos.length > 0) {
    mensajePrincipal = `Detectamos presión de inventario en ${productosCriticos[0].producto}. La mejor jugada ahora es activar una salida comercial rápida antes de que el stock siga perdiendo tracción.`;
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
export default function DashboardComercial({
  processedData,
  onClearFile,
  onSelectAnotherFile,
}: Props) {
  const [selectedSucursal, setSelectedSucursal] = useState("Todas");
  const [selectedProducto, setSelectedProducto] = useState("Todos");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionNotice, setActionNotice] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [plansOpen, setPlansOpen] = useState(false);
  const [detailModal, setDetailModal] = useState<DetailModalType>(null);

  const {
    settings,
    updateSettings,
    updateThreshold,
    updateChannel,
    resetSettings,
  } = useProfileSettings();
const currentBusinessSlug = "bodega-central";
const {
  data: businessPlanData,
  loading: businessPlanLoading,
  error: businessPlanError,
} = useBusinessPlan(currentBusinessSlug);

const currentPlan = businessPlanData?.currentPlan ?? "basic";
const debugPlanMessage = businessPlanLoading
  ? "Cargando plan..."
  : businessPlanError
  ? `Error plan: ${businessPlanError}`
  : `Plan real: ${currentPlan}`;
const planLabel = PLAN_LABELS[currentPlan];

function hasFeature(feature: PlanFeature): boolean {
  return PLAN_FEATURES[currentPlan].includes(feature);
}

const canUseBenchmarking = hasFeature("benchmarking");
const canUseAssistant = hasFeature("assistant");
const canExportPdf = hasFeature("pdf_export");
const canUseWhatsappByPlan = hasFeature("whatsapp_actions");

function setCurrentPlan(_plan: SubscriptionPlan) {
  setPlansOpen(true);
}

const activeChannels = useMemo(() => {
  return (Object.entries(settings.channelsEnabled) as [ChannelKey, boolean][])
    .filter(([, enabled]) => enabled)
    .map(([key]) => key);
}, [settings.channelsEnabled]);

const activeChannelsLabel = activeChannels.length
  ? activeChannels.map(getChannelDisplayName).join(" · ")
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
    const matchChannel = isRowChannelEnabled(row, settings.channelsEnabled);

    return matchSucursal && matchProducto && matchDate && matchChannel;
  });
}, [
  processedData.validRows,
  selectedSucursal,
  selectedProducto,
  fromDate,
  toDate,
  settings.channelsEnabled,
]);
const benchmarkRows = useMemo(() => {
  return processedData.validRows.filter((row) => {
    const producto = toText(row.producto, "Sin producto");
    const matchProducto = selectedProducto === "Todos" || producto === selectedProducto;
    const matchDate = isWithinRange(row.fecha, fromDate, toDate);
    const matchChannel = isRowChannelEnabled(row, settings.channelsEnabled);

    return matchProducto && matchDate && matchChannel;
  });
}, [
  processedData.validRows,
  selectedProducto,
  fromDate,
  toDate,
  settings.channelsEnabled,
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
  ? getChannelDisplayName(topActiveChannel)
  : "Sin canales habilitados";
const whatsappDigits = normalizeWhatsappNumber(settings.businessWhatsapp);
const hasValidWhatsapp = whatsappDigits.length >= 8 && whatsappDigits.length <= 15;
const canUseWhatsappInputs = activeChannels.length > 0 && hasValidWhatsapp;
const canUseWhatsappActions = canUseWhatsappByPlan && canUseWhatsappInputs;

const whatsappDisabledReason = !canUseWhatsappByPlan
  ? "Disponible en plan Ultra."
  : !hasValidWhatsapp
  ? "Configura un WhatsApp válido en Configuración del negocio."
  : activeChannels.length === 0
  ? "Activa al menos un canal para usar acciones de WhatsApp."
  : "";

const pdfDisabledReason = !canExportPdf
  ? "Disponible desde el plan Pro."
  : !hasValidWhatsapp
  ? "Configura un WhatsApp válido en Configuración del negocio."
  : activeChannels.length === 0
  ? "Activa al menos un canal para compartir."
  : "";
  const secondaryActiveChannels = activeChannels.filter(
  (channel) => channel !== topActiveChannel
);
const secondaryActiveChannelsLabel = secondaryActiveChannels.length
  ? secondaryActiveChannels.map(getChannelDisplayName).join(" · ")
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
      const matchChannel = isRowChannelEnabled(row, settings.channelsEnabled);
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
      const matchChannel = isRowChannelEnabled(row, settings.channelsEnabled);
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
  settings.channelsEnabled,
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
  const tendenciaVentas = useMemo(() => buildSalesTrend(filteredRows), [filteredRows]);
  const stockRiskRows = useMemo(() => {
  return buildStockRisk(filteredRows, settings.defaultStockMin);
}, [filteredRows, settings.defaultStockMin]);
  const channelResult = useMemo(() => buildChannelData(filteredRows), [filteredRows]);

const hasStockData = useMemo(() => {
  return filteredRows.some(
    (row) => row.stock !== undefined && row.stock !== null && row.stock !== ""
  );
}, [filteredRows]);

const stockCritico = useMemo(() => {
  if (!hasStockData) return null;

  return stockRiskRows.filter(
    (row) => row.estado === "Crítico" || row.estado === "Sin stock"
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
    "Tipo_Movimiento",
    "Cantidad",
    "Costo_Unitario",
    "Precio_Unitario",
    "Canal",
    "Stock",
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
      ? '€#,##0.00'
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

  if (wasSettingsOpen) {
    setSettingsOpen(false);
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    await new Promise((resolve) => setTimeout(resolve, 80));
  }

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

  if (wasSettingsOpen) {
    setSettingsOpen(true);
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
    salesDropMediumPct: settings.salesDropMediumPct,
    salesDropHighPct: settings.salesDropHighPct,
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
    subtitle: "vs. período anterior",
  },
  {
    title: "Unidades totales",
    value: formatInt(unidadesTotales, settings.locale),
    badge: `${variationPct >= 0 ? "+" : ""}${variationPct.toFixed(1)}%`,
    subtitle: "vs. período anterior",
  },
  {
    title: "Producto más vendido",
    value: productoTop?.producto ?? "Sin datos",
    badge: `${porcentajeTop}%`,
    subtitle: "del total de ventas",
  },
  {
    title: "Stock crítico",
    value: stockCritico === null ? "No Disponible" : formatInt(stockCritico),
    badge: "Reglas activas",
    subtitle: "revisar inventario",
    accent: "danger" as const,
  },
];
const jasoBot = useMemo(() => {
  return buildJasoBotInsights(filteredRows, settings.defaultStockMin);
}, [filteredRows, settings.defaultStockMin]);

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
    ? jasoBot.recomendaciones.map((item) => `• ${item}`).join("\n")
    : "• No se identificaron acciones prioritarias en este momento.";

  const mensaje = encodeURIComponent(
    `Cómo estás.

Te comparto un breve resumen comercial generado en ${settings.businessName || "JasoDatos"}.

${jasoBot.mensajePrincipal}

Puntos clave:
${jasoBot.insights.map((item) => `• ${item}`).join("\n")}

Acciones sugeridas:
${recomendaciones}

Ya se descargó el reporte en PDF para que puedas adjuntarlo y compartirlo por este medio.`
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
      `Hola, te escribimos desde ${settings.businessName || "JasoDatos"}. Tenemos promociones especiales disponibles. Escríbenos para más información.`
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
    <HeroHeader
  businessName={settings.businessName}
  filteredCount={filteredRows.length}
  fileName={processedData.fileName}
  planLabel={planLabel}
  onSelectAnotherFile={onSelectAnotherFile}
  onExportExcel={exportarExcel}
  onClearFile={onClearFile}
  onOpenPlans={() => setPlansOpen(true)}
  onOpenSettings={() => setSettingsOpen(true)}
/>
<UpgradeBanner
  currentPlan={currentPlan}
  planLabel={planLabel}
  onOpenPlans={() => setPlansOpen(true)}
/>
<div style={{ padding: "8px 12px", fontSize: 12, color: "#1E2670" }}>
  {debugPlanMessage}
</div>
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
<ProfileSettingsPanel
  open={settingsOpen}
  onClose={() => setSettingsOpen(false)}
  settings={settings}
  updateSettings={updateSettings}
  updateThreshold={updateThreshold}
  updateChannel={updateChannel}
  resetSettings={resetSettings}
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

<KpiSection items={kpiItems} />
<AlertsSection alerts={alerts} />

<SalesChartsSection
  tendenciaVentas={tendenciaVentas}
  topProductos={topProductos}
  ventasTotales={ventasTotales}
  axisWidth={axisWidth}
  tooltipStyle={tooltipStyle}
  colors={COLORS}
  formatCompactMoney={formatCompactMoney}
  formatMoney={(value) => formatMoney(value, settings.locale, settings.currencyCode)}
  onOpenProductDetails={() => {
  console.log("ABRIR MODAL PRODUCTS");
  setDetailModal("products");
}}
/>
<SecondaryChartsSection
  defaultStockMin={settings.defaultStockMin}
  stockRiskRows={stockRiskRows}
  activeChannelsCount={activeChannels.length}
  activeChannelsLabel={activeChannelsLabel}
  channelResult={channelResult}
  axisWidth={axisWidth}
  tooltipStyle={tooltipStyle}
  colors={COLORS}
  formatCompactMoney={formatCompactMoney}
  formatMoney={(value) => formatMoney(value, settings.locale, settings.currencyCode)}
  onOpenStockDetails={() => {
  console.log("ABRIR MODAL STOCK");
  setDetailModal("stock");
}}
  onOpenChannelDetails={() => {
  console.log("ABRIR MODAL CHANNELS");
  setDetailModal("channels");
}}
/>
{settings.showBenchmarking &&
  (canUseBenchmarking ? (
    <div id="benchmarking-sucursales">
      <div style={styles.modulePlanRow}>
        <ActivePlanBadge tone="pro">Incluido en PRO</ActivePlanBadge>
        <span style={styles.modulePlanText}>Comparativo comercial avanzado entre sucursales</span>
      </div>

      <BenchmarkingSucursales rows={benchmarkRows} />
    </div>
  ) : (
    <LockedFeatureCard
      title="Desempeño entre sucursales"
      description="Compara el desempeño comercial entre sucursales y detecta rezagos. Disponible desde el plan Pro."
      requiredPlan="pro"
      onOpenPlans={() => setPlansOpen(true)}
      onContactSales={openSalesWhatsapp}
    />
  ))}
{settings.showAssistant &&
  (canUseAssistant ? (
    <div style={styles.assistantCard}>
      <div style={styles.assistantGrid}>
        <div style={styles.assistantContent}>
          <div style={styles.assistantHeader}>
            <span style={styles.assistantTitle}>Asistente Comercial</span>
            <ActivePlanBadge tone="pro">Incluido en PRO</ActivePlanBadge>
            {canUseWhatsappByPlan ? (
              <ActivePlanBadge tone="ultra">WhatsApp en ULTRA</ActivePlanBadge>
            ) : (
              <ActivePlanBadge tone="basic">WhatsApp bloqueado</ActivePlanBadge>
            )}

            <span
              style={{
                ...styles.assistantPromoBadge,
                background:
                  jasoBot.tipoPromo === "combo"
                    ? "rgba(59,130,246,0.18)"
                    : jasoBot.tipoPromo === "liquidacion"
                    ? "rgba(239,68,68,0.18)"
                    : jasoBot.tipoPromo === "impulso_sucursal"
                    ? "rgba(245,158,11,0.18)"
                    : jasoBot.tipoPromo === "producto_estrella"
                    ? "rgba(34,197,94,0.18)"
                    : "rgba(148,163,184,0.18)",
                color:
                  jasoBot.tipoPromo === "combo"
                    ? "#93C5FD"
                    : jasoBot.tipoPromo === "liquidacion"
                    ? "#FCA5A5"
                    : jasoBot.tipoPromo === "impulso_sucursal"
                    ? "#FCD34D"
                    : jasoBot.tipoPromo === "producto_estrella"
                    ? "#86EFAC"
                    : "#CBD5E1",
                border:
                  jasoBot.tipoPromo === "combo"
                    ? "1px solid rgba(147,197,253,0.22)"
                    : jasoBot.tipoPromo === "liquidacion"
                    ? "1px solid rgba(252,165,165,0.22)"
                    : jasoBot.tipoPromo === "impulso_sucursal"
                    ? "1px solid rgba(252,211,77,0.22)"
                    : jasoBot.tipoPromo === "producto_estrella"
                    ? "1px solid rgba(134,239,172,0.22)"
                    : "1px solid rgba(203,213,225,0.22)",
              }}
            >
              {jasoBot.tipoPromo === "combo"
                ? "Combo"
                : jasoBot.tipoPromo === "liquidacion"
                ? "Liquidación"
                : jasoBot.tipoPromo === "impulso_sucursal"
                ? "Impulso sucursal"
                : jasoBot.tipoPromo === "producto_estrella"
                ? "Producto estrella"
                : "Promo"}
            </span>
          </div>

          <div style={styles.assistantText}>
            {jasoBot.mensajePrincipal}
            <br />
            <strong>JasoDatos prepara la campaña. Tú eliges a qué cliente, grupo o lista enviarla.</strong>
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

        <div style={styles.assistantInsights}>
          {jasoBot.insights.map((item) => (
            <div key={item}>✦ {item}</div>
          ))}

          <div style={styles.actionsGrid}>
            {jasoBot.recomendaciones?.map((item) => (
              <div key={item} style={styles.actionCard}>
                <div style={styles.actionIcon}>⚡</div>
                <div style={styles.actionText}>{item}</div>
                <button style={styles.actionButton} onClick={() => usarAccion(item)}>
                  Copiar campaña
                </button>
              </div>
            ))}

            {actionNotice ? <div style={styles.actionNotice}>{actionNotice}</div> : null}
          </div>
        </div>

        <div style={styles.assistantActions}>
          <div style={styles.modulePlanRow}>
            <ActivePlanBadge tone="pro">PDF en PRO</ActivePlanBadge>
            <ActivePlanBadge tone="ultra">WhatsApp en ULTRA</ActivePlanBadge>
          </div>

          <button
            style={{
              ...styles.whatsappButton,
              ...(!canUseWhatsappActions ? styles.disabledButton : null),
            }}
            onClick={enviarPromoWhatsApp}
            disabled={!canUseWhatsappActions}
            title={whatsappDisabledReason}
          >
            {!canUseWhatsappByPlan
              ? "Disponible en plan Ultra"
              : !hasValidWhatsapp
              ? "Configura tu número celular para activar el envío a WhatsApp"
              : "Preparar campaña para WhatsApp"}
          </button>

          <button
            style={{
              ...styles.shareButton,
              ...(!(canExportPdf && canUseWhatsappInputs) ? styles.disabledButton : null),
            }}
            onClick={() => {
              exportarPDF();
              setTimeout(() => {
                enviarWhatsApp();
              }, 900);
            }}
            disabled={!(canExportPdf && canUseWhatsappInputs)}
            title={pdfDisabledReason}
          >
            {!canExportPdf
              ? "Disponible desde el plan Pro"
              : !hasValidWhatsapp
              ? "Configura tu número celular para activar el envío a WhatsApp"
              : "Compartir PDF por WhatsApp"}
          </button>
        </div>
      </div>
    </div>
  ) : (
    <LockedFeatureCard
      title="Asistente Comercial"
      description="Recibe recomendaciones accionables, promociones sugeridas y apoyo de WhatsApp. Disponible desde el plan Pro."
      requiredPlan="pro"
      onOpenPlans={() => setPlansOpen(true)}
      onContactSales={openSalesWhatsapp}
    />
  ))}
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
  formatInt={(value) => formatInt(value, settings.locale)}
  formatMoney={(value) => formatMoney(value, settings.locale, settings.currencyCode)}
/>
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
          Disponible en {requiredPlan.toUpperCase()}
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
      ? "Detalle completo de stock en riesgo"
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
            <p style={detailStyles.eyebrow}>Vista ampliada</p>
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
                  <th style={detailStyles.th}>Participación</th>
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
                  <th style={detailStyles.th}>Stock actual</th>
                  <th style={detailStyles.th}>Mínimo</th>
                  <th style={detailStyles.th}>Estado</th>
                  <th style={detailStyles.th}>Días cobertura</th>
                  <th style={detailStyles.th}>Recomendación</th>
                </tr>
              </thead>
              <tbody>
                {stockRiskRows.map((row) => (
                  <tr key={row.producto}>
                    <td style={detailStyles.td}>{row.producto}</td>
                    <td style={detailStyles.td}>{row.stock}</td>
                    <td style={detailStyles.td}>{row.minimo}</td>
                    <td style={detailStyles.td}>{row.estado}</td>
                    <td style={detailStyles.td}>{row.diasCobertura} días</td>
                    <td style={detailStyles.td}>
                      {row.estado === "Crítico"
                        ? "Priorizar revisión y salida comercial."
                        : row.estado === "En riesgo"
                        ? "Monitorear reposición y rotación."
                        : "Mantener seguimiento operativo."}
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
                  <th style={detailStyles.th}>Participación</th>
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
                      {dominantChannel?.canal === item.canal ? "Sí" : "No"}
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
    borderRadius: 14,
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
    fontWeight: 700,
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
  background: "linear-gradient(180deg, #2f347f 0%, #2b3170 100%)",
  borderRadius: 20,
  padding: "20px 22px",
  border: "1px solid rgba(255,255,255,0.08)",
  boxShadow: "0 12px 24px rgba(17,24,39,0.10)",
},

assistantGrid: {
  display: "grid",
  gridTemplateColumns: "1.05fr 1fr 320px",
  alignItems: "center",
  columnGap: 16,
},
lockedFeatureActions: {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
},

lockedFeatureSalesButton: {
  minHeight: 42,
  width: "fit-content",
  padding: "0 16px",
  borderRadius: 12,
  border: "1px solid rgba(110,231,183,0.65)",
  background:
    "linear-gradient(135deg, rgba(34,197,94,0.38) 0%, rgba(16,185,129,0.32) 100%)",
  color: "#FFFFFF",
  fontSize: 13,
  fontWeight: 800,
  cursor: "pointer",
  boxShadow: "0 10px 20px rgba(16,185,129,0.18)",
},
actionButton: {
  marginLeft: "auto",
  background: "rgba(127,178,255,0.10)",
  color: "#FFFFFF",
  border: "1px solid rgba(127,178,255,0.20)",
  borderRadius: 12,
  minHeight: 38,
  padding: "0 14px",
  fontSize: 13,
  fontWeight: 800,
  cursor: "pointer",
  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.03)",
},

actionNotice: {
  padding: "10px 12px",
  borderRadius: 12,
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.14)",
  color: "#EAF0FF",
  fontSize: 13,
  fontWeight: 600,
},
assistantContent: {
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  paddingRight: 8,
  paddingLeft: 24,
},
assistantPromoBadge: {
  padding: "4px 10px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 800,
  border: "1px solid transparent",
},
actionsGrid: {
  marginTop: 14,
  display: "grid",
  gap: 12,
},

actionCard: {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 12px",
  borderRadius: 12,
  background: "rgba(34,197,94,0.08)",
  border: "1px solid rgba(34,197,94,0.18)",
},

actionIcon: {
  fontSize: 14,
},

actionText: {
  color: "#86EFAC",
  fontSize: 14,
  fontWeight: 700,
  lineHeight: 1.35,
},
assistantHeader: {
  display: "flex",
  alignItems: "center",
  gap: 10,
  marginBottom: 10,
},
assistantTitle: {
  fontSize: 18,
  fontWeight: 800,
  color: "#FFFFFF",
  lineHeight: 1.15,
  letterSpacing: "-0.01em",
},

assistantText: {
  color: "rgba(236,242,255,0.94)",
  fontSize: 14,
  lineHeight: 1.58,
  margin: 0,
  maxWidth: 720,
  fontWeight: 500,
},

whatsappButton: {
  background: "#22C55E",
  color: "#FFFFFF",
  border: "1px solid rgba(255,255,255,0.80)",
  borderRadius: 16,
  minHeight: 58,
  padding: "0 18px",
  width: "100%",
  fontWeight: 800,
  fontSize: 15,
  cursor: "pointer",
  boxShadow: "0 8px 18px rgba(34,197,94,0.28)",
  transition: "all 0.2s ease",
},
shareButton: {
  background: "#5e69c7",
  color: "#FFFFFF",
  border: "1px solid rgba(255,255,255,0.80)",
  borderRadius: 12,
  minHeight: 54,
  padding: "0 18px",
  width: "100%",
  fontWeight: 800,
  fontSize: 15,
  cursor: "pointer",
  boxShadow: "0 8px 18px rgba(18,140,126,0.24)",
},
assistantInsights: {
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  gap: 12,
  fontSize: 18,
  fontWeight: 700,
  color: "#F1F5FF",
  lineHeight: 1.5,
  padding: "0 8px 0 18px",
  borderLeft: "1px solid rgba(255,255,255,0.08)",
},
assistantActions: {
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  gap: 12,
  width: "100%",
  minWidth: 0,
},

  th: {
    textAlign: "left",
    padding: "12px 14px",
    color: "#BFC8FF",
    borderBottom: "1px solid rgba(255,255,255,0.10)",
    fontWeight: 700,
  },
  td: {
    padding: "12px 14px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    color: "#FFFFFF",
    verticalAlign: "middle",
  },
assistantChannelRow: {
  display: "grid",
  gap: 8,
  marginTop: 12,
},

assistantChannelBadge: {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 28,
  padding: "0 12px",
  borderRadius: 999,
  background: "rgba(127,178,255,0.12)",
  border: "1px solid rgba(127,178,255,0.22)",
  color: "#FFFFFF",
  fontSize: 12,
  fontWeight: 800,
  width: "fit-content",
},

assistantChannelText: {
  color: "#DDE6FF",
  fontSize: 13,
  lineHeight: 1.45,
  fontWeight: 600,
},

disabledButton: {
  opacity: 0.55,
  cursor: "not-allowed",
  boxShadow: "none",
},
lockedFeatureCard: {
  background: "linear-gradient(135deg, #202969 0%, #2B2F86 100%)",
  color: "#FFFFFF",
  borderRadius: 20,
  padding: 22,
  border: "1px solid rgba(255,255,255,0.12)",
  boxShadow: "0 12px 24px rgba(17,24,39,0.10)",
  display: "grid",
  gap: 12,
},

lockedFeatureBadge: {
  width: "fit-content",
  padding: "4px 10px",
  borderRadius: 999,
  background: "rgba(245,158,11,0.16)",
  border: "1px solid rgba(245,158,11,0.28)",
  color: "#FCD34D",
  fontSize: 11,
  fontWeight: 800,
},

lockedFeatureTitle: {
  margin: 0,
  fontSize: 20,
  fontWeight: 800,
  color: "#FFFFFF",
},

lockedFeatureText: {
  margin: 0,
  color: "#DDE6FF",
  fontSize: 14,
  lineHeight: 1.5,
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
  fontSize: 11,
  fontWeight: 800,
},

lockedFeatureFooter: {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
},

lockedFeatureHint: {
  color: "#C6CFFF",
  fontSize: 13,
  lineHeight: 1.45,
  fontWeight: 600,
},

lockedFeatureButton: {
  minHeight: 42,
  width: "fit-content",
  padding: "0 16px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "linear-gradient(135deg, #4460FF 0%, #5B6CFF 100%)",
  color: "#FFFFFF",
  fontSize: 13,
  fontWeight: 800,
  cursor: "pointer",
  boxShadow: "0 10px 20px rgba(68,96,255,0.18)",
},
modulePlanRow: {
  display: "inline-flex",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
  margin: "0 0 12px 4px",
  padding: 0,
  width: "fit-content",
  background: "transparent",
  border: "none",
},
modulePlanText: {
  color: "#1E2670",
  fontSize: 14,
  fontWeight: 800,
  letterSpacing: "-0.01em",
},
activePlanBadge: {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 30,
  padding: "0 14px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 800,
  border: "1px solid transparent",
  boxShadow: "0 6px 14px rgba(15, 23, 42, 0.10)",
},

activePlanBadgeBasic: {
  background: "linear-gradient(135deg, #475569 0%, #64748B 100%)",
  border: "1px solid rgba(71, 85, 105, 0.30)",
  color: "#FFFFFF",
},

activePlanBadgePro: {
  background: "linear-gradient(135deg, #4338CA 0%, #6366F1 100%)",
  border: "1px solid rgba(67, 56, 202, 0.28)",
  color: "#FFFFFF",
},

activePlanBadgeUltra: {
  background: "linear-gradient(135deg, #16A34A 0%, #22C55E 100%)",
  border: "1px solid rgba(22, 163, 74, 0.30)",
  color: "#FFFFFF",
},
};




