import type {
  BusinessProfile,
  CanonicalFieldDefinition,
  ProfileAnalyticsResult,
} from "../types";

const camaroneraFields: CanonicalFieldDefinition[] = [
  { key: "fecha", label: "Fecha", type: "date", required: true },
  { key: "piscina", label: "Piscina", type: "string", required: true },
  { key: "ciclo", label: "Ciclo", type: "string", required: true },
  { key: "biomasa", label: "Biomasa", type: "number", required: false },
  { key: "mortalidad", label: "Mortalidad", type: "number", required: false },
  { key: "supervivencia", label: "Supervivencia", type: "number", required: false },
  { key: "alimento", label: "Alimento", type: "number", required: false },
  { key: "produccion_lb", label: "Producción (lb)", type: "number", required: false },
  { key: "costo_total", label: "Costo Total", type: "number", required: false },
  { key: "densidad", label: "Densidad", type: "number", required: false },
];

function toNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  if (typeof value === "string") {
    const raw = value.trim();
    if (!raw) return 0;

    const hasComma = raw.includes(",");
    const hasDot = raw.includes(".");

    if (hasComma && hasDot) {
      const normalized = raw.replace(/\./g, "").replace(",", ".");
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : 0;
    }

    if (hasComma && !hasDot) {
      const normalized = raw.replace(",", ".");
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : 0;
    }

    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function monthKeyFromValue(value: unknown): string {
  const d = toDate(value);
  if (!d) return "sin-fecha";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function analyzeCamaronera(rows: Record<string, unknown>[]): ProfileAnalyticsResult {
  let biomasaTotal = 0;
  let mortalidadTotal = 0;
  let alimentoTotal = 0;
  let produccionTotalLb = 0;
  let costoTotal = 0;

  const produccionPorPiscina = new Map<string, number>();
  const biomasaPorMes = new Map<string, number>();
  const ciclos = new Set<string>();

  for (const row of rows) {
    const piscina = String(row.piscina ?? "Sin piscina");
    const ciclo = String(row.ciclo ?? "Sin ciclo");
    const biomasa = toNumber(row.biomasa);
    const mortalidad = toNumber(row.mortalidad);
    const alimento = toNumber(row.alimento);
    const produccionLb = toNumber(row.produccion_lb);
    const costo = toNumber(row.costo_total);
    const mes = monthKeyFromValue(row.fecha);

    biomasaTotal += biomasa;
    mortalidadTotal += mortalidad;
    alimentoTotal += alimento;
    produccionTotalLb += produccionLb;
    costoTotal += costo;

    produccionPorPiscina.set(
      piscina,
      (produccionPorPiscina.get(piscina) ?? 0) + produccionLb
    );

    biomasaPorMes.set(mes, (biomasaPorMes.get(mes) ?? 0) + biomasa);
    ciclos.add(ciclo);
  }

  const rankingPiscinas = [...produccionPorPiscina.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([piscina, produccion_lb]) => ({ piscina, produccion_lb }));

  const tendenciaBiomasa = [...biomasaPorMes.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([mes, biomasa]) => ({ mes, biomasa }));

  const costoPorLibra =
    produccionTotalLb > 0 ? costoTotal / produccionTotalLb : 0;

  const alerts: string[] = [];
  if (mortalidadTotal > 0) {
    alerts.push(`Se registró una mortalidad acumulada de ${mortalidadTotal}.`);
  }
  if (produccionTotalLb <= 0) {
    alerts.push("No se detectó producción positiva en libras.");
  }

  return {
    kpis: {
      biomasa_total: biomasaTotal,
      mortalidad_total: mortalidadTotal,
      alimento_total: alimentoTotal,
      produccion_total_lb: produccionTotalLb,
      costo_total: costoTotal,
      costo_por_libra: costoPorLibra,
      piscinas_analizadas: rankingPiscinas.length,
      ciclos_analizados: ciclos.size,
    },
    charts: {
      ranking_piscinas: rankingPiscinas,
      tendencia_biomasa: tendenciaBiomasa,
    },
    tables: {
      ranking_piscinas: rankingPiscinas,
      tendencia_biomasa: tendenciaBiomasa,
    },
    alerts,
  };
}

export const camaroneraProfile: BusinessProfile = {
  id: "camaronera",
  label: "Camaronera",
  description: "Perfil para análisis operativo y productivo acuícola.",
  fields: camaroneraFields,
  aliases: {
    fecha: ["fecha", "dia", "date", "fecha_registro"],
    piscina: ["piscina", "pool", "estanque", "unidad", "unidad_produccion"],
    ciclo: ["ciclo", "lote", "periodo", "período", "campaña"],
    biomasa: ["biomasa", "peso_total", "biomasa_estimada"],
    mortalidad: ["mortalidad", "muertes", "bajas"],
    supervivencia: ["supervivencia", "survival", "porcentaje_supervivencia"],
    alimento: ["alimento", "balanceado", "alimento_kg", "consumo_alimento"],
    produccion_lb: ["produccion_lb", "producción_lb", "cosecha_lb", "libras", "produccion", "producción"],
    costo_total: ["costo_total", "costo", "costo ciclo", "costo_produccion"],
    densidad: ["densidad", "densidad_siembra"],
  },
  requiredFieldKeys: ["fecha", "piscina", "ciclo"],
  dateFieldKeys: ["fecha"],
  numericFieldKeys: [
    "biomasa",
    "mortalidad",
    "supervivencia",
    "alimento",
    "produccion_lb",
    "costo_total",
    "densidad",
  ],
  validateRow: (row) => {
    const errors: string[] = [];

    if (!row.fecha) errors.push("Falta fecha.");
    if (!row.piscina) errors.push("Falta piscina.");
    if (!row.ciclo) errors.push("Falta ciclo.");

    const mortalidad = toNumber(row.mortalidad);
    if (row.mortalidad !== undefined && mortalidad < 0) {
      errors.push("La mortalidad no puede ser negativa.");
    }

    const supervivencia = toNumber(row.supervivencia);
    if (
      row.supervivencia !== undefined &&
      (supervivencia < 0 || supervivencia > 100)
    ) {
      errors.push("La supervivencia debe estar entre 0 y 100.");
    }

    const biomasa = toNumber(row.biomasa);
    if (row.biomasa !== undefined && biomasa < 0) {
      errors.push("La biomasa no puede ser negativa.");
    }

    const alimento = toNumber(row.alimento);
    if (row.alimento !== undefined && alimento < 0) {
      errors.push("El alimento no puede ser negativo.");
    }

    const produccionLb = toNumber(row.produccion_lb);
    if (row.produccion_lb !== undefined && produccionLb < 0) {
      errors.push("La producción en libras no puede ser negativa.");
    }

    const costoTotal = toNumber(row.costo_total);
    if (row.costo_total !== undefined && costoTotal < 0) {
      errors.push("El costo total no puede ser negativo.");
    }

    return errors;
  },
  analyze: analyzeCamaronera,
};