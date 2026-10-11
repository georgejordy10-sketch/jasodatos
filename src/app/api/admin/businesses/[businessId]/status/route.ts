import {
  NextRequest,
  NextResponse,
} from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/adminAuth";

type BusinessStatus =
  | "active"
  | "trial"
  | "suspended"
  | "inactive";

type BillingStatus =
  | "active"
  | "trial"
  | "past_due"
  | "canceled";

type StatusRpcResult = {
  ok: true;
  status: BusinessStatus;
  billing_status: BillingStatus;
};

function isValidStatus(
  value: unknown
): value is BusinessStatus {
  return (
    value === "active" ||
    value === "trial" ||
    value === "suspended" ||
    value === "inactive"
  );
}

function isValidBillingStatus(
  value: unknown
): value is BillingStatus {
  return (
    value === "active" ||
    value === "trial" ||
    value === "past_due" ||
    value === "canceled"
  );
}

function isStatusRpcResult(
  value: unknown
): value is StatusRpcResult {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return false;
  }

  const result =
    value as Partial<StatusRpcResult>;

  return (
    result.ok === true &&
    isValidStatus(result.status) &&
    isValidBillingStatus(
      result.billing_status
    )
  );
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

    const status =
      body?.status;

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

    if (!isValidStatus(status)) {
      return NextResponse.json(
        {
          error:
            "Estado inválido",
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
      "admin_set_business_status_atomic",
      {
        p_business_id:
          businessId,
        p_status:
          status,
      }
    );

    if (error) {
      console.error(
        "[admin-business-status] Error RPC:",
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
      !isStatusRpcResult(data)
    ) {
      console.error(
        "[admin-business-status] Respuesta RPC inválida:",
        data
      );

      return NextResponse.json(
        {
          error:
            "La operación de estado no devolvió una respuesta válida.",
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