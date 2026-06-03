import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type {
  JasoJevasaPlan,
  ProspectChannel,
  ProspectFit,
  ProspectOriginType,
  ProspectPipelineStage,
  ProspectPriority,
  ProspectTemperature,
} from "@/features/jasojevasa/types";

const VALID_STAGES: ProspectPipelineStage[] = [
  "nuevo",
  "investigado",
  "calificado",
  "contactado",
  "respondio",
  "interesado",
  "demo_agendada",
  "diagnostico_pendiente",
  "diagnostico_en_revision",
  "diagnostico_enviado",
  "propuesta_pendiente",
  "negociacion",
  "ganado",
  "perdido",
  "no_contactar",
  "convertido_cliente",
  "fuera_de_perfil",
];

const VALID_TEMPERATURES: ProspectTemperature[] = [
  "frio",
  "tibio",
  "caliente",
  "muy_caliente",
];

const VALID_FITS: ProspectFit[] = ["bajo", "medio", "alto", "ideal"];

const VALID_PRIORITIES: ProspectPriority[] = [
  "baja",
  "media",
  "alta",
  "urgente",
];

const VALID_PLANS: JasoJevasaPlan[] = ["basic", "pro", "ultra"];

const VALID_CHANNELS: ProspectChannel[] = [
  "whatsapp",
  "email",
  "formulario_web",
  "linkedin",
  "instagram",
  "facebook",
  "telefono",
  "referido",
  "manual",
];

const VALID_ORIGINS: ProspectOriginType[] = [
  "inbound",
  "outbound",
  "referral",
  "manual_research",
  "existing_contact",
  "event",
];

function cleanText(value: unknown) {
  if (typeof value !== "string") return null;

  const cleaned = value.trim();

  return cleaned.length > 0 ? cleaned : null;
}

function requiredText(value: unknown) {
  if (typeof value !== "string") return null;

  const cleaned = value.trim();

  return cleaned.length > 0 ? cleaned : null;
}

function isValidStage(value: unknown): value is ProspectPipelineStage {
  return typeof value === "string" && VALID_STAGES.includes(value as ProspectPipelineStage);
}

function isValidTemperature(value: unknown): value is ProspectTemperature {
  return (
    typeof value === "string" &&
    VALID_TEMPERATURES.includes(value as ProspectTemperature)
  );
}

function isValidFit(value: unknown): value is ProspectFit {
  return typeof value === "string" && VALID_FITS.includes(value as ProspectFit);
}

function isValidPriority(value: unknown): value is ProspectPriority {
  return (
    typeof value === "string" &&
    VALID_PRIORITIES.includes(value as ProspectPriority)
  );
}

function isValidPlan(value: unknown): value is JasoJevasaPlan {
  return typeof value === "string" && VALID_PLANS.includes(value as JasoJevasaPlan);
}

function isValidChannel(value: unknown): value is ProspectChannel {
  return typeof value === "string" && VALID_CHANNELS.includes(value as ProspectChannel);
}

function isValidOrigin(value: unknown): value is ProspectOriginType {
  return typeof value === "string" && VALID_ORIGINS.includes(value as ProspectOriginType);
}

function isValidDateOrNull(value: unknown) {
  if (value === null || value === undefined) return true;
  if (typeof value !== "string") return false;
  if (!value.trim()) return true;

  const date = new Date(value);

  return !Number.isNaN(date.getTime());
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const businessName = requiredText(body.business_name);

    if (!businessName) {
      return NextResponse.json(
        { ok: false, error: "El nombre del negocio es obligatorio." },
        { status: 400 }
      );
    }

    const pipelineStage = isValidStage(body.pipeline_stage)
      ? body.pipeline_stage
      : "nuevo";

    const leadTemperature = isValidTemperature(body.lead_temperature)
      ? body.lead_temperature
      : "frio";

    const leadFit = isValidFit(body.lead_fit) ? body.lead_fit : "medio";

    const leadPriority = isValidPriority(body.lead_priority)
      ? body.lead_priority
      : "media";

    const channel = isValidChannel(body.channel) ? body.channel : "manual";

    const leadOriginType = isValidOrigin(body.lead_origin_type)
      ? body.lead_origin_type
      : "manual_research";

    const recommendedPlan =
      body.recommended_plan === null || body.recommended_plan === ""
        ? null
        : isValidPlan(body.recommended_plan)
          ? body.recommended_plan
          : null;

    if (!isValidDateOrNull(body.next_action_at)) {
      return NextResponse.json(
        { ok: false, error: "Fecha de próxima acción inválida." },
        { status: 400 }
      );
    }

    const doNotContact = Boolean(body.do_not_contact);
    const contactAllowed = doNotContact ? false : Boolean(body.contact_allowed ?? true);

    const payload = {
      business_name: businessName,
      contact_name: cleanText(body.contact_name),
      email: cleanText(body.email),
      whatsapp: cleanText(body.whatsapp),

      city: cleanText(body.city),
      province: cleanText(body.province),
      country: cleanText(body.country) || "Ecuador",
      business_type: cleanText(body.business_type),

      source: cleanText(body.source),
      source_url: cleanText(body.source_url),
      channel,
      lead_origin_type: leadOriginType,

      pipeline_stage: doNotContact ? "no_contactar" : pipelineStage,
      lead_temperature: leadTemperature,
      lead_fit: leadFit,
      lead_priority: leadPriority,

      score: Number.isFinite(Number(body.score)) ? Number(body.score) : 0,
      recommended_plan: recommendedPlan,

      owner_name: cleanText(body.owner_name),

      next_action_at:
        typeof body.next_action_at === "string" && body.next_action_at.trim()
          ? body.next_action_at
          : null,

      last_interaction_at: null,

      notes: cleanText(body.notes),

      do_not_contact: doNotContact,
      contact_allowed: contactAllowed,
    };

    const supabase = createAdminSupabaseClient();

    const { data, error } = await supabase
      .from("prospects")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        prospect: data,
      },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo crear el prospecto.";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 }
    );
  }
}