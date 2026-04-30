import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const supabase = createAdminSupabaseClient();

    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("id, business_name, slug, plan, status, ciudad, provincia, pais")
      .eq("slug", slug)
      .single();

    if (businessError || !business) {
      return NextResponse.json(
        { error: "No se encontró el negocio solicitado" },
        { status: 404 }
      );
    }

    const { data: subscription, error: subscriptionError } = await supabase
      .from("subscriptions")
      .select("plan, billing_status")
      .eq("business_id", business.id)
      .maybeSingle();

    if (subscriptionError) {
      return NextResponse.json(
        { error: subscriptionError.message },
        { status: 500 }
      );
    }

    const currentPlan = subscription?.plan ?? business.plan ?? "basic";
    const billingStatus = subscription?.billing_status ?? "trial";

    return NextResponse.json({
business: {
  business_name: business.business_name,
  slug: business.slug,
  plan: currentPlan,
  status: business.status,
  billing_status: billingStatus,
  ciudad: business.ciudad,
  provincia: business.provincia,
  pais: business.pais,
},
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error inesperado";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}