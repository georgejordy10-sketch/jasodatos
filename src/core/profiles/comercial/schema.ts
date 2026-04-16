import type {
  BusinessProfile,
  CanonicalFieldDefinition,
  ProfileAnalyticsResult,
} from "../types";

const comercialFields: CanonicalFieldDefinition[] = [
  { key: "fecha", label: "Fecha", type: "date", required: true },
  { key: "sucursal", label: "Sucursal", type: "string", required: true },
  { key: "producto", label: "Producto", type: "string", required: true },
  { key: "sku", label: "SKU", type: "string", required: false },
  { key: "categoria", label: "Categoría", type: "string", required: false },
  { key: "cantidad", label: "Cantidad", type: "number", required: true },
  { key: "precio_unitario", label: "Precio Unitario", type: "number", required: true },
  { key: "costo_unitario", label: "Costo Unitario", type: "number", required: false },
  { key: "stock", label: "Stock", type: "number", required: false },
  { key: "canal", label: "Canal", type: "string", required: false },
  { key: "proveedor", label: "Proveedor", type: "string", required: false },
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

function analyzeComercial(rows: Record<string, unknown>[]): ProfileAnalyticsResult {
  let ventasTotales = 0;
  let unidadesTotales = 0;
  let stockCritico = 0;

  const ventasPorSucursal = new Map<string, number>();
  const ventasPorProducto = new Map<string, number>();
  const ventasPorMes = new Map<string, number>();

  for (const row of rows) {
    const sucursal = String(row.sucursal ?? "Sin sucursal");
    const producto = String(row.producto ?? "Sin producto");
    const cantidad = toNumber(row.cantidad);
    const precio = toNumber(row.precio_unitario);
    const venta = cantidad * precio;
    const mes = monthKeyFromValue(row.fecha);

    ventasTotales += venta;
    unidadesTotales += cantidad;

    if (row.stock !== undefined && row.stock !== null && row.stock !== "") {
      const stock = toNumber(row.stock);
      if (stock > 0 && stock <= 20) {
        stockCritico += 1;
      }
    }

    ventasPorSucursal.set(sucursal, (ventasPorSucursal.get(sucursal) ?? 0) + venta);
    ventasPorProducto.set(producto, (ventasPorProducto.get(producto) ?? 0) + venta);
    ventasPorMes.set(mes, (ventasPorMes.get(mes) ?? 0) + venta);
  }

  const topProductos = [...ventasPorProducto.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([producto, ventas]) => ({ producto, ventas }));

  const rankingSucursales = [...ventasPorSucursal.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([sucursal, ventas]) => ({ sucursal, ventas }));

  const tendenciaMensual = [...ventasPorMes.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([mes, ventas]) => ({ mes, ventas }));

  const alerts: string[] = [];
  if (stockCritico > 0) {
    alerts.push(`Se detectaron ${stockCritico} registros con stock crítico.`);
  }
  if (ventasTotales <= 0) {
    alerts.push("No se detectaron ventas positivas en el archivo procesado.");
  }

  return {
    kpis: {
      ventas_totales: ventasTotales,
      unidades_totales: unidadesTotales,
      stock_critico_registros: stockCritico,
      sucursales_analizadas: rankingSucursales.length,
      productos_analizados: ventasPorProducto.size,
    },
    charts: {
      tendencia_mensual: tendenciaMensual,
      ventas_por_sucursal: rankingSucursales,
      top_productos: topProductos,
    },
    tables: {
      ranking_sucursales: rankingSucursales,
      top_productos: topProductos,
      tendencia_mensual: tendenciaMensual,
    },
    alerts,
  };
}

export const comercialProfile: BusinessProfile = {
  id: "comercial",
  label: "Comercial",
  description: "Perfil para bodegas, ferreterías, farmacias y negocios con inventario y ventas.",
  fields: comercialFields,
  aliases: {
    fecha: ["fecha", "fecha venta", "fecha_venta", "date", "dia"],
    sucursal: ["sucursal", "tienda", "local", "agencia", "punto de venta", "pdv"],
    producto: ["producto", "articulo", "ítem", "item", "descripcion", "descripción", "nombre producto"],
    sku: ["sku", "codigo", "código", "cod producto", "codigo producto"],
    categoria: ["categoria", "categoría", "familia", "linea", "línea", "grupo"],
    cantidad: ["cantidad", "unidades", "qty", "cant vendida", "cantidad vendida"],
    precio_unitario: ["precio", "precio unitario", "pvp", "valor unitario", "precio venta"],
    costo_unitario: ["costo", "costo unitario", "coste", "valor costo"],
    stock: ["stock", "existencia", "inventario", "saldo", "stock actual"],
    canal: ["canal", "canal venta", "canal_venta", "medio de venta", "origen canal"],
    proveedor: ["proveedor", "supplier", "distribuidor"],
  },
  requiredFieldKeys: ["fecha", "sucursal", "producto", "cantidad", "precio_unitario"],
  dateFieldKeys: ["fecha"],
  numericFieldKeys: ["cantidad", "precio_unitario", "costo_unitario", "stock"],
  validateRow: (row) => {
    const errors: string[] = [];

    if (!row.fecha) errors.push("Falta fecha.");
    if (!row.sucursal) errors.push("Falta sucursal.");
    if (!row.producto) errors.push("Falta producto.");

    const cantidad = toNumber(row.cantidad);
    if (!row.cantidad && row.cantidad !== 0) {
      errors.push("Falta cantidad.");
    } else if (cantidad < 0) {
      errors.push("La cantidad no puede ser negativa.");
    }

    const precio = toNumber(row.precio_unitario);
    if (!row.precio_unitario && row.precio_unitario !== 0) {
      errors.push("Falta precio unitario.");
    } else if (precio < 0) {
      errors.push("El precio unitario no puede ser negativo.");
    }

    if (row.stock !== undefined && row.stock !== null && row.stock !== "") {
      const stock = toNumber(row.stock);
      if (stock < 0) {
        errors.push("El stock no puede ser negativo.");
      }
    }

    return errors;
  },
  analyze: analyzeComercial,
};