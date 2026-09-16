import { parseFlexibleNumber } from "@/core/numbers/parseFlexibleNumber";
import type {
  BuildCommercialRecommendationsInput,
  CommercialRecommendation,
} from "./types";

function toNumber(value: unknown): number {
  return parseFlexibleNumber(value);
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
function parseDateLike(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value !== "string") return null;

  const raw = value.trim();
  if (!raw) return null;

  const ymd = raw.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);

  if (ymd) {
    const year = Number(ymd[1]);
    const month = Number(ymd[2]);
    const day = Number(ymd[3]);

    const localDate = new Date(year, month - 1, day);

    if (
      localDate.getFullYear() === year &&
      localDate.getMonth() === month - 1 &&
      localDate.getDate() === day
    ) {
      return localDate;
    }

    return null;
  }

  const dmy = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);

  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    const year = Number(dmy[3]);

    const localDate = new Date(year, month - 1, day);

    if (
      localDate.getFullYear() === year &&
      localDate.getMonth() === month - 1 &&
      localDate.getDate() === day
    ) {
      return localDate;
    }

    return null;
  }

  const direct = new Date(raw);
  return Number.isNaN(direct.getTime()) ? null : direct;
}

export function buildCommercialRecommendations(
  input: BuildCommercialRecommendationsInput
): CommercialRecommendation[] {
  const rows = input.rows ?? [];
  const rawStockMin = Number(input.stockMin ?? 0);
const stockMin = Number.isFinite(rawStockMin)
  ? Math.max(0, rawStockMin)
  : 0;

  if (!rows.length) return [];

  const salesByProduct = new Map<string, number>();
  const salesByBranch = new Map<string, number>();
  const salesByChannel = new Map<string, number>();

  const latestStockByProductBranch = new Map<
    string,
    Map<string, { stock: number; timestamp: number }>
  >();

  let hasMissingChannel = false;

  for (const row of rows) {
    const productName = toText(row.producto, "Sin producto");
    const branchName = toText(row.sucursal, "Sin sucursal");
    const channelName = toText(row.canal, "Sin canal");

    const quantity = toNumber(row.cantidad);
    const unitPrice = toNumber(row.precio_unitario);
    const sale = quantity * unitPrice;

    salesByProduct.set(
      productName,
      (salesByProduct.get(productName) ?? 0) + sale
    );

    salesByBranch.set(
      branchName,
      (salesByBranch.get(branchName) ?? 0) + sale
    );

    if (channelName === "Sin canal") {
      hasMissingChannel = true;
    } else {
      salesByChannel.set(
        channelName,
        (salesByChannel.get(channelName) ?? 0) + sale
      );
    }

    if (
      row.stock !== undefined &&
      row.stock !== null &&
      row.stock !== ""
    ) {
      const stock = Math.max(0, toNumber(row.stock));
      const parsedDate = parseDateLike(row.fecha);
      const timestamp =
        parsedDate?.getTime() ?? Number.NEGATIVE_INFINITY;

      const branchStocks =
        latestStockByProductBranch.get(productName) ??
        new Map<string, { stock: number; timestamp: number }>();

      const current = branchStocks.get(branchName);

      if (!current || timestamp >= current.timestamp) {
        branchStocks.set(branchName, {
          stock,
          timestamp,
        });
      }

      latestStockByProductBranch.set(productName, branchStocks);
    }
  }

  const recommendations: CommercialRecommendation[] = [];

  const orderedProducts = [...salesByProduct.entries()].sort(
    (a, b) => b[1] - a[1]
  );

  const orderedBranches = [...salesByBranch.entries()].sort(
    (a, b) => b[1] - a[1]
  );

  const orderedChannels = [...salesByChannel.entries()].sort(
    (a, b) => b[1] - a[1]
  );

  const totalSales = orderedProducts.reduce(
    (acc, [, value]) => acc + value,
    0
  );

  const topProduct = orderedProducts[0];
  const topBranch = orderedBranches[0];
  const lowBranch = orderedBranches[orderedBranches.length - 1];
  const topChannel = orderedChannels[0];

  const productCount = orderedProducts.length;
  const branchCount = orderedBranches.length;
  const channelCount = orderedChannels.length;

  const criticalStockThreshold =
    stockMin > 0
      ? Math.max(1, Math.round(stockMin * 0.5))
      : 0;

  const criticalStockCases =
    stockMin > 0
      ? [...latestStockByProductBranch.entries()]
          .flatMap(([productName, branches]) =>
            [...branches.entries()].map(
              ([branchName, snapshot]) => ({
                productName,
                branchName,
                stock: snapshot.stock,
              })
            )
          )
          .filter(
            (item) =>
              item.stock < stockMin &&
              item.stock <= criticalStockThreshold
          )
          .sort((a, b) => a.stock - b.stock)
          .slice(0, 3)
      : [];

  if (criticalStockCases.length > 0) {
    const critical = criticalStockCases[0];

    recommendations.push({
      id: "reponer-producto-critico",
      type: "reponer_producto",
      title: "Reponer inventario crítico",
      message: `${critical.productName} registra ${critical.stock} unidades en ${critical.branchName}, por debajo del mínimo configurado. Revisa disponibilidad y planifica reposición antes de incrementar su demanda.`,
      priority: critical.stock <= 0 ? "alta" : "media",
      actionLabel: "Ver inventario",
      anchorId: "stock-en-riesgo",
      evidence: [
        `Sucursal: ${critical.branchName}`,
        `Inventario actual: ${critical.stock}`,
        `Mínimo configurado: ${stockMin}`,
      ],
      metric: critical.stock,
      productName: critical.productName,
      branchName: critical.branchName,
    });
  }

  if (
    topProduct &&
    totalSales > 0 &&
    productCount >= 2
  ) {
    const [productName, productSales] = topProduct;

    const share = (productSales / totalSales) * 100;
    const uniformShare = 100 / productCount;

    const concentrationThreshold = Math.max(
      35,
      uniformShare * 1.5
    );

    const highConcentrationThreshold = Math.max(
      45,
      uniformShare * 1.75
    );

    if (share >= concentrationThreshold) {
      recommendations.push({
        id: "producto-concentrado",
        type: "producto_estrella",
        title: "Revisar concentración del producto líder",
        message: `${productName} concentra ${round(
          share
        )}% de las ventas, frente a una referencia uniforme de ${round(
          uniformShare
        )}% considerando ${productCount} productos. Revisa si esta concentración se mantiene por período, sucursal y canal antes de definir una acción comercial.`,
        priority:
          share >= highConcentrationThreshold
            ? "alta"
            : "media",
        actionLabel: "Ver producto",
        anchorId: "participacion-producto",
        evidence: [
          `Participación sobre ventas: ${round(share)}%`,
          `Referencia uniforme: ${round(uniformShare)}%`,
          `Productos analizados: ${productCount}`,
        ],
        metric: share,
        productName,
      });
    }
  }

  if (
    branchCount >= 2 &&
    lowBranch &&
    totalSales > 0
  ) {
    const lowBranchShare =
      (lowBranch[1] / totalSales) * 100;

    const expectedShare =
      100 / branchCount;

    const weakBranchThreshold = Math.min(
      18,
      expectedShare * 0.75
    );

    if (lowBranchShare <= weakBranchThreshold) {
      recommendations.push({
        id: "impulsar-sucursal",
        type: "impulsar_sucursal",
        title: "Revisar sucursal con menor participación",
        message: `${lowBranch[0]} aporta ${round(
          lowBranchShare
        )}% de las ventas, frente a una referencia proporcional de ${round(
          expectedShare
        )}% considerando ${branchCount} sucursales. Revisa surtido, disponibilidad, canal y ejecución comercial antes de definir una acción correctiva.`,
        priority:
          lowBranchShare <= expectedShare * 0.5
            ? "alta"
            : "media",
        actionLabel: "Ver sucursal",
        anchorId: "benchmarking-sucursales",
        evidence: [
          `Participación de ${lowBranch[0]}: ${round(
            lowBranchShare
          )}%`,
          `Referencia proporcional: ${round(
            expectedShare
          )}%`,
          topBranch
            ? `Sucursal con mayor venta: ${topBranch[0]}`
            : "Sin referencia superior disponible.",
        ],
        metric: lowBranchShare,
        branchName: lowBranch[0],
      });
    }
  }

  if (
    !hasMissingChannel &&
    channelCount >= 2 &&
    topChannel &&
    totalSales > 0
  ) {
    const topChannelShare =
      (topChannel[1] / totalSales) * 100;

    const uniformChannelShare =
      100 / channelCount;

    const channelConcentrationThreshold = Math.max(
      50,
      uniformChannelShare * 1.5
    );

    const highChannelConcentrationThreshold = Math.max(
      65,
      uniformChannelShare * 1.75
    );

    if (
      topChannelShare >=
      channelConcentrationThreshold
    ) {
      recommendations.push({
        id: "potenciar-canal",
        type: "potenciar_canal",
        title: "Revisar concentración por canal",
        message: `${topChannel[0]} concentra ${round(
          topChannelShare
        )}% de las ventas, frente a una referencia uniforme de ${round(
          uniformChannelShare
        )}% considerando ${channelCount} canales. Revisa si esta dependencia se mantiene antes de reasignar inventario, inversión o acciones comerciales.`,
        priority:
          topChannelShare >=
          highChannelConcentrationThreshold
            ? "alta"
            : "media",
        actionLabel: "Ver canal",
        anchorId: "ventas-por-canal",
        evidence: [
          `Participación del canal: ${round(
            topChannelShare
          )}%`,
          `Referencia uniforme: ${round(
            uniformChannelShare
          )}%`,
          `Canales analizados: ${channelCount}`,
        ],
        metric: topChannelShare,
        channelName: topChannel[0],
      });
    }
  }

  const order = {
    alta: 0,
    media: 1,
    baja: 2,
  };

  return recommendations
    .sort(
      (a, b) =>
        order[a.priority] - order[b.priority]
    )
    .slice(0, 5);
}