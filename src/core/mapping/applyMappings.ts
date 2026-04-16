import type { ConfirmedMapping, ApplyMappingsResult } from "./types";

export function applyMappings(
  rawRows: Record<string, unknown>[],
  mappings: ConfirmedMapping[]
): ApplyMappingsResult {
  const mappingMap = new Map<string, string>();

  for (const mapping of mappings) {
    mappingMap.set(mapping.sourceColumn, mapping.targetField);
  }

  const transformedRows = rawRows.map((row) => {
    const transformed: Record<string, unknown> = {};

    for (const [sourceColumn, value] of Object.entries(row)) {
      const targetField = mappingMap.get(sourceColumn);
      if (!targetField) continue;
      transformed[targetField] = value;
    }

    return transformed;
  });

  const mappedSourceColumns = new Set(mappings.map((m) => m.sourceColumn));

  const allColumns = new Set<string>();
  for (const row of rawRows) {
    for (const key of Object.keys(row)) {
      allColumns.add(key);
    }
  }

  const unmappedColumns = [...allColumns].filter(
    (column) => !mappedSourceColumns.has(column)
  );

  return {
    rows: transformedRows,
    unmappedColumns,
  };
}