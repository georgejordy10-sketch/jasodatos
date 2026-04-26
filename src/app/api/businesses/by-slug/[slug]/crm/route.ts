import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type Params = {
  params: Promise<{
    slug: string;
  }>;
};

function cleanText(value: unknown) {
  if (typeof value !== "string") return null;

  const text = value.trim();

  return text.length > 0 ? text : null;
}
export async function GET(_request: Request, context: Params) {
  try {
    const { slug } = await context.params;
    const businessSlug = slug?.trim();

    if (!businessSlug) {
      return NextResponse.json(
        { ok: false, error: "Slug del negocio requerido." },
        { status: 400 }
      );
    }

    const supabase = createAdminSupabaseClient();

    const { data, error } = await supabase
      .from("businesses")
      .select(
        "id, slug, business_name, owner_name, commercial_email, commercial_whatsapp, commercial_notes, last_contact_at"
      )
      .eq("slug", businessSlug)
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
      error instanceof Error
        ? error.message
        : "No se pudo cargar la información CRM.";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
export async function PATCH(request: Request, context: Params) {
  try {
    const { slug } = await context.params;
    const body = await request.json();

    const businessSlug = slug?.trim();

    if (!businessSlug) {
      return NextResponse.json(
        { ok: false, error: "Slug del negocio requerido." },
        { status: 400 }
      );
    }

    const owner_name = cleanText(body.owner_name);
    const commercial_email = cleanText(body.commercial_email);
    const commercial_whatsapp = cleanText(body.commercial_whatsapp);
    const commercial_notes = cleanText(body.commercial_notes);

    const last_contact_at =
      typeof body.last_contact_at === "string" && body.last_contact_at.trim()
        ? body.last_contact_at
        : null;

    const supabase = createAdminSupabaseClient();

    const { data, error } = await supabase
      .from("businesses")
      .update({
        owner_name,
        commercial_email,
        commercial_whatsapp,
        commercial_notes,
        last_contact_at,
      })
      .eq("slug", businessSlug)
      .select(
        "id, slug, business_name, owner_name, commercial_email, commercial_whatsapp, commercial_notes, last_contact_at"
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
      error instanceof Error
        ? error.message
        : "No se pudo actualizar la información CRM.";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}