'use client';
import { useState } from 'react';

type KV = { key: string; total: number };
type LowItem = { sku: string; producto: string; stock: number };

type Insights = {
  ventas7?: number;
  deltaVentas7?: number;
  topProd?: { name?: string; share?: number; monto?: number };
  lowStock?: LowItem[];
  rango?: { desde?: string; hasta?: string };
};

type Resumen = {
  totalVentas?: number;
  porProducto?: KV[];
  porEmpresa?: KV[];
  porFecha?: KV[];
};

function openWhatsAppSafe(raw: string) {
  if (typeof window === 'undefined') return;
  const MAX_WA_CHARS = 900;

  const msg = (raw ?? '').trim().slice(0, MAX_WA_CHARS);
  if (!msg) return;

  const enc = encodeURIComponent(msg);
  const isMobile =
    typeof navigator !== 'undefined'
      ? /Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent)
      : false;

  const urlMobileDeep = `whatsapp://send?text=${enc}`;
  const urlMobileHttp = `https://api.whatsapp.com/send?text=${enc}`;
  const urlDesktopWeb = `https://web.whatsapp.com/send?text=${enc}`;

  const primary = isMobile ? urlMobileDeep : urlDesktopWeb;
  const fallback = urlMobileHttp;

  try {
    const win = window.open(primary, '_blank');
    if (!win) {
      window.location.href = fallback;
    }
  } catch {
    window.location.href = fallback;
  }
}

export default function JasoBotQA({
  insights,
  resumen,
}: {
  insights: Insights;
  resumen: Resumen;
}) {
  const [qInput, setQInput] = useState('');
  const [reply, setReply] = useState<string>('');
  const [loadingChat, setLoadingChat] = useState(false);
  const [sendingWA, setSendingWA] = useState(false);

  function buildContext() {
    return {
      kpis: {
        ventas7: insights?.ventas7 ?? 0,
        delta7: insights?.deltaVentas7 ?? 0,
        total: resumen?.totalVentas ?? 0,
      },
      topProducto: {
        nombre: insights?.topProd?.name ?? (resumen?.porProducto?.[0]?.key ?? '—'),
        share: insights?.topProd?.share ?? 0,
        monto: insights?.topProd?.monto ?? 0,
      },
      porProducto: resumen?.porProducto ?? [],
      porEmpresa: resumen?.porEmpresa ?? [],
      porFecha: resumen?.porFecha ?? [],
      lowStock: insights?.lowStock ?? [],
      rango: insights?.rango ?? null,
    };
  }

  function handleClear() {
    setQInput('');
    setReply('');
  }

  async function handleAsk() {
    const trimmed = qInput.trim();
    if (!trimmed) return;
    if (trimmed === '0') {
      handleClear();
      return;
    }

    try {
      setLoadingChat(true);
      const context = buildContext();
      const res = await fetch('/api/jasobot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed, context }),
      });
      const json = await res.json();
      setReply(json.reply || json.error || 'Sin respuesta.');
    } catch {
      setReply('No me pude comunicar con el asistente ahora.');
    } finally {
      setLoadingChat(false);
    }
  }

  async function handleSendWhatsApp() {
    if (!reply.trim() || sendingWA) return;
    setSendingWA(true);
    try {
      openWhatsAppSafe(reply);
    } finally {
      setTimeout(() => setSendingWA(false), 800);
    }
  }

  return (
    <div
      style={{
        display: 'grid',
        gap: 6,
        width: '100%',
        marginTop: 12,
      }}
    >
      <pre
        style={{
          margin: 0,
          padding: 8,
          fontSize: 12,
          background: '#f8fafc',
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          whiteSpace: 'pre-wrap',
          color: '#4f46e5',
        }}
      >{`Selecciona una opción (0–10) o escribe: "ventas 7 días", "stock", "combo", etc.
1 Resumen general
2 Ventas últimos 7 días
3 Lo más vendido (copiar)
4 Combo recomendado (top + bajo)
5 Stock en riesgo (top 9)
6 Tendencia general 7 días
7 Mejores locales/puntos
8 Productos con menor desempeño
9 Rango analizado
10 Recomendación de hoy`}</pre>

      {/* Input + botones principales */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <input
          placeholder='Escribe un número del (1–10) o "ventas 7 días"'
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              if (qInput.trim() === 'Limpiar') handleClear();
              else void handleAsk();
            }
          }}
          style={{
            flex: 1,
            padding: 8,
            border: '1px solid #fff',
            borderRadius: 8,
            fontSize: 12,
            background: '#fff',
            color: '#4f46e5',
          }}
        />

        <button
          type="button"
          onClick={handleClear}
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            background: '#4f46e5',
            color: '#f5f5f5',
            fontWeight: 700,
            fontSize: 12,
            border: '1px solid #e5e7eb',
          }}
          title="Borra el campo y el resultado"
        >
          Limpiar
        </button>

        <button
          onClick={handleAsk}
          disabled={loadingChat}
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            background: '#4f46e5',
            color: '#fff',
            fontWeight: 800,
            fontSize: 12,
            border: '1px solid #e5e7eb',
            cursor: loadingChat ? 'not-allowed' : 'pointer',
          }}
          title="Consultarle al asistente con las reglas actuales"
        >
          {loadingChat ? 'Generando…' : '⚡ Obtener'}
        </button>
      </div>

      {/* Resultado + botón WhatsApp */}
      {!!reply && (
        <div style={{ display: 'grid', gap: 6 }}>
          <div
            style={{
              whiteSpace: 'pre-wrap',
              fontSize: 13,
              color: '#4f46e5',
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              padding: 10,
            }}
          >
            {reply}
          </div>

          <div
            style={{
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              onClick={handleSendWhatsApp}
              disabled={sendingWA}
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                background: '#1D4ED8',
                color: '#F5F5F5',
                fontWeight: 700,
                fontSize: 12,
                border: '1px solid #e5e7eb',
                cursor: sendingWA ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 6px rgba(79,70,229,0.28)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
              title="Enviar este resultado a tu WhatsApp"
            >
              <span
                aria-hidden="true"
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: '#F5F5F5',
                }}
              />
              {sendingWA ? 'Enviando…' : 'Enviar este resultado a WhatsApp'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
