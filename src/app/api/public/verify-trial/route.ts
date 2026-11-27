import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { checkPublicRateLimit, rateLimitResponse } from "@/lib/publicRateLimit";
import { setBusinessAccessSession } from "@/lib/businessAccessSession";

type VerifyTrialBody = {
  slug?: string;
  code?: string;
};

type VerifyTrialRpcResult = {
  ok?: boolean;
  reason?: string;
  business_id?: string;
  slug?: string;
  trial_ends_at?: string;
};

function isMissingVerifyTrialRpcError(error: {
  code?: string | null;
  message?: string | null;
}) {
  if (error.code === "PGRST202") {
    return true;
  }

  const message =
    String(error.message ?? "").toLowerCase();

  return (
    message.includes("verify_trial_and_activate_atomic") &&
    (
      message.includes("schema cache") ||
      message.includes("does not exist") ||
      message.includes("could not find")
    )
  );
}

function verifyTrialFailure(
  reason?: string
) {
  if (reason === "not_found") {
    return {
      status: 404,
      error: "No se encontró el negocio solicitado.",
    };
  }

  if (reason === "already_verified") {
    return {
      status: 409,
      error:
        "Este correo ya fue verificado. Usa la opción Acceder a mi negocio.",
    };
  }

  if (reason === "attempts_exceeded") {
    return {
      status: 429,
      error:
        "Se alcanzó el máximo de intentos. Solicita un nuevo código de verificación.",
    };
  }

  if (reason === "expired") {
    return {
      status: 400,
      error:
        "El código venció. Solicita un nuevo código de verificación.",
    };
  }

  return {
    status: 400,
    error: "Código de verificación incorrecto.",
  };
}

function cleanText(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function hashVerificationCode(code: string) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as VerifyTrialBody;

    const slug = cleanText(body.slug);
    const code = cleanText(body.code);

    if (!slug) {
      return NextResponse.json(
        { ok: false, error: "Falta el código interno del negocio." },
        { status: 400 }
      );
    }

    if (!code || code.length !== 6) {
      return NextResponse.json(
        { ok: false, error: "Ingresa el código de 6 dígitos." },
        { status: 400 }
      );
    }

    const verificationRateLimit =
      await checkPublicRateLimit({
        request,
        action: "verify-trial",
        identifier: slug,
        limit: 15,
        windowSeconds: 10 * 60,
      });

    if (!verificationRateLimit.allowed) {
      return rateLimitResponse(
        verificationRateLimit.retryAfterSeconds
      );
    }

    const supabase = createAdminSupabaseClient();
    const incomingHash =
      hashVerificationCode(code);

    const {
      data: atomicVerification,
      error: atomicVerificationError,
    } = await supabase.rpc(
      "verify_trial_and_activate_atomic",
      {
        p_slug: slug,
        p_code_hash: incomingHash,
      }
    );

    if (!atomicVerificationError) {
      const result =
        atomicVerification as VerifyTrialRpcResult | null;

      if (result?.ok === true) {
        const trialEndsAt =
          result.trial_ends_at
            ? new Date(result.trial_ends_at)
            : null;

        const expiresInSeconds =
          trialEndsAt &&
          Number.isFinite(trialEndsAt.getTime())
            ? Math.max(
                1,
                Math.floor(
                  (
                    trialEndsAt.getTime() -
                    Date.now()
                  ) / 1000
                )
              )
            : 3 * 24 * 60 * 60;

        await setBusinessAccessSession({
          businessId:
            result.business_id ?? "",
          slug:
            result.slug ?? slug,
          expiresInSeconds,
        });

        return NextResponse.json({
          ok: true,
          redirectTo:
            `/cargas?business=${encodeURIComponent(
              result.slug ?? slug
            )}`,
        });
      }

      const failure =
        verifyTrialFailure(result?.reason);

      return NextResponse.json(
        {
          ok: false,
          error: failure.error,
        },
        { status: failure.status }
      );
    }

    if (
      !isMissingVerifyTrialRpcError(
        atomicVerificationError
      )
    ) {
      console.error(
        "[verify-trial] Error RPC atómico:",
        atomicVerificationError
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "No se pudo verificar el correo.",
        },
        { status: 500 }
      );
    }

    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select(
        "id, slug, business_name, plan, status, email_verified_at, email_verification_code_hash, email_verification_expires_at"
      )
      .eq("slug", slug)
      .maybeSingle();

    if (businessError) {
      return NextResponse.json(
        { ok: false, error: "No se pudo verificar el correo." },
        { status: 500 }
      );
    }

    if (!business) {
      return NextResponse.json(
        { ok: false, error: "No se encontró el negocio solicitado." },
        { status: 404 }
      );
    }

    if (business.email_verified_at) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Este correo ya fue verificado. Usa la opción Acceder a mi negocio.",
        },
        { status: 409 }
      );
    }

    const expiresAt = business.email_verification_expires_at
      ? new Date(business.email_verification_expires_at)
      : null;

    if (!expiresAt || expiresAt.getTime() < Date.now()) {
      return NextResponse.json(
        {
          ok: false,
          error: "El código venció. Registra nuevamente la prueba gratis.",
        },
        { status: 400 }
      );
    }

    if (incomingHash !== business.email_verification_code_hash) {
      return NextResponse.json(
        { ok: false, error: "Código de verificación incorrecto." },
        { status: 400 }
      );
    }

    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const { error: businessUpdateError } = await supabase
      .from("businesses")
      .update({
        status: "trial",
        trial_started_at: now.toISOString(),
        trial_ends_at: trialEndsAt.toISOString(),
        email_verified_at: now.toISOString(),
        email_verification_code_hash: null,
        email_verification_expires_at: null,
      })
      .eq("id", business.id);

    if (businessUpdateError) {
      return NextResponse.json(
        { ok: false, error: "No se pudo activar la prueba." },
        { status: 500 }
      );
    }

    const { data: existingSubscription, error: subscriptionReadError } =
      await supabase
        .from("subscriptions")
        .select("id")
        .eq("business_id", business.id)
        .maybeSingle();

    if (subscriptionReadError) {
      return NextResponse.json(
        { ok: false, error: "No se pudo activar la prueba." },
        { status: 500 }
      );
    }

    const subscriptionPayload = {
      business_id: business.id,
      plan: "ultra",
      billing_status: "trial",
      trial_started_at: now.toISOString(),
      trial_ends_at: trialEndsAt.toISOString(),
      current_period_starts_at: now.toISOString(),
      current_period_ends_at: trialEndsAt.toISOString(),
    };

    if (existingSubscription?.id) {
      const { error: subscriptionUpdateError } = await supabase
        .from("subscriptions")
        .update(subscriptionPayload)
        .eq("business_id", business.id);

      if (subscriptionUpdateError) {
        return NextResponse.json(
          { ok: false, error: "No se pudo activar la prueba." },
          { status: 500 }
        );
      }
    } else {
      const { error: subscriptionInsertError } = await supabase
        .from("subscriptions")
        .insert(subscriptionPayload);

      if (subscriptionInsertError) {
        return NextResponse.json(
          { ok: false, error: "No se pudo activar la prueba." },
          { status: 500 }
        );
      }
    }

    await setBusinessAccessSession({
      businessId: business.id,
      slug: business.slug,
      expiresInSeconds: 3 * 24 * 60 * 60,
    });

    return NextResponse.json({
      ok: true,
      redirectTo: `/cargas?business=${business.slug}`,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo verificar el correo.";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 }
    );
  }
}