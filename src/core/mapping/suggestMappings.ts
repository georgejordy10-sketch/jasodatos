import type { BusinessProfile, MappingSuggestion } from "../profiles/types";
import type { MappingCandidate } from "./types";
import { normalizeHeader } from "../ingestion/normalizeHeaders";

function scoreCandidate(
  normalizedSource: string,
  targetField: string,
  aliases: string[]
): { confidence: number; reason: string } {
  const normalizedAliases = aliases.map(normalizeHeader);

  if (normalizedSource === normalizeHeader(targetField)) {
    return { confidence: 1, reason: "Coincidencia exacta con el campo canónico." };
  }

  if (normalizedAliases.includes(normalizedSource)) {
    return { confidence: 0.95, reason: "Coincidencia exacta con alias conocido." };
  }

  const partialAlias = normalizedAliases.find(
    (alias) =>
      normalizedSource.includes(alias) ||
      alias.includes(normalizedSource)
  );

  if (partialAlias) {
    return { confidence: 0.75, reason: `Coincidencia parcial con alias: ${partialAlias}.` };
  }

  const partialTarget =
    normalizedSource.includes(normalizeHeader(targetField)) ||
    normalizeHeader(targetField).includes(normalizedSource);

  if (partialTarget) {
    return { confidence: 0.65, reason: "Coincidencia parcial con el campo canónico." };
  }

  return { confidence: 0, reason: "Sin coincidencia suficiente." };
}

export function suggestMappings(
  columns: string[],
  profile: BusinessProfile
): {
  candidates: MappingCandidate[];
  suggestions: MappingSuggestion[];
} {
  const candidates: MappingCandidate[] = [];
  const suggestions: MappingSuggestion[] = [];

  for (const sourceColumn of columns) {
    const normalizedSourceColumn = normalizeHeader(sourceColumn);

    let bestTargetField: string | null = null;
    let bestConfidence = 0;
    let bestReason = "Sin coincidencia suficiente.";

    for (const field of profile.fields) {
      const aliases = profile.aliases[field.key] ?? [];
      const result = scoreCandidate(normalizedSourceColumn, field.key, aliases);

      if (result.confidence > bestConfidence) {
        bestTargetField = field.key;
        bestConfidence = result.confidence;
        bestReason = result.reason;
      }
    }

    const candidate: MappingCandidate = {
      sourceColumn,
      normalizedSourceColumn,
      targetField: bestConfidence > 0 ? bestTargetField : null,
      confidence: bestConfidence,
      reason: bestReason,
    };

    candidates.push(candidate);

    if (candidate.targetField) {
      suggestions.push({
        sourceColumn: candidate.sourceColumn,
        targetField: candidate.targetField,
        confidence: candidate.confidence,
        reason: candidate.reason,
      });
    }
  }

  return { candidates, suggestions };
}