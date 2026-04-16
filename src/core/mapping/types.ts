export interface ConfirmedMapping {
  sourceColumn: string;
  targetField: string;
}

export interface MappingCandidate {
  sourceColumn: string;
  normalizedSourceColumn: string;
  targetField: string | null;
  confidence: number;
  reason: string;
}

export interface ApplyMappingsResult {
  rows: Record<string, unknown>[];
  unmappedColumns: string[];
}