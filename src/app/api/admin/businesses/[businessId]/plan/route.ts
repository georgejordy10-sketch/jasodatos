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

type ExistingSubscription = {
  id: string;
  billing_status:
    | "manual"
    | "trial"
    | "active"
    | "past_due"
    | "canceled"
    | null;
  current_period_starts_at:
    | string
    | null;
  current_period_ends_at:
    | string
    | null;
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

function addDays(
  date: Date,
  days: number
) {
  const nextDate =
    new Date(date);

  nextDate.setDate(
    nextDate.getDate() + days
  );

  return nextDate;
}

function parseValidDate(
  value: string | null | undefined
): Date | null {
  if (!value) {
    return null;
  }

  const date =
    new Date(value);

  if (
    !Number.isFinite(
      date.getTime()
    )
  ) {
    return null;
  }

  return date;
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
      isValidAction(body?.action)
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

    if (action === "renew") {
      const now =
        new Date();

      const {
        data:
          existingSubscriptionData,
        error:
          subscriptionReadError,
      } = await supabase
        .from("subscriptions")
        .select(
          `
            id,
            billing_status,
            current_period_starts_at,
            current_period_ends_at
          `
        )
        .eq(
          "business_id",
          businessId
        )
        .maybeSingle();

      if (subscriptionReadError) {
        return NextResponse.json(
          {
            error:
              subscriptionReadError.message,
          },
          {
            status: 500,
          }
        );
      }

      const existingSubscription =
        existingSubscriptionData as
          | ExistingSubscription
          | null;

      const existingPeriodEnd =
        parseValidDate(
          existingSubscription
            ?.current_period_ends_at
        );

      const existingPeriodStart =
        parseValidDate(
          existingSubscription
            ?.current_period_starts_at
        );

      const canExtendCurrentPeriod =
        existingSubscription
          ?.billing_status ===
          "active" &&
        existingPeriodEnd !==
          null &&
        existingPeriodEnd.getTime() >
          now.getTime();

      const renewalBaseDate =
        canExtendCurrentPeriod
          ? existingPeriodEnd
          : now;

      const periodEndsAt =
        addDays(
          renewalBaseDate,
          30
        );

      const periodStartsAt =
        canExtendCurrentPeriod &&
        existingPeriodStart
          ? existingPeriodStart
          : now;

      const {
        error: businessError,
      } = await supabase
        .from("businesses")
        .update({
          plan,
          status: "active",
        })
        .eq(
          "id",
          businessId
        );

      if (businessError) {
        return NextResponse.json(
          {
            error:
              businessError.message,
          },
          {
            status: 500,
          }
        );
      }

      const subscriptionPayload = {
        plan,
        billing_status:
          "active",
        trial_ends_at:
          null,
        current_period_starts_at:
          periodStartsAt.toISOString(),
        current_period_ends_at:
          periodEndsAt.toISOString(),
      };

      if (
        existingSubscription?.id
      ) {
        const {
          error:
            subscriptionUpdateError,
        } = await supabase
          .from("subscriptions")
          .update(
            subscriptionPayload
          )
          .eq(
            "business_id",
            businessId
          );

        if (
          subscriptionUpdateError
        ) {
          return NextResponse.json(
            {
              error:
                subscriptionUpdateError.message,
            },
            {
              status: 500,
            }
          );
        }
      } else {
        const {
          error:
            subscriptionInsertError,
        } = await supabase
          .from("subscriptions")
          .insert({
            business_id:
              businessId,
            ...subscriptionPayload,
          });

        if (
          subscriptionInsertError
        ) {
          return NextResponse.json(
            {
              error:
                subscriptionInsertError.message,
            },
            {
              status: 500,
            }
          );
        }
      }

      return NextResponse.json(
        {
          ok: true,
          action,
          plan,
          status: "active",
          billing_status:
            "active",
          current_period_starts_at:
            periodStartsAt.toISOString(),
          current_period_ends_at:
            periodEndsAt.toISOString(),
          extended_existing_period:
            canExtendCurrentPeriod,
        },
        {
          status: 200,
        }
      );
    }

    const {
      error: businessError,
    } = await supabase
      .from("businesses")
      .update({
        plan,
      })
      .eq(
        "id",
        businessId
      );

    if (businessError) {
      return NextResponse.json(
        {
          error:
            businessError.message,
        },
        {
          status: 500,
        }
      );
    }

    const {
      data:
        existingSubscription,
      error:
        subscriptionReadError,
    } = await supabase
      .from("subscriptions")
      .select("id")
      .eq(
        "business_id",
        businessId
      )
      .maybeSingle();

    if (subscriptionReadError) {
      return NextResponse.json(
        {
          error:
            subscriptionReadError.message,
        },
        {
          status: 500,
        }
      );
    }

    if (
      existingSubscription?.id
    ) {
      const {
        error:
          subscriptionUpdateError,
      } = await supabase
        .from("subscriptions")
        .update({
          plan,
        })
        .eq(
          "business_id",
          businessId
        );

      if (
        subscriptionUpdateError
      ) {
        return NextResponse.json(
          {
            error:
              subscriptionUpdateError.message,
          },
          {
            status: 500,
          }
        );
      }
    } else {
      const {
        error:
          subscriptionInsertError,
      } = await supabase
        .from("subscriptions")
        .insert({
          business_id:
            businessId,
          plan,
          billing_status:
            "manual",
        });

      if (
        subscriptionInsertError
      ) {
        return NextResponse.json(
          {
            error:
              subscriptionInsertError.message,
          },
          {
            status: 500,
          }
        );
      }
    }

    return NextResponse.json(
      {
        ok: true,
        action,
        plan,
      },
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
