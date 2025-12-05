// src/app/api/jasobot/route.ts
import { NextResponse } from 'next/server';

/** IDs de preguntas soportadas (reglas, sin LLM) */
type QID =
  | 'resumenGeneral'
  | 'ventas7'
  | 'topProducto'
  | 'comboTopBottom'
  | 'stockRiesgo'
  | 'tendencia'
  | 'mejoresEmpresas'
  | 'peoresProductos'
  | 'rangoFechas'
  | 'recomendacionHoy';

type PorKV = { key: string; total: number };
type LowItem = { sku: string; producto: string; stock: number };

type Ctx = {
  kpis?: { ventas7?: number; delta7?: number; total?: number };
  topProducto?: { nombre?: string; share?: number; monto?: number };
  porProducto?: PorKV[];
  porEmpresa?: PorKV[];
  porFecha?: PorKV[];
  lowStock?: LowItem[];
  rango?: { desde?: string; hasta?: string };
};

const FALLBACK =
  'Para un análisis más profundo, contáctate con JasoDatos y te damos las respuestas. 💼';

/* ========================= ROUTE ========================= */
export async function POST(req: Request) {
  try {
    const { questionId, text, context } = (await req.json()) as {
      questionId?: QID;
      text?: string;
      context?: Ctx;
    };

    // 1) Si viene texto del “chat”, intentamos mapearlo a una QID
    let q: QID | null = null;
    if (typeof text === 'string' && text.trim()) {
      q = mapTextToQID(text.trim());
    }

    // 2) Si no hay texto válido pero viene questionId (legacy), úsalo
    if (!q && questionId) q = questionId;

    // 3) Si no mapeó a nada: devolver SOLO el fallback
    if (!q) {
      return NextResponse.json({ reply: FALLBACK });
    }

    // 4) Responder por reglas
    const reply = answerByRules(q, context || {});
    return NextResponse.json({ reply });
  } catch {
    // pase lo que pase, NO devolvemos menú ni nada extra
    return NextResponse.json({ reply: FALLBACK }, { status: 200 });
  }
}

/* ===================== MAPEADOR TEXTO -> QID ===================== */
function mapTextToQID(raw: string): QID | null {
  const s = normalize(raw);

  // número 0..10 (0 lo maneja el front para limpiar)
  const m = s.match(/^(\d{1,2})$/);
  if (m) {
    const n = Number(m[1]);
    if (n === 0) return null;
    if (n === 1) return 'resumenGeneral';
    if (n === 2) return 'ventas7';
    if (n === 3) return 'topProducto';
    if (n === 4) return 'comboTopBottom';
    if (n === 5) return 'stockRiesgo';
    if (n === 6) return 'tendencia';
    if (n === 7) return 'mejoresEmpresas';
    if (n === 8) return 'peoresProductos';
    if (n === 9) return 'rangoFechas';
    if (n === 10) return 'recomendacionHoy';
    return null;
  }

  // keywords (flexibles)
  if (hasAll(s, ['resumen'])) return 'resumenGeneral';
  if (hasAny(s, ['venta 7', '7 dia', 'ultimos 7', 'ventas semana']))
    return 'ventas7';
  if (hasAny(s, ['top', 'mas vendido', 'estrella', 'lider']))
    return 'topProducto';
  if (hasAny(s, ['combo', 'cruzad']))
    return 'comboTopBottom';
  if (hasAny(s, ['stock', 'riesgo', 'agot', 'inventario']))
    return 'stockRiesgo';
  if (hasAny(s, ['tendencia', 'trend']))
    return 'tendencia';
  if (hasAny(s, ['mejores empresa', 'top empresa', 'puntos']))
    return 'mejoresEmpresas';
  if (hasAny(s, ['peores', 'bajo desempeno', 'dormido']))
    return 'peoresProductos';
  if (hasAny(s, ['rango', 'periodo', 'desde', 'hasta']))
    return 'rangoFechas';
  if (hasAny(s, ['hoy', 'recomendacion']))
    return 'recomendacionHoy';

  return null; // 👈 nada coincide => el front mostrará SOLO el fallback
}

function normalize(t: string) {
  return t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
function hasAny(s: string, kws: string[]) {
  return kws.some((k) => s.includes(k));
}
function hasAll(s: string, kws: string[]) {
  return kws.every((k) => s.includes(k));
}

/* ======================== REGLAS (10) ======================== */
function answerByRules(q: QID, ctx: Ctx): string {
  switch (q) {
    case 'ventas7': {
      const v = safeNum(ctx.kpis?.ventas7);
      const d = safeNum(ctx.kpis?.delta7);
      const dir = d >= 0.1 ? 'en alza' : d <= -0.1 ? 'a la baja' : 'estable';
      return `📈 Ventas últimos 7 días: ${money(v)} (${(d * 100).toFixed(1)}% • ${dir}).
Recomendación: refuerza el canal ganador con una promo de 48h y foco en el top producto.`;
    }
    case 'topProducto': {
      const name = ctx.topProducto?.nombre || 'Producto top';
      const share = percent(ctx.topProducto?.share);
      const monto = money(ctx.topProducto?.monto ?? 0);
      return `🌟 Lo más vendido: ${name} • ${share} del total (${monto}).
Texto recomendado A: “${name} al mejor precio por 48h. ¡Aprovecha ahora!”
Texto recomendado B: “${name} lidera ventas esta semana. Pide el tuyo hoy.”`;
    }
    case 'comboTopBottom': {
      const top = ctx.topProducto?.nombre || ctx.porProducto?.[0]?.key || 'Producto top';
      const bottom =
        ctx.porProducto?.[ctx.porProducto.length - 1]?.key ||
        'producto de baja rotación';
      return `🤝 Combo recomendado: ${top} + ${bottom}.
Texto recomendado A: “Activa ${bottom} con ${top}: combo especial hoy y mañana.”
Texto recomendado B: “Llévate ${top} + ${bottom} en combo inteligente. ¡Stock limitado!”
Vamos a la acción: Responde “QUIERO” y te asesoramos por WhatsApp.`;
    }
    case 'stockRiesgo': {
      const items = (ctx.lowStock || []).slice(0, 9);
      if (!items.length) return '✅ No hay stock en riesgo según el umbral actual.';
      const listado = items
        .map((x, i) => {
          const cat = i < 3 ? 'CRÍTICO' : i < 6 ? 'EN RIESGO' : 'ATENCIÓN';
          const val =
            x.stock >= 0
              ? `${num(x.stock)} uds`
              : `Hay ${num(Math.abs(x.stock))} uds de déficit`;
          return `• ${cat} — ${x.producto} (${x.sku}): ${val}`;
        })
        .join('\n');
      return `🚨 Stock en riesgo (top 9):\n${listado}\nAcción: compra urgente de los 3 críticos y promo rotativa de los de “atención”.`;
    }
    case 'tendencia': {
      const d = safeNum(ctx.kpis?.delta7);
      const dir = d >= 0.1 ? 'subiendo' : d <= -0.1 ? 'bajando' : 'estable';
      return `📊 Tendencia 7d: ${dir} (${(d * 100).toFixed(1)}%).
Siguiente paso: refuerza canales fuertes y ajusta precio/pack en los débiles.`;
    }
    case 'mejoresEmpresas': {
      const top = (ctx.porEmpresa || []).slice(0, 3);
      if (!top.length) return 'No hay datos de empresas suficientes para ranking.';
      const lines = top
        .map((e, i) => `#${i + 1} ${e.key} — ${money(e.total)}`)
        .join('\n');
      return `🏢 Top empresas / puntos de venta:\n${lines}\nRecomendación: replica la acción de la #1 en el resto por 7 días.`;
    }
    case 'peoresProductos': {
      const arr = (ctx.porProducto || []).slice(-3);
      if (!arr.length) return 'No hay base para identificar peores productos.';
      const lines = arr.map((e) => `• ${e.key} — ${money(e.total)}`).join('\n');
      return `🧊 Productos con menor desempeño:\n${lines}\nAcción: incluir en combos, mejorar exhibición y activar beneficio claro (precio o valor agregado).`;
    }
    case 'resumenGeneral': {
      const total = money(safeNum(ctx.kpis?.total));
      const top = ctx.topProducto?.nombre || ctx.porProducto?.[0]?.key || '—';
      const share = percent(ctx.topProducto?.share);
      const rango = ctx.rango
        ? `Período: ${ctx.rango.desde} → ${ctx.rango.hasta}`
        : '';
      return `🧭 Resumen ejecutivo: ventas ${total}. Top: ${top} (${share}). ${rango}
Siguiente paso: campaña “48h” con el top y rotación de dormidos.`;
    }
    case 'rangoFechas': {
      if (!ctx.rango?.desde || !ctx.rango?.hasta)
        return 'No hay rango de fechas visible.';
      return `🗓️ Analizando del ${ctx.rango.desde} al ${ctx.rango.hasta}.
Tip: muévete en tramos de 7 días para comparar semana vs semana.`;
    }
    case 'recomendacionHoy': {
      const top = ctx.topProducto?.nombre || ctx.porProducto?.[0]?.key || 'Producto top';
      return `🚀 Recomendación de hoy:
1) Lanzar “combo inteligente” con ${top} y un producto de baja rotación.
2) Historia de impacto (reseña o cifra de ventas).
3) Urgencia: “solo 48h”.
${FALLBACK}`;
    }
  }
}

/* ======================== helpers ======================== */
function money(n: number) {
  try {
    return (n || 0).toLocaleString('es-EC', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    });
  } catch {
    return `$${(n || 0).toFixed(2)}`;
  }
}
function num(n: number) {
  try {
    return (n || 0).toLocaleString('es-EC');
  } catch {
    return String(n || 0);
  }
}
function percent(p?: number) {
  if (p == null || isNaN(p)) return '0.0%';
  return `${(p * 100).toFixed(1)}%`;
}
function safeNum(n: any) {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}
