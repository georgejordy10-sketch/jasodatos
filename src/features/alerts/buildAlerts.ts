import type { BuildAlertsInput, BusinessAlert } from "./types";

function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function buildAlerts(input: BuildAlertsInput): BusinessAlert[] {
  const alerts: BusinessAlert[] = [];

  const stockCriticalCount = Number(input.stockCriticalCount ?? 0);
  const salesChangePct =
    typeof input.salesChangePct === "number" && Number.isFinite(input.salesChangePct)
      ? input.salesChangePct
      : null;
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
          ? "Hay 1 producto en estado crítico. Conviene revisar inventario y rotación."
          : `Hay ${stockCriticalCount} productos en estado crítico. Conviene revisar inventario y priorizar salida comercial.`,
      severity: stockCriticalCount >= 4 ? "alta" : stockCriticalCount >= 2 ? "media" : "baja",
      status: "nueva",
      metric: stockCriticalCount,
      actionLabel: "Ver stock",
      anchorId: "stock-en-riesgo",
    });
  }

  if (salesChangePct !== null && salesChangePct < 0) {
    const absDrop = Math.abs(salesChangePct);

    if (absDrop >= 15) {
      alerts.push({
        id: "caida-ventas",
        type: "caida_ventas",
        title: "Caída de ventas",
        message: `Las ventas bajaron ${round(absDrop)}% frente al período de referencia.`,
        severity: "alta",
        status: "nueva",
        metric: salesChangePct,
        actionLabel: "Ver tendencia",
        anchorId: "tendencia-ventas",
      });
    } else if (absDrop >= 8) {
      alerts.push({
        id: "caida-ventas",
        type: "caida_ventas",
        title: "Desaceleración comercial",
        message: `Las ventas bajaron ${round(absDrop)}%. Todavía no es crítico, pero requiere seguimiento.`,
        severity: "media",
        status: "nueva",
        metric: salesChangePct,
        actionLabel: "Ver tendencia",
        anchorId: "tendencia-ventas",
      });
    }
  }

  if (weakestBranchName && weakestBranchSharePct !== null) {
    if (weakestBranchSharePct <= 18) {
      alerts.push({
        id: "sucursal-rezagada",
        type: "sucursal_rezagada",
        title: "Sucursal rezagada",
        message: `${weakestBranchName} aporta solo ${round(
          weakestBranchSharePct
        )}% del total. Conviene revisar surtido, canal y ejecución comercial.`,
        severity: weakestBranchSharePct <= 12 ? "alta" : "media",
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

  return alerts.sort((a, b) => order[a.severity] - order[b.severity]);
}