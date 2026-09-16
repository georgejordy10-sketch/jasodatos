import type { BuildAlertsInput, BusinessAlert } from "./types";

function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function buildAlerts(input: BuildAlertsInput): BusinessAlert[] {
  const alerts: BusinessAlert[] = [];

  const stockCriticalCount = Number(input.stockCriticalCount ?? 0);

  const salesChangePct =
    typeof input.salesChangePct === "number" &&
    Number.isFinite(input.salesChangePct)
      ? input.salesChangePct
      : null;
const salesDropMediumPct =
  typeof input.salesDropMediumPct === "number" &&
  Number.isFinite(input.salesDropMediumPct)
    ? Math.max(0, input.salesDropMediumPct)
    : 8;

const salesDropHighPct =
  typeof input.salesDropHighPct === "number" &&
  Number.isFinite(input.salesDropHighPct)
    ? Math.max(salesDropMediumPct, input.salesDropHighPct)
    : Math.max(salesDropMediumPct, 15);
  const weakestBranchName = (input.weakestBranchName ?? "").trim();

  const weakestBranchSharePct =
    typeof input.weakestBranchSharePct === "number" &&
    Number.isFinite(input.weakestBranchSharePct)
      ? input.weakestBranchSharePct
      : null;

  const topProductSharePct =
    typeof input.topProductSharePct === "number" &&
    Number.isFinite(input.topProductSharePct)
      ? input.topProductSharePct
      : null;

  const topProductName = (input.topProductName ?? "").trim();

  if (stockCriticalCount > 0) {
    alerts.push({
      id: "stock-critico",
      type: "stock_critico",
      title: "Stock crítico detectado",
message:
  stockCriticalCount === 1
    ? "Hay 1 caso de inventario crítico. Revisa disponibilidad y planifica reposición antes de impulsar su demanda."
    : `Hay ${stockCriticalCount} casos de inventario crítico. Revisa disponibilidad y prioriza reposición antes de impulsar su demanda.`,
      severity:
        stockCriticalCount >= 4
          ? "alta"
          : stockCriticalCount >= 2
          ? "media"
          : "baja",
      status: "nueva",
      metric: stockCriticalCount,
      actionLabel: "Ver stock",
      anchorId: "stock-en-riesgo",
    });
  }

  if (salesChangePct !== null && salesChangePct < 0) {
    const absDrop = Math.abs(salesChangePct);

    if (absDrop >= salesDropHighPct) {
      alerts.push({
        id: "caida-ventas",
        type: "caida_ventas",
        title: "Caída de ventas",
        message: `Las ventas bajaron ${round(
          absDrop
        )}% frente al período de referencia.`,
        severity: "alta",
        status: "nueva",
        metric: salesChangePct,
        actionLabel: "Ver tendencia",
        anchorId: "tendencia-ventas",
      });
    } else if (absDrop >= salesDropMediumPct) {
      alerts.push({
        id: "caida-ventas",
        type: "caida_ventas",
        title: "Desaceleración comercial",
        message: `Las ventas bajaron ${round(
          absDrop
        )}%. Todavía no es crítico, pero requiere seguimiento.`,
        severity: "media",
        status: "nueva",
        metric: salesChangePct,
        actionLabel: "Ver tendencia",
        anchorId: "tendencia-ventas",
      });
    }
  }
  const branchCount =
  typeof input.branchCount === "number" &&
  Number.isFinite(input.branchCount)
    ? Math.max(0, Math.floor(input.branchCount))
    : 0;

if (
  weakestBranchName &&
  weakestBranchSharePct !== null &&
  branchCount >= 2
) {
  const expectedSharePct = 100 / branchCount;
  const weakBranchThresholdPct = Math.min(
    18,
    expectedSharePct * 0.75
  );

  if (weakestBranchSharePct <= weakBranchThresholdPct) {
    alerts.push({
      id: "sucursal-rezagada",
      type: "sucursal_rezagada",
      title: "Sucursal rezagada",
      message: `${weakestBranchName} aporta solo ${round(
        weakestBranchSharePct
      )}% del total. Conviene revisar surtido, canal y ejecución comercial.`,
      severity:
  weakestBranchSharePct <= expectedSharePct * 0.5
    ? "alta"
    : "media",
      status: "nueva",
      metric: weakestBranchSharePct,
      actionLabel: "Ver sucursal",
      anchorId: "benchmarking-sucursales",
    });
  }
}
  if (topProductSharePct !== null && topProductName) {
    if (topProductSharePct >= 35) {
      alerts.push({
        id: "concentracion-producto",
        type: "concentracion_producto",
        title: "Alta concentración en un producto",
        message: `${topProductName} concentra ${round(
          topProductSharePct
        )}% de las ventas. Hay dependencia comercial relevante.`,
        severity: topProductSharePct >= 45 ? "alta" : "media",
        status: "nueva",
        metric: topProductSharePct,
        actionLabel: "Ver mix",
        anchorId: "participacion-producto",
      });
    }
  }

  const order = { alta: 0, media: 1, baja: 2 };

  return alerts.sort(
    (a, b) => order[a.severity] - order[b.severity]
  );
}