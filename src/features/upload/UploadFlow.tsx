"use client";

import { useMemo, useRef, useState } from "react";
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

export default function UploadFlow() {

  const profiles = useMemo(() => listProfiles(), []);
const profileId: ProfileId = "comercial";
  const [file, setFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const [initialData, setInitialData] = useState<ReadDatasetInitialResult | null>(null);
  const [confirmedMappings, setConfirmedMappings] = useState<ConfirmedMapping[]>([]);
  const [processedData, setProcessedData] = useState<ProcessDatasetResult | null>(null);
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

    setLoading(true);
    setError("");
    setProcessedData(null);

    try {
      const result = await readDatasetInitial(file, profileId);
      setInitialData(result);
      setConfirmedMappings(result.suggestedMappings);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo leer el archivo.");
      setInitialData(null);
      setConfirmedMappings([]);
    } finally {
      setLoading(false);
    }
  }

  function updateMapping(sourceColumn: string, targetField: string) {
    setConfirmedMappings((prev) => {
      const withoutCurrent = prev.filter((m) => m.sourceColumn !== sourceColumn);

      if (!targetField) return withoutCurrent;

      return [
        ...withoutCurrent,
        {
          sourceColumn,
          targetField,
        },
      ];
    });
  }

  function getCurrentTargetField(sourceColumn: string): string {
    return confirmedMappings.find((m) => m.sourceColumn === sourceColumn)?.targetField ?? "";
  }

  function handleProcess() {
    if (!initialData) {
      setError("Primero debes leer el archivo.");
      return;
    }

    setError("");

    const result = processDataset(
      initialData.rawRows,
      initialData.profileId,
      confirmedMappings,
      initialData.fileName
    );

    setProcessedData(result);
  }

function resetFlow() {
  setFile(null);
  setLoading(false);
  setError("");
  setInitialData(null);
  setConfirmedMappings([]);
  setProcessedData(null);

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
        <h2 style={{ margin: 0 }}>Carga inteligente de archivos</h2>

        <div style={{ display: "grid", gap: 8 }}>
          <label htmlFor="file">Archivo</label>
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
}}
          />
          {file ? (
            <small style={{ color: "#374151" }}>
              Archivo seleccionado: <strong>{file.name}</strong>
            </small>
          ) : null}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={handleReadFile}
            disabled={loading || !file}
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid #111827",
              background: "#111827",
              color: "#ffffff",
              cursor: loading || !file ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Leyendo..." : "Leer archivo"}
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
          <h3 style={{ margin: 0 }}>Revisión de mapeo</h3>

          <div style={{ color: "#374151" }}>
            <strong>Archivo:</strong> {initialData.fileName}
          </div>
          <div style={{ color: "#374151" }}>
            <strong>Columnas detectadas:</strong> {initialData.columns.length}
          </div>
          <div style={{ color: "#374151" }}>
            <strong>Filas detectadas:</strong> {initialData.rawRows.length}
          </div>

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
                  <th style={thStyle}>Columna detectada</th>
                  <th style={thStyle}>Campo sugerido</th>
                  <th style={thStyle}>Confianza</th>
                  <th style={thStyle}>Motivo</th>
                </tr>
              </thead>
              <tbody>
{initialData.mappingCandidates.map((candidate) => (
  <tr key={candidate.sourceColumn}>
    <td style={tdStyle}>{formatColumnLabel(candidate.sourceColumn)}</td>
    <td style={tdStyle}>
      <select
                        value={getCurrentTargetField(candidate.sourceColumn)}
                        onChange={(e) => updateMapping(candidate.sourceColumn, e.target.value)}
                        style={{
                          width: "100%",
                          padding: 8,
                          borderRadius: 8,
                          border: "1px solid #d1d5db",
                        }}
                      >
                        <option value="">No mapear</option>
                        {selectedProfile.fields.map((field) => (
                         <option key={field.key} value={field.key}>
  {field.label}
</option>
                        ))}
                      </select>
                    </td>
<td style={tdStyle}>
  {isManualMapping(candidate.sourceColumn, candidate.targetField)
    ? "Manual"
    : formatConfidenceLabel(candidate.confidence, candidate.sourceColumn)}
</td>
<td style={tdStyle}>
  {isManualMapping(candidate.sourceColumn, candidate.targetField)
    ? "Campo ajustado manualmente."
    : formatReasonLabel(candidate.reason, candidate.sourceColumn)}
</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <button
              type="button"
              onClick={handleProcess}
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px solid #111827",
                background: "#111827",
                color: "#ffffff",
                cursor: "pointer",
              }}
            >
              Procesar dataset
            </button>
          </div>
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
          <h3 style={{ margin: 0 }}>Resultado del procesamiento</h3>

          <div style={{ display: "grid", gap: 6 }}>
            <div>
              <strong>Estructura válida:</strong> {processedData.isValidStructure ? "Sí" : "No"}
            </div>
            <div>
              <strong>Campos obligatorios faltantes:</strong>{" "}
              {processedData.missingRequiredFields.length > 0
                ? processedData.missingRequiredFields.join(", ")
                : "Ninguno"}
            </div>
            <div>
              <strong>Columnas no mapeadas:</strong>{" "}
              {processedData.unmappedColumns.length > 0
                ? processedData.unmappedColumns.join(", ")
                : "Ninguna"}
            </div>
            <div>
              <strong>Filas válidas:</strong> {processedData.validRows.length}
            </div>
            <div>
              <strong>Filas con errores:</strong> {processedData.rowIssues.length}
            </div>
          </div>

          {processedData.rowIssues.length > 0 ? (
            <div
              style={{
                background: "#fff7ed",
                color: "#9a3412",
                border: "1px solid #fed7aa",
                borderRadius: 10,
                padding: 12,
              }}
            >
              Se detectaron errores en {processedData.rowIssues.length} filas.
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