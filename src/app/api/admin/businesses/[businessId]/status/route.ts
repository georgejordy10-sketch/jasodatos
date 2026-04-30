import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type BusinessStatus = "active" | "trial" | "suspended" | "inactive";

function isValidStatus(value: unknown): value is BusinessStatus {
  return (
    value === "active" ||
    value === "trial" ||
    value === "suspended" ||
    value === "inactive"
  );
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const { businessId } = await params;
    const body = await request.json();
    const status = body?.status;

    if (!businessId) {
      return NextResponse.json({ error: "Falta businessId" }, { status: 400 });
    }

    if (!isValidStatus(status)) {
      return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
    }

    const supabase = createAdminSupabaseClient();

    const { error: businessError } = await supabase
      .from("businesses")
      .update({ status })
      .eq("id", businessId);

    if (businessError) {
      return NextResponse.json({ error: businessError.message }, { status: 500 });
    }

    const nextBillingStatus = status === "inactive" ? "canceled" : "active";

    const { error: subscriptionError } = await supabase
      .from("subscriptions")
      .update({ billing_status: nextBillingStatus })
      .eq("business_id", businessId);

    if (subscriptionError) {
      return NextResponse.json(
        { error: subscriptionError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        status,
        billing_status: nextBillingStatus,
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}