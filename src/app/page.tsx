'use client';

import React, { useMemo, useState } from 'react';
import CsvUploader from '@/components/CsvUploader';

// 🔽 Agrega estos imports porque abajo usas helpers y charts
import { Row, buildStockPorSku } from '@/utils/helpers';
import {
  kpisUlt7VsPrev,
  participacionPorProducto,
  productoEstrella,
  stockEnRiesgo,
  buildWhatsAppPromo,
} from '@/utils/analytics';
import {
  Kpi,
  DonutProductos,
  TrendVentasCard,
  AreaApiladaPorCanal,
  fmtMoney,
} from '@/components/Charts';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('💥 ErrorBoundary atrapó un error:', error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            padding: 24,
            background: '#fff7ed',
            color: '#b91c1c',
            border: '2px solid #f59e0b',
            borderRadius: 12,
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
          }}
        >
          <b>💥 Error en la app:</b>
          <br />
          {String(this.state.error?.message || this.state.error)}
        </div>
      );
    }
    return this.props.children as React.ReactElement;
  }
}

const SHOW_PAGE_VISUALS = true; // pon en false si quieres que solo renderice el CsvUploader

export default function Page() {
  // ⬇⬇⬇ ESTO ES CLAVE: tu estado y cálculos VAN DENTRO del componente, ANTES del return
  const [rows, setRows] = useState<Row[]>([]);
  const filteredRows = rows; // si luego aplicas filtros UI, reemplázalo aquí

  // ===== KPIs y prev (semana previa deducida del delta)
  const k = useMemo(
    () => (filteredRows.length ? kpisUlt7VsPrev(filteredRows) : null),
    [filteredRows]
  );

  const prevVentas = useMemo(() => {
    if (!k) return 0;
    return k.deltaVentasPct === -100
      ? 0
      : k.ventasTotales / (1 + k.deltaVentasPct / 100);
  }, [k]);

  // ===== Donut (formato { key,total })
  const donutData = useMemo(() => {
    if (!filteredRows.length) return [] as { key: string; total: number }[];
    const { items } = participacionPorProducto(filteredRows);
    return items.map((it) => ({ key: it.producto, total: it.total }));
  }, [filteredRows]);

  // ===== Producto estrella y WhatsApp
  const star = useMemo(
    () => (filteredRows.length ? productoEstrella(filteredRows) : null),
    [filteredRows]
  );

  const wa = useMemo(() => {
    if (!star) return null;
    return buildWhatsAppPromo({
      producto: star.producto,
      descuentoPct: 20,
      precio: (star.monto / Math.max(star.unidades, 1)) || undefined,
      telefono: '5939XXXXXXXX',
      copiar: false,
    });
  }, [star]);

  // ===== Stock en riesgo
  const riesgo = useMemo(() => {
    if (!filteredRows.length) return [];
    const map = buildStockPorSku(filteredRows);
    return stockEnRiesgo(map, 20); // tu threshold por defecto
  }, [filteredRows]);

  // ===== Insights 7 días (UI cards)
  const insights = useMemo(() => {
    if (!k) return null;
    const desde = k.rangoActual.desde.toLocaleDateString('es-EC', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const hasta = k.rangoActual.hasta.toLocaleDateString('es-EC', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const share = star && k.ventasTotales ? star.monto / k.ventasTotales : 0;
    return {
      rango: { desde, hasta },
      ventas7: k.ventasTotales,
      deltaVentas7: (k.deltaVentasPct ?? 0) / 100,
      topProd: { name: star?.producto ?? '', share, monto: star?.monto ?? 0 },
      lowStock: riesgo.map((x) => ({
        sku: x.sku,
        producto: x.producto,
        stock: x.stock,
      })),
    };
  }, [k, star, riesgo]);

  function copiarPromoProductoEstrella() {
    if (!insights?.topProd.name) return;
    const msg =
      `¡Promo de la semana! 🎉\n${insights.topProd.name} con precio especial solo por hoy.\n` +
      `Aprovecha: válido en ${insights.rango.desde}–${insights.rango.hasta}.\n` +
      `Consulta disponibilidad. #JasoDatos`;
    navigator.clipboard?.writeText(msg).catch(() => {});
    alert('Mensaje de promo copiado ✅');
  }

  // ⬇⬇⬇ y recién aquí renderizas
  return (
    <main style={{ padding: 24 }}>
      <ErrorBoundary>
        {/* 1) Carga CSV */}
        <section style={{ marginBottom: 16 }}>
          <CsvUploader onRows={(r) => setRows(r)} />
        </section>

        {/* 2) Insight cards */}
        {SHOW_PAGE_VISUALS && insights && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 12,
              marginTop: 8,
              marginBottom: 12,
            }}
          >
            {/* Ventas últimos 7 días */}
            <div
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: 12,
                padding: 12,
              }}
            >
              <div style={{ fontSize: 12, color: '#666' }}>
                Ventas últimos 7 días ({insights.rango.desde} → {insights.rango.hasta})
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>
                {fmtMoney(insights.ventas7)}
              </div>
              <div
                style={{
                  marginTop: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  color: insights.deltaVentas7 >= 0 ? '#065f46' : '#991b1b',
                }}
              >
                {insights.deltaVentas7 >= 0 ? '▲' : '▼'} {(insights.deltaVentas7 * 100).toFixed(1)}% vs. semana previa
              </div>
            </div>

            {/* Producto estrella */}
            <div
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: 12,
                padding: 12,
              }}
            >
              <div style={{ fontSize: 12, color: '#666' }}>Producto estrella (participación)</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4, minHeight: 24 }}>
                {insights.topProd.name || '—'}
              </div>
              <div style={{ fontSize: 14, color: '#444', marginTop: 4 }}>
                {insights.topProd.monto > 0
                  ? `${(insights.topProd.share * 100).toFixed(1)}% del total`
                  : 'Sin ventas en el período'}
              </div>
              <button
                type="button"
                onClick={copiarPromoProductoEstrella}
                disabled={!insights.topProd.name}
                style={{
                  marginTop: 8,
                  padding: '8px 12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  background: insights.topProd.name ? '#fff' : '#f3f4f6',
                  cursor: insights.topProd.name ? 'pointer' : 'not-allowed',
                }}
                title="Copiar mensaje listo para WhatsApp"
              >
                Copiar promo (WhatsApp)
              </button>
            </div>

            {/* Stock en riesgo */}
            <div
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: 12,
                padding: 12,
              }}
            >
              <div style={{ fontSize: 12, color: '#666' }}>Stock en riesgo (≤ 20 uds)</div>
              {insights.lowStock.length === 0 ? (
                <div style={{ marginTop: 6, color: '#065f46' }}>Todo OK ✅</div>
              ) : (
                <ul
                  style={{
                    marginTop: 6,
                    fontSize: 13,
                    color: '#444',
                    listStyle: 'disc',
                    paddingLeft: 16,
                  }}
                >
                  {insights.lowStock.map((x) => (
                    <li key={x.sku}>
                      <strong>{x.producto}</strong> — {x.sku} · {x.stock} uds
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* 3) KPIs */}
        {SHOW_PAGE_VISUALS && k && (
          <section
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 12,
            }}
          >
            <Kpi label="Ventas totales (últimos 7 días)" value={k.ventasTotales} prev={prevVentas} money />
            <Kpi label="Unidades (últimos 7 días)" value={k.unidades} prev={0} money={false} />
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: 12, color: '#666' }}>Filas visibles</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{k.filasVisibles}</div>
            </div>
          </section>
        )}

        {/* 4) Gráficas */}
        {SHOW_PAGE_VISUALS && filteredRows.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {/* Donut */}
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12 }}>
              <h3 style={{ margin: 0, marginBottom: 8, fontSize: 14, color: '#555' }}>Participación por producto</h3>
              <div style={{ height: 400, width: '100%' }}>
                <DonutProductos data={donutData} topN={12} minPercentForLabel={0.015} />
              </div>
            </div>

            {/* Tendencia */}
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12 }}>
              <h3 style={{ margin: 0, marginBottom: 8, fontSize: 14, color: '#555' }}>Tendencia (línea)</h3>
              <TrendVentasCard rows={filteredRows} ventanaMA={7} soloVentas height={260} />
            </div>

            {/* Área apilada */}
            <div style={{ gridColumn: '1 / -1', border: '1px solid #e5e7eb', borderRadius: 12, padding: 12 }}>
              <h3 style={{ margin: 0, marginBottom: 8, fontSize: 14, color: '#555' }}>Ventas por canal (apilado)</h3>
              <div style={{ height: 320, width: '100%' }}>
                <AreaApiladaPorCanal base={filteredRows} />
              </div>
            </div>
          </div>
        )}
      </ErrorBoundary>
    </main>
  );
}
