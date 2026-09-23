import { normalizeHeader } from "@/core/ingestion/normalizeHeaders";

const NON_SALE_MOVEMENT_PREFIXES = [
  "stock",
  "snapshot",
  "inventario",
  "ajuste",
  "entrada",
  "ingreso",
  "compra",
  "recepcion",
  "transferencia",
  "traslado",
  "conteo",
  "saldo",
];

export function isCommercialSaleRow(
  row: Record<string, unknown>
): boolean {
  const rawMovement = row.tipo_movimiento;

  if (
    rawMovement === undefined ||
    rawMovement === null ||
    String(rawMovement).trim() === ""
  ) {
    return true;
  }

  const movement = normalizeHeader(String(rawMovement));

  if (!movement) {
    return true;
  }

  const isExplicitNonSale = NON_SALE_MOVEMENT_PREFIXES.some(
    (prefix) =>
      movement === prefix ||
      movement.startsWith(`${prefix} `)
  );

  return !isExplicitNonSale;
}
