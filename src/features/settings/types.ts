export type ChannelKey = "ecommerce" | "mayorista" | "tiendaFisica";

export type CurrencyCode = "USD" | "EUR" | "PEN" | "COP" | "MXN";

export type ProfileSettings = {
  businessName: string;
  businessWhatsapp: string;
  currencySymbol: string;
  currencyCode: string;
  locale: string;
  defaultStockMin: number;
  salesDropMediumPct: number;
  salesDropHighPct: number;
  showBenchmarking: boolean;
  showAssistant: boolean;
  channelsEnabled: {
    ecommerce: boolean;
    mayorista: boolean;
    tiendaFisica: boolean;
  };
};