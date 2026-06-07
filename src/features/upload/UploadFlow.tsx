"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { listProfiles } from "@/core/profiles/registry";
import type { ProfileId } from "@/core/profiles/types";
import DashboardComercial from "@/features/dashboard/DashboardComercial";
import { AppShell } from "@/features/layout/AppShell";
import {
  UPLOAD_HISTORY_STORAGE_KEY,
  buildUploadHistoryItem,
  calculatePercentChange,
  findComparisonReference,
  getComparisonModeLabel,
  getComparisonUnavailableMessage,
  getUploadDateLabel,
} from "./uploadHistory";
import type { ComparisonMode, UploadHistoryItem } from "./uploadHistory";
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

function toUploadNumber(value: unknown) {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
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
  const [activeUploadView, setActiveUploadView] = useState("general");
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
useEffect(() => {
  function readUploadViewFromHash() {
    const hash = window.location.hash.replace("#", "");

if (
  hash === "resumen" ||
  hash === "acciones" ||
  hash === "ventas" ||
  hash === "inventario" ||
  hash === "productos" ||
  hash === "alertas" ||
  hash === "reportes" ||
  hash === "comparativo" ||
  hash === "configuracion"
) {
  setActiveUploadView(hash);
  return;
}

    setActiveUploadView("general");
  }

  readUploadViewFromHash();

  window.addEventListener("hashchange", readUploadViewFromHash);
  return () => window.removeEventListener("hashchange", readUploadViewFromHash);
}, []);
const isUploadGeneralView = activeUploadView === "general";
const isUploadComparativoView = activeUploadView === "comparativo";
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

setActiveUploadView("general");

if (typeof window !== "undefined") {
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}${window.location.search}`
  );
}

setProcessedData(result);
  }

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
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

const qualityScoreTone =
  qualityReport && qualityReport.score >= 90
    ? {
        background: "rgba(34, 197, 94, 0.18)",
        border: "1px solid rgba(134, 239, 172, 0.72)",
        color: "#86EFAC",
      }
    : qualityReport && qualityReport.score >= 70
    ? {
        background: "rgba(245, 158, 11, 0.18)",
        border: "1px solid rgba(253, 186, 116, 0.72)",
        color: "#FDBA74",
      }
    : {
        background: "rgba(239, 68, 68, 0.18)",
        border: "1px solid rgba(252, 165, 165, 0.72)",
        color: "#FCA5A5",
      };

return (
  <div style={{ display: "grid", gap: processedData ? 0 : 16 }}>
    <div
      style={{
        border: processedData ? 0 : "1px solid rgba(255,255,255,0.42)",
        borderRadius: processedData ? 0 : 18,
        padding: processedData ? 0 : 18,
        background: processedData
          ? "transparent"
          : "linear-gradient(135deg, #283593 0%, #27308A 52%, #252C7D 100%)",
        display: "grid",
        gap: processedData ? 0 : 14,
        boxShadow: processedData
          ? "none"
          : "inset 0 1px 0 rgba(255,255,255,0.10), 0 0 10px rgba(56,189,248,0.04)",
      }}
    >
      {!processedData ? (
  <h1 className="jd-upload-main-title" style={uploadTitleStyle}>
    Empecemos el análisis de tus datos
  </h1>
) : null}

{!initialData ? (
  <div className="jd-upload-hero"
style={uploadHeroStyle}>
    <div style={uploadHeroTextStyle}>
<strong style={uploadHeroTitleStyle}>
  Sube tu archivo o solicita ayuda a JasoDatos para crearlo y organizarlo.
</strong>

      <p style={uploadHeroDescriptionStyle}>
        Selecciona un archivo CSV o Excel para que JasoDatos revise tus datos y
        prepare el análisis de tu negocio.
      </p>
    </div>

    <div className="jd-upload-actions"
style={uploadActionsStyle}>
      <label
  htmlFor="file"
  className="jd-upload-primary-action"
  style={selectFileButtonStyle}
>
        Tengo un archivo para subir
      </label>

      <button
        type="button"
        onClick={openInventoryHelpWhatsapp}
        className="jd-upload-secondary-action"
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
  border: "1px solid rgba(255,255,255,0.42)",
  background: "rgba(255,255,255,0.08)",
  color: "#FFFFFF",
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
  <small style={{ color: "rgba(255,255,255,0.72)" }}>
    Los resultados dependerán de la calidad y exactitud de los datos cargados.
  </small>{" "}
  <a
    href="/legal/privacidad"
    target="_blank"
    rel="noopener noreferrer"
    style={{
      color: "#FFFFFF",
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
    border: "1px solid rgba(255,255,255,0.72)",
    background: loading || !file || !hasDataConsent ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.10)",
    color: "#FFFFFF",
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
              border: "1px solid rgba(255,255,255,0.72)",
              background: "rgba(255,255,255,0.08)",
              color: "#FFFFFF",
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
            border: "1px solid rgba(255,255,255,0.42)",
            borderRadius: 18,
            padding: 18,
            background:
              "linear-gradient(135deg, #283593 0%, #27308A 52%, #252C7D 100%)",
            display: "grid",
            gap: 14,
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.10), 0 0 10px rgba(56,189,248,0.04)",
          }}
        >
          <div style={{ display: "grid", gap: 2 }}>
            <strong
              style={{
                color: "#FFFFFF",
                fontSize: 20,
                fontWeight: 800,
                letterSpacing: "-0.01em",
              }}
            >
              Últimas cargas procesadas
            </strong>

            <p
              style={{
                margin: 0,
                color: "rgba(255,255,255,0.78)",
                fontSize: 13,
                lineHeight: 1.4,
              }}
            >
              Resumen local de tus últimos archivos analizados en este navegador.
            </p>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            {uploadHistory.slice(0, 3).map((item) => (
              <div
                key={item.id}
                style={{
                  border: "1px solid rgba(255,255,255,0.18)",
                  borderRadius: 14,
                  padding: "10px 12px",
                  background: "rgba(255,255,255,0.08)",
                  display: "grid",
                  gap: 6,
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
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
                      color: "#FFFFFF",
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

                  <span style={{ color: "rgba(255,255,255,0.72)", fontSize: 11 }}>
                    {getUploadDateLabel(item.uploadedAt)} ·{" "}
                    {new Date(item.uploadedAt).toLocaleString("es-EC")}
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                    color: "rgba(255,255,255,0.82)",
                    fontSize: 12,
                    lineHeight: 1.3,
                  }}
                >
                  <span>
                    <strong style={{ color: "#FFFFFF" }}>{item.totalRows}</strong>{" "}
                    registros
                  </span>
                  <span>
                    <strong style={{ color: "#FFFFFF" }}>
                      {item.totalSales.toLocaleString("es-EC", {
                        style: "currency",
                        currency: "USD",
                      })}
                    </strong>{" "}
                    ventas
                  </span>
                  <span>
                    <strong style={{ color: "#FFFFFF" }}>{item.totalUnits}</strong>{" "}
                    unidades
                  </span>
                  <span>
                    <strong style={{ color: "#FFFFFF" }}>{item.productsCount}</strong>{" "}
                    productos
                  </span>
                  <span>
                    <strong style={{ color: "#FFFFFF" }}>{item.localsCount}</strong>{" "}
                    locales
                  </span>
                  <span>
                    <strong style={{ color: "#FFFFFF" }}>{item.channelsCount}</strong>{" "}
                    medios
                  </span>
                </div>
              </div>
            ))}
          </div>

          {uploadHistory.length > 3 ? (
            <span style={{ color: "rgba(255,255,255,0.72)", fontSize: 11 }}>
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
      {initialData && !processedData ? (
        <div
          style={{
            border: "1px solid rgba(255,255,255,0.42)",
            borderRadius: 18,
            padding: 18,
            background:
              "linear-gradient(135deg, #283593 0%, #27308A 52%, #252C7D 100%)",
            display: "grid",
            gap: 14,
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.10), 0 0 10px rgba(56,189,248,0.04)",
          }}
        >
<h3 style={{ margin: 0, fontSize: 24, color: "#FFFFFF", fontWeight: 800, letterSpacing: "-0.02em" }}>
  Revisa cómo JasoDatos entendió tu archivo
</h3>

<p style={{ margin: 0, color: "rgba(255,255,255,0.78)", fontSize: 14, lineHeight: 1.45 }}>
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
      background: "rgba(255,255,255,0.08)",
      color: "#FFFFFF",
      border: "1px solid rgba(255,255,255,0.18)",
      borderRadius: 18,
      padding: 18,
      display: "grid",
      gap: 16,
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
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
            background: "rgba(255,255,255,0.10)",
            border: "1px solid rgba(255,255,255,0.72)",
            color: "#FFFFFF",
          }}
        >
          {qualityTheme?.badge}
        </div>

        <strong
          style={{
            fontSize: 28,
            lineHeight: 1.1,
            color: "#FFFFFF",
          }}
        >
          {qualityTheme?.title}
        </strong>

        <span
          style={{
            fontSize: 15,
            color: "rgba(255,255,255,0.78)",
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
    color: "#1D4ED8",
    fontSize: 14,
    lineHeight: 1.5,
  }}
>
  <strong style={{ color: "#1D4ED8" }}>
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
          background: qualityScoreTone.background,
          border: qualityScoreTone.border,
          textAlign: "center",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10)",
        }}
      >
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.78)", fontWeight: 500 }}>
          Calidad del archivo
        </div>
        <div
          style={{
            fontSize: 34,
            fontWeight: 800,
            lineHeight: 1.1,
            color: qualityScoreTone.color,
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
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.18)",
            borderRadius: 14,
            padding: 12,
            display: "grid",
            gap: 4,
          }}
        >
          <span
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.72)",
            }}
          >
            {item.label}
          </span>
          <strong
            style={{
              fontSize: 24,
              lineHeight: 1.1,
              color: "#FFFFFF",
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
          background: "rgba(255,255,255,0.08)",
          border: "1px dashed rgba(255,255,255,0.42)",
          borderRadius: 14,
          padding: 12,
          display: "grid",
          gap: 8,
        }}
      >
<strong style={{ color: "#FFFFFF" }}>
  Datos que JasoDatos no reconoció automáticamente
</strong>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {qualityReport.unmappedColumns.map((column) => (
            <span
              key={column}
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.10)",
                border: "1px solid rgba(255,255,255,0.42)",
                fontSize: 13,
                color: "#FFFFFF",
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
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.18)",
          borderRadius: 14,
          padding: 12,
          display: "grid",
          gap: 8,
        }}
      >
<strong style={{ color: "#FFFFFF" }}>
  Cosas que debes revisar antes de continuar
</strong>

        <ul
          style={{
            margin: 0,
            paddingLeft: 18,
            color: "rgba(255,255,255,0.78)",
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
<div
  style={{
    overflowX: "auto",
    maxWidth: "100%",
    WebkitOverflowScrolling: "touch",
  }}
>
  <table
    style={{
      width: "100%",
      minWidth: 760,
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
        <strong style={{ color: "#FFFFFF" }}>
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
  minWidth: 150,
  padding: 8,
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.42)",
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
        <span style={{ color: "rgba(255,255,255,0.72)", fontSize: 13 }}>
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
  <div style={dashboardLayerStyle}>
          {processedData.rowIssues.length > 0 ? (
            <div style={analysisWarningStyle}>
              Se detectaron errores en {processedData.rowIssues.length} filas. Puedes revisar el archivo o continuar solo con las filas válidas.
            </div>
          ) : null}
        {processedData.analytics && processedData.profileId === "comercial" ? (
<AppShell
  businessName="Panel comercial"
  periodLabel="Carga y análisis"
  planName="Análisis comercial"
  planStatus="active"
  showPlanBanner={false}
>
  {(isUploadGeneralView || isUploadComparativoView) && lastUploadComparison ? (
  <div style={historyComparisonOuterStyle}>
  <div id="comparativo" style={historyComparisonSectionStyle}>
              <div style={historyComparisonHeaderStyle}>
                <h3 style={historyComparisonTitleStyle}>
  Comparativo rápido
</h3>
                <p style={historyComparisonSubtitleStyle}>
                  Comparación local con cargas anteriores de este navegador.
                </p>
                {selectedUploadComparison ? (
  <div style={historyComparisonReferenceStyle}>
    Comparando contra:{" "}
   <span style={{ fontWeight: 500 }}>
  {selectedUploadComparison.previous.fileName}
</span>
    {" · "}
    {new Date(selectedUploadComparison.previous.uploadedAt).toLocaleString("es-EC")}
  </div>
) : null}
                <div style={historyComparisonModeStyle}>
                  <span style={historyComparisonModeLabelStyle}>Comparar con:</span>

                  {(["previous", "day", "week", "month", "year"] as ComparisonMode[]).map((mode) => (
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
            </div>
          ) : null}

{!isUploadComparativoView ? (
  <DashboardComercial
    processedData={processedData}
    onClearFile={resetFlow}
    onSelectAnotherFile={resetFlow}
  />
) : null}
  </AppShell>
) : null}
        </div>
      ) : null}
    </div>
  );
}

const thStyle: CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  borderBottom: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(255,255,255,0.10)",
  color: "#FFFFFF",
};

const tdStyle: CSSProperties = {
  padding: "10px 12px",
  borderBottom: "1px solid rgba(255,255,255,0.14)",
  verticalAlign: "top",
  color: "#FFFFFF",
};
const infoCardStyle: CSSProperties = {
  display: "grid",
  gap: 4,
  border: "1px solid rgba(255,255,255,0.18)",
  borderRadius: 14,
  padding: 12,
  background: "rgba(255,255,255,0.08)",
  color: "#FFFFFF",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
};
const inventoryHelpCardStyle: CSSProperties = {
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

const inventoryHelpTitleStyle: CSSProperties = {
  color: "#172554",
  fontSize: 18,
  fontWeight: 900,
  lineHeight: 1.15,
};

const inventoryHelpTextStyle: CSSProperties = {
  margin: 0,
  color: "#334155",
  fontSize: 14,
  fontWeight: 600,
  lineHeight: 1.5,
  maxWidth: 720,
};

const inventoryHelpButtonStyle: CSSProperties = {
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
const infoLabelStyle: CSSProperties = {
  color: "rgba(255,255,255,0.72)",
  fontSize: 12,
};

const infoValueStyle: CSSProperties = {
  color: "#FFFFFF",
  fontSize: 15,
  overflowWrap: "anywhere",
};

const uploadTitleStyle: CSSProperties = {
  margin: 0,
  color: "#FFFFFF",
  fontSize: 40,
  fontWeight: 900,
  lineHeight: 1.1,
};

const uploadHeroStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: 16,
  alignItems: "center",
  padding: 18,
  borderRadius: 20,
  border: "1px solid rgba(255,255,255,0.42)",
  background: "rgba(255,255,255,0.08)",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.08), 0 0 10px rgba(56,189,248,0.04)",
};

const uploadHeroTextStyle: CSSProperties = {
  display: "grid",
  gap: 6,
};

const uploadHeroTitleStyle: CSSProperties = {
  color: "#FFFFFF",
  fontSize: 19,
  fontWeight: 800,
  lineHeight: 1.15,
};

const uploadHeroDescriptionStyle: CSSProperties = {
  margin: 0,
  color: "rgba(255,255,255,0.82)",
  fontSize: 14,
  fontWeight: 500,
  lineHeight: 1.45,
  maxWidth: 760,
};

const uploadActionsStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 10,
  flexWrap: "wrap",
};

const selectFileButtonStyle: CSSProperties = {
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

const selectedFileStyle: CSSProperties = {
  gridColumn: "1 / -1",
  padding: "10px 12px",
  borderRadius: 14,
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.42)",
  color: "#FFFFFF",
  fontSize: 13,
  fontWeight: 600,
};

const selectedFileMutedStyle: CSSProperties = {
  gridColumn: "1 / -1",
  padding: "10px 12px",
  borderRadius: 14,
  background: "rgba(255,255,255,0.07)",
  border: "1px dashed rgba(255,255,255,0.42)",
  color: "rgba(255,255,255,0.82)",
  fontSize: 13,
  fontWeight: 500,
};
const historyMetricLabelStyle: CSSProperties = {
  color: "#64748b",
  fontSize: 12,
  fontWeight: 700,
};
const historyMetricValueStyle: CSSProperties = {
  color: "#FFFFFF",
  fontSize: 22,
  fontWeight: 650,
  lineHeight: 1,
  letterSpacing: "-0.02em",
};
const historyComparisonOuterStyle: CSSProperties = {
  width: "100%",
  background: "#EEF2FF",
  margin: 0,
  padding: "16px 20px 4px",
  boxSizing: "border-box",
};
const historyComparisonSectionStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  margin: 0,
  borderRadius: 18,
  padding: "16px 18px",
  background: "linear-gradient(135deg, #283593 0%, #27308A 52%, #252C7D 100%)",
  border: "1px solid rgba(255,255,255,0.42)",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.10), 0 0 10px rgba(56,189,248,0.04)",
  display: "grid",
  gap: 12,
};

const historyComparisonHeaderStyle: CSSProperties = {
  display: "grid",
  gap: 8,
};

const historyComparisonTitleStyle: CSSProperties = {
  margin: 0,
  color: "#FFFFFF",
  fontSize: 24,
  fontWeight: 800,
  lineHeight: 1.05,
  letterSpacing: "-0.03em",
};

const historyComparisonSubtitleStyle: CSSProperties = {
  margin: 0,
  color: "rgba(255,255,255,0.86)",
  fontSize: 13,
  fontWeight: 500,
  lineHeight: 1.3,
};

const historyComparisonReferenceStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  width: "fit-content",
  maxWidth: "100%",
  minHeight: 24,
  padding: "0 12px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.14)",
  border: "1px solid rgba(255,255,255,0.16)",
  color: "rgba(255,255,255,0.82)",
  fontSize: 11,
  fontWeight: 500,
  lineHeight: 1,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const historyComparisonGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 10,
};

const historyComparisonCardStyle: CSSProperties = {
  borderRadius: 14,
  padding: "10px 12px",
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.12)",
  display: "grid",
  gap: 5,
  minHeight: 76,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
};

const historyComparisonLabelStyle: CSSProperties = {
  color: "#FFFFFF",
  fontSize: 13,
  fontWeight: 600,
  lineHeight: 1.15,
};

const historyComparisonValueStyle: CSSProperties = {
  color: "#FFFFFF",
  fontSize: 22,
  fontWeight: 650,
  lineHeight: 1,
  letterSpacing: "-0.02em",
};

const historyComparisonFootStyle: CSSProperties = {
  color: "#86EFAC",
  fontSize: 19,
  fontWeight: 500,
  lineHeight: 1.25,
};
const historyComparisonModeStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
  marginTop: 2,
};

const historyComparisonModeLabelStyle: CSSProperties = {
  color: "#FFFFFF",
  fontSize: 12,
  fontWeight: 600,
  lineHeight: 1,
};

const historyComparisonModeButtonStyle: CSSProperties = {
  minHeight: 32,
  padding: "0 15px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.72)",
  background: "rgba(255,255,255,0.08)",
  color: "#FFFFFF",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
  whiteSpace: "nowrap",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
};

const historyComparisonModeButtonActiveStyle: CSSProperties = {
  background: "rgba(56,189,248,0.22)",
  border: "1px solid rgba(255,255,255,0.92)",
  color: "#FFFFFF",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.16), 0 0 12px rgba(56,189,248,0.16)",
};

const historyComparisonEmptyStyle: CSSProperties = {
  borderRadius: 14,
  padding: "12px 14px",
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "rgba(255,255,255,0.86)",
  fontSize: 13,
  fontWeight: 500,
  lineHeight: 1.35,
};

const analysisResultCompactStyle: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.18)",
  borderRadius: 16,
  padding: 14,
  background: "rgba(255,255,255,0.08)",
  display: "grid",
  gap: 10,
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
};
const analysisResultTitleStyle: CSSProperties = {
  display: "block",
  color: "#FFFFFF",
  fontSize: 16,
  fontWeight: 800,
  lineHeight: 1.2,
};

const analysisResultTextStyle: CSSProperties = {
  margin: "4px 0 0",
  color: "rgba(255,255,255,0.78)",
  fontSize: 13,
  lineHeight: 1.35,
};

const analysisResultBadgesStyle: CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  alignItems: "center",
};

const analysisResultBadgeStyle: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.72)",
  background: "rgba(255,255,255,0.10)",
  color: "#FFFFFF",
  borderRadius: 999,
  padding: "6px 10px",
  fontSize: 12,
  fontWeight: 800,
  whiteSpace: "normal",
};
const processActionsStyle: CSSProperties = {
  display: "flex",
  justifyContent: "flex-start",
  gap: 10,
  flexWrap: "wrap",
  paddingTop: 4,
};
const analysisWarningStyle: CSSProperties = {
  background: "#fff7ed",
  color: "#9a3412",
  border: "1px solid #fed7aa",
  borderRadius: 12,
  padding: 12,
  fontSize: 13,
  fontWeight: 600,
};
const clearHistoryButtonStyle: CSSProperties = {
  width: "fit-content",
  border: "1px solid rgba(255,255,255,0.72)",
  background: "rgba(255,255,255,0.08)",
  color: "#FFFFFF",
  borderRadius: 999,
  padding: "7px 12px",
  fontSize: 12,
  fontWeight: 800,
  cursor: "pointer",
};
const dashboardLayerStyle: CSSProperties = {
  display: "grid",
  gap: 0,
  marginTop: 0,
  paddingTop: 0,
};

const dashboardLayerHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
  border: "1px solid #dbeafe",
  borderRadius: 0,
  padding: "10px 16px",
  background: "linear-gradient(135deg, #f8faff 0%, #eef2ff 100%)",
};

const dashboardLayerTitleStyle: CSSProperties = {
  display: "block",
  color: "#1d4ed8",
  fontSize: 24,
  fontWeight: 900,
  lineHeight: 1.15,
  letterSpacing: "-0.02em",
};

const dashboardLayerSubtitleStyle: CSSProperties = {
  margin: "6px 0 0",
  color: "#475569",
  fontSize: 14,
  lineHeight: 1.4,
};

const dashboardLayerBackButtonStyle: CSSProperties = {
  border: "1px solid transparent",
  background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
  color: "#ffffff",
  borderRadius: 999,
  padding: "10px 14px",
  fontSize: 13,
  fontWeight: 800,
  cursor: "pointer",
  whiteSpace: "nowrap",
  boxShadow: "0 10px 24px rgba(79, 70, 229, 0.22)",
};
const uploadHistoryDateStyle: CSSProperties = {
  color: "#64748b",
  fontSize: 11,
  whiteSpace: "nowrap",
  fontWeight: 700,
};