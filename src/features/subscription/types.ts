export type SubscriptionPlan = "basic" | "pro" | "ultra";

export type PlanFeature =
  | "alerts"
  | "benchmarking"
  | "assistant"
  | "pdf_export"
  | "whatsapp_actions";

export const PLAN_LABELS: Record<SubscriptionPlan, string> = {
  basic: "Basic",
  pro: "Pro",
  ultra: "Ultra",
};

export const PLAN_FEATURES: Record<SubscriptionPlan, PlanFeature[]> = {
  basic: ["alerts"],
  pro: ["alerts", "benchmarking", "assistant", "pdf_export"],
  ultra: ["alerts", "benchmarking", "assistant", "pdf_export", "whatsapp_actions"],
};

export const PLAN_FEATURE_LABELS: Record<PlanFeature, string> = {
  alerts: "Alertas del negocio",
  benchmarking: "Desempeño entre sucursales",
  assistant: "JasoBot Comercial",
  pdf_export: "Exportación a PDF",
  whatsapp_actions: "Acciones de WhatsApp",
};