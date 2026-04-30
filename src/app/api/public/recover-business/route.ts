import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type RecoverBusinessBody = {
  business_name?: string;
  commercial_email?: string;
  commercial_whatsapp?: string;
};

function cleanText(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RecoverBusinessBody;

    const businessName = cleanText(body.business_name);
    const commercialEmail = cleanText(body.commercial_email).toLowerCase();
    const commercialWhatsapp = normalizePhone(cleanText(body.commercial_whatsapp));

    if (!businessName && !commercialEmail && !commercialWhatsapp) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Ingresa el nombre del negocio, correo comercial o WhatsApp registrado.",
        },
        { status: 400 }
      );
    }

    const supabase = createAdminSupabaseClient();

    let query = supabase
      .from("businesses")
      .select(
        "id, slug, business_name, owner_name, owner_email, owner_whatsapp, commercial_email, commercial_whatsapp, status, trial_ends_at"
      )
      .limit(5);

    if (commercialEmail) {
      query = query.or(
        `commercial_email.ilike.${commercialEmail},owner_email.ilike.${commercialEmail}`
      );
    } else if (commercialWhatsapp) {
      query = query.or(
        `commercial_whatsapp.ilike.%${commercialWhatsapp}%,owner_whatsapp.ilike.%${commercialWhatsapp}%`
      );
    } else {
      query = query.ilike("business_name", `%${businessName}%`);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    const businesses = data ?? [];

    if (businesses.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No encontramos un negocio con esos datos. Revisa la información o contacta soporte.",
        },
        { status: 404 }
      );
    }

    const business = businesses[0];

    if (business.status === "inactive") {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Este negocio se encuentra inactivo. Contacta soporte para reactivarlo.",
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      ok: true,
      business: {
        id: business.id,
        slug: business.slug,
        business_name: business.business_name,
        owner_name: business.owner_name,
        status: business.status,
        trial_ends_at: business.trial_ends_at,
      },
      redirectTo: `/cargas?business=${business.slug}`,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo recuperar el acceso al negocio.";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}