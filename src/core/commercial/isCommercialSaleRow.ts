import { classifyCommercialMovement } from "@/core/commercial/classifyCommercialMovement";

export function isCommercialSaleRow(
  row: Record<string, unknown>
): boolean {
  const classification = classifyCommercialMovement(row);

  return (
    classification.kind === "sale" ||
    classification.kind === "return"
  );
}
