import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type Plan = "basic" | "pro" | "ultra";

function isValidPlan(value: unknown): value is Plan {
  return value === "basic" || value === "pro" || value === "ultra";
}
export async function GET() {
  return NextResponse.json({ ok: true, route: "admin plan route alive" });
}
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const { businessId } = await params;
    const body = await request.json();
    const plan = body?.plan;

    if (!businessId) {
      return NextResponse.json({ error: "Falta businessId" }, { status: 400 });
    }

    if (!isValidPlan(plan)) {
      return NextResponse.json({ error: "Plan inválido" }, { status: 400 });
    }

    const supabase = createAdminSupabaseClient();

    const { error: businessError } = await supabase
      .from("businesses")
      .update({ plan })
      .eq("id", businessId);

    if (businessError) {
      return NextResponse.json({ error: businessError.message }, { status: 500 });
    }

    const { data: existingSubscription, error: subscriptionReadError } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("business_id", businessId)
      .maybeSingle();

    if (subscriptionReadError) {
      return NextResponse.json({ error: subscriptionReadError.message }, { status: 500 });
    }

    if (existingSubscription?.id) {
      const { error: subscriptionUpdateError } = await supabase
        .from("subscriptions")
        .update({ plan })
        .eq("business_id", businessId);

      if (subscriptionUpdateError) {
        return NextResponse.json({ error: subscriptionUpdateError.message }, { status: 500 });
      }
    } else {
      const { error: subscriptionInsertError } = await supabase
        .from("subscriptions")
        .insert({
          business_id: businessId,
          plan,
          billing_status: "manual",
        });

      if (subscriptionInsertError) {
        return NextResponse.json({ error: subscriptionInsertError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true, plan }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}