import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Params = {
  params: Promise<{
    businessId: string;
  }>;
};

function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Faltan variables de entorno de Supabase.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
    },
  });
}

export async function PATCH(request: Request, context: Params) {
  try {
    const { businessId } = await context.params;
    const body = await request.json();

    const owner_name =
      typeof body.owner_name === "string" ? body.owner_name.trim() : null;

    const commercial_email =
      typeof body.commercial_email === "string"
        ? body.commercial_email.trim()
        : null;

    const commercial_whatsapp =
      typeof body.commercial_whatsapp === "string"
        ? body.commercial_whatsapp.trim()
        : null;

    const commercial_notes =
      typeof body.commercial_notes === "string"
        ? body.commercial_notes.trim()
        : null;

    const last_contact_at =
      typeof body.last_contact_at === "string" && body.last_contact_at
        ? body.last_contact_at
        : null;

    const supabase = getSupabaseAdminClient();

    const { data, error } = await supabase
      .from("businesses")
      .update({
        owner_name,
        commercial_email,
        commercial_whatsapp,
        commercial_notes,
        last_contact_at,
      })
      .eq("id", businessId)
      .select(
        "id, owner_name, commercial_email, commercial_whatsapp, commercial_notes, last_contact_at"
      )
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      business: data,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo actualizar CRM.";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}