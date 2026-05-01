import type { ProfileSettings } from "./types";

export const DEFAULT_PROFILE_SETTINGS: ProfileSettings = {
  businessName: "JasoDatos Demo",
  businessWhatsapp: "+593",
  currencySymbol: "$",
  currencyCode: "USD",
  locale: "es-EC",
  defaultStockMin: 20,
  salesDropMediumPct: 8,
  salesDropHighPct: 15,
  showBenchmarking: true,
  showAssistant: true,
  channelsEnabled: {
    ecommerce: true,
    mayorista: true,
    tiendaFisica: true,
  },
};