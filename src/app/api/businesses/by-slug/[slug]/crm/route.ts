import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { authorizeBusinessAccess } from "@/lib/authorizeBusinessAccess";

type Params = {
  params: Promise<{
    slug: string;
  }>;
};

type UpdateBusinessCrmBody = {
  business_name?: unknown;
  owner_name?: unknown;
  commercial_email?: unknown;
  commercial_whatsapp?: unknown;
  ciudad?: unknown;
  provincia?: unknown;
  pais?: unknown;
};

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const text = value.trim();

  return text.length > 0 ? text : null;
}

export async function GET(
  _request: Request,
  context: Params
) {
  try {
    const { slug } = await context.params;

    const businessSlug = slug?.trim();

    if (!businessSlug) {
      return NextResponse.json(
        {
          ok: false,
          error: "Slug del negocio requerido.",
        },
        { status: 400 }
      );
    }

    const access =
      await authorizeBusinessAccess(
        businessSlug
      );

    if (!access) {
      return NextResponse.json(
        {
          ok: false,
          error: "No autorizado",
        },
        { status: 401 }
      );
    }

    const supabase =
      createAdminSupabaseClient();

    const {
      data: business,
      error,
    } = await supabase
      .from("businesses")
      .select(
        "id, slug, business_name, owner_name, commercial_email, commercial_whatsapp, ciudad, provincia, pais"
      )
      .eq(
        "id",
        access.businessId
      )
      .eq(
        "slug",
        access.slug
      )
      .maybeSingle();

    if (error) {
      console.error(
        "[business-crm] Error consultando negocio:",
        error
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "No se pudo cargar la información del negocio.",
        },
        { status: 500 }
      );
    }

    if (!business) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No se encontró información para este negocio.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      business: {
        id: business.id,
        slug: business.slug,
        business_name:
          business.business_name,
        owner_name:
          business.owner_name,
        commercial_email:
          business.commercial_email,
        commercial_whatsapp:
          business.commercial_whatsapp,
        ciudad: business.ciudad,
        provincia: business.provincia,
        pais: business.pais,

        /*
         * Estos campos existen en la interfaz actual,
         * pero pertenecen al CRM interno de JasoDatos.
         * El cliente no debe poder leerlos.
         */
        commercial_notes: null,
        last_contact_at: null,
      },
    });
  } catch (error) {
    console.error(
      "[business-crm] Error GET:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "No se pudo cargar la información del negocio.";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  context: Params
) {
  try {
    const { slug } = await context.params;

    const businessSlug = slug?.trim();

    if (!businessSlug) {
      return NextResponse.json(
        {
          ok: false,
          error: "Slug del negocio requerido.",
        },
        { status: 400 }
      );
    }

    const access =
      await authorizeBusinessAccess(
        businessSlug
      );

    if (!access) {
      return NextResponse.json(
        {
          ok: false,
          error: "No autorizado",
        },
        { status: 401 }
      );
    }

    const body =
      (await request.json()) as UpdateBusinessCrmBody;

    const businessName =
      cleanText(body.business_name);

    if (!businessName) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El nombre del negocio es obligatorio.",
        },
        { status: 400 }
      );
    }

    const ownerName =
      cleanText(body.owner_name);

    const commercialEmail =
      cleanText(body.commercial_email);

    const commercialWhatsapp =
      cleanText(body.commercial_whatsapp);

    const ciudad =
      cleanText(body.ciudad);

    const provincia =
      cleanText(body.provincia);

    const pais =
      cleanText(body.pais);

    const supabase =
      createAdminSupabaseClient();

    const {
      data: business,
      error,
    } = await supabase
      .from("businesses")
      .update({
        business_name: businessName,
        owner_name: ownerName,
        commercial_email:
          commercialEmail,
        commercial_whatsapp:
          commercialWhatsapp,
        ciudad,
        provincia,
        pais,
      })
      .eq(
        "id",
        access.businessId
      )
      .eq(
        "slug",
        access.slug
      )
      .select(
        "id, slug, business_name, owner_name, commercial_email, commercial_whatsapp, ciudad, provincia, pais"
      )
      .maybeSingle();

    if (error) {
      console.error(
        "[business-crm] Error actualizando negocio:",
        error
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "No se pudo actualizar la información del negocio.",
        },
        { status: 500 }
      );
    }

    if (!business) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No se encontró información para este negocio.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      business: {
        id: business.id,
        slug: business.slug,
        business_name:
          business.business_name,
        owner_name:
          business.owner_name,
        commercial_email:
          business.commercial_email,
        commercial_whatsapp:
          business.commercial_whatsapp,
        ciudad: business.ciudad,
        provincia: business.provincia,
        pais: business.pais,

        /*
         * Conservamos la forma esperada por el frontend,
         * pero nunca exponemos ni modificamos los campos
         * internos del CRM comercial.
         */
        commercial_notes: null,
        last_contact_at: null,
      },
    });
  } catch (error) {
    console.error(
      "[business-crm] Error PATCH:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "No se pudo actualizar la información del negocio.";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
