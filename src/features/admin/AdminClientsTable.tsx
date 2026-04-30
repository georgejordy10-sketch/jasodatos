"use client";

import { useMemo, useState, type CSSProperties } from "react";
import type { AdminBusinessOverview } from "./types";

type Props = {
  rows: AdminBusinessOverview[];
};

type Plan = AdminBusinessOverview["plan"];
type CrmDraft = {
  owner_name: string;
  commercial_email: string;
  commercial_whatsapp: string;
  ciudad: string;
  provincia: string;
  pais: string;
  commercial_notes: string;
  last_contact_at: string;
};

function planLabel(plan: Plan) {
  if (plan === "basic") return "Basic";
  if (plan === "pro") return "Pro";
  return "Ultra";
}
function clientStatusLabel(status: AdminBusinessOverview["status"]) {
  if (status === "active") return "Activo";
  if (status === "trial") return "Prueba";
  if (status === "suspended") return "Suspendido";
  return status;
}
function billingLabel(status: AdminBusinessOverview["billing_status"]) {
  if (status === "active") return "Activo";
  if (status === "trial") return "Prueba";
  if (status === "manual") return "Manual";
  if (status === "past_due") return "Pago vencido";
  if (status === "canceled") return "Cancelado";

  return status;
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

function getDaysRemaining(value: string | null) {
  if (!value) return null;

  const endDate = new Date(value);

  if (Number.isNaN(endDate.getTime())) return null;

  const today = new Date();
  const diffMs = endDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return diffDays;
}

function getValidityInfo(row: AdminBusinessOverview) {
  const isTrial = row.billing_status === "trial" || row.status === "trial";
  const date = isTrial ? row.trial_ends_at : row.current_period_ends_at;
  const days = getDaysRemaining(date);

  if (!date) {
    return {
      label: isTrial ? "Prueba sin fecha" : "Renovación no configurada",
      dateLabel: "-",
      daysLabel: "-",
      status: "neutral" as const,
    };
  }

  if (days === null) {
    return {
      label: "Fecha inválida",
      dateLabel: "-",
      daysLabel: "-",
      status: "warning" as const,
    };
  }

  if (days < 0) {
    return {
      label: isTrial
  ? `Prueba vencida: ${formatDate(date)}`
  : `Vencido: ${formatDate(date)}`,
      dateLabel: formatDate(date),
      daysLabel: "Vencido",
      status: "danger" as const,
    };
  }

  if (days === 0) {
    return {
      label: isTrial ? "Prueba termina hoy" : "Renueva hoy",
      dateLabel: formatDate(date),
      daysLabel: "Hoy",
      status: "warning" as const,
    };
  }

  return {
    label: isTrial
  ? `Prueba termina: ${formatDate(date)}`
  : `Renueva: ${formatDate(date)}`,
    dateLabel: formatDate(date),
    daysLabel: `${days} día${days === 1 ? "" : "s"}`,
    status: days <= 3 ? ("warning" as const) : ("ok" as const),
  };
}

function validityPillStyle(status: "ok" | "warning" | "danger" | "neutral"): CSSProperties {
  if (status === "danger") {
    return { background: "rgba(239,68,68,0.12)", color: "#B91C1C" };
  }

  if (status === "warning") {
    return { background: "rgba(245,158,11,0.14)", color: "#B45309" };
  }

  if (status === "ok") {
    return { background: "rgba(34,197,94,0.14)", color: "#166534" };
  }

  return { background: "rgba(100,116,139,0.14)", color: "#475569" };
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
      row.commercial_email || row.owner_email || "",
      row.commercial_whatsapp || row.owner_whatsapp || "",
      planLabel(row.plan),
      row.status,
      row.billing_status,
      row.users_count,
      row.last_contact_at || row.last_seen_at || "",
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
  const [statusFilter, setStatusFilter] = useState<
  "all" | AdminBusinessOverview["status"]
>("all");
  const [notice, setNotice] = useState<string>("");
  const [editingCrmRow, setEditingCrmRow] =
  useState<AdminBusinessOverview | null>(null);
const [crmDraft, setCrmDraft] = useState<CrmDraft | null>(null);
const [savingCrmId, setSavingCrmId] = useState<string | null>(null);

  const totalUsers = useMemo(
    () => tableRows.reduce((acc, row) => acc + row.users_count, 0),
    [tableRows]
  );

const filteredRows = useMemo(() => {
  const term = searchTerm.trim().toLowerCase();

  return tableRows.filter((row) => {
    const matchesStatus =
      statusFilter === "all" ? true : row.status === statusFilter;

    const values = [
      row.business_name,
      row.slug,
      row.owner_email,
      row.owner_whatsapp,
      row.owner_name,
      row.commercial_email,
      row.commercial_whatsapp,
      row.ciudad,
      row.provincia,
      row.pais,
      row.plan,
      row.status,
      row.billing_status,
      row.signup_source,
    ];

    const matchesSearch = !term
      ? true
      : values.some((value) =>
          String(value ?? "").toLowerCase().includes(term)
        );

    return matchesStatus && matchesSearch;
  });
}, [tableRows, searchTerm, statusFilter]);
  function exportClients() {
    const csv = buildClientsCsv(filteredRows);
    const today = new Date().toISOString().slice(0, 10);

    downloadTextFile(csv, `jasodatos_contactos_clientes_${today}.csv`);
    setNotice(`Archivo exportado con ${filteredRows.length} clientes.`);
  }
function openCrmEditor(row: AdminBusinessOverview) {
  setEditingCrmRow(row);
  setCrmDraft({
    owner_name: row.owner_name || "",
    commercial_email: row.commercial_email || row.owner_email || "",
    commercial_whatsapp: row.commercial_whatsapp || row.owner_whatsapp || "",
    ciudad: row.ciudad || "",
    provincia: row.provincia || "",
    pais: row.pais || "",
    commercial_notes: row.commercial_notes || "",
    last_contact_at: row.last_contact_at
      ? String(row.last_contact_at).slice(0, 10)
      : "",
  });
}

function closeCrmEditor() {
  setEditingCrmRow(null);
  setCrmDraft(null);
}

async function saveCrmContact() {
  if (!editingCrmRow || !crmDraft) return;

  try {
    setSavingCrmId(editingCrmRow.id);
    setNotice("");

    const response = await fetch(
      `/api/admin/businesses/${editingCrmRow.id}/crm`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          owner_name: crmDraft.owner_name,
          commercial_email: crmDraft.commercial_email,
          commercial_whatsapp: crmDraft.commercial_whatsapp,
          ciudad: crmDraft.ciudad,
          provincia: crmDraft.provincia,
          pais: crmDraft.pais,
          commercial_notes: crmDraft.commercial_notes,
          last_contact_at: crmDraft.last_contact_at,
        }),
      }
    );

    const raw = await response.text();
    let result: { ok?: boolean; error?: string } = {};

    if (raw) {
      try {
        result = JSON.parse(raw);
      } catch {
        throw new Error(raw || "La API devolvió una respuesta inválida.");
      }
    }

    if (!response.ok) {
      throw new Error(
        result?.error ||
          `No se pudo actualizar el contacto (${response.status}).`
      );
    }

    setTableRows((prev) =>
      prev.map((row) =>
        row.id === editingCrmRow.id
          ? {
              ...row,
              owner_name: crmDraft.owner_name || null,
              commercial_email: crmDraft.commercial_email || null,
              commercial_whatsapp: crmDraft.commercial_whatsapp || null,
              ciudad: crmDraft.ciudad || null,
              provincia: crmDraft.provincia || null,
              pais: crmDraft.pais || null,
              commercial_notes: crmDraft.commercial_notes || null,
              last_contact_at: crmDraft.last_contact_at || null,
            }
          : row
      )
    );

    setNotice(`Contacto actualizado para ${editingCrmRow.business_name}.`);
    closeCrmEditor();
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo actualizar el contacto.";
    setNotice(message);
  } finally {
    setSavingCrmId(null);
  }
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
      body: JSON.stringify({
        plan,
        action: "change_plan",
      }),
    });

    const raw = await response.text();

    let result: { ok?: boolean; plan?: Plan; error?: string } = {};

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
      prev.map((row) =>
        row.id === businessId
          ? {
              ...row,
              plan,
            }
          : row
      )
    );

    setNotice("Plan actualizado correctamente.");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo actualizar el plan.";
    setNotice(message);
  } finally {
    setSavingId(null);
  }
}
async function renewPlan(row: AdminBusinessOverview) {
  const plan = draftPlans[row.id] ?? row.plan;

  try {
    setSavingId(row.id);
    setNotice("");

    const response = await fetch(`/api/admin/businesses/${row.id}/plan`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        plan,
        action: "renew",
      }),
    });

    const raw = await response.text();

    let result: {
      ok?: boolean;
      plan?: Plan;
      status?: AdminBusinessOverview["status"];
      billing_status?: AdminBusinessOverview["billing_status"];
      current_period_starts_at?: string;
      current_period_ends_at?: string;
      error?: string;
    } = {};

    if (raw) {
      try {
        result = JSON.parse(raw);
      } catch {
        throw new Error(raw || "La API devolvió una respuesta inválida.");
      }
    }

    if (!response.ok) {
      throw new Error(
        result?.error || `No se pudo renovar el plan (${response.status}).`
      );
    }

    setTableRows((prev) =>
      prev.map((item) =>
        item.id === row.id
          ? {
              ...item,
              plan,
              status: result.status ?? "active",
              billing_status: result.billing_status ?? "active",
              trial_ends_at: null,
              current_period_starts_at:
                result.current_period_starts_at ??
                new Date().toISOString(),
              current_period_ends_at:
                result.current_period_ends_at ??
                item.current_period_ends_at,
            }
          : item
      )
    );

    setNotice(`Plan renovado por 30 días para ${row.business_name}.`);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo renovar el plan.";
    setNotice(message);
  } finally {
    setSavingId(null);
  }
}
async function archiveVisibleTrialBusinesses() {
  const trialRows = filteredRows.filter((row) => row.status === "trial");

  if (trialRows.length === 0) {
    setNotice("No hay pruebas visibles para archivar.");
    return;
  }

  const confirmed = window.confirm(
    `Se archivarán ${trialRows.length} pruebas visibles. Esta acción marcará los negocios como inactivos y su facturación como cancelada.`
  );

  if (!confirmed) return;

  try {
    setSavingId("bulk-archive-trials");
    setNotice("");

    for (const row of trialRows) {
      const response = await fetch(`/api/admin/businesses/${row.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "inactive",
        }),
      });

      const raw = await response.text();

      let result: {
        ok?: boolean;
        status?: AdminBusinessOverview["status"];
        billing_status?: AdminBusinessOverview["billing_status"];
        error?: string;
      } = {};

      if (raw) {
        try {
          result = JSON.parse(raw);
        } catch {
          throw new Error(raw || "La API devolvió una respuesta inválida.");
        }
      }

      if (!response.ok) {
        throw new Error(
          result?.error ||
            `No se pudo archivar ${row.business_name} (${response.status}).`
        );
      }
    }

    const archivedIds = new Set(trialRows.map((row) => row.id));

    setTableRows((prev) =>
      prev.map((row) =>
        archivedIds.has(row.id)
          ? {
              ...row,
              status: "inactive",
              billing_status: "canceled",
            }
          : row
      )
    );

    setNotice(`Se archivaron ${trialRows.length} pruebas visibles.`);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudieron archivar las pruebas visibles.";

    setNotice(message);
  } finally {
    setSavingId(null);
  }
}
async function archiveBusiness(row: AdminBusinessOverview) {
  const confirmed = window.confirm(
    `¿Seguro que deseas archivar el negocio "${row.business_name}"? El cliente quedará inactivo y su facturación se marcará como cancelada.`
  );

  if (!confirmed) return;

  try {
    setSavingId(row.id);
    setNotice("");

    const response = await fetch(`/api/admin/businesses/${row.id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: "inactive",
      }),
    });

    const raw = await response.text();

    let result: {
      ok?: boolean;
      status?: AdminBusinessOverview["status"];
      billing_status?: AdminBusinessOverview["billing_status"];
      error?: string;
    } = {};

    if (raw) {
      try {
        result = JSON.parse(raw);
      } catch {
        throw new Error(raw || "La API devolvió una respuesta inválida.");
      }
    }

    if (!response.ok) {
      throw new Error(
        result?.error || `No se pudo archivar el negocio (${response.status}).`
      );
    }

    setTableRows((prev) =>
      prev.map((item) =>
        item.id === row.id
          ? {
              ...item,
              status: result.status ?? "inactive",
              billing_status: result.billing_status ?? "canceled",
            }
          : item
      )
    );

    setNotice(`Negocio archivado: ${row.business_name}.`);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo archivar el negocio.";
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
<select
    style={styles.statusFilterSelect}
    value={statusFilter}
    onChange={(event) =>
      setStatusFilter(
        event.target.value as "all" | AdminBusinessOverview["status"]
      )
    }
  >
    <option value="all">Todos los estados</option>
    <option value="trial">Pruebas</option>
    <option value="active">Activos</option>
    <option value="suspended">Suspendidos</option>
    <option value="inactive">Archivados</option>
  </select>
<div style={styles.toolbarActions}>
  <div style={styles.searchCounter}>
    {filteredRows.length} de {tableRows.length} clientes
  </div>

  <button
    type="button"
    style={styles.bulkArchiveButton}
    onClick={archiveVisibleTrialBusinesses}
    disabled={savingId === "bulk-archive-trials"}
  >
    {savingId === "bulk-archive-trials"
      ? "Archivando pruebas..."
      : "Archivar pruebas visibles"}
  </button>

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
<div style={styles.tableHint}>
  Desliza horizontalmente para ver toda la información del cliente.
</div>

<div style={styles.tableShell}>
  <table style={styles.table}>
          <thead>
            <tr>
<th style={styles.th}>Negocio</th>
<th style={styles.th}>Plan</th>
<th style={styles.th}>Estado</th>
<th style={styles.th}>Usuarios</th>
<th style={styles.th}>Responsable</th>
<th style={styles.th}>Correo comercial</th>
<th style={styles.th}>WhatsApp comercial</th>
<th style={styles.th}>Origen</th>
<th style={styles.th}>Ubicación</th>
<th style={styles.th}>Facturación</th>
<th style={styles.th}>Vigencia</th>
<th style={styles.th}>Días restantes</th>
<th style={styles.th}>Última actividad</th>
<th style={{ ...styles.th, ...styles.stickyActionTh }}>Acción</th>
            </tr>
          </thead>

          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td style={styles.emptyCell} colSpan={14}>
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
                      {clientStatusLabel(row.status)}
                    </span>
                  </td>

                  <td style={styles.td}>{row.users_count}</td>
                  <td style={styles.td}>
  {row.owner_name || "Sin responsable"}
</td>

<td style={styles.td}>
  {row.commercial_email || row.owner_email || "-"}
</td>

<td style={styles.td}>
  {row.commercial_whatsapp || row.owner_whatsapp || "-"}
</td>

<td style={styles.td}>
  {row.signup_source === "landing_trial"
    ? "Registro web"
    : row.signup_source || "-"}
</td>
<td style={styles.td}>
  <div style={styles.locationBlock}>
    <strong style={styles.locationCity}>
      {row.ciudad || "Ciudad no definida"}
    </strong>

    <span style={styles.locationMeta}>
      {row.provincia || "Provincia no definida"}
    </span>

    <span style={styles.locationMeta}>
      {row.pais || "País no definido"}
    </span>
  </div>
</td>
                  
                  <td style={styles.td}>
  <span
    style={{
      ...styles.statusPill,
      ...billingPillStyle(row.billing_status),
    }}
  >
    {billingLabel(row.billing_status)}
  </span>
</td>

<td style={styles.td}>
  <span
    style={{
      ...styles.statusPill,
      ...validityPillStyle(getValidityInfo(row).status),
    }}
  >
    {getValidityInfo(row).label}
  </span>
</td>

<td style={styles.td}>
  <span
    style={{
      ...styles.statusPill,
      ...validityPillStyle(getValidityInfo(row).status),
    }}
  >
    {getValidityInfo(row).daysLabel}
  </span>
</td>

<td style={styles.td}>{row.last_seen_at || "-"}</td>

<td style={{ ...styles.td, ...styles.stickyActionTd }}>
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
  onClick={() => renewPlan(row)}
  disabled={savingId === row.id}
>
  Renovar 30 días
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
<button
  type="button"
  style={styles.secondaryActionButton}
  onClick={() => openCrmEditor(row)}
>
  Editar contacto
</button>
<button
  type="button"
  style={styles.dangerActionButton}
  onClick={() => archiveBusiness(row)}
  disabled={savingId === row.id || row.status === "inactive"}
>
  {row.status === "inactive" ? "Archivado" : "Archivar negocio"}
</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
            {editingCrmRow && crmDraft ? (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <div>
                <p style={styles.modalEyebrow}>CRM Lite</p>
                <h2 style={styles.modalTitle}>
                  Editar contacto comercial
                </h2>
                <p style={styles.modalSubtitle}>
                  {editingCrmRow.business_name} · {editingCrmRow.slug}
                </p>
              </div>

              <button
                type="button"
                style={styles.modalCloseButton}
                onClick={closeCrmEditor}
              >
                Cerrar
              </button>
            </div>

            <div style={styles.modalGrid}>
              <label style={styles.modalLabel}>
                <span>Nombre del dueño</span>
                <input
                  style={styles.modalInput}
                  value={crmDraft.owner_name}
                  onChange={(event) =>
                    setCrmDraft((current) =>
                      current
                        ? { ...current, owner_name: event.target.value }
                        : current
                    )
                  }
                  placeholder="Ej. Juan Pérez"
                />
              </label>

              <label style={styles.modalLabel}>
                <span>Correo comercial</span>
                <input
                  type="email"
                  style={styles.modalInput}
                  value={crmDraft.commercial_email}
                  onChange={(event) =>
                    setCrmDraft((current) =>
                      current
                        ? { ...current, commercial_email: event.target.value }
                        : current
                    )
                  }
                  placeholder="correo@negocio.com"
                />
              </label>

              <label style={styles.modalLabel}>
                <span>WhatsApp comercial</span>
                <input
                  type="tel"
                  style={styles.modalInput}
                  value={crmDraft.commercial_whatsapp}
                  onChange={(event) =>
                    setCrmDraft((current) =>
                      current
                        ? {
                            ...current,
                            commercial_whatsapp: event.target.value,
                          }
                        : current
                    )
                  }
                  placeholder="593999111222"
                />
              </label>
                             <label style={styles.modalLabel}>
                <span>Ciudad</span>
                <input
                  style={styles.modalInput}
                  value={crmDraft.ciudad}
                  onChange={(event) =>
                    setCrmDraft((current) =>
                      current ? { ...current, ciudad: event.target.value } : current
                    )
                  }
                  placeholder="Ej. Quito"
                />
              </label>

              <label style={styles.modalLabel}>
                <span>Provincia</span>
                <input
                  style={styles.modalInput}
                  value={crmDraft.provincia}
                  onChange={(event) =>
                    setCrmDraft((current) =>
                      current
                        ? { ...current, provincia: event.target.value }
                        : current
                    )
                  }
                  placeholder="Ej. Pichincha"
                />
              </label>

              <label style={styles.modalLabel}>
                <span>País</span>
                <input
                  style={styles.modalInput}
                  value={crmDraft.pais}
                  onChange={(event) =>
                    setCrmDraft((current) =>
                      current ? { ...current, pais: event.target.value } : current
                    )
                  }
                  placeholder="Ej. Ecuador"
                />
              </label>
              <label style={styles.modalLabel}>
                <span>Último contacto</span>
                <input
                  type="date"
                  style={styles.modalInput}
                  value={crmDraft.last_contact_at}
                  onChange={(event) =>
                    setCrmDraft((current) =>
                      current
                        ? { ...current, last_contact_at: event.target.value }
                        : current
                    )
                  }
                />
              </label>

              <label style={{ ...styles.modalLabel, ...styles.modalFull }}>
                <span>Notas comerciales</span>
                <textarea
                  style={styles.modalTextarea}
                  value={crmDraft.commercial_notes}
                  onChange={(event) =>
                    setCrmDraft((current) =>
                      current
                        ? {
                            ...current,
                            commercial_notes: event.target.value,
                          }
                        : current
                    )
                  }
                  placeholder="Ej. Cliente interesado en plan Pro. Contactar nuevamente el viernes."
                />
              </label>
            </div>

            <div style={styles.modalActions}>
              <button
                type="button"
                style={styles.secondaryActionButton}
                onClick={closeCrmEditor}
              >
                Cancelar
              </button>

              <button
                type="button"
                style={styles.saveButton}
                onClick={saveCrmContact}
                disabled={savingCrmId === editingCrmRow.id}
              >
                {savingCrmId === editingCrmRow.id
                  ? "Guardando..."
                  : "Guardar contacto"}
              </button>
            </div>
          </div>
        </div>
      ) : null}  
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
  width: "100%",
  maxWidth: "100%",
  maxHeight: "calc(100vh - 260px)",
  overflowX: "auto",
  overflowY: "auto",
  paddingBottom: 12,
  borderRadius: 18,
  border: "1px solid rgba(226,232,240,0.95)",
  background: "#ffffff",
  scrollbarGutter: "stable",
},
table: {
  width: "100%",
  minWidth: 1880,
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
  modalOverlay: {
    position: "fixed",
    inset: 0,
    zIndex: 80,
    display: "grid",
    placeItems: "center",
    padding: 24,
    background: "rgba(15, 23, 42, 0.56)",
    backdropFilter: "blur(8px)",
  },
  modal: {
    width: "min(760px, 96vw)",
    maxHeight: "88vh",
    overflow: "auto",
    borderRadius: 24,
    background: "#FFFFFF",
    border: "1px solid rgba(15, 23, 42, 0.10)",
    boxShadow: "0 28px 80px rgba(15, 23, 42, 0.35)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    padding: 24,
    borderBottom: "1px solid rgba(15, 23, 42, 0.08)",
  },
  modalEyebrow: {
    margin: 0,
    color: "#16A34A",
    fontSize: 12,
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  modalTitle: {
    margin: "6px 0 0 0",
    color: "#172554",
    fontSize: 24,
    fontWeight: 900,
    letterSpacing: "-0.02em",
  },
  modalSubtitle: {
    margin: "6px 0 0 0",
    color: "#64748B",
    fontSize: 13,
    fontWeight: 700,
  },
  modalCloseButton: {
    minHeight: 38,
    borderRadius: 12,
    border: "1px solid rgba(15, 23, 42, 0.12)",
    background: "#F8FAFC",
    color: "#0F172A",
    padding: "0 14px",
    fontSize: 13,
    fontWeight: 800,
    cursor: "pointer",
  },
  modalGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 14,
    padding: 24,
  },
  modalLabel: {
    display: "grid",
    gap: 6,
    color: "#172554",
    fontSize: 12,
    fontWeight: 900,
  },
  modalFull: {
    gridColumn: "1 / -1",
  },
  modalInput: {
    width: "100%",
    minHeight: 42,
    borderRadius: 12,
    border: "1px solid rgba(15, 23, 42, 0.14)",
    background: "#FFFFFF",
    color: "#0F172A",
    padding: "0 12px",
    fontSize: 14,
    fontWeight: 700,
    outline: "none",
  },
  modalTextarea: {
    width: "100%",
    minHeight: 110,
    resize: "vertical",
    borderRadius: 12,
    border: "1px solid rgba(15, 23, 42, 0.14)",
    background: "#FFFFFF",
    color: "#0F172A",
    padding: 12,
    fontSize: 14,
    fontWeight: 700,
    outline: "none",
    fontFamily: "inherit",
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 10,
    padding: 24,
    borderTop: "1px solid rgba(15, 23, 42, 0.08)",
  },
  tableHint: {
  marginBottom: 8,
  color: "#64748B",
  fontSize: 12,
  fontWeight: 800,
},
dangerActionButton: {
  border: "1px solid rgba(220,38,38,0.35)",
  background: "rgba(254,226,226,0.75)",
  color: "#991B1B",
  borderRadius: 10,
  padding: "8px 10px",
  fontSize: 12,
  fontWeight: 900,
  cursor: "pointer",
  whiteSpace: "nowrap",
},
locationBlock: {
  display: "grid",
  gap: 3,
  minWidth: 150,
},

locationCity: {
  color: "#0F172A",
  fontSize: 13,
  fontWeight: 900,
  lineHeight: 1.25,
},

locationMeta: {
  color: "#64748B",
  fontSize: 12,
  fontWeight: 700,
  lineHeight: 1.25,
},
stickyActionTh: {
  position: "sticky",
  right: 0,
  zIndex: 4,
  background: "#F8FAFC",
  boxShadow: "-10px 0 18px rgba(15,23,42,0.08)",
},

stickyActionTd: {
  position: "sticky",
  right: 0,
  zIndex: 3,
  background: "#FFFFFF",
  boxShadow: "-10px 0 18px rgba(15,23,42,0.08)",
},
statusFilterSelect: {
  minHeight: 42,
  minWidth: 190,
  borderRadius: 12,
  border: "1px solid rgba(148,163,184,0.35)",
  background: "#FFFFFF",
  color: "#0F172A",
  padding: "0 12px",
  fontSize: 13,
  fontWeight: 800,
  outline: "none",
},
bulkArchiveButton: {
  minHeight: 42,
  borderRadius: 12,
  border: "1px solid rgba(220,38,38,0.35)",
  background: "rgba(254,226,226,0.85)",
  color: "#991B1B",
  padding: "0 14px",
  fontSize: 13,
  fontWeight: 900,
  cursor: "pointer",
  whiteSpace: "nowrap",
},
};