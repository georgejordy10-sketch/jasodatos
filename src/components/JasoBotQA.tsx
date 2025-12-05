'use client';
import { useState } from 'react';

type KV = { key: string; total: number };
type LowItem = { sku: string; producto: string; stock: number };

export default function JasoBotQA({
  insights,
  resumen,
}: {
  insights: {
    ventas7?: number;
    deltaVentas7?: number;
    topProd?: { name?: string; share?: number; monto?: number };
    lowStock?: LowItem[];
    rango?: { desde?: string; hasta?: string };
  };
  resumen: {
    totalVentas?: number;
    porProducto?: KV[];
    porEmpresa?: KV[];
    porFecha?: KV[];
  };
}) {
  const [qInput, setQInput] = useState('');
  const [reply, setReply] = useState<string>('');
  const [loadingChat, setLoadingChat] = useState(false);

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

  return (
    <div style={{ display: 'grid', gap: 6, width: '100%', marginTop: 12 }}>
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

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
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
          style={{ flex: 1, padding: 8, border: '1px solid #fff', borderRadius: 8, fontSize: 12, background: '#fff', color: '#4f46e5',  }}
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

      {!!reply && (
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
      )}
    </div>
  );
}
