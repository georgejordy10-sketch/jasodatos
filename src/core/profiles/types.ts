export type ProfileId = "comercial" | "camaronera";

export type CanonicalFieldType =
  | "string"
  | "number"
  | "date"
  | "boolean"
  | "enum";

export interface CanonicalFieldDefinition {
  key: string;
  label: string;
  type: CanonicalFieldType;
  required: boolean;
  description?: string;
  allowedValues?: string[];
}

export interface MappingSuggestion {
  sourceColumn: string;
  targetField: string;
  confidence: number;
  reason?: string;
}

export interface ProfileAnalyticsResult {
  kpis: Record<string, number | string | null>;
  charts?: Record<string, unknown>;
  tables?: Record<string, unknown[]>;
  alerts?: string[];
}

export interface BusinessProfile {
  id: ProfileId;
  label: string;
  description: string;
  fields: CanonicalFieldDefinition[];
  aliases: Record<string, string[]>;
  requiredFieldKeys: string[];
  dateFieldKeys: string[];
  numericFieldKeys: string[];
  validateRow: (row: Record<string, unknown>) => string[];
  analyze: (rows: Record<string, unknown>[]) => ProfileAnalyticsResult;
}