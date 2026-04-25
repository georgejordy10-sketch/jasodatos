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