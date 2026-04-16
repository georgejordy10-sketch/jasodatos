"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ProcessDatasetResult } from "@/core/ingestion/readDataset";
import BenchmarkingSucursales from "@/features/dashboard/BenchmarkingSucursales";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
type Props = {
  processedData: ProcessDatasetResult;
  onClearFile?: () => void;
  onSelectAnotherFile?: () => void;
};

type DetailRow = {
  fecha: string;
  sucursal: string;
  producto: string;
  cantidad: number;
  precio_unitario: number;
  costo_unitario: number;
  stock: number | null;
  canal: string;
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

function formatMoney(value: number): string {
  return value.toLocaleString("es-EC", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

function formatInt(value: number): string {
  return value.toLocaleString("es-EC", { maximumFractionDigits: 0 });
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

function buildStockRisk(rows: Record<string, unknown>[]): StockRiskRow[] {
  const rowsWithStock = rows.filter(
    (row) => row.stock !== undefined && row.stock !== null && row.stock !== ""
  );

  return rowsWithStock
    .map((row) => {
      const stock = toNumber(row.stock);
      const producto = toText(row.producto, "Sin producto");
      const minimo = 20;
      const diasCobertura = stock <= 0 ? 0 : Math.max(1, Math.round(stock / 5));

      let estado = "Óptimo";
      if (stock <= 0) estado = "Sin stock";
      else if (stock <= 10) estado = "Crítico";
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
    const canal = toText(row.canal, "").trim().toLowerCase();

    return (
      canal !== "" &&
      canal !== "inventario" &&
      canal !== "inventory" &&
      row.canal !== undefined &&
      row.canal !== null
    );
  });

  const byDateAndChannel = new Map<string, Record<string, number | string>>();
  const channels = new Set<string>();

  for (const row of validRows) {
    const fecha = toDateKey(row.fecha);
    const canal = toText(row.canal, "Sin canal");
    const venta = toNumber(row.cantidad) * toNumber(row.precio_unitario);

    channels.add(canal);

    const current = byDateAndChannel.get(fecha) ?? { fecha };
    current[canal] = toNumber(current[canal]) + venta;
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
function buildDetails(rows: Record<string, unknown>[]): DetailRow[] {
  return rows.slice(0, 5).map((row) => ({
    fecha: toDateKey(row.fecha),
    sucursal: toText(row.sucursal),
    producto: toText(row.producto),
    cantidad: toNumber(row.cantidad),
    precio_unitario: toNumber(row.precio_unitario),
    costo_unitario: toNumber(row.costo_unitario),
    stock:
      row.stock === undefined || row.stock === null || row.stock === ""
        ? null
        : toNumber(row.stock),
    canal: toText(row.canal, "-"),
  }));
}
function buildAlerts(
  rows: Record<string, unknown>[],
  trendData: SalesPoint[],
  stockCritico: number | null
): string[] {
  const alerts: string[] = [];

  if (typeof stockCritico === "number" && stockCritico > 0) {
    alerts.push(`${stockCritico} productos están en stock crítico.`);
  }

  if (trendData.length >= 2) {
    const last = trendData[trendData.length - 1]?.ventas ?? 0;
    const prev = trendData[trendData.length - 2]?.ventas ?? 0;
    if (prev > 0 && last < prev) {
      const pct = (((last - prev) / prev) * 100).toFixed(1);
      alerts.push(`Las ventas del último período cayeron ${pct}% frente al anterior.`);
    }
  }

  const sucursalMap = new Map<string, number>();
  for (const row of rows) {
    const sucursal = toText(row.sucursal, "Sin sucursal");
    const venta = toNumber(row.cantidad) * toNumber(row.precio_unitario);
    sucursalMap.set(sucursal, (sucursalMap.get(sucursal) ?? 0) + venta);
  }

  const sucursales = [...sucursalMap.entries()].sort((a, b) => a[1] - b[1]);
  if (sucursales.length > 1) {
    alerts.push(`Enfócate en ${sucursales[0][0]}: es la sucursal con menor participación.`);
  }

  if (alerts.length === 0) {
    alerts.push("El período filtrado no muestra alertas críticas.");
  }

  return alerts.slice(0, 4);
}

function buildJasoBotInsights(rows: Record<string, unknown>[]) {
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
        "Buen día. Tenemos promociones especiales disponibles. Escríbenos para conocer las mejores opciones para ti.",
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
    .filter((item) => item.stock <= 20)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 3);

  const recomendaciones: string[] = [];
  const productosOrdenados = [...ventasPorProducto.entries()].sort((a, b) => b[1] - a[1]);

  let promoWhatsApp = "";
  let tipoPromo = "general";

  if (productosCriticos.length > 0) {
    const critico = productosCriticos[0].producto;
    tipoPromo = "liquidacion";

    promoWhatsApp = `Buen día. Tenemos una oportunidad especial en ${critico}. Disponible por tiempo limitado, ideal para activar una compra rápida. Escríbenos y te compartimos el detalle de la promoción.`;
  } else if (lowSucursal && topProducto) {
    const top = topProducto[0];
    tipoPromo = "impulso_sucursal";

    promoWhatsApp = `Buen día. Estamos impulsando ${top} con una propuesta especial en ${lowSucursal[0]}. Si deseas conocer disponibilidad y condiciones, escríbenos por este medio.`;
  } else if (productosOrdenados.length > 1) {
    const top = productosOrdenados[0][0];
    const bajo = productosOrdenados[productosOrdenados.length - 1][0];
    tipoPromo = "combo";

    promoWhatsApp = `Buen día. Te compartimos una promoción especial: lleva ${top} y combínalo con ${bajo}. Es una excelente oportunidad para aprovechar una compra más completa. Escríbenos para enviarte la propuesta.`;
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

  if (topCanal) {
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
  insights.push(`Canal con mayor aporte: ${nombreCanalTop}`);

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
const [hoveredRow, setHoveredRow] = useState<number | null>(null);
const [actionNotice, setActionNotice] = useState("");

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

    return matchSucursal && matchProducto && matchDate;
  });
}, [processedData.validRows, selectedSucursal, selectedProducto, fromDate, toDate]);
  const benchmarkRows = useMemo(() => {
    return processedData.validRows.filter((row) => {
      const producto = toText(row.producto, "Sin producto");
      const matchProducto = selectedProducto === "Todos" || producto === selectedProducto;
      const matchDate = isWithinRange(row.fecha, fromDate, toDate);
      return matchProducto && matchDate;
    });
  }, [processedData.validRows, selectedProducto, fromDate, toDate]);

  const periodMetrics = useMemo(() => {
    const rowsWithDate = processedData.validRows.filter((row) => parseDateLike(row.fecha));

    if (rowsWithDate.length === 0) {
      return {
        currentSales: 0,
        previousSales: 0,
        variationPct: 0,
        variationAbs: 0,
      };
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
        return matchSucursal && matchProducto;
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
        return matchSucursal && matchProducto;
      })
      .reduce((acc, row) => acc + toNumber(row.cantidad) * toNumber(row.precio_unitario), 0);

    const variationAbs = currentSales - previousSales;
    const variationPct = previousSales > 0 ? (variationAbs / previousSales) * 100 : 0;

    return {
      currentSales,
      previousSales,
      variationPct,
      variationAbs,
    };
  }, [processedData.validRows, fromDate, toDate, selectedSucursal, selectedProducto]);

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
  const stockRiskRows = useMemo(() => buildStockRisk(filteredRows), [filteredRows]);
  const channelResult = useMemo(() => buildChannelData(filteredRows), [filteredRows]);
  const detailRows = useMemo(() => buildDetails(filteredRows), [filteredRows]);

const hasStockData = useMemo(() => {
  return filteredRows.some(
    (row) => row.stock !== undefined && row.stock !== null && row.stock !== ""
  );
}, [filteredRows]);

const stockCritico = useMemo(() => {
  if (!hasStockData) return null;

  const rowsWithStock = filteredRows.filter(
    (row) => row.stock !== undefined && row.stock !== null && row.stock !== ""
  );

  return rowsWithStock.filter((row) => toNumber(row.stock) <= 20).length;
}, [filteredRows, hasStockData]);


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
      formatMoney(toNumber(row.costo_unitario)),
      formatMoney(toNumber(row.precio_unitario)),
      toText(row.canal, "-"),
      row.stock === undefined || row.stock === null || row.stock === ""
        ? "No Disponible"
        : formatInt(toNumber(row.stock)),
    ];

    return values.some((value) => value.toLowerCase().includes(term));
  });
}, [filteredRows, searchTerm]);


const totalPages = Math.max(1, Math.ceil(searchedRows.length / pageSize));

const paginatedRows = useMemo(() => {
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  return searchedRows.slice(start, end);
}, [searchedRows, currentPage, pageSize]);

useEffect(() => {
  setCurrentPage(1);
}, [selectedSucursal, selectedProducto, fromDate, toDate, pageSize, searchTerm]);

function exportarExcel() {
  const filas = searchedRows;

  if (!filas.length) return;

  const data = filas.map((row) => ({
    Fecha: toDateKey(row.fecha),
    Sucursal: toText(row.sucursal),
    Bodega: toText(row.bodega, "-"),
    SKU: toText(row.sku, "-"),
    Producto: toText(row.producto),
    Tipo_Movimiento: toText(row.tipo_movimiento, "-"),
    Cantidad: toNumber(row.cantidad),
    Costo_Unitario: toNumber(row.costo_unitario),
    Precio_Unitario: toNumber(row.precio_unitario),
    Canal: toText(row.canal, "-"),
    Stock:
      row.stock === undefined || row.stock === null || row.stock === ""
        ? ""
        : toNumber(row.stock),
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);

  // ancho automático de columnas
  const colWidths = Object.keys(data[0]).map((key) => ({
    wch: Math.max(
      key.length,
      ...data.map((row) => String(row[key as keyof typeof row]).length)
    ) + 2,
  }));

  worksheet["!cols"] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte Comercial");

  const fecha = new Date().toISOString().slice(0, 10);

  XLSX.writeFile(workbook, `jasodatos_reporte_${fecha}.xlsx`);
}

async function exportarPDF() {
  const elemento = document.getElementById("dashboard-export");

  if (!elemento) return;

  const canvas = await html2canvas(elemento, {
    scale: 2,
    useCORS: true,
  });

  const imgData = canvas.toDataURL("image/png");

  const pdf = new jsPDF("p", "mm", "a4");

  const width = pdf.internal.pageSize.getWidth();
  const height = (canvas.height * width) / canvas.width;

  pdf.addImage(imgData, "PNG", 0, 0, width, height);

  pdf.save("jasodatos_reporte.pdf");
}
const productoTop = topProductos[0];
const porcentajeTop =
  ventasTotales > 0 ? ((toNumber(productoTop?.ventas) / ventasTotales) * 100).toFixed(1) : "0.0";

const variationPct = periodMetrics.variationPct;

const jasoBot = useMemo(() => {
  return buildJasoBotInsights(filteredRows);
}, [filteredRows]);

async function exportarPDF() {
  const elemento = document.getElementById("dashboard-export");

  if (!elemento) return;

  const canvas = await html2canvas(elemento, {
    scale: 2,
    useCORS: true,
  });

  const imgData = canvas.toDataURL("image/png");

  const pdf = new jsPDF("p", "mm", "a4");

  const width = pdf.internal.pageSize.getWidth();
  const height = (canvas.height * width) / canvas.width;

  pdf.addImage(imgData, "PNG", 0, 0, width, height);

  pdf.save("jasodatos_reporte.pdf");
}
function usarAccion(texto: string) {
  navigator.clipboard.writeText(texto);
  setActionNotice(`Acción copiada: ${texto}`);
  setTimeout(() => {
    setActionNotice("");
  }, 3000);
}
function enviarWhatsApp() {
  const recomendaciones = jasoBot.recomendaciones?.length
    ? jasoBot.recomendaciones.map((item) => `• ${item}`).join("\n")
    : "• No se identificaron acciones prioritarias en este momento.";

  const mensaje = encodeURIComponent(
    `Cómo estás.

Te comparto un breve resumen comercial generado en JasoDatos.

${jasoBot.mensajePrincipal}

Puntos clave:
${jasoBot.insights.map((item) => `• ${item}`).join("\n")}

Acciones sugeridas:
${recomendaciones}

Ya se descargó el reporte en PDF para que puedas adjuntarlo y compartirlo por este medio.`
  );

  const url = `https://wa.me/?text=${mensaje}`;
  window.open(url, "_blank");
}
function enviarPromoWhatsApp() {
  const mensaje = encodeURIComponent(
    jasoBot.promoWhatsApp ??
      "Hola, tenemos promociones especiales disponibles. Escríbenos para más información."
  );

  const url = `https://wa.me/?text=${mensaje}`;
  window.open(url, "_blank");
}
function clearFilters() {
  setSelectedSucursal("Todas");
  setSelectedProducto("Todos");
  setFromDate("");
  setToDate("");
}

  return (
  <div id="dashboard-export">
    <div style={styles.page}>
      <section style={styles.hero}>
        <div>
          <div style={styles.brandRow}>
            <div style={styles.brandIcon}>JD</div>
            <div>
              <h1 style={styles.brandTitle}>JasoDatos</h1>
              <p style={styles.brandSubtitle}>Inteligencia comercial que impulsa decisiones</p>
              <p style={styles.brandMeta}>
                Registros válidos: {filteredRows.length} · Archivo: {processedData.fileName}
              </p>
            </div>
          </div>
        </div>

        <div style={styles.heroActions}>
          <button style={styles.primaryButton} onClick={onSelectAnotherFile}>
  Seleccionar archivo
</button>
<button style={styles.secondaryButton} onClick={exportarExcel}>
  Exportar Excel
</button>
          <button style={styles.secondaryButton} onClick={onClearFile}>
  Limpiar archivo
</button>
        </div>
      </section>

      <section style={styles.filterBar}>
        <FilterSelect
          label="Sucursal"
          value={selectedSucursal}
          options={sucursalOptions}
          onChange={setSelectedSucursal}
        />
        <FilterSelect
          label="Producto"
          value={selectedProducto}
          options={productoOptions}
          onChange={setSelectedProducto}
        />
        <FilterDate label="Desde" value={fromDate} onChange={setFromDate} />
        <FilterDate label="Hasta" value={toDate} onChange={setToDate} />
        <button style={styles.filterButton} onClick={clearFilters}>
          Limpiar filtros
        </button>
      </section>

      <section style={styles.kpiGrid}>
        <KpiCard
          title="Ventas totales"
          value={formatMoney(ventasTotales)}
          badge={`${variationPct >= 0 ? "+" : ""}${variationPct.toFixed(1)}%`}
          subtitle="vs. período anterior"
        />
        <KpiCard
          title="Unidades totales"
          value={formatInt(unidadesTotales)}
          badge={`${variationPct >= 0 ? "+" : ""}${variationPct.toFixed(1)}%`}
          subtitle="vs. período anterior"
        />
        <KpiCard
          title="Producto más vendido"
          value={productoTop?.producto ?? "Sin datos"}
          badge={`${porcentajeTop}%`}
          subtitle="del total de ventas"
        />
        <KpiCard
          title="Stock crítico"
          value={stockCritico === null ? "No Disponible" : formatInt(stockCritico)}
          badge="Reglas activas"
          subtitle="revisar inventario"
          accent="danger"
        />
      </section>

      <section style={styles.mainCharts}>
        <Card title="Tendencia de ventas" subtitle="Ventas filtradas por fecha">
          <div style={styles.chartTopBar}>
            <div style={styles.customLegend}>
              <div style={styles.customLegendItem}>
                <span style={styles.legendLineSolid} />
                <span>2024</span>
              </div>
              <div style={styles.customLegendItem}>
                <span style={styles.legendLineDashed} />
                <span>2023</span>
              </div>
            </div>

            <div style={styles.totalPill}>
              <strong>{formatMoney(ventasTotales)}</strong>
              <span>Total</span>
            </div>
          </div>

          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <AreaChart data={tendenciaVentas}>
                <defs>
                  <linearGradient id="ventasFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7FB2FF" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#7FB2FF" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="fecha" stroke="#B9C2FF" tickLine={false} axisLine={false} />
<YAxis
  stroke="#B9C2FF"
  tickLine={false}
  axisLine={false}
  tickFormatter={(v) => {
    if (v >= 1000) return `$${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k`;
    return `$${v}`;
  }}
/>
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => formatMoney(value)} />
                <Area
                  type="monotone"
                  dataKey="ventas"
                  stroke="#7FB2FF"
                  fill="url(#ventasFill)"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#A8CCFF", stroke: "#7FB2FF" }}
                />
                <Line
                  type="monotone"
                  dataKey="comparativo"
                  stroke="#C9D2FF"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card
          title="Participación por producto"
          subtitle="Distribución de ventas por producto (top)"
          action={<button style={styles.viewAllButton}>Ver todo</button>}
        >
          <div style={styles.pieLayout}>
            <div style={styles.pieBox}>
              <div style={{ width: "100%", height: 380 }}>
                <ResponsiveContainer>
                  <PieChart>
<Pie
  data={topProductos}
  dataKey="ventas"
  nameKey="producto"
  innerRadius={95}
  outerRadius={155}
  paddingAngle={1.5}
  stroke="#F3F4F6"
  strokeWidth={0.005}
>
                      {topProductos.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => formatMoney(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div style={styles.pieCenterOverlay}>
                <span style={styles.pieCenterLabel}>Ventas</span>
                <strong style={styles.pieCenterValue}>{formatMoney(ventasTotales)}</strong>
                <span style={styles.pieCenterSub}>Total</span>
              </div>
            </div>

            <div style={styles.legendColumn}>
              {topProductos.map((item, index) => {
                const pct = ventasTotales > 0 ? ((item.ventas / ventasTotales) * 100).toFixed(1) : "0.0";
                return (
                  <div key={item.producto} style={styles.legendItem}>
                    <span
                      style={{
                        ...styles.legendDot,
                        background: COLORS[index % COLORS.length],
                      }}
                    />
                    <span style={styles.legendLabel}>{item.producto}</span>
                    <span style={styles.legendPct}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </section>

      <section style={styles.secondaryCharts}>
<Card
  title="Stock en riesgo • Regla: mínimo 20 unidades"
  action={<button style={styles.viewAllButton}>Ver todo</button>}
>
  <div style={{ overflowX: "auto" }}>
    <table style={styles.tableCompact}>
      <thead>
        <tr>
          <th style={styles.thCompact}>Producto</th>
          <th style={styles.thCompact}>Stock actual</th>
          <th style={styles.thCompact}>Mínimo</th>
          <th style={styles.thCompact}>Estado</th>
          <th style={styles.thCompact}>Días cobertura</th>
        </tr>
      </thead>
      <tbody>
        {stockRiskRows.length === 0 ? (
          <tr>
            <td style={styles.tdCompact}>Sin datos</td>
            <td style={styles.tdCompact}>No Disponible</td>
            <td style={styles.tdCompact}>20</td>
            <td style={styles.tdCompact}>
              <span
                style={{
                  ...styles.statusPill,
                  background: "rgba(148,163,184,0.18)",
                  color: "#CBD5E1",
                }}
              >
                Sin stock cargado
              </span>
            </td>
            <td style={styles.tdCompact}>-</td>
          </tr>
        ) : (
          stockRiskRows.map((row) => (
            <tr key={row.producto}>
              <td style={styles.tdCompact}>{row.producto}</td>
              <td style={styles.tdCompact}>{row.stock}</td>
              <td style={styles.tdCompact}>{row.minimo}</td>
              <td style={styles.tdCompact}>
  <div
    style={{
      ...styles.stockStatusBar,
      background:
        row.estado === "Crítico" || row.estado === "Sin stock"
          ? "rgba(126, 34, 54, 0.55)"
          : row.estado === "En riesgo"
          ? "rgba(120, 53, 15, 0.55)"
          : "rgba(20, 83, 45, 0.55)",
    }}
  >
    <div
      style={{
        ...styles.stockStatusFill,
        width:
          row.estado === "Crítico" || row.estado === "Sin stock"
            ? "64%"
            : row.estado === "En riesgo"
            ? "78%"
            : "58%",
        background:
          row.estado === "Crítico" || row.estado === "Sin stock"
            ? "linear-gradient(90deg, #ef4444 0%, #b91c1c 100%)"
            : row.estado === "En riesgo"
            ? "linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)"
            : "linear-gradient(90deg, #22c55e 0%, #4ade80 100%)",
      }}
    />
    <span
      style={{
        ...styles.stockStatusText,
        color:
          row.estado === "Crítico" || row.estado === "Sin stock"
            ? "#ffe4e6"
            : row.estado === "En riesgo"
            ? "#fff7ed"
            : "#ecfdf5",
      }}
    >
      {row.estado}
    </span>
  </div>
</td>
              <td style={styles.tdCompact}>{row.diasCobertura} días</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
</Card>

        <Card title="Ventas por canal" subtitle="Distribución por fecha y canal"action={<button style={styles.viewAllButton}>Ver todo</button>}>
{!channelResult.hasChannelData ? (
    <div style={{ color: "#C6CFFF", fontSize: 14 }}>
      El archivo filtrado no contiene una columna de canal mapeada.
    </div>
  ) : (
    <div style={{ width: "100%", height: 340 }}>
      <ResponsiveContainer>
        <AreaChart
  data={channelResult.data}
  margin={{ top: 22, right: 18, left: 6, bottom: 1 }}
>
          <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
<XAxis
  dataKey="fecha"
  stroke="#B9C2FF"
  tickLine={false}
  axisLine={false}
  tickMargin={8}
  dy={1}
/>
<YAxis
  stroke="#B9C2FF"
  tickLine={false}
  axisLine={false}
  tickMargin={10}
  width={54}
  tickFormatter={(v) => {
    if (v >= 1000) return `$${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k`;
    return `$${v}`;
  }}
/>
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value: number) => formatMoney(value)}
          />
          <Legend verticalAlign="top" height={36} />
          {channelResult.channels.map((channel, index) => (
            <Area
              key={channel}
              type="monotone"
              dataKey={channel}
              stackId="1"
              stroke={COLORS[index % COLORS.length]}
              fill={COLORS[index % COLORS.length]}
              fillOpacity={0.55}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )}
</Card>
</section>

<div style={styles.assistantCard}>
  <div style={styles.assistantGrid}>
    <div style={styles.assistantContent}>
      <div style={styles.assistantHeader}>
        <span style={styles.assistantTitle}>Asistente Comercial</span>
        <span style={styles.assistantBadge}>PRO</span>
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
  <strong>Potencia esa promoción en tu WhatsApp</strong>
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
        Usar
      </button>
    </div>
  ))}

  {actionNotice ? (
    <div style={styles.actionNotice}>
      {actionNotice}
    </div>
  ) : null}
</div>
</div>

    <div style={styles.assistantActions}>
<button style={styles.whatsappButton} onClick={enviarPromoWhatsApp}>
  Mejora tus ventas en WhatsApp
</button>

<button
  style={styles.shareButton}
  onClick={() => {
    exportarPDF();
    setTimeout(() => {
      enviarWhatsApp();
    }, 900);
  }}
>
  Compartir PDF por WhatsApp
</button>
    </div>
  </div>
</div>
      <BenchmarkingSucursales rows={benchmarkRows} />
<section style={styles.detailCardPro}>
  <div style={styles.detailTopBar}>
    <div style={styles.detailTopLeft}>
      Detalle de registros — mostrando {Math.min(pageSize, paginatedRows.length)} de {searchedRows.length} filas
    </div>

   <div style={styles.detailTopRight}>
  <input
    style={styles.searchInput}
    placeholder="Buscar..."
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
  />

  <span style={styles.detailTopLabel}>Filas por página</span>

      <select
        style={styles.pageSizeSelect}
        value={pageSize}
        onChange={(e) => setPageSize(Number(e.target.value))}
      >
        <option value="25">25</option>
        <option value="50">50</option>
        <option value="100">100</option>
      </select>

      <button
        style={styles.pageGhostButton}
        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
        disabled={currentPage === 1}
      >
        ◀ Anterior
      </button>

      <span style={styles.pageIndicator}>
        Página {currentPage} de {totalPages}
      </span>

      <button
        style={styles.pagePrimaryButton}
        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
        disabled={currentPage === totalPages}
      >
        Siguiente ▶
      </button>
    </div>
  </div>

  <div style={styles.detailTableShell}>
    <div style={styles.detailTableScroller}>
      <table style={styles.dataTablePro}>
        <thead>
          <tr>
            <th style={styles.dataTh}>fecha</th>
            <th style={styles.dataTh}>sucursal</th>
            <th style={styles.dataTh}>bodega</th>
            <th style={styles.dataTh}>sku</th>
            <th style={styles.dataTh}>producto</th>
            <th style={styles.dataTh}>tipo_movimiento</th>
            <th style={styles.dataTh}>cantidad</th>
            <th style={styles.dataTh}>costo_unitario</th>
            <th style={styles.dataTh}>precio_unitario</th>
            <th style={styles.dataTh}>canal</th>
            <th style={styles.dataTh}>stock</th>
          </tr>
        </thead>

        <tbody>
{paginatedRows.map((row, index) => (
  <tr
    key={`${toDateKey(row.fecha)}-${toText(row.producto)}-${index}`}
    onMouseEnter={() => setHoveredRow(index)}
    onMouseLeave={() => setHoveredRow(null)}
    style={
      hoveredRow === index
        ? styles.dataRowHover
        : index % 2 === 0
        ? styles.dataRowEven
        : styles.dataRowOdd
    }
  >
              <td style={styles.dataTd}>{toDateKey(row.fecha)}</td>
              <td style={styles.dataTd}>{toText(row.sucursal)}</td>
              <td style={styles.dataTd}>{toText(row.bodega, "-")}</td>
              <td style={styles.dataTd}>{toText(row.sku, "-")}</td>
              <td style={styles.dataTd}>{toText(row.producto)}</td>
              <td style={styles.dataTd}>{toText(row.tipo_movimiento, "-")}</td>
              <td style={styles.dataTd}>{formatInt(toNumber(row.cantidad))}</td>
              <td style={styles.dataTd}>{formatMoney(toNumber(row.costo_unitario))}</td>
              <td style={styles.dataTd}>{formatMoney(toNumber(row.precio_unitario))}</td>
              <td style={styles.dataTd}>{toText(row.canal, "-")}</td>
              <td style={styles.dataTd}>
                {row.stock === undefined || row.stock === null || row.stock === ""
                  ? "No Disponible"
                  : formatInt(toNumber(row.stock))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <div style={styles.detailBottomBar}>
      {(() => {
  const start = searchedRows.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, searchedRows.length);
  return `Mostrando ${start}–${end} de ${searchedRows.length} filas.`;
})()}
    </div>
  </div>
</section>
    </div>
  </div>
);
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div style={styles.filterBox}>
      <span style={styles.filterLabel}>{label}</span>
      <select style={styles.filterSelect} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function FilterDate({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div style={styles.filterBox}>
      <span style={styles.filterLabel}>{label}</span>
      <input type="date" style={styles.filterDateInput} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function KpiCard({
  title,
  value,
  badge,
  subtitle,
  accent = "default",
}: {
  title: string;
  value: string;
  badge: string;
  subtitle: string;
  accent?: "default" | "danger";
}) {
  return (
    <div style={styles.kpiCard}>
      <div style={styles.kpiTitle}>{title}</div>
      <div style={styles.kpiValue}>{value}</div>
      <div style={styles.kpiFooter}>
        <span
          style={{
            ...styles.kpiBadge,
            background: accent === "danger" ? "rgba(239,68,68,0.18)" : "rgba(34,197,94,0.18)",
            color: accent === "danger" ? "#FCA5A5" : "#86EFAC",
          }}
        >
          {badge}
        </span>
        <span style={styles.kpiSubtitle}>{subtitle}</span>
      </div>
    </div>
  );
}

function Card({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <div>
          <h3 style={styles.sectionTitle}>{title}</h3>
          {subtitle ? <p style={styles.sectionSubtitle}>{subtitle}</p> : null}
        </div>
        {action ? <div>{action}</div> : null}
      </div>
      {children}
    </div>
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
hero: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 18,
  background: "linear-gradient(135deg, #1E2670 0%, #2D2D92 100%)",
  color: "#FFFFFF",
  borderRadius: 22,
  padding: "22px 24px",
  border: "1px solid rgba(255,255,255,0.12)",
  boxShadow: "0 14px 28px rgba(17,24,39,0.12)",
  flexWrap: "wrap",
},
  brandRow: {
    display: "flex",
    alignItems: "center",
    gap: 14,
  },
  brandIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    display: "grid",
    placeItems: "center",
    fontWeight: 800,
    background: "linear-gradient(135deg, #7C3AED 0%, #3B82F6 100%)",
    color: "#FFFFFF",
  },
  brandTitle: {
    margin: 0,
    fontSize: 36,
    lineHeight: 1,
    fontWeight: 800,
  },
  dataRowEven: {
  background: "rgba(255,255,255,0.04)",
},

dataRowOdd: {
  background: "rgba(255,255,255,0.08)",
},
dataRowHover: {
  background: "rgba(255,255,255,0.14)",
},
assistantCard: {
  background: "linear-gradient(180deg, #2f347f 0%, #2b3170 100%)",
  borderRadius: 20,
  padding: "18px 20px",
  border: "1px solid rgba(255,255,255,0.08)",
  boxShadow: "0 12px 24px rgba(17,24,39,0.10)",
},

assistantGrid: {
  display: "grid",
  gridTemplateColumns: "1.05fr 1fr 320px",
  alignItems: "center",
  columnGap: 16,
},

actionButton: {
  marginLeft: "auto",
  background: "rgba(255,255,255,0.10)",
  color: "#FFFFFF",
  border: "1px solid rgba(255,255,255,0.18)",
  borderRadius: 10,
  padding: "8px 12px",
  fontSize: 12,
  fontWeight: 800,
  cursor: "pointer",
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
  lineHeight: 1.3,
},
assistantHeader: {
  display: "flex",
  alignItems: "center",
  gap: 10,
  marginBottom: 10,
},
assistantTitle: {
  fontSize: 22,
  fontWeight: 800,
  color: "#FFFFFF",
  lineHeight: 1.1,
},
assistantBadge: {
  background: "rgba(255,255,255,0.14)",
  color: "#E9E7FF",
  padding: "4px 10px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 800,
  border: "1px solid rgba(255,255,255,0.10)",
},
assistantText: {
  color: "#E1E6FF",
  fontSize: 17,
  lineHeight: 1.7,
  margin: 0,
  maxWidth: 720,
  fontWeight: 500,
},
assistantButtons: {
  display: "flex",
  gap: 10,
  marginTop: 4,
  flexWrap: "wrap",
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
  brandSubtitle: {
    margin: "6px 0 4px",
    color: "#D6DCFF",
    fontSize: 15,
  },
  brandMeta: {
    margin: 0,
    color: "#B7C2FF",
    fontSize: 13,
  },
heroActions: {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
  alignItems: "center",
},
primaryButton: {
  background: "#4460FF",
  color: "#FFFFFF",
  border: "1px solid rgba(255,255,255,0.16)",
  borderRadius: 14,
  minHeight: 48,
  padding: "0 20px",
  fontWeight: 800,
  fontSize: 15,
  cursor: "pointer",
  boxShadow: "0 10px 22px rgba(68,96,255,0.22)",
},
secondaryButton: {
  background: "transparent",
  color: "#FFFFFF",
  border: "1px solid rgba(255,255,255,0.24)",
  borderRadius: 14,
  minHeight: 48,
  padding: "0 20px",
  fontWeight: 700,
  fontSize: 15,
  cursor: "pointer",
},
  filterBar: {
    display: "grid",
    gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
    gap: 12,
    background: "linear-gradient(135deg, #232D82 0%, #2C318E 100%)",
    borderRadius: 18,
    padding: 16,
    border: "1px solid rgba(255,255,255,0.12)",
  },
  filterBox: {
    display: "grid",
    gap: 8,
  },
  filterLabel: {
    color: "#D9E0FF",
    fontSize: 13,
    fontWeight: 600,
  },
  filterSelect: {
    background: "rgba(255,255,255,0.96)",
    color: "#111827",
    borderRadius: 12,
    minHeight: 44,
    padding: "0 14px",
    fontWeight: 600,
    border: "none",
    outline: "none",
  },
  filterDateInput: {
    background: "rgba(255,255,255,0.96)",
    color: "#111827",
    borderRadius: 12,
    minHeight: 44,
    padding: "0 14px",
    fontWeight: 600,
    border: "none",
    outline: "none",
  },
  filterButton: {
    alignSelf: "end",
    minHeight: 44,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "#365BFF",
    color: "#FFFFFF",
    fontWeight: 700,
    cursor: "pointer",
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 12,
  },
  kpiCard: {
    background: "linear-gradient(135deg, #202969 0%, #2B2F86 100%)",
    color: "#FFFFFF",
    borderRadius: 18,
    padding: 20,
    border: "1px solid rgba(255,255,255,0.12)",
    boxShadow: "0 10px 20px rgba(17,24,39,0.10)",
  },
  kpiTitle: {
    color: "#D3DAFF",
    fontSize: 15,
    fontWeight: 700,
    marginBottom: 10,
  },
  kpiValue: {
    fontSize: 30,
    fontWeight: 800,
    marginBottom: 12,
    lineHeight: 1.1,
  },
  kpiFooter: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    flexWrap: "wrap",
  },
  kpiBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 28,
    borderRadius: 999,
    padding: "0 10px",
    fontSize: 12,
    fontWeight: 800,
  },
  kpiSubtitle: {
    color: "#C0C9FF",
    fontSize: 13,
    fontWeight: 600,
  },
  mainCharts: {
    display: "grid",
    gridTemplateColumns: "1.55fr 1fr",
    gap: 12,
  },
  secondaryCharts: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },
card: {
  background: "linear-gradient(135deg, #202969 0%, #2B2F86 100%)",
  color: "#FFFFFF",
  borderRadius: 20,
  padding: 20,
  border: "1px solid rgba(255,255,255,0.12)",
  boxShadow: "0 12px 24px rgba(17,24,39,0.10)",
},
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 12,
  },
sectionTitle: {
  margin: 0,
  fontSize: 20,
  fontWeight: 800,
  color: "#FFFFFF",
  letterSpacing: "-0.01em",
},
sectionSubtitle: {
  margin: "5px 0 0",
  color: "#C6CFFF",
  fontSize: 13,
  lineHeight: 1.45,
},
  chartTopBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    gap: 12,
    flexWrap: "wrap",
  },
  customLegend: {
    display: "flex",
    gap: 18,
    alignItems: "center",
    marginLeft: "auto",
    marginRight: "auto",
  },
  customLegendItem: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    color: "#D8DEFF",
    fontSize: 13,
    fontWeight: 700,
  },
  legendLineSolid: {
    width: 22,
    height: 3,
    borderRadius: 999,
    background: "#7FB2FF",
  },
  legendLineDashed: {
    width: 22,
    height: 0,
    borderTop: "3px dashed #C9D2FF",
  },
  totalPill: {
    display: "grid",
    gap: 2,
    minWidth: 110,
    justifyItems: "center",
    padding: "10px 12px",
    borderRadius: 14,
    background: "rgba(255,255,255,0.10)",
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: 700,
  },
pieLayout: {
  display: "grid",
  gridTemplateColumns: "380px 1fr",
  gap: 14,
  alignItems: "center",
},
pieBox: {
  position: "relative",
  width: 340,
  height: 360,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
},
  pieCenterOverlay: {
    position: "absolute",
    inset: 0,
    display: "grid",
    placeContent: "center",
    textAlign: "center",
    pointerEvents: "none",
  },
  pieCenterLabel: {
    color: "#D9E0FF",
    fontSize: 16,
    fontWeight: 700,
  },
  pieCenterValue: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: 800,
    lineHeight: 1.1,
  },
  pieCenterSub: {
    color: "#D9E0FF",
    fontSize: 13,
    fontWeight: 700,
  },
legendColumn: {
  display: "grid",
  gap: 12,
  alignContent: "center",
  paddingLeft: 0,
},
legendItem: {
  display: "grid",
  gridTemplateColumns: "12px 260px 80px",
  alignItems: "center",
  gap: 12,
  color: "#FFFFFF",
  fontSize: 18,
},
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
legendLabel: {
  color: "#DDE3FF",
  fontSize: 18,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
},
legendPct: {
  color: "#FFFFFF",
  fontSize: 16,
  fontWeight: 800,
  textAlign: "right",
  justifySelf: "end",
},
viewAllButton: {
  background: "rgba(255,255,255,0.08)",
  color: "#FFFFFF",
  border: "1px solid rgba(255,255,255,0.14)",
  borderRadius: 999,
  minHeight: 36,
  padding: "0 14px",
  fontWeight: 700,
  fontSize: 12,
  cursor: "pointer",
},
  
  detailCard: {
    background: "linear-gradient(135deg, #202969 0%, #2B2F86 100%)",
    color: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    border: "1px solid rgba(255,255,255,0.12)",
    boxShadow: "0 10px 20px rgba(17,24,39,0.10)",
  },
detailCardPro: {
  background: "linear-gradient(180deg, #4F56E8 0%, #1BC3D9 100%)",
  borderRadius: 22,
  padding: 14,
  border: "1px solid rgba(255,255,255,0.10)",
  boxShadow: "0 14px 28px rgba(17,24,39,0.16)",
},

detailTopBar: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  marginBottom: 10,
  flexWrap: "wrap",
},

detailTopLeft: {
  color: "#FFFFFF",
  fontSize: 14,
  fontWeight: 700,
},

detailTopRight: {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
},

detailTopLabel: {
  color: "#EAF0FF",
  fontSize: 12,
  fontWeight: 600,
},

pageSizeSelect: {
  background: "rgba(255,255,255,0.12)",
  color: "#FFFFFF",
  border: "1px solid rgba(255,255,255,0.24)",
  borderRadius: 999,
  padding: "6px 12px",
  fontWeight: 700,
  outline: "none",
},

pageGhostButton: {
  background: "rgba(255,255,255,0.10)",
  color: "#D8DEFF",
  border: "1px solid rgba(255,255,255,0.18)",
  borderRadius: 999,
  padding: "6px 12px",
  fontWeight: 700,
  cursor: "pointer",
  opacity: 1,
},

pagePrimaryButton: {
  background: "rgba(99,102,241,0.85)",
  color: "#FFFFFF",
  border: "1px solid rgba(255,255,255,0.24)",
  borderRadius: 999,
  padding: "6px 12px",
  fontWeight: 700,
  cursor: "pointer",
  opacity: 1,
},

pageIndicator: {
  color: "#FFFFFF",
  fontSize: 12,
  fontWeight: 700,
},

detailTableShell: {
  background: "linear-gradient(180deg, rgba(8,17,65,0.88) 0%, rgba(7,89,133,0.88) 100%)",
  borderRadius: 18,
  overflow: "hidden",
  border: "1px solid rgba(255,255,255,0.12)",
},

detailTableScroller: {
  overflowX: "auto",
  maxHeight: 720,
  overflowY: "auto",
},

dataTablePro: {
  width: "100%",
  minWidth: 1200,
  borderCollapse: "collapse",
  color: "#FFFFFF",
  fontSize: 13,
},

dataTh: {
  textAlign: "left",
  padding: "12px 10px",
  background: "rgba(7,16,54,0.96)",
  color: "#EAF0FF",
  borderRight: "1px solid rgba(255,255,255,0.16)",
  borderBottom: "1px solid rgba(255,255,255,0.18)",
  fontWeight: 800,
  fontSize: 12,
  textTransform: "none",
  whiteSpace: "nowrap",
  position: "sticky",
  top: 0,
  zIndex: 2,
},

dataTd: {
  padding: "10px 10px",
  color: "#F8FAFF",
  borderRight: "1px solid rgba(255,255,255,0.10)",
  borderBottom: "1px solid rgba(255,255,255,0.10)",
  whiteSpace: "nowrap",
  fontWeight: 600,
  background: "transparent",
  letterSpacing: 0.2,
},

detailBottomBar: {
  padding: "10px 12px",
  color: "#EAF0FF",
  fontSize: 12,
  fontWeight: 700,
  background: "rgba(0,0,0,0.12)",
},
  detailHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
    flexWrap: "wrap",
  },
  detailActions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  searchInput: {
    minWidth: 220,
    minHeight: 42,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    color: "#FFFFFF",
    padding: "0 12px",
    outline: "none",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    color: "#FFFFFF",
    fontSize: 14,
  },
  tableCompact: {
  width: "100%",
  borderCollapse: "collapse",
  color: "#FFFFFF",
  fontSize: 13,
},
thCompact: {
  textAlign: "left",
  padding: "12px 14px",
  color: "#C7D2FE",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
  fontWeight: 700,
  background: "rgba(255,255,255,0.04)",
  fontSize: 13,
},
tdCompact: {
  padding: "14px 14px",
  borderBottom: "1px solid rgba(255,255,255,0.05)",
  color: "#FFFFFF",
  verticalAlign: "middle",
  fontSize: 14,
  fontWeight: 600,
},
stockStatusBar: {
  position: "relative",
  width: 250,
  height: 30,
  borderRadius: 10,
  overflow: "hidden",
  display: "flex",
  alignItems: "center",
},

stockStatusFill: {
  position: "absolute",
  top: 0,
  left: 0,
  height: "100%",
  borderRadius: 10,
},

stockStatusText: {
  position: "relative",
  zIndex: 1,
  fontSize: 13,
  fontWeight: 800,
  paddingLeft: 12,
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
  statusPill: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 26,
    borderRadius: 999,
    padding: "0 10px",
    fontWeight: 800,
    fontSize: 12,
  },
  footerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginTop: 14,
    color: "#C7D0FF",
    fontSize: 13,
    flexWrap: "wrap",
  },
};
