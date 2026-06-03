"use client";

import { useMemo, useState, type CSSProperties } from "react";
import type {
  AdminProspectOverview,
  ProspectFit,
  ProspectPipelineStage,
  ProspectPriority,
  ProspectTemperature,
} from "./types";
import {
  jasoJevasaPlanLabel,
  prospectStageLabel,
} from "./types";

type Props = {
  rows: AdminProspectOverview[];
};

type FilterValue = "all" | ProspectPipelineStage;

function formatDate(value: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("es-EC", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatDateTime(value: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("es-EC", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function temperatureLabel(value: ProspectTemperature) {
  if (value === "frio") return "Frío";
  if (value === "tibio") return "Tibio";
  if (value === "caliente") return "Caliente";
  return "Muy caliente";
}

function fitLabel(value: ProspectFit) {
  if (value === "bajo") return "Bajo";
  if (value === "medio") return "Medio";
  if (value === "alto") return "Alto";
  return "Ideal";
}

function priorityLabel(value: ProspectPriority) {
  if (value === "baja") return "Baja";
  if (value === "media") return "Media";
  if (value === "alta") return "Alta";
  return "Urgente";
}

function priorityPillStyle(value: ProspectPriority): CSSProperties {
  if (value === "urgente") {
    return { background: "rgba(220,38,38,0.12)", color: "#B91C1C" };
  }

  if (value === "alta") {
    return { background: "rgba(234,88,12,0.14)", color: "#C2410C" };
  }

  if (value === "media") {
    return { background: "rgba(245,158,11,0.14)", color: "#B45309" };
  }

  return { background: "rgba(100,116,139,0.14)", color: "#475569" };
}

function temperaturePillStyle(value: ProspectTemperature): CSSProperties {
  if (value === "muy_caliente") {
    return { background: "rgba(220,38,38,0.12)", color: "#B91C1C" };
  }

  if (value === "caliente") {
    return { background: "rgba(234,88,12,0.14)", color: "#C2410C" };
  }

  if (value === "tibio") {
    return { background: "rgba(59,130,246,0.14)", color: "#1D4ED8" };
  }

  return { background: "rgba(100,116,139,0.14)", color: "#475569" };
}

function stagePillStyle(value: ProspectPipelineStage): CSSProperties {
  if (
    value === "ganado" ||
    value === "convertido_cliente" ||
    value === "demo_agendada"
  ) {
    return { background: "rgba(34,197,94,0.14)", color: "#166534" };
  }

  if (
    value === "interesado" ||
    value === "diagnostico_pendiente" ||
    value === "diagnostico_enviado" ||
    value === "propuesta_pendiente" ||
    value === "negociacion"
  ) {
    return { background: "rgba(245,158,11,0.14)", color: "#B45309" };
  }

  if (
    value === "perdido" ||
    value === "no_contactar" ||
    value === "fuera_de_perfil"
  ) {
    return { background: "rgba(100,116,139,0.16)", color: "#475569" };
  }

  return { background: "rgba(59,130,246,0.14)", color: "#1D4ED8" };
}

function getNextActionStatus(value: string | null) {
  if (!value) return "Sin próxima acción";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Sin próxima acción";

  const now = new Date();

  if (date.getTime() < now.getTime()) {
    return "Vencida";
  }

  return "Pendiente";
}

export default function AdminProspectsTable({ rows }: Props) {
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<FilterValue>("all");
  const [selectedId, setSelectedId] = useState<string | null>(
    rows[0]?.id ?? null
  );

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesStage =
        stageFilter === "all" || row.pipeline_stage === stageFilter;

      const matchesSearch =
        !normalizedSearch ||
        [
          row.business_name,
          row.contact_name,
          row.email,
          row.whatsapp,
          row.city,
          row.business_type,
          row.owner_name,
          row.source,
          row.pipeline_stage,
          row.lead_temperature,
          row.lead_fit,
          row.lead_priority,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value).toLowerCase().includes(normalizedSearch)
          );

      return matchesStage && matchesSearch;
    });
  }, [rows, search, stageFilter]);

  const selectedProspect =
    filteredRows.find((row) => row.id === selectedId) ??
    filteredRows[0] ??
    null;

  const hotCount = rows.filter(
    (row) =>
      row.lead_temperature === "caliente" ||
      row.lead_temperature === "muy_caliente"
  ).length;

  const urgentCount = rows.filter(
    (row) => row.lead_priority === "urgente"
  ).length;

  const wonCount = rows.filter(
    (row) =>
      row.pipeline_stage === "ganado" ||
      row.pipeline_stage === "convertido_cliente"
  ).length;

  return (
    <section style={styles.wrapper}>
      <header style={styles.header}>
        <div>
          <p style={styles.eyebrow}>JasoJevasa v1</p>
          <h1 style={styles.title}>Prospectos comerciales</h1>
          <p style={styles.subtitle}>
            Captación, seguimiento y priorización de oportunidades antes de
            convertirlas en clientes de JasoDatos.
          </p>
        </div>

        <div style={styles.headerBadge}>
          <span style={styles.headerBadgeLabel}>Motor comercial</span>
          <strong style={styles.headerBadgeValue}>Controlado</strong>
        </div>
      </header>

      <div style={styles.metricsGrid}>
        <MetricCard label="Prospectos" value={rows.length} />
        <MetricCard label="Calientes" value={hotCount} />
        <MetricCard label="Urgentes" value={urgentCount} />
        <MetricCard label="Ganados" value={wonCount} />
      </div>

      <div style={styles.toolbar}>
        <label style={styles.searchBox}>
          <span style={styles.searchLabel}>Buscar prospecto</span>
          <input
            style={styles.searchInput}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Negocio, contacto, ciudad, WhatsApp, responsable..."
          />
        </label>

        <label style={styles.filterBox}>
          <span style={styles.searchLabel}>Estado</span>
          <select
            style={styles.select}
            value={stageFilter}
            onChange={(event) =>
              setStageFilter(event.target.value as FilterValue)
            }
          >
            <option value="all">Todos</option>
            <option value="nuevo">Nuevo</option>
            <option value="investigado">Investigado</option>
            <option value="contactado">Contactado</option>
            <option value="interesado">Interesado</option>
            <option value="demo_agendada">Demo agendada</option>
            <option value="diagnostico_pendiente">
              Diagnóstico pendiente
            </option>
            <option value="propuesta_pendiente">Propuesta pendiente</option>
            <option value="negociacion">Negociación</option>
            <option value="ganado">Ganado</option>
            <option value="perdido">Perdido</option>
            <option value="no_contactar">No contactar</option>
            <option value="fuera_de_perfil">Fuera de perfil</option>
          </select>
        </label>
      </div>

      {selectedProspect ? (
        <div style={styles.detailPanel}>
          <div>
            <p style={styles.detailEyebrow}>Prospecto seleccionado</p>
            <h2 style={styles.detailTitle}>
              {selectedProspect.business_name}
            </h2>
            <p style={styles.detailMeta}>
              {selectedProspect.business_type || "Tipo no definido"} ·{" "}
              {selectedProspect.city || "Ciudad no definida"} · Responsable:{" "}
              {selectedProspect.owner_name || "Sin asignar"}
            </p>
          </div>

          <div style={styles.detailActions}>
            <span
              style={{
                ...styles.pill,
                ...stagePillStyle(selectedProspect.pipeline_stage),
              }}
            >
              {prospectStageLabel(selectedProspect.pipeline_stage)}
            </span>

            <span
              style={{
                ...styles.pill,
                ...priorityPillStyle(selectedProspect.lead_priority),
              }}
            >
              {priorityLabel(selectedProspect.lead_priority)}
            </span>
          </div>

          <div style={styles.detailGrid}>
            <DetailItem label="Contacto" value={selectedProspect.contact_name} />
            <DetailItem label="WhatsApp" value={selectedProspect.whatsapp} />
            <DetailItem label="Correo" value={selectedProspect.email} />
            <DetailItem
              label="Plan sugerido"
              value={jasoJevasaPlanLabel(selectedProspect.recommended_plan)}
            />
            <DetailItem
              label="Próxima acción"
              value={formatDateTime(selectedProspect.next_action_at)}
            />
            <DetailItem
              label="Estado próxima acción"
              value={getNextActionStatus(selectedProspect.next_action_at)}
            />
          </div>

          {selectedProspect.notes ? (
            <div style={styles.notesBox}>
              <strong>Notas:</strong> {selectedProspect.notes}
            </div>
          ) : null}
        </div>
      ) : null}

      <div style={styles.tableCard}>
        <div style={styles.tableHeader}>
          <strong>{filteredRows.length} prospectos</strong>
          <span>Vista inicial de JasoJevasa</span>
        </div>

        <div style={styles.tableScroll}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Negocio</th>
                <th style={styles.th}>Contacto</th>
                <th style={styles.th}>Ciudad</th>
                <th style={styles.th}>Estado</th>
                <th style={styles.th}>Temperatura</th>
                <th style={styles.th}>Fit</th>
                <th style={styles.th}>Prioridad</th>
                <th style={styles.th}>Plan</th>
                <th style={styles.th}>Responsable</th>
                <th style={styles.th}>Próxima acción</th>
                <th style={styles.th}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td style={styles.emptyCell} colSpan={11}>
                    No se encontraron prospectos.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row.id} style={styles.tr}>
                    <td style={styles.td}>
                      <strong style={styles.businessName}>
                        {row.business_name}
                      </strong>
                      <span style={styles.smallText}>
                        {row.business_type || "-"}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <strong>{row.contact_name || "-"}</strong>
                      <span style={styles.smallText}>{row.whatsapp || "-"}</span>
                    </td>
                    <td style={styles.td}>{row.city || "-"}</td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.pill,
                          ...stagePillStyle(row.pipeline_stage),
                        }}
                      >
                        {prospectStageLabel(row.pipeline_stage)}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.pill,
                          ...temperaturePillStyle(row.lead_temperature),
                        }}
                      >
                        {temperatureLabel(row.lead_temperature)}
                      </span>
                    </td>
                    <td style={styles.td}>{fitLabel(row.lead_fit)}</td>
                    <td style={styles.td}>
                      <span
                        style={{
                          ...styles.pill,
                          ...priorityPillStyle(row.lead_priority),
                        }}
                      >
                        {priorityLabel(row.lead_priority)}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {jasoJevasaPlanLabel(row.recommended_plan)}
                    </td>
                    <td style={styles.td}>{row.owner_name || "-"}</td>
                    <td style={styles.td}>
                      <span>{formatDate(row.next_action_at)}</span>
                      <span style={styles.smallText}>
                        {getNextActionStatus(row.next_action_at)}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <button
                        type="button"
                        style={{
                          ...styles.actionButton,
                          ...(selectedProspect?.id === row.id
                            ? styles.actionButtonActive
                            : null),
                        }}
                        onClick={() => setSelectedId(row.id)}
                      >
                        {selectedProspect?.id === row.id
                          ? "Seleccionado"
                          : "Gestionar"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <article style={styles.metricCard}>
      <span style={styles.metricLabel}>{label}</span>
      <strong style={styles.metricValue}>{value}</strong>
    </article>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div style={styles.detailItem}>
      <span>{label}</span>
      <strong>{value || "-"}</strong>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  wrapper: {
    minHeight: "100vh",
    padding: 16,
    background:
      "linear-gradient(135deg, #F8FAFC 0%, #EEF2FF 45%, #F8FAFC 100%)",
    color: "#0F172A",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "flex-start",
    marginBottom: 16,
    padding: 20,
    borderRadius: 24,
    background: "linear-gradient(135deg, #2E0D4F 0%, #3D2C8D 100%)",
    color: "#FFFFFF",
    boxShadow: "0 22px 50px rgba(46,13,79,0.22)",
  },
  eyebrow: {
    margin: "0 0 6px",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: "#C4B5FD",
  },
  title: {
    margin: 0,
    fontSize: 30,
    lineHeight: 1.1,
  },
  subtitle: {
    margin: "8px 0 0",
    maxWidth: 720,
    color: "#DDD6FE",
    fontSize: 14,
    lineHeight: 1.5,
  },
  headerBadge: {
    minWidth: 160,
    padding: 14,
    borderRadius: 18,
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.22)",
  },
  headerBadgeLabel: {
    display: "block",
    fontSize: 12,
    color: "#DDD6FE",
  },
  headerBadgeValue: {
    display: "block",
    marginTop: 4,
    fontSize: 18,
  },
  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    padding: 16,
    borderRadius: 20,
    background: "#FFFFFF",
    border: "1px solid rgba(148,163,184,0.28)",
    boxShadow: "0 12px 28px rgba(15,23,42,0.08)",
  },
  metricLabel: {
    display: "block",
    color: "#64748B",
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  metricValue: {
    display: "block",
    marginTop: 8,
    fontSize: 28,
    color: "#2E0D4F",
  },
  toolbar: {
    display: "flex",
    gap: 12,
    alignItems: "flex-end",
    marginBottom: 16,
  },
  searchBox: {
    flex: 1,
    display: "grid",
    gap: 6,
  },
  filterBox: {
    width: 260,
    display: "grid",
    gap: 6,
  },
  searchLabel: {
    fontSize: 12,
    fontWeight: 800,
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  searchInput: {
    height: 42,
    borderRadius: 14,
    border: "1px solid rgba(148,163,184,0.42)",
    padding: "0 14px",
    fontSize: 14,
    outline: "none",
    background: "#FFFFFF",
  },
  select: {
    height: 42,
    borderRadius: 14,
    border: "1px solid rgba(148,163,184,0.42)",
    padding: "0 12px",
    fontSize: 14,
    outline: "none",
    background: "#FFFFFF",
  },
  detailPanel: {
    marginBottom: 16,
    padding: 18,
    borderRadius: 24,
    background: "#FFFFFF",
    border: "1px solid rgba(148,163,184,0.28)",
    boxShadow: "0 16px 36px rgba(15,23,42,0.08)",
  },
  detailEyebrow: {
    margin: 0,
    fontSize: 12,
    fontWeight: 800,
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  detailTitle: {
    margin: "4px 0 0",
    fontSize: 24,
    color: "#111827",
  },
  detailMeta: {
    margin: "6px 0 0",
    color: "#64748B",
    fontSize: 14,
  },
  detailActions: {
    display: "flex",
    gap: 8,
    marginTop: 14,
    flexWrap: "wrap",
  },
  detailGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 10,
    marginTop: 16,
  },
  detailItem: {
    padding: 12,
    borderRadius: 16,
    background: "#F8FAFC",
    border: "1px solid rgba(148,163,184,0.22)",
    display: "grid",
    gap: 4,
  },
  notesBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 16,
    background: "#F8FAFC",
    border: "1px solid rgba(148,163,184,0.22)",
    color: "#334155",
  },
  tableCard: {
    borderRadius: 24,
    background: "#FFFFFF",
    border: "1px solid rgba(148,163,184,0.28)",
    boxShadow: "0 16px 36px rgba(15,23,42,0.08)",
    overflow: "hidden",
  },
  tableHeader: {
    display: "flex",
    justifyContent: "space-between",
    padding: "14px 16px",
    borderBottom: "1px solid rgba(148,163,184,0.22)",
    color: "#475569",
  },
  tableScroll: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 1120,
  },
  th: {
    padding: "12px 14px",
    textAlign: "left",
    fontSize: 12,
    color: "#64748B",
    background: "#F8FAFC",
    borderBottom: "1px solid rgba(148,163,184,0.22)",
    whiteSpace: "nowrap",
  },
  tr: {
    borderBottom: "1px solid rgba(148,163,184,0.18)",
  },
  td: {
    padding: "12px 14px",
    verticalAlign: "middle",
    fontSize: 14,
    color: "#334155",
  },
  businessName: {
    display: "block",
    color: "#111827",
    marginBottom: 3,
  },
  smallText: {
    display: "block",
    marginTop: 3,
    fontSize: 12,
    color: "#64748B",
  },
  pill: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 24,
    padding: "3px 9px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    whiteSpace: "nowrap",
  },
  actionButton: {
    border: "1px solid rgba(46,13,79,0.22)",
    background: "#FFFFFF",
    color: "#2E0D4F",
    padding: "8px 12px",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 800,
  },
  actionButtonActive: {
    background: "#2E0D4F",
    color: "#FFFFFF",
  },
  emptyCell: {
    padding: 24,
    textAlign: "center",
    color: "#64748B",
  },
};
