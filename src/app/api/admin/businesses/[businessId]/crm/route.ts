import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminAuth";
function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Faltan variables de entorno de Supabase.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function cleanText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const adminAuth = await requireAdmin(request);

    if (!adminAuth.ok) {
      return adminAuth.response;
    }

    const { businessId } = await params;
    const body = await request.json();

    if (!businessId) {
      return NextResponse.json(
        { ok: false, error: "Falta businessId." },
        { status: 400 }
      );
    }

    const owner_name = cleanText(body.owner_name);
    const commercial_email = cleanText(body.commercial_email);
    const commercial_whatsapp = cleanText(body.commercial_whatsapp);
    const ciudad = cleanText(body.ciudad);
    const provincia = cleanText(body.provincia);
    const pais = cleanText(body.pais);
    const commercial_notes = cleanText(body.commercial_notes);
    const last_contact_at = cleanText(body.last_contact_at);

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("businesses")
      .update({
        owner_name,
        commercial_email,
        commercial_whatsapp,
        ciudad,
        provincia,
        pais,
        commercial_notes,
        last_contact_at,
      })
      .eq("id", businessId)
      .select(
        "id, owner_name, commercial_email, commercial_whatsapp, ciudad, provincia, pais, commercial_notes, last_contact_at"
      )
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, business: data }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}