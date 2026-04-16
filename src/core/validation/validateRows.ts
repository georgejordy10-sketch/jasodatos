import type { BusinessProfile } from "../profiles/types";

export interface RowValidationIssue {
  rowIndex: number;
  errors: string[];
}

export interface ValidateRowsResult {
  validRows: Record<string, unknown>[];
  issues: RowValidationIssue[];
  totalRows: number;
  validRowsCount: number;
  invalidRowsCount: number;
}

export function validateRows(
  mappedRows: Record<string, unknown>[],
  profile: BusinessProfile
): ValidateRowsResult {
  const validRows: Record<string, unknown>[] = [];
  const issues: RowValidationIssue[] = [];

  mappedRows.forEach((row, index) => {
    const errors = profile.validateRow(row);

    if (errors.length > 0) {
      issues.push({
        rowIndex: index,
        errors,
      });
      return;
    }

    validRows.push(row);
  });

  return {
    validRows,
    issues,
    totalRows: mappedRows.length,
    validRowsCount: validRows.length,
    invalidRowsCount: issues.length,
  };
}