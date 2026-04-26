"use client";

import { useMemo, useState, type CSSProperties } from "react";
import type { AdminBusinessOverview } from "./types";

type Props = {
  rows: AdminBusinessOverview[];
};

type Plan = AdminBusinessOverview["plan"];

function planLabel(plan: Plan) {
  if (plan === "basic") return "Basic";
  if (plan === "pro") return "Pro";
  return "Ultra";
}

function planPillStyle(plan: Plan): CSSProperties {
  if (plan === "basic") {
    return {
      background: "linear-gradient(135deg, #475569 0%, #64748B 100%)",
      color: "#FFFFFF",
    };
  }

  if (plan === "pro") {
    return {
      background: "linear-gradient(135deg, #4338CA 0%, #6366F1 100%)",
      color: "#FFFFFF",
    };
  }

  return {
    background: "linear-gradient(135deg, #16A34A 0%, #22C55E 100%)",
    color: "#FFFFFF",
  };
}

function statusPillStyle(status: AdminBusinessOverview["status"]): CSSProperties {
  if (status === "active") {
    return { background: "rgba(34,197,94,0.14)", color: "#166534" };
  }

  if (status === "trial") {
    return { background: "rgba(59,130,246,0.14)", color: "#1D4ED8" };
  }

  if (status === "suspended") {
    return { background: "rgba(239,68,68,0.14)", color: "#B91C1C" };
  }

  return { background: "rgba(148,163,184,0.16)", color: "#475569" };
}

function billingPillStyle(
  status: AdminBusinessOverview["billing_status"]
): CSSProperties {
  if (status === "active") {
    return { background: "rgba(34,197,94,0.14)", color: "#166534" };
  }

  if (status === "trial") {
    return { background: "rgba(245,158,11,0.14)", color: "#B45309" };
  }

  if (status === "past_due") {
    return { background: "rgba(239,68,68,0.14)", color: "#B91C1C" };
  }

  if (status === "canceled") {
    return { background: "rgba(100,116,139,0.16)", color: "#475569" };
  }

  return { background: "rgba(99,102,241,0.14)", color: "#4338CA" };
}
function getOptionalText(row: AdminBusinessOverview, key: string) {
  const value = (row as unknown as Record<string, unknown>)[key];

  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);

  return "";
}

function csvCell(value: string | number | null | undefined) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function buildClientsCsv(rows: AdminBusinessOverview[]) {
  const headers = [
    "Nombre del local",
    "Identificador",
    "Nombre del dueño",
    "Correo",
    "WhatsApp",
    "Plan",
    "Estado del cliente",
    "Estado de facturación",
    "Usuarios",
    "Última actividad",
  ];

  const body = rows.map((row) => {
    const ownerName =
      getOptionalText(row, "owner_name") ||
      getOptionalText(row, "owner_full_name") ||
      getOptionalText(row, "owner");

    return [
      row.business_name,
      row.slug,
      ownerName,
      row.owner_email || "",
      row.owner_whatsapp || "",
      planLabel(row.plan),
      row.status,
      row.billing_status,
      row.users_count,
      row.last_seen_at || "",
    ]
      .map(csvCell)
      .join(";");
  });

  return [headers.map(csvCell).join(";"), ...body].join("\r\n");
}

function downloadTextFile(content: string, filename: string) {
  const blob = new Blob(["\uFEFF" + content], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
export default function AdminClientsTable({ rows }: Props) {
  const [tableRows, setTableRows] = useState(rows);
  const [draftPlans, setDraftPlans] = useState<Record<string, Plan>>(
    Object.fromEntries(rows.map((row) => [row.id, row.plan]))
  );
  const [savingId, setSavingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [notice, setNotice] = useState<string>("");

  const totalUsers = useMemo(
    () => tableRows.reduce((acc, row) => acc + row.users_count, 0),
    [tableRows]
  );

  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) return tableRows;

    return tableRows.filter((row) => {
      const values = [
        row.business_name,
        row.slug,
        row.owner_email,
        row.owner_whatsapp,
        row.plan,
        row.status,
        row.billing_status,
      ];

      return values.some((value) =>
        String(value ?? "").toLowerCase().includes(term)
      );
    });
  }, [tableRows, searchTerm]);
    function exportClients() {
    const csv = buildClientsCsv(filteredRows);
    const today = new Date().toISOString().slice(0, 10);

    downloadTextFile(csv, `jasodatos_contactos_clientes_${today}.csv`);
    setNotice(`Archivo exportado con ${filteredRows.length} clientes.`);
  }
  function exportClients() {
    const csv = buildClientsCsv(filteredRows);
    const today = new Date().toISOString().slice(0, 10);

    downloadTextFile(csv, `jasodatos_contactos_clientes_${today}.csv`);
    setNotice(`Archivo exportado con ${filteredRows.length} clientes.`);
  }

  async function savePlan(businessId: string) {
    const plan = draftPlans[businessId];


    if (!plan) return;

    try {
      setSavingId(businessId);
      setNotice("");

      const response = await fetch(`/api/admin/businesses/${businessId}/plan`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan }),
      });

      const raw = await response.text();

      let result: { ok?: boolean; plan?: string; error?: string } = {};

      if (raw) {
        try {
          result = JSON.parse(raw);
        } catch {
          throw new Error(raw || "La API devolvió una respuesta inválida.");
        }
      }

      if (!response.ok) {
        throw new Error(
          result?.error || `No se pudo actualizar el plan (${response.status}).`
        );
      }

      setTableRows((prev) =>
        prev.map((row) => (row.id === businessId ? { ...row, plan } : row))
      );

      setNotice("Plan actualizado correctamente.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo actualizar el plan";
      setNotice(message);
    } finally {
      setSavingId(null);
    }
  }

  return (
    <section style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Matriz de clientes</h1>
          <p style={styles.subtitle}>
            Administra clientes, planes, estado de cuenta y usuarios del negocio.
          </p>
        </div>

        <div style={styles.headerStats}>
          <div style={styles.statCard}>
            <span style={styles.statLabel}>Clientes</span>
            <strong style={styles.statValue}>{tableRows.length}</strong>
          </div>

          <div style={styles.statCard}>
            <span style={styles.statLabel}>Usuarios totales</span>
            <strong style={styles.statValue}>{totalUsers}</strong>
          </div>
        </div>
      </div>

      <div style={styles.toolbar}>
        <div style={styles.searchBox}>
          <span style={styles.searchLabel}>Buscar cliente</span>
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar por negocio, slug, correo, WhatsApp, plan o estado..."
            style={styles.searchInput}
          />
        </div>

<div style={styles.toolbarActions}>
  <div style={styles.searchCounter}>
    {filteredRows.length} de {tableRows.length} clientes
  </div>

  <button
    type="button"
    style={styles.exportButton}
    onClick={exportClients}
    disabled={filteredRows.length === 0}
  >
    Exportar contactos
  </button>
</div>
      </div>

      {notice ? <div style={styles.notice}>{notice}</div> : null}

      <div style={styles.tableShell}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Negocio</th>
              <th style={styles.th}>Plan</th>
              <th style={styles.th}>Estado</th>
              <th style={styles.th}>Usuarios</th>
              <th style={styles.th}>Owner</th>
              <th style={styles.th}>WhatsApp</th>
              <th style={styles.th}>Billing</th>
              <th style={styles.th}>Última actividad</th>
              <th style={styles.th}>Acción</th>
            </tr>
          </thead>

          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td style={styles.emptyCell} colSpan={9}>
                  No se encontraron clientes con ese criterio.
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => (
                <tr key={row.id}>
                  <td style={styles.td}>
                    <div style={styles.businessName}>{row.business_name}</div>
                    <div style={styles.businessSlug}>{row.slug}</div>
                  </td>

                  <td style={styles.td}>
                    <span
                      style={{ ...styles.planPill, ...planPillStyle(row.plan) }}
                    >
                      {planLabel(row.plan)}
                    </span>
                  </td>

                  <td style={styles.td}>
                    <span
                      style={{
                        ...styles.statusPill,
                        ...statusPillStyle(row.status),
                      }}
                    >
                      {row.status}
                    </span>
                  </td>

                  <td style={styles.td}>{row.users_count}</td>
                  <td style={styles.td}>{row.owner_email || "-"}</td>
                  <td style={styles.td}>{row.owner_whatsapp || "-"}</td>

                  <td style={styles.td}>
                    <span
                      style={{
                        ...styles.statusPill,
                        ...billingPillStyle(row.billing_status),
                      }}
                    >
                      {row.billing_status}
                    </span>
                  </td>

                  <td style={styles.td}>{row.last_seen_at || "-"}</td>

                  <td style={styles.td}>
                    <div style={styles.actionCell}>
                      <select
                        style={styles.planSelect}
                        value={draftPlans[row.id] ?? row.plan}
                        onChange={(event) =>
                          setDraftPlans((prev) => ({
                            ...prev,
                            [row.id]: event.target.value as Plan,
                          }))
                        }
                      >
                        <option value="basic">Basic</option>
                        <option value="pro">Pro</option>
                        <option value="ultra">Ultra</option>
                      </select>

                      <button
                        type="button"
                        style={styles.saveButton}
                        onClick={() => savePlan(row.id)}
                        disabled={savingId === row.id}
                      >
                        {savingId === row.id ? "Guardando..." : "Cambiar plan"}
                      </button>

                      <button
                        type="button"
                        style={styles.secondaryActionButton}
                        onClick={() =>
                          window.open(
                            `/api/businesses/by-slug/${row.slug}/plan`,
                            "_blank",
                            "noopener,noreferrer"
                          )
                        }
                      >
                        Validar plan
                      </button>
<button
  type="button"
  style={styles.secondaryActionButton}
  onClick={async () => {
    const appUrl = `${window.location.origin}/cargas?business=${row.slug}`;

    try {
      await navigator.clipboard.writeText(appUrl);
      setNotice(`Enlace de app copiado para ${row.business_name}.`);
    } catch {
      setNotice(`Enlace de app: ${appUrl}`);
    }
  }}
>
  Copiar enlace app
</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    display: "grid",
    gap: 18,
    padding: 18,
    background: "linear-gradient(180deg, #EEF2FF 0%, #E8EDFF 100%)",
    minHeight: "100vh",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    flexWrap: "wrap",
  },
  title: {
    margin: 0,
    fontSize: 30,
    fontWeight: 800,
    color: "#1E2670",
    letterSpacing: "-0.01em",
  },
  subtitle: {
    margin: "6px 0 0 0",
    color: "#475569",
    fontSize: 14,
    lineHeight: 1.5,
    fontWeight: 600,
  },
  headerStats: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
  },
  statCard: {
    minWidth: 140,
    display: "grid",
    gap: 6,
    padding: "14px 16px",
    borderRadius: 16,
    background: "#FFFFFF",
    border: "1px solid rgba(15, 23, 42, 0.08)",
    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.06)",
  },
  statLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: "#64748B",
  },
  statValue: {
    fontSize: 24,
    fontWeight: 800,
    color: "#0F172A",
  },
  toolbar: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 16,
    flexWrap: "wrap",
  },
  searchBox: {
    display: "grid",
    gap: 6,
    minWidth: 320,
    flex: "1 1 420px",
  },
  searchLabel: {
    fontSize: 12,
    fontWeight: 800,
    color: "#172554",
  },
  searchInput: {
    width: "100%",
    minHeight: 44,
    borderRadius: 14,
    border: "1px solid rgba(15, 23, 42, 0.14)",
    background: "#FFFFFF",
    color: "#0F172A",
    padding: "0 14px",
    fontSize: 14,
    fontWeight: 700,
    outline: "none",
    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)",
  },
  searchCounter: {
    minHeight: 44,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 14px",
    borderRadius: 14,
    background: "#FFFFFF",
    border: "1px solid rgba(15, 23, 42, 0.08)",
    color: "#172554",
    fontSize: 13,
    fontWeight: 900,
    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)",
  },
  notice: {
    padding: "12px 14px",
    borderRadius: 14,
    background: "#FFFFFF",
    border: "1px solid rgba(15, 23, 42, 0.08)",
    color: "#1E2670",
    fontSize: 14,
    fontWeight: 700,
    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.06)",
  },
  tableShell: {
    overflowX: "auto",
    background: "#FFFFFF",
    borderRadius: 20,
    border: "1px solid rgba(15, 23, 42, 0.08)",
    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.06)",
  },
  table: {
    width: "100%",
    minWidth: 1500,
    borderCollapse: "collapse",
  },
  th: {
    textAlign: "left",
    padding: "14px 16px",
    fontSize: 12,
    fontWeight: 800,
    color: "#475569",
    background: "#F8FAFC",
    borderBottom: "1px solid rgba(15, 23, 42, 0.08)",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "14px 16px",
    fontSize: 14,
    color: "#0F172A",
    borderBottom: "1px solid rgba(15, 23, 42, 0.06)",
    verticalAlign: "middle",
    fontWeight: 600,
    whiteSpace: "nowrap",
  },
  emptyCell: {
    padding: "28px 16px",
    fontSize: 14,
    color: "#64748B",
    fontWeight: 800,
    textAlign: "center",
  },
  businessName: {
    fontWeight: 800,
    color: "#0F172A",
  },
  businessSlug: {
    marginTop: 4,
    fontSize: 12,
    color: "#64748B",
    fontWeight: 600,
  },
  planPill: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 28,
    padding: "0 12px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
  },
  statusPill: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 28,
    padding: "0 12px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    textTransform: "capitalize",
  },
  actionCell: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  planSelect: {
    minHeight: 38,
    borderRadius: 10,
    border: "1px solid rgba(15, 23, 42, 0.12)",
    background: "#FFFFFF",
    color: "#0F172A",
    padding: "0 10px",
    fontWeight: 700,
    outline: "none",
  },
  saveButton: {
    minHeight: 38,
    borderRadius: 10,
    border: "1px solid rgba(79,70,229,0.18)",
    background: "linear-gradient(135deg, #4460FF 0%, #5B6CFF 100%)",
    color: "#FFFFFF",
    padding: "0 12px",
    fontSize: 13,
    fontWeight: 800,
    cursor: "pointer",
  },
  secondaryActionButton: {
    minHeight: 38,
    borderRadius: 10,
    border: "1px solid rgba(37, 99, 235, 0.25)",
    background: "rgba(37, 99, 235, 0.08)",
    color: "#1D4ED8",
    padding: "0 12px",
    fontSize: 13,
    fontWeight: 800,
    cursor: "pointer",
  },
  toolbarActions: {
  display: "flex",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
},

exportButton: {
  minHeight: 44,
  borderRadius: 14,
  border: "1px solid rgba(22, 163, 74, 0.25)",
  background: "linear-gradient(135deg, #16A34A 0%, #22C55E 100%)",
  color: "#FFFFFF",
  padding: "0 16px",
  fontSize: 13,
  fontWeight: 900,
  cursor: "pointer",
  boxShadow: "0 10px 24px rgba(22, 163, 74, 0.16)",
},
};