import type { AdminProspectOverview } from "@/features/jasojevasa/types";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import AdminProspectsTable from "@/features/jasojevasa/AdminProspectsTable";

export const dynamic = "force-dynamic";

export default async function AdminProspectosPage() {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("prospects")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Error al cargar prospectos</h1>
        <p>{error.message}</p>
      </main>
    );
  }

  const rows: AdminProspectOverview[] =
    data?.map((row) => ({
      id: row.id,
      business_name: row.business_name,
      contact_name: row.contact_name,
      email: row.email,
      whatsapp: row.whatsapp,
      city: row.city,
      province: row.province,
      country: row.country,
      business_type: row.business_type,
      source: row.source,
      source_url: row.source_url,
      channel: row.channel,
      lead_origin_type: row.lead_origin_type,
      pipeline_stage: row.pipeline_stage,
      lead_temperature: row.lead_temperature,
      lead_fit: row.lead_fit,
      lead_priority: row.lead_priority,
      score: Number(row.score ?? 0),
      recommended_plan: row.recommended_plan,
      owner_name: row.owner_name,
      next_action_at: row.next_action_at,
      last_interaction_at: row.last_interaction_at,
      notes: row.notes,
      do_not_contact: Boolean(row.do_not_contact),
      contact_allowed: Boolean(row.contact_allowed),
      converted_business_id: row.converted_business_id,
      converted_at: row.converted_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
    })) ?? [];

  return (
    <main style={{ padding: "8px 8px 16px" }}>
      <AdminProspectsTable rows={rows} />
    </main>
  );
}