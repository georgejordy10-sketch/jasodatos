"use client";

import { useMemo, useState } from "react";
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

const selectedProfile = profiles[0];

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
    setError("");
    setInitialData(null);
    setConfirmedMappings([]);
    setProcessedData(null);
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
            id="file"
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(e) => {
              const nextFile = e.target.files?.[0] ?? null;
              setFile(nextFile);
              setInitialData(null);
              setConfirmedMappings([]);
              setProcessedData(null);
              setError("");
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
                    <td style={tdStyle}>{candidate.sourceColumn}</td>
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
                            {field.label} ({field.key})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={tdStyle}>{candidate.confidence.toFixed(2)}</td>
                    <td style={tdStyle}>{candidate.reason}</td>
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
  onClearFile={() => {
    window.location.reload();
  }}
  onSelectAnotherFile={() => {
    window.location.reload();
  }}
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