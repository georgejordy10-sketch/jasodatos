import { normalizeHeader } from "@/core/ingestion/normalizeHeaders";
import { parseFlexibleNumber } from "@/core/numbers/parseFlexibleNumber";

export type CommercialMovementKind =
  | "sale"
  | "return"
  | "non_sale"
  | "conflict";

export type CommercialMovementClassification = {
  kind: CommercialMovementKind;
  movement: string;
  quantity: number;
  effectiveQuantity: number;
  inferred: boolean;
};

const RETURN_MOVEMENT_PREFIXES = [
  "devolucion",
  "refund",
  "return",
  "nota de credito",
  "reverso",
  "reversal",
];

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

const SALE_MOVEMENT_PREFIXES = [
  "venta",
  "sale",
];

function matchesMovementPrefix(
  movement: string,
  prefixes: string[]
): boolean {
  return prefixes.some(
    (prefix) =>
      movement === prefix ||
      movement.startsWith(`${prefix} `)
  );
}

export function classifyCommercialMovement(
  row: Record<string, unknown>
): CommercialMovementClassification {
  const quantity = parseFlexibleNumber(row.cantidad);

  const rawMovement = row.tipo_movimiento;

  const movement =
    rawMovement === undefined ||
    rawMovement === null ||
    String(rawMovement).trim() === ""
      ? ""
      : normalizeHeader(String(rawMovement));

  if (!movement) {
    if (quantity < 0) {
      return {
        kind: "return",
        movement: "",
        quantity,
        effectiveQuantity: -Math.abs(quantity),
        inferred: true,
      };
    }

    return {
      kind: "sale",
      movement: "",
      quantity,
      effectiveQuantity: Math.abs(quantity),
      inferred: true,
    };
  }

  if (
    matchesMovementPrefix(
      movement,
      NON_SALE_MOVEMENT_PREFIXES
    )
  ) {
    return {
      kind: "non_sale",
      movement,
      quantity,
      effectiveQuantity: 0,
      inferred: false,
    };
  }

  if (
    matchesMovementPrefix(
      movement,
      RETURN_MOVEMENT_PREFIXES
    )
  ) {
    return {
      kind: "return",
      movement,
      quantity,
      effectiveQuantity: -Math.abs(quantity),
      inferred: false,
    };
  }

  if (
    matchesMovementPrefix(
      movement,
      SALE_MOVEMENT_PREFIXES
    )
  ) {
    if (quantity < 0) {
      return {
        kind: "conflict",
        movement,
        quantity,
        effectiveQuantity: quantity,
        inferred: false,
      };
    }

    return {
      kind: "sale",
      movement,
      quantity,
      effectiveQuantity: Math.abs(quantity),
      inferred: false,
    };
  }

  if (quantity < 0) {
    return {
      kind: "conflict",
      movement,
      quantity,
      effectiveQuantity: quantity,
      inferred: false,
    };
  }

  return {
    kind: "sale",
    movement,
    quantity,
    effectiveQuantity: Math.abs(quantity),
    inferred: true,
  };
}

export function getCommercialEffectiveQuantity(
  row: Record<string, unknown>
): number {
  const classification = classifyCommercialMovement(row);

  if (
    classification.kind !== "sale" &&
    classification.kind !== "return"
  ) {
    return 0;
  }

  return classification.effectiveQuantity;
}

export function getCommercialNetSales(
  row: Record<string, unknown>
): number {
  const effectiveQuantity =
    getCommercialEffectiveQuantity(row);

  const unitPrice = parseFlexibleNumber(
    row.precio_unitario
  );

  return effectiveQuantity * unitPrice;
}
