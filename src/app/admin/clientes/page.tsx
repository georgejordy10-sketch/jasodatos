import AdminClientsTable from "@/features/admin/AdminClientsTable";
import type { AdminBusinessOverview } from "@/features/admin/types";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminClientesPage() {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("admin_business_overview")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <h1>Error al cargar clientes</h1>
        <p>{error.message}</p>
      </div>
    );
  }

  const rows: AdminBusinessOverview[] =
    data?.map((row) => ({
      id: row.id,
      slug: row.slug,
      business_name: row.business_name,
      owner_email: row.owner_email,
      owner_whatsapp: row.owner_whatsapp,
      owner_name: row.owner_name,
      commercial_email: row.commercial_email,
      commercial_whatsapp: row.commercial_whatsapp,
      commercial_notes: row.commercial_notes,
      last_contact_at: row.last_contact_at,
      trial_started_at: row.trial_started_at,
trial_ends_at: row.trial_ends_at,
signup_source: row.signup_source,
current_period_starts_at: row.current_period_starts_at,
current_period_ends_at: row.current_period_ends_at,
      plan: row.plan,
      status: row.status,
      created_at: row.created_at,
      last_seen_at: row.last_seen_at
        ? new Date(row.last_seen_at).toLocaleString("es-EC")
        : null,
      billing_status: row.billing_status,
      users_count: Number(row.users_count ?? 0),
    })) ?? [];

  return <AdminClientsTable rows={rows} />;
}