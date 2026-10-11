import {
  NextRequest,
  NextResponse,
} from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/adminAuth";

type Plan =
  | "basic"
  | "pro"
  | "ultra";

type PlanAction =
  | "change_plan"
  | "renew";

type PlanRpcResult = {
  ok: true;
  action: PlanAction;
  plan: Plan;
  status?: "active";
  billing_status?: "active";
  current_period_starts_at?: string;
  current_period_ends_at?: string;
  extended_existing_period?: boolean;
};

function isValidPlan(
  value: unknown
): value is Plan {
  return (
    value === "basic" ||
    value === "pro" ||
    value === "ultra"
  );
}

function isValidAction(
  value: unknown
): value is PlanAction {
  return (
    value === "change_plan" ||
    value === "renew"
  );
}

function isPlanRpcResult(
  value: unknown
): value is PlanRpcResult {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return false;
  }

  const result =
    value as Partial<PlanRpcResult>;

  if (
    result.ok !== true ||
    !isValidAction(
      result.action
    ) ||
    !isValidPlan(
      result.plan
    )
  ) {
    return false;
  }

  if (
    result.action ===
    "change_plan"
  ) {
    return true;
  }

  return (
    result.status === "active" &&
    result.billing_status ===
      "active" &&
    typeof result.current_period_starts_at ===
      "string" &&
    typeof result.current_period_ends_at ===
      "string" &&
    typeof result.extended_existing_period ===
      "boolean"
  );
}

export async function GET(
  request: NextRequest
) {
  const adminAuth =
    await requireAdmin(request);

  if (!adminAuth.ok) {
    return adminAuth.response;
  }

  return NextResponse.json({
    ok: true,
    route:
      "admin plan route alive",
  });
}

export async function PATCH(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      businessId: string;
    }>;
  }
) {
  try {
    const adminAuth =
      await requireAdmin(request);

    if (!adminAuth.ok) {
      return adminAuth.response;
    }

    const { businessId } =
      await params;

    const body =
      await request.json();

    const plan =
      body?.plan;

    const action =
      isValidAction(
        body?.action
      )
        ? body.action
        : "change_plan";

    if (!businessId) {
      return NextResponse.json(
        {
          error:
            "Falta businessId",
        },
        {
          status: 400,
        }
      );
    }

    if (!isValidPlan(plan)) {
      return NextResponse.json(
        {
          error:
            "Plan inválido",
        },
        {
          status: 400,
        }
      );
    }

    const supabase =
      createAdminSupabaseClient();

    const {
      data,
      error,
    } = await supabase.rpc(
      "admin_update_business_plan_atomic",
      {
        p_business_id:
          businessId,
        p_plan:
          plan,
        p_action:
          action,
      }
    );

    if (error) {
      console.error(
        "[admin-business-plan] Error RPC:",
        error
      );

      return NextResponse.json(
        {
          error:
            error.message,
        },
        {
          status: 500,
        }
      );
    }

    if (
      !isPlanRpcResult(data)
    ) {
      console.error(
        "[admin-business-plan] Respuesta RPC inválida:",
        data
      );

      return NextResponse.json(
        {
          error:
            "La operación de plan no devolvió una respuesta válida.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json(
      data,
      {
        status: 200,
      }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Error inesperado";

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: 500,
      }
    );
  }
}