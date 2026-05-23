export type CommercialRecommendationType =
  | "reponer_producto"
  | "promocionar_producto"
  | "revisar_margen"
  | "reducir_compra_futura"
  | "producto_estrella"
  | "revisar_caida_ventas"
  | "dato_atipico"
  | "crear_combo"
  | "liquidar_inventario"
  | "impulsar_sucursal"
  | "potenciar_canal";

export type CommercialRecommendationPriority = "alta" | "media" | "baja";

export type CommercialRecommendation = {
  id: string;
  type: CommercialRecommendationType;
  title: string;
  message: string;
  priority: CommercialRecommendationPriority;
  actionLabel: string;
  anchorId?: string;
  evidence: string[];
  metric?: number | null;
  productName?: string | null;
  branchName?: string | null;
  channelName?: string | null;
};

export type BuildCommercialRecommendationsInput = {
  rows: Record<string, unknown>[];
  stockMin: number;
};