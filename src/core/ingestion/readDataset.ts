import { readCsv } from "./readCsv";
import { readExcel } from "./readExcel";
import { getProfile } from "../profiles/registry";
import type { ProfileId, ProfileAnalyticsResult } from "../profiles/types";
import { suggestMappings } from "../mapping/suggestMappings";
import { applyMappings } from "../mapping/applyMappings";
import type { ConfirmedMapping, MappingCandidate } from "../mapping/types";
import { validateRequiredFields } from "../validation/validateRequiredFields";
import { validateRows, type RowValidationIssue } from "../validation/validateRows";
import { runProfileAnalytics } from "../analytics/runProfileAnalytics";

export interface ReadDatasetInitialResult {
  profileId: ProfileId;
  profileLabel: string;
  fileName: string;
  columns: string[];
  rawRows: Record<string, unknown>[];
  mappingCandidates: MappingCandidate[];
  suggestedMappings: ConfirmedMapping[];
}

export interface ProcessDatasetResult {
  profileId: ProfileId;
  fileName: string;
  mappedRows: Record<string, unknown>[];
  unmappedColumns: string[];
  missingRequiredFields: string[];
  isValidStructure: boolean;
  validRows: Record<string, unknown>[];
  rowIssues: RowValidationIssue[];
  analytics: ProfileAnalyticsResult | null;
}

function isExcelFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return lower.endsWith(".xlsx") || lower.endsWith(".xls");
}

function isCsvFile(fileName: string): boolean {
  return fileName.toLowerCase().endsWith(".csv");
}

export async function readDatasetInitial(
  file: File,
  profileId: ProfileId
): Promise<ReadDatasetInitialResult> {
  const profile = getProfile(profileId);

  let columns: string[] = [];
  let rawRows: Record<string, unknown>[] = [];

  if (isCsvFile(file.name)) {
    const result = await readCsv(file);
    columns = result.columns;
    rawRows = result.rows;
  } else if (isExcelFile(file.name)) {
    const result = await readExcel(file);
    columns = result.columns;
    rawRows = result.rows;
  } else {
    throw new Error("Formato no soportado. Solo se permiten archivos CSV o Excel.");
  }

  const { candidates, suggestions } = suggestMappings(columns, profile);

  return {
    profileId,
    profileLabel: profile.label,
    fileName: file.name,
    columns,
    rawRows,
    mappingCandidates: candidates,
    suggestedMappings: suggestions.map((item) => ({
      sourceColumn: item.sourceColumn,
      targetField: item.targetField,
    })),
  };
}

export function processDataset(
  rawRows: Record<string, unknown>[],
  profileId: ProfileId,
  confirmedMappings: ConfirmedMapping[],
  fileName: string
): ProcessDatasetResult {
  const profile = getProfile(profileId);

  const mapped = applyMappings(rawRows, confirmedMappings);

  const requiredValidation = validateRequiredFields(mapped.rows, profile);

  if (!requiredValidation.isValid) {
    return {
      profileId,
      fileName,
      mappedRows: mapped.rows,
      unmappedColumns: mapped.unmappedColumns,
      missingRequiredFields: requiredValidation.missingRequiredFields,
      isValidStructure: false,
      validRows: [],
      rowIssues: [],
      analytics: null,
    };
  }

  const rowValidation = validateRows(mapped.rows, profile);
  const analytics = runProfileAnalytics(rowValidation.validRows, profile);

  return {
    profileId,
    fileName,
    mappedRows: mapped.rows,
    unmappedColumns: mapped.unmappedColumns,
    missingRequiredFields: [],
    isValidStructure: true,
    validRows: rowValidation.validRows,
    rowIssues: rowValidation.issues,
    analytics,
  };
}