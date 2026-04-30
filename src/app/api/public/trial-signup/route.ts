import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type TrialSignupBody = {
  business_name?: string;
  owner_name?: string;
  commercial_email?: string;
  commercial_whatsapp?: string;
  ciudad?: string;
  provincia?: string;
  pais?: string;
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

function generateVerificationCode() {
  return crypto.randomInt(100000, 1000000).toString();
}

function hashVerificationCode(code: string) {
  return crypto.createHash("sha256").update(code).digest("hex");
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

async function sendVerificationEmail({
  to,
  businessName,
  code,
}: {
  to: string;
  businessName: string;
  code: string;
}) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail =
    process.env.RESEND_FROM_EMAIL || "JasoDatos <onboarding@resend.dev>";

  if (!resendApiKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Falta configurar RESEND_API_KEY para enviar correos.");
    }

    console.log(`[JasoDatos DEV] Código de verificación para ${to}: ${code}`);
    return { sent: false };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
      "User-Agent": "JasoDatos/1.0",
    },
    body: JSON.stringify({
      from: fromEmail,
      to,
      subject: "Código de verificación de JasoDatos",
      html: `
        <div style="font-family: Arial, sans-serif; color: #0f172a;">
          <h2>Verifica tu correo para activar tu prueba gratis</h2>
          <p>Hola. Recibimos el registro del negocio <strong>${businessName}</strong>.</p>
          <p>Tu código de verificación es:</p>
          <div style="font-size: 28px; font-weight: 800; letter-spacing: 4px; margin: 18px 0;">
            ${code}
          </div>
          <p>Este código vence en 10 minutos.</p>
          <p>Si no solicitaste este registro, puedes ignorar este correo.</p>
        </div>
      `,
      text: `Tu código de verificación de JasoDatos es: ${code}. Este código vence en 10 minutos.`,
    }),
  });

  if (!response.ok) {
    const raw = await response.text();
    throw new Error(raw || "No se pudo enviar el correo de verificación.");
  }

  return { sent: true };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TrialSignupBody;

    const businessName = cleanText(body.business_name);
    const ownerName = cleanText(body.owner_name);
    const commercialEmail = cleanText(body.commercial_email).toLowerCase();
    const rawWhatsapp = cleanText(body.commercial_whatsapp);
    const locale = cleanText(body.locale) || "es-EC";
    const ciudad = cleanText(body.ciudad);
    const provincia = cleanText(body.provincia);
    const pais = cleanText(body.pais) || "Ecuador";
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

    if (!ciudad) {
      return NextResponse.json(
        { ok: false, error: "La ciudad es obligatoria." },
        { status: 400 }
      );
    }

    if (!provincia) {
      return NextResponse.json(
        { ok: false, error: "La provincia es obligatoria." },
        { status: 400 }
      );
    }

    if (!pais) {
      return NextResponse.json(
        { ok: false, error: "El país es obligatorio." },
        { status: 400 }
      );
    }

    const now = new Date();
    const verificationCode = generateVerificationCode();
    const verificationCodeHash = hashVerificationCode(verificationCode);
    const verificationExpiresAt = new Date(now.getTime() + 10 * 60 * 1000);
    const slug = await buildUniqueSlug(slugify(businessName));

    const supabase = createAdminSupabaseClient();

    const { data: existingEmail } = await supabase
      .from("businesses")
      .select("id")
      .eq("commercial_email", commercialEmail)
      .maybeSingle();

    if (existingEmail?.id) {
      return NextResponse.json(
        {
          ok: false,
          error: "Ya existe un negocio registrado con este correo comercial.",
        },
        { status: 409 }
      );
    }

    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .insert({
        business_name: businessName,
        slug,
        plan: "ultra",
        status: "suspended",
        owner_name: ownerName,
        owner_email: commercialEmail,
        owner_whatsapp: commercialWhatsapp,
        commercial_email: commercialEmail,
        commercial_whatsapp: commercialWhatsapp,
        ciudad,
        provincia,
        pais,
        commercial_notes:
          "Registro automático desde prueba gratis. Pendiente de verificación por correo.",
        signup_source: "landing_trial",
        email_verification_code_hash: verificationCodeHash,
        email_verification_expires_at: verificationExpiresAt.toISOString(),
      })
      .select(
        "id, slug, business_name, plan, status, ciudad, provincia, pais, commercial_email"
      )
      .single();

    if (businessError) {
      return NextResponse.json(
        { ok: false, error: businessError.message },
        { status: 500 }
      );
    }

    const emailResult = await sendVerificationEmail({
      to: commercialEmail,
      businessName,
      code: verificationCode,
    });

    return NextResponse.json({
      ok: true,
      verification_required: true,
      business,
      slug: business.slug,
      message: "Te enviamos un código de verificación al correo registrado.",
      debug_verification_code:
        !emailResult.sent && process.env.NODE_ENV !== "production"
          ? verificationCode
          : undefined,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo crear la prueba.";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}