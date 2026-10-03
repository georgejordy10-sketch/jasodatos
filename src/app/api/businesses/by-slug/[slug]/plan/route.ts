import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { authorizeBusinessAccess } from "@/lib/authorizeBusinessAccess";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    const { slug } = await context.params;

    const businessSlug = slug?.trim();

    if (!businessSlug) {
      return NextResponse.json(
        {
          error:
            "No se recibió el identificador del negocio.",
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
          error: "No autorizado",
        },
        { status: 401 }
      );
    }

    const supabase =
      createAdminSupabaseClient();

    const {
      data: business,
      error: businessError,
    } = await supabase
      .from("businesses")
      .select(
        "id, business_name, slug, plan, status, ciudad, provincia, pais"
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

    if (businessError) {
      return NextResponse.json(
        {
          error:
            "No se pudo consultar el negocio.",
        },
        { status: 500 }
      );
    }

    if (!business) {
      return NextResponse.json(
        {
          error:
            "No se encontró el negocio solicitado.",
        },
        { status: 404 }
      );
    }

    const {
      data: subscription,
      error: subscriptionError,
    } = await supabase
      .from("subscriptions")
      .select(
        "plan, billing_status"
      )
      .eq(
        "business_id",
        access.businessId
      )
      .maybeSingle();

    if (subscriptionError) {
      return NextResponse.json(
        {
          error:
            "No se pudo consultar la suscripción del negocio.",
        },
        { status: 500 }
      );
    }

    const currentPlan =
      subscription?.plan ??
      business.plan ??
      "basic";

    const billingStatus =
      subscription?.billing_status ??
      "trial";

    return NextResponse.json({
      business: {
        business_name:
          business.business_name,
        slug: business.slug,
        plan: currentPlan,
        status: business.status,
        billing_status:
          billingStatus,
        ciudad: business.ciudad,
        provincia: business.provincia,
        pais: business.pais,
      },
    });
  } catch (error) {
    console.error(
      "[business-plan] Error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Error inesperado";

    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 }
    );
  }
}
