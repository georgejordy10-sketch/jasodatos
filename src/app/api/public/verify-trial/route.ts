import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type VerifyTrialBody = {
  slug?: string;
  code?: string;
};

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

    const supabase = createAdminSupabaseClient();

    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select(
        "id, slug, business_name, plan, status, email_verified_at, email_verification_code_hash, email_verification_expires_at"
      )
      .eq("slug", slug)
      .maybeSingle();

    if (businessError) {
      return NextResponse.json(
        { ok: false, error: businessError.message },
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
      return NextResponse.json({
        ok: true,
        redirectTo: `/cargas?business=${business.slug}`,
      });
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

    const incomingHash = hashVerificationCode(code);

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
        { ok: false, error: businessUpdateError.message },
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
        { ok: false, error: subscriptionReadError.message },
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
          { ok: false, error: subscriptionUpdateError.message },
          { status: 500 }
        );
      }
    } else {
      const { error: subscriptionInsertError } = await supabase
        .from("subscriptions")
        .insert(subscriptionPayload);

      if (subscriptionInsertError) {
        return NextResponse.json(
          { ok: false, error: subscriptionInsertError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      ok: true,
      redirectTo: `/cargas?business=${business.slug}`,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo verificar el correo.";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}