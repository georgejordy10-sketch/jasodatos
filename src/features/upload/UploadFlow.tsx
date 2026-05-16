"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { listProfiles } from "@/core/profiles/registry";
import type { ProfileId } from "@/core/profiles/types";
import DashboardComercial from "@/features/dashboard/DashboardComercial";
import {
  readDatasetInitial,
  processDataset,
  type ReadDatasetInitialResult,
  type ProcessDatasetResult,
} from "@/core/ingestion/readDataset";
import type { ConfirmedMapping } from "@/core/mapping/types";
import {
  calculateDataQualityReport,
  type DataQualityReport,
} from "@/features/upload/dataQuality";
export default function UploadFlow() {
const UPLOAD_HISTORY_STORAGE_KEY = "jasodatos_upload_history_v1";
type ComparisonMode = "previous" | "day" | "week" | "month";
type UploadHistoryItem = {
  id: string;
  fileName: string;
  uploadedAt: string;
  totalRows: number;
  totalSales: number;
  totalUnits: number;
  productsCount: number;
  localsCount: number;
  channelsCount: number;
};

function toUploadNumber(value: unknown) {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function buildUploadHistoryItem(
  result: ProcessDatasetResult,
  fileName: string
): UploadHistoryItem {
  const rows = result.validRows ?? [];

  const products = new Set<string>();
  const locals = new Set<string>();
  const channels = new Set<string>();

  let totalSales = 0;
  let totalUnits = 0;

  for (const row of rows) {
    const producto = String(row.producto ?? "").trim();
    const sucursal = String(row.sucursal ?? "Local principal").trim();
    const canal = String(row.canal ?? "").trim();

    const cantidad = toUploadNumber(row.cantidad);
    const precio = toUploadNumber(row.precio_unitario);

    totalUnits += cantidad;
    totalSales += cantidad * precio;

    if (producto) products.add(producto);
    if (sucursal) locals.add(sucursal);
    if (canal) channels.add(canal);
  }

  return {
    id: `${Date.now()}-${fileName}`,
    fileName,
    uploadedAt: new Date().toISOString(),
    totalRows: rows.length,
    totalSales,
    totalUnits,
    productsCount: products.size,
    localsCount: locals.size,
    channelsCount: channels.size,
  };
}
  const profiles = useMemo(() => listProfiles(), []);
const profileId: ProfileId = "comercial";
  const [file, setFile] = useState<File | null>(null);
  const [hasDataConsent, setHasDataConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const [initialData, setInitialData] = useState<ReadDatasetInitialResult | null>(null);
  const [confirmedMappings, setConfirmedMappings] = useState<ConfirmedMapping[]>([]);
  const [processedData, setProcessedData] = useState<ProcessDatasetResult | null>(null);
const [uploadHistory, setUploadHistory] = useState<UploadHistoryItem[]>([]);
const [historyLoaded, setHistoryLoaded] = useState(false);
useEffect(() => {
  try {
    const saved = window.localStorage.getItem(UPLOAD_HISTORY_STORAGE_KEY);
    setUploadHistory(saved ? JSON.parse(saved) : []);
  } catch {
    setUploadHistory([]);
  } finally {
    setHistoryLoaded(true);
  }
}, []);
const [lastUploadComparison, setLastUploadComparison] = useState<{
  current: UploadHistoryItem;
  previous: UploadHistoryItem;
} | null>(null);
const [comparisonMode, setComparisonMode] = useState<ComparisonMode>("previous");
const selectedUploadComparison = useMemo<{
  current: UploadHistoryItem;
  previous: UploadHistoryItem;
} | null>(() => {
  if (!lastUploadComparison) return null;

  const previous = findComparisonReference(
    lastUploadComparison.current,
    uploadHistory,
    comparisonMode
  );

  if (!previous) return null;

  return {
    current: lastUploadComparison.current,
    previous,
  };
}, [comparisonMode, lastUploadComparison, uploadHistory]);
  const [qualityReport, setQualityReport] = useState<DataQualityReport | null>(null);
  const qualityTheme = qualityReport ? getQualitySummary(qualityReport) : null;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
const selectedProfile = profiles[0];
function formatColumnLabel(value: string) {
  const customLabels: Record<string, string> = {
    sku: "Código del producto",
    categoria: "Categoría del producto",
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

function normalizeColumnName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isOptionalCommercialColumn(columnName: string) {
  const normalizedColumn = normalizeColumnName(columnName);

  return ["bodega", "tipo de movimiento"].includes(normalizedColumn);
}

function formatConfidenceLabel(
  confidence: number | null | undefined,
  columnName = ""
) {
  if (isOptionalCommercialColumn(columnName)) {
    return "Campo opcional";
  }

  const value = Number(confidence ?? 0);

  if (value >= 0.9) return "Alta";
  if (value >= 0.6) return "Media";
  if (value > 0) return "Baja";

  return "Sin coincidencia";
}

function formatReasonLabel(
  reason: string | null | undefined,
  columnName = ""
) {
  if (isOptionalCommercialColumn(columnName)) {
    return "No requerido para el dashboard comercial actual.";
  }

  const normalizedReason = String(reason ?? "").trim().toLowerCase();

  if (normalizedReason.includes("coincidencia exacta")) {
    return "Coincidencia detectada automáticamente.";
  }

  if (normalizedReason.includes("sin coincidencia")) {
    return "Revisar manualmente.";
  }

  return reason || "Revisar manualmente.";
}
function getQualitySummary(report: DataQualityReport) {
  const base = {
    textColor: "#334155",
    headingColor: "#0f172a",
    mutedColor: "#64748b",
    chipBackground: "#f8fafc",
    chipBorder: "#e2e8f0",
    chipText: "#334155",
    cardBackground: "#ffffff",
  };

if (report.status === "good") {
  return {
    ...base,
    badge: "Listo para analizar",
    title: "Archivo listo para el análisis",
    message:
      "La estructura y calidad del archivo son adecuadas para generar el panel comercial.",
    recommendationTitle: "Recomendación",
    background: "linear-gradient(135deg, #f8faff 0%, #eef2ff 55%, #ede9fe 100%)",
    border: "#a5b4fc",
    statusColor: "#1e1b4b",
    accent: "#4f46e5",
    chipBackground: "#eef2ff",
    chipBorder: "#c7d2fe",
    chipText: "#3730a3",
    cardBackground: "#ffffff",
  };
}

if (report.status === "warning") {
  return {
    ...base,
    badge: "Observaciones menores",
    title: "Archivo apto para análisis",
    message:
      "El archivo puede procesarse. Hay algunos campos opcionales que no serán usados en esta versión del panel.",
    recommendationTitle: "Recomendación",
    background: "linear-gradient(135deg, #f8faff 0%, #f5f3ff 55%, #eef2ff 100%)",
    border: "#c4b5fd",
    statusColor: "#1e1b4b",
    accent: "#7c3aed",
    chipBackground: "#eef2ff",
    chipBorder: "#c7d2fe",
    chipText: "#3730a3",
    cardBackground: "#ffffff",
  };
}

  return {
    ...base,
    badge: "Corrección necesaria",
    title: "Archivo no apto para análisis completo",
    message:
      "Corrige los errores críticos antes de generar indicadores para evitar decisiones basadas en datos defectuosos.",
    recommendationTitle: "Recomendación",
    background: "linear-gradient(135deg, #fef2f2 0%, #fff1f2 100%)",
    border: "#fca5a5",
    statusColor: "#b91c1c",
    accent: "#ef4444",
  };
}
function buildQualityReport(
  rawRows: Record<string, unknown>[],
  columns: string[],
  mappings: ConfirmedMapping[]
) {
  return calculateDataQualityReport({
    rawRows,
    columns,
    mappings,
  });
}
function isManualMapping(
  sourceColumn: string,
  suggestedTargetField: string | null | undefined
) {
  const currentTargetField = getCurrentTargetField(sourceColumn);
  const originalTargetField = suggestedTargetField ?? "";

  if (!currentTargetField && !originalTargetField) {
    return false;
  }

  return currentTargetField !== originalTargetField;
}

  async function handleReadFile() {
    if (!file) {
      setError("Selecciona un archivo antes de continuar.");
      return;
    }
if (!hasDataConsent) {
  setError(
    "Confirma que tienes autorización para procesar este archivo antes de continuar."
  );
  return;
}
    setLoading(true);
    setError("");
    setProcessedData(null);

    try {
const result = await readDatasetInitial(file, profileId);
const initialQualityReport = buildQualityReport(
  result.rawRows,
  result.columns,
  result.suggestedMappings
);

setInitialData(result);
setConfirmedMappings(result.suggestedMappings);
setQualityReport(initialQualityReport);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo leer el archivo.");
      setInitialData(null);
      setConfirmedMappings([]);
      setQualityReport(null);
    } finally {
      setLoading(false);
    }
  }

function updateMapping(sourceColumn: string, targetField: string) {
  setConfirmedMappings((prev) => {
    const withoutCurrent = prev.filter((m) => m.sourceColumn !== sourceColumn);

    const nextMappings = targetField
      ? [
          ...withoutCurrent,
          {
            sourceColumn,
            targetField,
          },
        ]
      : withoutCurrent;

    if (initialData) {
      const nextQualityReport = buildQualityReport(
        initialData.rawRows,
        initialData.columns,
        nextMappings
      );

      setQualityReport(nextQualityReport);
    }

    return nextMappings;
  });
}
  function getCurrentTargetField(sourceColumn: string): string {
    return confirmedMappings.find((m) => m.sourceColumn === sourceColumn)?.targetField ?? "";
  }
 function openInventoryHelpWhatsapp() {
  const message =
    "Hola, quiero usar JasoDatos pero todavía no tengo mi inventario ordenado. ¿Me pueden ayudar a crear una base inicial para cargar mis productos?";

  const whatsappUrl = `https://wa.me/593997945350?text=${encodeURIComponent(
    message
  )}`;

  window.open(whatsappUrl, "_blank", "noopener,noreferrer");
} 
function getColumnExamples(sourceColumn: string) {
  if (!initialData?.rawRows?.length) return "-";

  const examples = initialData.rawRows
    .map((row) => row[sourceColumn])
    .filter(
      (value) =>
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ""
    )
    .slice(0, 3)
    .map((value) => String(value).trim());

  return examples.length > 0 ? examples.join(" · ") : "-";
}

function getMappingStatus(
  sourceColumn: string,
  suggestedTargetField: string | null | undefined,
  confidence: number | null | undefined
) {
  const currentTargetField = getCurrentTargetField(sourceColumn);

if (!currentTargetField) {
  return {
    label: "No necesario",
    style: {
      background: "#F1F5F9",
      color: "#475569",
      border: "1px solid #CBD5E1",
    },
  };
}

  if (isManualMapping(sourceColumn, suggestedTargetField)) {
    return {
      label: "Cambiado",
      style: {
        background: "#DBEAFE",
        color: "#1D4ED8",
        border: "1px solid #93C5FD",
      },
    };
  }

  const value = Number(confidence ?? 0);

  if (value >= 0.75) {
    return {
      label: "Listo",
      style: {
        background: "#DCFCE7",
        color: "#166534",
        border: "1px solid #86EFAC",
      },
    };
  }

  return {
    label: "Revisar",
    style: {
      background: "#FEF3C7",
      color: "#92400E",
      border: "1px solid #FCD34D",
    },
  };
}
function saveUploadHistory(item: UploadHistoryItem) {
  setUploadHistory((current) => {
    const next = [item, ...current].slice(0, 5);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        UPLOAD_HISTORY_STORAGE_KEY,
        JSON.stringify(next)
      );
    }

    return next;
  });
}
function clearUploadHistory() {
  try {
    window.localStorage.removeItem(UPLOAD_HISTORY_STORAGE_KEY);
  } catch {
    // No hacemos nada si el navegador bloquea localStorage.
  }

  setUploadHistory([]);
  setLastUploadComparison(null);
}
  function handleProcess() {
    if (!initialData) {
      setError("Primero debes leer el archivo.");
      return;
    }

setError("");

const currentQualityReport = buildQualityReport(
  initialData.rawRows,
  initialData.columns,
  confirmedMappings
);

setQualityReport(currentQualityReport);

if (currentQualityReport.status === "blocked") {
  setError(
    "El archivo no cumple la calidad mínima para generar el dashboard. Corrige los errores críticos o ajusta el mapeo de columnas."
  );
  return;
}

const result = processDataset(
  initialData.rawRows,
  initialData.profileId,
  confirmedMappings,
  initialData.fileName
);

const historyItem = buildUploadHistoryItem(result, initialData.fileName);
const previousUpload = uploadHistory[0] ?? null;

if (previousUpload) {
  setLastUploadComparison({
    current: historyItem,
    previous: previousUpload,
  });
} else {
  setLastUploadComparison(null);
}

saveUploadHistory(historyItem);

setProcessedData(result);
  }
function getComparisonModeLabel(mode: ComparisonMode) {
  const labels: Record<ComparisonMode, string> = {
    previous: "Carga anterior",
    day: "Día anterior",
    week: "Semana anterior",
    month: "Mes anterior",
  };

  return labels[mode];
}
function getComparisonUnavailableMessage(mode: ComparisonMode) {
  const messages: Record<ComparisonMode, string> = {
    previous:
      "Aún no hay una carga anterior disponible. Procesa al menos dos archivos para activar esta comparación.",
    day:
      "Para comparar contra el día anterior, carga al menos un archivo de una fecha previa.",
    week:
      "Para comparar contra la semana anterior, carga archivos en diferentes semanas o con varios días de diferencia.",
    month:
      "Para comparar contra el mes anterior, carga al menos un archivo de un mes previo.",
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

function findComparisonReference(
  current: UploadHistoryItem,
  history: UploadHistoryItem[],
  mode: ComparisonMode
) {
  const previousItems = history.filter((item) => item.id !== current.id);

  if (mode === "previous") {
    return previousItems[0] ?? null;
  }

  const currentDate = new Date(current.uploadedAt);

  if (mode === "day") {
    const targetDate = new Date(currentDate);
    targetDate.setDate(targetDate.getDate() - 1);

    return (
      previousItems.find((item) =>
        isSameDay(new Date(item.uploadedAt), targetDate)
      ) ?? null
    );
  }

  if (mode === "week") {
    const fromDate = new Date(currentDate);
    fromDate.setDate(fromDate.getDate() - 7);

    return (
      previousItems.find((item) => {
        const itemDate = new Date(item.uploadedAt);
        return itemDate >= fromDate && itemDate < currentDate;
      }) ?? null
    );
  }

  const previousMonth = new Date(currentDate);
  previousMonth.setMonth(previousMonth.getMonth() - 1);

  return (
    previousItems.find((item) => {
      const itemDate = new Date(item.uploadedAt);
      return (
        itemDate.getFullYear() === previousMonth.getFullYear() &&
        itemDate.getMonth() === previousMonth.getMonth()
      );
    }) ?? null
  );
}
function calculatePercentChange(current: number, previous: number) {
  if (previous === 0 && current === 0) return "0.0%";
  if (previous === 0) return "+100.0%";

  const change = ((current - previous) / previous) * 100;
  return `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`;
}
function resetFlow() {
  setFile(null);
  setLoading(false);
  setError("");
  setInitialData(null);
  setConfirmedMappings([]);
  setProcessedData(null);
  setQualityReport(null);
  setHasDataConsent(false);

  if (fileInputRef.current) {
    fileInputRef.current.value = "";
  }
}

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 16,
          display: "grid",
          gap: 12,
        }}
      >
      <h2 style={uploadTitleStyle}>Empecemos el análisis de tus datos</h2>

{!initialData ? (
  <div style={uploadHeroStyle}>
    <div style={uploadHeroTextStyle}>
<strong style={uploadHeroTitleStyle}>
  Sube tu archivo o solicita ayuda a JasoDatos para crearlo y organizarlo.
</strong>

      <p style={uploadHeroDescriptionStyle}>
        Selecciona un archivo CSV o Excel para que JasoDatos revise tus datos y
        prepare el análisis de tu negocio.
      </p>
    </div>

    <div style={uploadActionsStyle}>
      <label htmlFor="file" style={selectFileButtonStyle}>
        Tengo un archivo para subir
      </label>

      <button
        type="button"
        onClick={openInventoryHelpWhatsapp}
        style={inventoryHelpButtonStyle}
      >
        No tengo inventario, necesito ayuda
      </button>
    </div>

    <input
      ref={fileInputRef}
      id="file"
      type="file"
      accept=".csv,.xlsx,.xls"
      onChange={(e) => {
        const nextFile = e.target.files?.[0] ?? null;

        setFile(nextFile);
        setLoading(false);
        setError("");
        setInitialData(null);
        setConfirmedMappings([]);
        setProcessedData(null);
        setQualityReport(null);
        setHasDataConsent(false);
      }}
      style={{ display: "none" }}
    />

    {file ? (
      <div style={selectedFileStyle}>
        Archivo seleccionado: <strong>{file.name}</strong>
      </div>
    ) : (
      <div style={selectedFileMutedStyle}>
        Aún no has seleccionado un archivo.
      </div>
    )}
  </div>
) : null}

{!initialData ? (
  <>
    <label
      style={{
  display: "flex",
  alignItems: "flex-start",
  gap: 10,
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #c7d2fe",
  background: "linear-gradient(135deg, #f8faff 0%, #eef2ff 100%)",
  color: "#1e1b4b",
  fontSize: 14,
  lineHeight: 1.5,
  cursor: "pointer",
}}
>
  <input
    type="checkbox"
    checked={hasDataConsent}
    onChange={(e) => {
      setHasDataConsent(e.target.checked);
      setError("");
    }}
    style={{ marginTop: 3 }}
  />
<span>
  Confirmo que tengo autorización para procesar este archivo.{" "}
  <small style={{ color: "#475569" }}>
    Los resultados dependerán de la calidad y exactitud de los datos cargados.
  </small>{" "}
  <a
    href="/legal/privacidad"
    target="_blank"
    rel="noopener noreferrer"
    style={{
      color: "#1d4ed8",
      fontWeight: 700,
      textDecoration: "underline",
    }}
  >
    Ver política de privacidad
  </a>
</span>
</label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
<button
  type="button"
  onClick={handleReadFile}
  disabled={loading || !file || !hasDataConsent}
  style={{
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid #111827",
    background: loading || !file || !hasDataConsent ? "#9ca3af" : "#111827",
    color: "#ffffff",
    cursor: loading || !file || !hasDataConsent ? "not-allowed" : "pointer",
  }}
>
  {loading ? "Revisando..." : "Revisar archivo"}
</button>

          <button
            type="button"
            onClick={resetFlow}
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              background: "#ffffff",
              color: "#111827",
              cursor: "pointer",
            }}
          >
            Reiniciar
          </button>
</div>
  </>
) : null}

{error ? (
          <div
            style={{
              background: "#fef2f2",
              color: "#991b1b",
              border: "1px solid #fecaca",
              borderRadius: 10,
              padding: 12,
            }}
          >
            {error}
          </div>
        ) : null}
      </div>
      {historyLoaded && !processedData && uploadHistory.length > 0 ? (
  <div
    style={{
      border: "1px solid #dbeafe",
      borderRadius: 16,
      padding: 14,
      background: "linear-gradient(135deg, #f8faff 0%, #eef2ff 100%)",
      display: "grid",
      gap: 10,
    }}
  >
    <div style={{ display: "grid", gap: 2 }}>
      <strong style={{ color: "#1d4ed8", fontSize: 15 }}>
        Últimas cargas procesadas
      </strong>

      <p style={{ margin: 0, color: "#475569", fontSize: 12, lineHeight: 1.35 }}>
        Resumen local de tus últimos archivos analizados en este navegador.
      </p>
    </div>

    <div style={{ display: "grid", gap: 8 }}>
      {uploadHistory.slice(0, 3).map((item) => (
        <div
          key={item.id}
          style={{
            border: "1px solid #dbeafe",
            borderRadius: 12,
            padding: "10px 12px",
            background: "#ffffff",
            display: "grid",
            gap: 6,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "flex-start",
              flexWrap: "wrap",
            }}
          >
            <strong
              style={{
                color: "#0f172a",
                fontSize: 13,
                lineHeight: 1.2,
                maxWidth: 360,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={item.fileName}
            >
              {item.fileName}
            </strong>

            <span style={{ color: "#64748b", fontSize: 11, whiteSpace: "nowrap" }}>
              {new Date(item.uploadedAt).toLocaleString("es-EC")}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              color: "#334155",
              fontSize: 12,
              lineHeight: 1.3,
            }}
          >
            <span>
              <strong>{item.totalRows}</strong> registros
            </span>
            <span>
              <strong>
                {item.totalSales.toLocaleString("es-EC", {
                  style: "currency",
                  currency: "USD",
                })}
              </strong>{" "}
              ventas
            </span>
            <span>
              <strong>{item.totalUnits}</strong> unidades
            </span>
            <span>
              <strong>{item.productsCount}</strong> productos
            </span>
            <span>
              <strong>{item.localsCount}</strong> locales
            </span>
            <span>
              <strong>{item.channelsCount}</strong> medios
            </span>
          </div>
        </div>
      ))}
    </div>

    {uploadHistory.length > 3 ? (
      <span style={{ color: "#64748b", fontSize: 11 }}>
        Mostrando las 3 cargas más recientes de {uploadHistory.length} registradas.
      </span>
    ) : null}
    <button
  type="button"
  onClick={clearUploadHistory}
  style={clearHistoryButtonStyle}
>
  Limpiar historial local
</button>
  </div>
) : null}
      {initialData ? (
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 16,
            display: "grid",
            gap: 12,
          }}
        >
<h3 style={{ margin: 0, fontSize: 24, color: "#111827" }}>
  Revisa cómo JasoDatos entendió tu archivo
</h3>

<p style={{ margin: 0, color: "#475569", fontSize: 14 }}>
  JasoDatos detectó las columnas del archivo y sugirió a qué campo comercial corresponde cada una.
  Puedes ajustar manualmente cualquier asignación antes de procesar el archivo.
</p>
<div
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 10,
  }}
>
  <div style={infoCardStyle}>
    <span style={infoLabelStyle}>Archivo cargado</span>
    <strong style={infoValueStyle}>{initialData.fileName}</strong>
  </div>

  <div style={infoCardStyle}>
    <span style={infoLabelStyle}>Datos encontrados en tu archivo</span>
    <strong style={infoValueStyle}>{initialData.columns.length}</strong>
  </div>

  <div style={infoCardStyle}>
    <span style={infoLabelStyle}>Registros encontrados</span>
    <strong style={infoValueStyle}>{initialData.rawRows.length}</strong>
  </div>
</div>
{qualityReport ? (
  <div
    style={{
      background: qualityTheme?.background ?? "#ffffff",
      color: qualityTheme?.textColor ?? "#334155",
      border: `1px solid ${qualityTheme?.border ?? "#e2e8f0"}`,
      borderRadius: 18,
      padding: 18,
      display: "grid",
      gap: 16,
      boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
    }}
  >
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <div style={{ display: "grid", gap: 6 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            width: "fit-content",
            padding: "6px 12px",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.02em",
            background: "#ffffff",
            border: `1px solid ${qualityTheme?.border ?? "#e2e8f0"}`,
            color: qualityTheme?.statusColor ?? "#334155",
          }}
        >
          {qualityTheme?.badge}
        </div>

        <strong
          style={{
            fontSize: 28,
            lineHeight: 1.1,
            color: qualityTheme?.statusColor ?? "#0f172a",
          }}
        >
          {qualityTheme?.title}
        </strong>

        <span
          style={{
            fontSize: 15,
            color: qualityTheme?.textColor ?? "#334155",
          }}
        >
          {qualityTheme?.message}
        </span>

        <div
          style={{
            marginTop: 6,
            padding: "10px 12px",
            borderRadius: 12,
            background: "#ffffff",
            border: `1px solid ${qualityTheme?.border ?? "#e2e8f0"}`,
            color: qualityTheme?.textColor ?? "#334155",
            fontSize: 14,
            lineHeight: 1.5,
          }}
        >
<strong style={{ color: qualityTheme?.headingColor ?? "#0f172a" }}>
  Qué te sugerimos:
</strong>{" "}
          {qualityReport.recommendation}
        </div>
      </div>

      <div
        style={{
          minWidth: 160,
          borderRadius: 16,
          padding: "14px 16px",
          background: "#ffffff",
          border: `1px solid ${qualityTheme?.border ?? "#e2e8f0"}`,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 12, color: qualityTheme?.mutedColor ?? "#64748b" }}>
          Calidad del archivo
        </div>
        <div
          style={{
            fontSize: 34,
            fontWeight: 800,
            lineHeight: 1.1,
            color: qualityTheme?.accent ?? "#4f46e5",
          }}
        >
          {qualityReport.score}/100
        </div>
      </div>
    </div>

    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: 10,
      }}
    >
{[
  { label: "Registros encontrados", value: qualityReport.totalRows },
  { label: "Registros vacíos", value: qualityReport.emptyRows },
  { label: "Registros repetidos", value: qualityReport.duplicateRows },
  { label: "Datos reconocidos por JasoDatos", value: qualityReport.mappedColumns },
  {
    label: "Datos por revisar",
    value: qualityReport.unmappedColumns.length,
  },
].map((item) => (
        <div
          key={item.label}
          style={{
            background: "#ffffff",
            border: `1px solid ${qualityTheme?.border ?? "#e2e8f0"}`,
            borderRadius: 14,
            padding: 12,
            display: "grid",
            gap: 4,
          }}
        >
          <span
            style={{
              fontSize: 12,
              color: qualityTheme?.mutedColor ?? "#64748b",
            }}
          >
            {item.label}
          </span>
          <strong
            style={{
              fontSize: 24,
              lineHeight: 1.1,
              color: qualityTheme?.headingColor ?? "#0f172a",
            }}
          >
            {item.value}
          </strong>
        </div>
      ))}
    </div>

    {qualityReport.unmappedColumns.length > 0 ? (
      <div
        style={{
          background: "#ffffff",
          border: `1px dashed ${qualityTheme?.border ?? "#e2e8f0"}`,
          borderRadius: 14,
          padding: 12,
          display: "grid",
          gap: 8,
        }}
      >
        <strong style={{ color: qualityTheme?.headingColor ?? "#0f172a" }}>
          Datos que JasoDatos no reconoció automáticamente
        </strong>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {qualityReport.unmappedColumns.map((column) => (
            <span
              key={column}
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                background: qualityTheme?.chipBackground ?? "#f8fafc",
                border: `1px solid ${qualityTheme?.chipBorder ?? "#e2e8f0"}`,
                fontSize: 13,
                color: qualityTheme?.chipText ?? "#334155",
              }}
            >
              {formatColumnLabel(column)}
            </span>
          ))}
        </div>
      </div>
    ) : null}

    {qualityReport.issues.length > 0 ? (
      <div
        style={{
          background: "#ffffff",
          border: `1px solid ${qualityTheme?.border ?? "#e2e8f0"}`,
          borderRadius: 14,
          padding: 12,
          display: "grid",
          gap: 8,
        }}
      >
        <strong style={{ color: qualityTheme?.headingColor ?? "#0f172a" }}>
          Cosas que debes revisar antes de continuar
        </strong>

        <ul
          style={{
            margin: 0,
            paddingLeft: 18,
            color: qualityTheme?.textColor ?? "#334155",
          }}
        >
          {qualityReport.issues.slice(0, 8).map((issue, index) => (
            <li key={`${issue.type}-${index}`} style={{ marginBottom: 6 }}>
              {issue.message}
            </li>
          ))}
        </ul>
      </div>
    ) : null}
  </div>
) : null}
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 14,
              }}
            >
<thead>
  <tr>
    <th style={thStyle}>Dato encontrado</th>
    <th style={thStyle}>Usar como</th>
    <th style={thStyle}>Datos leídos de tu archivo</th>
    <th style={thStyle}>Seguridad</th>
    <th style={thStyle}>Estado</th>
  </tr>
</thead>
              <tbody>
{initialData.mappingCandidates.map((candidate) => {
  const currentTargetField = getCurrentTargetField(candidate.sourceColumn);

  const mappingStatus = getMappingStatus(
    candidate.sourceColumn,
    candidate.targetField,
    candidate.confidence
  );

  return (
    <tr key={candidate.sourceColumn}>
      <td style={tdStyle}>
        <strong style={{ color: "#0f172a" }}>
          {formatColumnLabel(candidate.sourceColumn)}
        </strong>
      </td>

      <td style={tdStyle}>
        <select
          value={currentTargetField}
          onChange={(e) =>
            updateMapping(candidate.sourceColumn, e.target.value)
          }
          style={{
            width: "100%",
            padding: 8,
            borderRadius: 8,
            border: "1px solid #d1d5db",
          }}
        >
          <option value="">No necesario para el análisis</option>
          {selectedProfile.fields.map((field) => (
            <option key={field.key} value={field.key}>
              {field.label}
            </option>
          ))}
        </select>
      </td>

      <td style={tdStyle}>
        <span style={{ color: "#475569", fontSize: 13 }}>
          {getColumnExamples(candidate.sourceColumn)}
        </span>
      </td>

      <td style={tdStyle}>
        {isManualMapping(candidate.sourceColumn, candidate.targetField)
          ? "Cambiado por ti"
          : formatConfidenceLabel(
              candidate.confidence,
              candidate.sourceColumn
            )}
      </td>

      <td style={tdStyle}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            width: "fit-content",
            padding: "5px 9px",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 800,
            ...mappingStatus.style,
          }}
title={
  mappingStatus.label === "No necesario"
    ? "Esta columna quedará fuera del dashboard porque no es necesaria para el análisis principal."
    : isManualMapping(candidate.sourceColumn, candidate.targetField)
    ? "Tú cambiaste cómo JasoDatos debe leer este dato."
    : formatReasonLabel(candidate.reason, candidate.sourceColumn)
}
        >
          {mappingStatus.label}
        </span>
      </td>
    </tr>
  );
})}
              </tbody>
            </table>
          </div>
{qualityReport && !processedData ? (
  <div style={analysisResultCompactStyle}>
    <div>
      <strong style={analysisResultTitleStyle}>Archivo validado</strong>
      <p style={analysisResultTextStyle}>
        JasoDatos revisó la estructura del archivo y preparó los datos para generar el dashboard.
      </p>
    </div>

    <div style={analysisResultBadgesStyle}>
      <span style={analysisResultBadgeStyle}>
        {qualityReport.totalRows} filas válidas
      </span>

      <span style={analysisResultBadgeStyle}>0 errores</span>

      <span style={analysisResultBadgeStyle}>
        {qualityReport.unmappedColumns.length > 0
          ? `${qualityReport.unmappedColumns.length} columnas no usadas: ${qualityReport.unmappedColumns
              .map((column) => formatColumnLabel(column))
              .join(", ")}`
          : "Columnas completas"}
      </span>
    </div>

    <div style={processActionsStyle}>
      {qualityReport.status === "blocked" ? (
        <button
          type="button"
          onClick={resetFlow}
          style={{
            padding: "12px 18px",
            borderRadius: 12,
            border: "1px solid #cbd5e1",
            background: "#ffffff",
            color: "#0f172a",
            cursor: "pointer",
            fontWeight: 800,
          }}
        >
          Subir otro archivo
        </button>
      ) : null}

      <button
        type="button"
        onClick={handleProcess}
        disabled={qualityReport.status === "blocked"}
        style={{
          padding: "12px 18px",
          borderRadius: 12,
          border: "1px solid transparent",
          background:
            qualityReport.status === "blocked"
              ? "#9ca3af"
              : "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
          color: "#ffffff",
          cursor: qualityReport.status === "blocked" ? "not-allowed" : "pointer",
          fontWeight: 800,
          boxShadow:
            qualityReport.status === "blocked"
              ? "none"
              : "0 10px 24px rgba(79, 70, 229, 0.22)",
        }}
      >
        {qualityReport.status === "blocked"
          ? "Corrige el archivo para continuar"
          : "Crear dashboard"}
      </button>
    </div>
  </div>
) : null}
        </div>
      ) : null}

      {processedData ? (
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 16,
            display: "grid",
            gap: 12,
          }}
        >
          {processedData.rowIssues.length > 0 ? (
            <div style={analysisWarningStyle}>
              Se detectaron errores en {processedData.rowIssues.length} filas. Puedes revisar el archivo o continuar solo con las filas válidas.
            </div>
          ) : null}

          {lastUploadComparison ? (
            <div style={historyComparisonSectionStyle}>
              <div style={historyComparisonHeaderStyle}>
                <h3 style={historyComparisonTitleStyle}>
                  Comparación rápida con la carga anterior
                </h3>

                <p style={historyComparisonSubtitleStyle}>
                  Lectura comparativa local basada en el último archivo procesado en este navegador.
                </p>
                {selectedUploadComparison ? (
  <div style={historyComparisonReferenceStyle}>
    Comparando contra:{" "}
    <strong>{selectedUploadComparison.previous.fileName}</strong>
    {" · "}
    {new Date(selectedUploadComparison.previous.uploadedAt).toLocaleString("es-EC")}
  </div>
) : null}
                <div style={historyComparisonModeStyle}>
                  <span style={historyComparisonModeLabelStyle}>Comparar con:</span>

                  {(["previous", "day", "week", "month"] as ComparisonMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setComparisonMode(mode)}
                      style={{
                        ...historyComparisonModeButtonStyle,
                        ...(comparisonMode === mode
                          ? historyComparisonModeButtonActiveStyle
                          : null),
                      }}
                    >
                      {getComparisonModeLabel(mode)}
                    </button>
                  ))}
                </div>
              </div>

              {selectedUploadComparison ? (
                <div style={historyComparisonGridStyle}>
                  <div style={historyComparisonCardStyle}>
                    <span style={historyComparisonLabelStyle}>Ventas</span>
                    <strong style={historyComparisonValueStyle}>
                      {calculatePercentChange(
                        selectedUploadComparison.current.totalSales,
                        selectedUploadComparison.previous.totalSales
                      )}
                    </strong>
                    <span style={historyComparisonFootStyle}>
                      Actual:{" "}
                      {selectedUploadComparison.current.totalSales.toLocaleString("es-EC", {
                        style: "currency",
                        currency: "USD",
                      })}
                    </span>
                  </div>

                  <div style={historyComparisonCardStyle}>
                    <span style={historyComparisonLabelStyle}>Unidades</span>
                    <strong style={historyComparisonValueStyle}>
                      {calculatePercentChange(
                        selectedUploadComparison.current.totalUnits,
                        selectedUploadComparison.previous.totalUnits
                      )}
                    </strong>
                    <span style={historyComparisonFootStyle}>
                      Actual: {selectedUploadComparison.current.totalUnits}
                    </span>
                  </div>

                  <div style={historyComparisonCardStyle}>
                    <span style={historyComparisonLabelStyle}>Productos</span>
                    <strong style={historyComparisonValueStyle}>
                      {selectedUploadComparison.current.productsCount -
                        selectedUploadComparison.previous.productsCount >=
                      0
                        ? "+"
                        : ""}
                      {selectedUploadComparison.current.productsCount -
                        selectedUploadComparison.previous.productsCount}
                    </strong>
                    <span style={historyComparisonFootStyle}>
                      Actual: {selectedUploadComparison.current.productsCount}
                    </span>
                  </div>

                  <div style={historyComparisonCardStyle}>
                    <span style={historyComparisonLabelStyle}>Locales</span>
                    <strong style={historyComparisonValueStyle}>
                      {selectedUploadComparison.current.localsCount -
                        selectedUploadComparison.previous.localsCount >=
                      0
                        ? "+"
                        : ""}
                      {selectedUploadComparison.current.localsCount -
                        selectedUploadComparison.previous.localsCount}
                    </strong>
                    <span style={historyComparisonFootStyle}>
                      Actual: {selectedUploadComparison.current.localsCount}
                    </span>
                  </div>
                </div>
              ) : (
                 <div style={historyComparisonEmptyStyle}>
  {getComparisonUnavailableMessage(comparisonMode)}
</div>
              )}
            </div>
          ) : null}

          {processedData.analytics && processedData.profileId === "comercial" ? (
            <DashboardComercial
              processedData={processedData}
              onClearFile={resetFlow}
              onSelectAnotherFile={resetFlow}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  borderBottom: "1px solid #e5e7eb",
  background: "#f9fafb",
};

const tdStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderBottom: "1px solid #e5e7eb",
  verticalAlign: "top",
};
const infoCardStyle: React.CSSProperties = {
  display: "grid",
  gap: 4,
  border: "1px solid #dbeafe",
  borderRadius: 14,
  padding: 12,
  background: "linear-gradient(135deg, #ffffff 0%, #f8faff 100%)",
};
const inventoryHelpCardStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
  flexWrap: "wrap",
  padding: 18,
  borderRadius: 18,
  border: "1px solid #bfdbfe",
  background: "linear-gradient(135deg, #eff6ff 0%, #eef2ff 100%)",
  boxShadow: "0 12px 30px rgba(37, 99, 235, 0.10)",
};

const inventoryHelpTitleStyle: React.CSSProperties = {
  color: "#172554",
  fontSize: 18,
  fontWeight: 900,
  lineHeight: 1.15,
};

const inventoryHelpTextStyle: React.CSSProperties = {
  margin: 0,
  color: "#334155",
  fontSize: 14,
  fontWeight: 600,
  lineHeight: 1.5,
  maxWidth: 720,
};

const inventoryHelpButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 44,
  border: 0,
  borderRadius: 14,
  padding: "0 18px",
  background: "linear-gradient(135deg, #16A34A 0%, #22C55E 100%)",
  color: "#ffffff",
  fontSize: 14,
  fontWeight: 900,
  cursor: "pointer",
  boxShadow: "0 12px 28px rgba(22, 163, 74, 0.22)",
  whiteSpace: "nowrap",
};
const infoLabelStyle: React.CSSProperties = {
  color: "#64748b",
  fontSize: 12,
};

const infoValueStyle: React.CSSProperties = {
  color: "#0f172a",
  fontSize: 15,
  overflowWrap: "anywhere",
  };

const uploadTitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#1d4ed8",
  fontSize: 46,
  fontWeight: 900,
  lineHeight: 1.1,
};

const uploadHeroStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: 16,
  alignItems: "center",
  padding: 18,
  borderRadius: 20,
  border: "1px solid #bfdbfe",
  background: "linear-gradient(135deg, #eff6ff 0%, #eef2ff 55%, #f8fafc 100%)",
  boxShadow: "0 14px 36px rgba(37, 99, 235, 0.10)",
};

const uploadHeroTextStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
};

const uploadHeroTitleStyle: React.CSSProperties = {
  color: "#1d4ed8",
  fontSize: 19,
  fontWeight: 900,
  lineHeight: 1.15,
};

const uploadHeroDescriptionStyle: React.CSSProperties = {
  margin: 0,
  color: "#334155",
  fontSize: 14,
  fontWeight: 600,
  lineHeight: 1.45,
  maxWidth: 760,
};

const uploadActionsStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 10,
  flexWrap: "wrap",
};

const selectFileButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 44,
  borderRadius: 14,
  padding: "0 18px",
  background: "linear-gradient(135deg, #2563EB 0%, #4F46E5 100%)",
  color: "#ffffff",
  fontSize: 14,
  fontWeight: 900,
  cursor: "pointer",
  boxShadow: "0 12px 28px rgba(37, 99, 235, 0.24)",
  border: "1px solid rgba(255,255,255,0.20)",
};

const selectedFileStyle: React.CSSProperties = {
  gridColumn: "1 / -1",
  padding: "10px 12px",
  borderRadius: 14,
  background: "#ffffff",
  border: "1px solid #dbeafe",
  color: "#1e293b",
  fontSize: 13,
  fontWeight: 650,
};

const selectedFileMutedStyle: React.CSSProperties = {
  gridColumn: "1 / -1",
  padding: "10px 12px",
  borderRadius: 14,
  background: "rgba(255,255,255,0.70)",
  border: "1px dashed #bfdbfe",
  color: "#64748b",
  fontSize: 13,
  fontWeight: 650,
};
const historyMetricLabelStyle: React.CSSProperties = {
  color: "#64748b",
  fontSize: 12,
  fontWeight: 700,
};

const historyMetricValueStyle: React.CSSProperties = {
  color: "#0f172a",
  fontSize: 22,
  fontWeight: 900,
};

const historyComparisonSectionStyle: React.CSSProperties = {
  display: "grid",
  gap: 10,
  margin: "12px 12px 4px",
};

const historyComparisonHeaderStyle: React.CSSProperties = {
  display: "grid",
  gap: 2,
};

const historyComparisonTitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#1D4ED8",
  fontSize: 30,
  fontWeight: 900,
  lineHeight: 1.15,
  letterSpacing: "-0.02em",
};
const historyComparisonSubtitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#475569",
  fontSize: 13,
  lineHeight: 1.35,
};
const historyComparisonReferenceStyle: React.CSSProperties = {
  color: "#334155",
  fontSize: 12,
  fontWeight: 600,
  lineHeight: 1.35,
  background: "#ffffff",
  border: "1px solid #dbeafe",
  borderRadius: 999,
  padding: "6px 10px",
  width: "fit-content",
  maxWidth: "100%",
};
const historyComparisonGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 180px))",
  gap: 8,
  justifyContent: "start",
};

const historyComparisonCardStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #202969 0%, #2B2F86 100%)",
  color: "#FFFFFF",
  borderRadius: 12,
  padding: "10px 12px",
  border: "1px solid rgba(255,255,255,0.12)",
  boxShadow: "0 6px 14px rgba(17,24,39,0.10)",
  display: "grid",
  gap: 4,
  minHeight: 70,
};
const historyComparisonLabelStyle: React.CSSProperties = {
  color: "#D3DAFF",
  fontSize: 11,
  fontWeight: 700,
};

const historyComparisonValueStyle: React.CSSProperties = {
  color: "#FFFFFF",
  fontSize: 18,
  fontWeight: 800,
  lineHeight: 1,
};

const historyComparisonFootStyle: React.CSSProperties = {
  color: "#C0C9FF",
  fontSize: 11,
  fontWeight: 600,
};
const historyComparisonModeStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
  marginTop: 4,
};

const historyComparisonModeLabelStyle: React.CSSProperties = {
  color: "#475569",
  fontSize: 12,
  fontWeight: 700,
};

const historyComparisonModeButtonStyle: React.CSSProperties = {
  border: "1px solid #c7d2fe",
  background: "#ffffff",
  color: "#334155",
  borderRadius: 999,
  padding: "6px 10px",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
};

const historyComparisonModeButtonActiveStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
  color: "#ffffff",
  border: "1px solid transparent",
};

const historyComparisonEmptyStyle: React.CSSProperties = {
  border: "1px dashed #c7d2fe",
  borderRadius: 12,
  padding: 12,
  color: "#475569",
  background: "#f8faff",
  fontSize: 13,
  fontWeight: 600,
};

const analysisResultCompactStyle: React.CSSProperties = {
  border: "1px solid #dbeafe",
  borderRadius: 16,
  padding: 14,
  background: "linear-gradient(135deg, #f8faff 0%, #eef2ff 100%)",
  display: "grid",
  gap: 10,
};

const analysisResultTitleStyle: React.CSSProperties = {
  display: "block",
  color: "#1d4ed8",
  fontSize: 16,
  fontWeight: 800,
  lineHeight: 1.2,
};

const analysisResultTextStyle: React.CSSProperties = {
  margin: "4px 0 0",
  color: "#475569",
  fontSize: 13,
  lineHeight: 1.35,
};

const analysisResultBadgesStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  alignItems: "center",
};

const analysisResultBadgeStyle: React.CSSProperties = {
  border: "1px solid #bfdbfe",
  background: "#ffffff",
  color: "#1e3a8a",
  borderRadius: 999,
  padding: "6px 10px",
  fontSize: 12,
  fontWeight: 800,
  whiteSpace: "normal",
};
const processActionsStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-start",
  gap: 10,
  flexWrap: "wrap",
  paddingTop: 4,
};
const analysisWarningStyle: React.CSSProperties = {
  background: "#fff7ed",
  color: "#9a3412",
  border: "1px solid #fed7aa",
  borderRadius: 12,
  padding: 12,
  fontSize: 13,
  fontWeight: 600,
};
const clearHistoryButtonStyle: React.CSSProperties = {
  width: "fit-content",
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#334155",
  borderRadius: 999,
  padding: "7px 12px",
  fontSize: 12,
  fontWeight: 800,
  cursor: "pointer",
};