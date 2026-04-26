import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type TrialSignupBody = {
  business_name?: string;
  owner_name?: string;
  commercial_email?: string;
  commercial_whatsapp?: string;
  locale?: string;
};

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

function normalizeWhatsappPhone(value: string, locale: string) {
  const rawValue = value.trim();
  const digits = rawValue.replace(/\D/g, "");

  if (!digits) return "";

  const dialCodes: Record<string, string> = {
    "es-EC": "593",
    "es-CO": "57",
    "es-MX": "52",
    "es-PE": "51",
    "es-ES": "34",
    "en-US": "1",
  };

  const dialCode = dialCodes[locale] ?? "593";

  if (rawValue.startsWith("+")) return digits;
  if (digits.startsWith(dialCode)) return digits;

  if (locale === "es-EC" && digits.startsWith("0") && digits.length === 10) {
    return `593${digits.slice(1)}`;
  }

  if (locale === "es-CO" && digits.length === 10) return `57${digits}`;
  if (locale === "es-MX" && digits.length === 10) return `52${digits}`;
  if (locale === "es-PE" && digits.length === 9) return `51${digits}`;
  if (locale === "es-ES" && digits.length === 9) return `34${digits}`;
  if (locale === "en-US" && digits.length === 10) return `1${digits}`;

  return digits;
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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TrialSignupBody;

    const businessName = cleanText(body.business_name);
    const ownerName = cleanText(body.owner_name);
    const commercialEmail = cleanText(body.commercial_email).toLowerCase();
    const rawWhatsapp = cleanText(body.commercial_whatsapp);
    const locale = cleanText(body.locale) || "es-EC";
    const commercialWhatsapp = normalizeWhatsappPhone(rawWhatsapp, locale);

    if (!businessName) {
      return NextResponse.json(
        { ok: false, error: "El nombre del negocio es obligatorio." },
        { status: 400 }
      );
    }

    if (!ownerName) {
      return NextResponse.json(
        { ok: false, error: "El nombre del responsable es obligatorio." },
        { status: 400 }
      );
    }

    if (!commercialEmail || !commercialEmail.includes("@")) {
      return NextResponse.json(
        { ok: false, error: "Ingresa un correo comercial válido." },
        { status: 400 }
      );
    }

    if (!commercialWhatsapp || commercialWhatsapp.length < 8) {
      return NextResponse.json(
        { ok: false, error: "Ingresa un WhatsApp válido." },
        { status: 400 }
      );
    }

    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const slug = await buildUniqueSlug(slugify(businessName));

    const supabase = createAdminSupabaseClient();

     const { data: business, error: businessError } = await supabase
  .from("businesses")
  .insert({
    business_name: businessName,
    slug,
    plan: "ultra",
    status: "trial",
    owner_name: ownerName,
    owner_email: commercialEmail,
    owner_whatsapp: commercialWhatsapp,
    commercial_email: commercialEmail,
    commercial_whatsapp: commercialWhatsapp,
    commercial_notes: "Registro automático desde prueba gratis.",
    trial_started_at: now.toISOString(),
    trial_ends_at: trialEndsAt.toISOString(),
    signup_source: "landing_trial",
  })
  .select("id, slug, business_name, plan, status")
  .single();

const { error: subscriptionError } = await supabase
  .from("subscriptions")
  .insert({
    business_id: business.id,
    plan: "ultra",
    billing_status: "trial",
    trial_started_at: now.toISOString(),
    trial_ends_at: trialEndsAt.toISOString(),
    current_period_starts_at: now.toISOString(),
    current_period_ends_at: trialEndsAt.toISOString(),
  });
    if (subscriptionError) {
      return NextResponse.json(
        { ok: false, error: subscriptionError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      business: {
        ...business,
        trial_started_at: now.toISOString(),
        trial_ends_at: trialEndsAt.toISOString(),
      },
      redirectTo: `/cargas?business=${business.slug}`,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo crear la prueba.";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}