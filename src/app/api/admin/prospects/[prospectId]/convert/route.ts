import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/adminAuth";
import type { JasoJevasaPlan } from "@/features/jasojevasa/types";

type Plan = JasoJevasaPlan;

type AtomicConversionResult =
  | {
      ok: true;
      business: {
        id: string;
        slug: string;
        business_name: string;
        plan: Plan;
        status: "active" | "trial";
      };
      prospect: Record<string, unknown>;
    }
  | {
      ok: false;
      reason?: string;
      error?: string;
    };

function isAtomicConversionResult(
  value: unknown
): value is AtomicConversionResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const result = value as Partial<AtomicConversionResult>;

  return typeof result.ok === "boolean";
}

function isMissingAtomicRpcError(error: {
  code?: string | null;
  message?: string | null;
}) {
  if (error.code === "PGRST202") {
    return true;
  }

  const message = String(error.message ?? "").toLowerCase();

  return (
    message.includes("admin_convert_prospect_atomic") &&
    (
      message.includes("schema cache") ||
      message.includes("could not find") ||
      message.includes("function")
    )
  );
}

function atomicFailureStatus(reason?: string) {
  if (reason === "not_found") return 404;

  if (
    reason === "already_converted" ||
    reason === "blocked_stage" ||
    reason === "duplicate_email" ||
    reason === "duplicate_whatsapp"
  ) {
    return 409;
  }

  return 400;
}

function cleanText(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function normalizeWhatsappPhone(value: string) {
  const digits = value.replace(/\D/g, "");

  if (!digits) return "";

  if (digits.startsWith("593")) return digits;

  if (digits.startsWith("0") && digits.length === 10) {
    return `593${digits.slice(1)}`;
  }

  return digits;
}

function isValidPlan(value: unknown): value is Plan {
  return value === "basic" || value === "pro" || value === "ultra";
}

async function buildUniqueSlug(baseSlug: string) {
  const supabase = createAdminSupabaseClient();
  const fallback = baseSlug || "negocio";
  let candidate = fallback;

  for (let index = 1; index <= 30; index += 1) {
    const { data, error } = await supabase
      .from("businesses")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) return candidate;

    candidate = `${fallback}-${index + 1}`;
  }

  return `${fallback}-${Date.now()}`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ prospectId: string }> }
) {
  try {
    const adminAuth = await requireAdmin(request);

    if (!adminAuth.ok) {
      return adminAuth.response;
    }

    const { prospectId } = await params;

    if (!prospectId) {
      return NextResponse.json(
        { ok: false, error: "Falta prospectId." },
        { status: 400 }
      );
    }

const body = await request.json().catch(() => ({}));

if (body?.confirm !== "convertir") {
  return NextResponse.json(
    {
      ok: false,
      error: "Confirmación requerida para convertir el prospecto.",
    },
    { status: 400 }
  );
}

const requestedPlan = isValidPlan(body?.plan) ? body.plan : null;
const requestedStatus =
  body?.status === "active" || body?.status === "trial"
    ? body.status
    : "trial";

    const supabase = createAdminSupabaseClient();

    const { data: prospect, error: prospectError } = await supabase
      .from("prospects")
      .select("*")
      .eq("id", prospectId)
      .single();

    if (prospectError || !prospect) {
      return NextResponse.json(
        {
          ok: false,
          error: prospectError?.message || "Prospecto no encontrado.",
        },
        { status: 404 }
      );
    }

    if (prospect.converted_business_id) {
      return NextResponse.json(
        {
          ok: false,
          error: "Este prospecto ya fue convertido en cliente.",
        },
        { status: 409 }
      );
    }
    if (
  prospect.pipeline_stage === "perdido" ||
  prospect.pipeline_stage === "no_contactar" ||
  prospect.pipeline_stage === "fuera_de_perfil"
) {
  return NextResponse.json(
    {
      ok: false,
      error:
        "Este prospecto no puede convertirse porque está perdido, fuera de perfil o marcado como no contactar.",
    },
    { status: 409 }
  );
}
    const businessName = cleanText(prospect.business_name);

    if (!businessName) {
      return NextResponse.json(
        { ok: false, error: "El prospecto no tiene nombre de negocio." },
        { status: 400 }
      );
    }

    const commercialEmail = cleanText(prospect.email).toLowerCase();
    const commercialWhatsapp = normalizeWhatsappPhone(
      cleanText(prospect.whatsapp)
    );

    if (commercialEmail) {
      const { data: existingEmail } = await supabase
        .from("businesses")
        .select("id")
        .eq("commercial_email", commercialEmail)
        .maybeSingle();

      if (existingEmail?.id) {
        return NextResponse.json(
          {
            ok: false,
            error: "Ya existe un cliente con este correo comercial.",
          },
          { status: 409 }
        );
      }
    }
    if (commercialWhatsapp) {
  const { data: existingWhatsapp } = await supabase
    .from("businesses")
    .select("id")
    .eq("commercial_whatsapp", commercialWhatsapp)
    .maybeSingle();

  if (existingWhatsapp?.id) {
    return NextResponse.json(
      {
        ok: false,
        error: "Ya existe un cliente con este WhatsApp comercial.",
      },
      { status: 409 }
    );
  }
}
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const periodEndsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const plan = requestedPlan || prospect.recommended_plan || "basic";
    const slug = await buildUniqueSlug(slugify(businessName));

    const {
      data: atomicConversion,
      error: atomicConversionError,
    } = await supabase.rpc(
      "admin_convert_prospect_atomic",
      {
        p_prospect_id: prospectId,
        p_plan: plan,
        p_status: requestedStatus,
        p_slug_base: slugify(businessName) || "negocio",
      }
    );

    if (!atomicConversionError) {
      if (!isAtomicConversionResult(atomicConversion)) {
        console.error(
          "[admin-prospect-convert] Respuesta RPC inválida:",
          atomicConversion
        );

        return NextResponse.json(
          {
            ok: false,
            error:
              "La conversión no devolvió una respuesta válida.",
          },
          { status: 500 }
        );
      }

      if (!atomicConversion.ok) {
        return NextResponse.json(
          {
            ok: false,
            error:
              atomicConversion.error ||
              "No se pudo convertir el prospecto.",
          },
          {
            status: atomicFailureStatus(
              atomicConversion.reason
            ),
          }
        );
      }

      return NextResponse.json(
        {
          ok: true,
          business: atomicConversion.business,
          prospect: atomicConversion.prospect,
        },
        { status: 201 }
      );
    }

    if (!isMissingAtomicRpcError(atomicConversionError)) {
      console.error(
        "[admin-prospect-convert] Error RPC:",
        atomicConversionError
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "No se pudo completar la conversión de forma segura.",
        },
        { status: 500 }
      );
    }

    console.warn(
      "[admin-prospect-convert] RPC atómico aún no disponible; se usa compatibilidad con rollback compensatorio."
    );

    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .insert({
        business_name: businessName,
        slug,
        plan,
        status: requestedStatus,
        owner_name: cleanText(prospect.contact_name) || businessName,
        owner_email: commercialEmail || null,
        owner_whatsapp: commercialWhatsapp || null,
        commercial_email: commercialEmail || null,
        commercial_whatsapp: commercialWhatsapp || null,
        ciudad: cleanText(prospect.city) || null,
        provincia: cleanText(prospect.province) || null,
        pais: cleanText(prospect.country) || "Ecuador",
        commercial_notes:
          cleanText(prospect.notes) ||
          "Cliente convertido desde JasoJevasa.",
        signup_source: "jasojevasa",
      })
      .select("id, slug, business_name, plan, status")
      .single();

    if (businessError || !business) {
      return NextResponse.json(
        {
          ok: false,
          error: businessError?.message || "No se pudo crear el cliente.",
        },
        { status: 500 }
      );
    }

    const { error: subscriptionError } = await supabase
      .from("subscriptions")
      .insert({
        business_id: business.id,
        plan,
        billing_status: requestedStatus === "active" ? "active" : "trial",
        trial_started_at: requestedStatus === "trial" ? now.toISOString() : null,
        trial_ends_at:
          requestedStatus === "trial" ? trialEndsAt.toISOString() : null,
        current_period_starts_at:
          requestedStatus === "active" ? now.toISOString() : null,
        current_period_ends_at:
          requestedStatus === "active" ? periodEndsAt.toISOString() : null,
      });

    if (subscriptionError) {
      const { error: cleanupBusinessError } = await supabase
        .from("businesses")
        .delete()
        .eq("id", business.id);

      if (cleanupBusinessError) {
        console.error(
          "[admin-prospect-convert] Falló rollback de business:",
          cleanupBusinessError
        );
      }

      return NextResponse.json(
        {
          ok: false,
          error:
            "No se pudo crear la suscripción del cliente. La conversión fue revertida.",
        },
        { status: 500 }
      );
    }

    const { data: updatedProspect, error: updateProspectError } =
      await supabase
        .from("prospects")
        .update({
          pipeline_stage: "convertido_cliente",
          converted_business_id: business.id,
          converted_at: now.toISOString(),
        })
        .eq("id", prospectId)
        .select("*")
        .single();

    if (updateProspectError) {
      const { error: cleanupSubscriptionError } = await supabase
        .from("subscriptions")
        .delete()
        .eq("business_id", business.id);

      const { error: cleanupBusinessError } = await supabase
        .from("businesses")
        .delete()
        .eq("id", business.id);

      if (cleanupSubscriptionError) {
        console.error(
          "[admin-prospect-convert] Falló rollback de subscription:",
          cleanupSubscriptionError
        );
      }

      if (cleanupBusinessError) {
        console.error(
          "[admin-prospect-convert] Falló rollback de business:",
          cleanupBusinessError
        );
      }

      return NextResponse.json(
        {
          ok: false,
          error:
            "No se pudo finalizar la conversión del prospecto. La creación del cliente fue revertida.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        business,
        prospect: updatedProspect,
      },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo convertir el prospecto en cliente.";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 }
    );
  }
}