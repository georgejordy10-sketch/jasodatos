import type {
  BuildCommercialRecommendationsInput,
  CommercialRecommendation,
} from "./types";

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const normalized = value.replace(",", ".").replace(/[^\d.-]/g, "");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function toText(value: unknown, fallback = "Sin dato"): string {
  if (typeof value === "string") {
    const cleaned = value.trim();
    return cleaned || fallback;
  }

  if (value === null || value === undefined) return fallback;

  const converted = String(value).trim();
  return converted || fallback;
}

function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function buildCommercialRecommendations(
  input: BuildCommercialRecommendationsInput
): CommercialRecommendation[] {
  const rows = input.rows ?? [];
  const stockMin = Number(input.stockMin ?? 0);

  if (!rows.length) return [];

  const salesByProduct = new Map<string, number>();
  const salesByBranch = new Map<string, number>();
  const salesByChannel = new Map<string, number>();
  const stockByProduct = new Map<string, number>();

  for (const row of rows) {
    const productName = toText(row.producto, "Sin producto");
    const branchName = toText(row.sucursal, "Sin sucursal");
    const channelName = toText(row.canal, "Sin canal");
    const quantity = toNumber(row.cantidad);
    const unitPrice = toNumber(row.precio_unitario);
    const sale = quantity * unitPrice;

    salesByProduct.set(productName, (salesByProduct.get(productName) ?? 0) + sale);
    salesByBranch.set(branchName, (salesByBranch.get(branchName) ?? 0) + sale);
    salesByChannel.set(channelName, (salesByChannel.get(channelName) ?? 0) + sale);

    if (row.stock !== undefined && row.stock !== null && row.stock !== "") {
      const currentStock = toNumber(row.stock);
      const previousStock = stockByProduct.get(productName);

      stockByProduct.set(
        productName,
        previousStock === undefined ? currentStock : Math.min(previousStock, currentStock)
      );
    }
  }

  const recommendations: CommercialRecommendation[] = [];

  const orderedProducts = [...salesByProduct.entries()].sort((a, b) => b[1] - a[1]);
  const orderedBranches = [...salesByBranch.entries()].sort((a, b) => b[1] - a[1]);
  const orderedChannels = [...salesByChannel.entries()].sort((a, b) => b[1] - a[1]);

  const totalSales = orderedProducts.reduce((acc, [, value]) => acc + value, 0);
  const topProduct = orderedProducts[0];
  const lowProduct = orderedProducts[orderedProducts.length - 1];
  const topBranch = orderedBranches[0];
  const lowBranch = orderedBranches[orderedBranches.length - 1];
  const topChannel = orderedChannels[0];

  const criticalStockProducts = [...stockByProduct.entries()]
    .filter(([, stock]) => stock <= stockMin)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 3);

  if (criticalStockProducts.length > 0) {
    const [productName, stock] = criticalStockProducts[0];

    recommendations.push({
      id: "reponer-producto-critico",
type: "reponer_producto",
title: "Reponer producto crítico",
message: `${productName} tiene stock bajo frente al mínimo configurado. Conviene revisar disponibilidad y planificar reposición antes de perder ventas.`,
      priority: stock <= 0 ? "alta" : "media",
      actionLabel: "Ver inventario",
      anchorId: "stock-en-riesgo",
      evidence: [
        `Stock actual detectado: ${stock}`,
        `Stock mínimo configurado: ${stockMin}`,
      ],
      metric: stock,
      productName,
    });
  }

  if (topProduct && totalSales > 0) {
    const [productName, productSales] = topProduct;
    const share = (productSales / totalSales) * 100;

    if (share >= 25) {
      recommendations.push({
        id: "producto-estrella",
        type: "producto_estrella",
        title: "Potenciar producto estrella",
        message: `${productName} concentra ${round(share)}% de las ventas. Conviene destacarlo como producto ancla para campañas y promociones.`,
        priority: share >= 40 ? "alta" : "media",
        actionLabel: "Ver producto",
        anchorId: "participacion-producto",
        evidence: [
          `Participación sobre ventas: ${round(share)}%`,
          "Producto con mayor aporte comercial del período.",
        ],
        metric: share,
        productName,
      });
    }
  }
 const hasEnoughProductsForCombo = orderedProducts.length >= 3;
const topProductShare =
  topProduct && totalSales > 0 ? (topProduct[1] / totalSales) * 100 : 0;
const lowProductShare =
  lowProduct && totalSales > 0 ? (lowProduct[1] / totalSales) * 100 : 0;
const hasClearProductGap = topProductShare - lowProductShare >= 15;

if (
  hasEnoughProductsForCombo &&
  hasClearProductGap &&
  topProduct &&
  lowProduct &&
  topProduct[0] !== lowProduct[0]
) {
    recommendations.push({
      id: "crear-combo",
      type: "crear_combo",
      title: "Crear combo comercial",
      message: `Combina ${topProduct[0]} con ${lowProduct[0]} para aprovechar la tracción del producto líder y mover productos con menor venta.`,
      priority: "media",
      actionLabel: "Comparar productos",
      anchorId: "participacion-producto",
      evidence: [
    `${topProduct[0]} concentra ${round(topProductShare)}% de las ventas.`,
`${lowProduct[0]} concentra ${round(lowProductShare)}% de las ventas.`,
      ],
      productName: topProduct[0],
    });
  }
 const hasEnoughBranches = orderedBranches.length >= 2;
const topBranchShare =
  topBranch && totalSales > 0 ? (topBranch[1] / totalSales) * 100 : 0;
const lowBranchShare =
  lowBranch && totalSales > 0 ? (lowBranch[1] / totalSales) * 100 : 0;
const hasClearBranchGap = topBranchShare - lowBranchShare >= 20;

if (
  hasEnoughBranches &&
  hasClearBranchGap &&
  lowBranch &&
  topBranch &&
  lowBranch[0] !== topBranch[0]
) {
    recommendations.push({
      id: "impulsar-sucursal",
      type: "impulsar_sucursal",
      title: "Impulsar sucursal rezagada",
      message: `${lowBranch[0]} muestra menor aporte comercial. Conviene revisar surtido, canal y ejecución comercial en esa sucursal.`,
      priority: "media",
      actionLabel: "Ver sucursal",
      anchorId: "benchmarking-sucursales",
evidence: [
  `${topBranch[0]} concentra ${round(topBranchShare)}% de las ventas.`,
  `${lowBranch[0]} concentra ${round(lowBranchShare)}% de las ventas.`,
],
      branchName: lowBranch[0],
    });
  }

  if (topChannel && topChannel[0] !== "Sin canal") {
    recommendations.push({
      id: "potenciar-canal",
      type: "potenciar_canal",
      title: "Potenciar canal principal",
      message: `${topChannel[0]} es el canal con mayor aporte. Conviene reforzarlo con promociones, disponibilidad y comunicación directa.`,
      priority: "baja",
      actionLabel: "Ver canal",
      anchorId: "ventas-por-canal",
      evidence: [
        `${topChannel[0]} concentra el mayor aporte por canal.`,
      ],
      channelName: topChannel[0],
    });
  }

  const order = { alta: 0, media: 1, baja: 2 };

  return recommendations
    .sort((a, b) => order[a.priority] - order[b.priority])
    .slice(0, 5);
}