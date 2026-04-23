export type AlertSeverity = "alta" | "media" | "baja";
export type AlertStatus = "nueva" | "vista" | "resuelta" | "silenciada";

export type BusinessAlertType =
  | "stock_critico"
  | "caida_ventas"
  | "sucursal_rezagada"
  | "concentracion_producto";

export type BusinessAlert = {
  id: string;
  type: BusinessAlertType;
  title: string;
  message: string;
  severity: AlertSeverity;
  status: AlertStatus;
  metric?: number | null;
  actionLabel?: string;
  anchorId?: string;
};

export type BuildAlertsInput = {
  stockCriticalCount?: number | null;
  salesChangePct?: number | null;
  weakestBranchName?: string | null;
  weakestBranchSharePct?: number | null;
  topProductSharePct?: number | null;
  topProductName?: string | null;
};