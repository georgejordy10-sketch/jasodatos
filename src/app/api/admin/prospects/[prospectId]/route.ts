import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type {
  JasoJevasaPlan,
  ProspectFit,
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

function cleanText(value: unknown) {
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

function isValidDateOrNull(value: unknown) {
  if (value === null) return true;
  if (typeof value !== "string") return false;
  if (!value.trim()) return true;

  const date = new Date(value);

  return !Number.isNaN(date.getTime());
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ prospectId: string }> }
) {
  try {
    const { prospectId } = await params;

    if (!prospectId) {
      return NextResponse.json(
        { ok: false, error: "Falta prospectId." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const payload: Record<string, unknown> = {};

    if ("pipeline_stage" in body) {
      if (!isValidStage(body.pipeline_stage)) {
        return NextResponse.json(
          { ok: false, error: "Estado de prospecto inválido." },
          { status: 400 }
        );
      }

      payload.pipeline_stage = body.pipeline_stage;
    }

    if ("lead_temperature" in body) {
      if (!isValidTemperature(body.lead_temperature)) {
        return NextResponse.json(
          { ok: false, error: "Temperatura inválida." },
          { status: 400 }
        );
      }

      payload.lead_temperature = body.lead_temperature;
    }

    if ("lead_fit" in body) {
      if (!isValidFit(body.lead_fit)) {
        return NextResponse.json(
          { ok: false, error: "Fit inválido." },
          { status: 400 }
        );
      }

      payload.lead_fit = body.lead_fit;
    }

    if ("lead_priority" in body) {
      if (!isValidPriority(body.lead_priority)) {
        return NextResponse.json(
          { ok: false, error: "Prioridad inválida." },
          { status: 400 }
        );
      }

      payload.lead_priority = body.lead_priority;
    }

    if ("recommended_plan" in body) {
      if (body.recommended_plan === null || body.recommended_plan === "") {
        payload.recommended_plan = null;
      } else if (isValidPlan(body.recommended_plan)) {
        payload.recommended_plan = body.recommended_plan;
      } else {
        return NextResponse.json(
          { ok: false, error: "Plan sugerido inválido." },
          { status: 400 }
        );
      }
    }

    if ("owner_name" in body) {
      payload.owner_name = cleanText(body.owner_name);
    }

    if ("notes" in body) {
      payload.notes = cleanText(body.notes);
    }

    if ("next_action_at" in body) {
      if (!isValidDateOrNull(body.next_action_at)) {
        return NextResponse.json(
          { ok: false, error: "Fecha de próxima acción inválida." },
          { status: 400 }
        );
      }

      payload.next_action_at =
        typeof body.next_action_at === "string" && body.next_action_at.trim()
          ? body.next_action_at
          : null;
    }

    if ("do_not_contact" in body) {
      payload.do_not_contact = Boolean(body.do_not_contact);

      if (Boolean(body.do_not_contact)) {
        payload.contact_allowed = false;
        payload.pipeline_stage = "no_contactar";
      }
    }

    if ("contact_allowed" in body && !payload.do_not_contact) {
      payload.contact_allowed = Boolean(body.contact_allowed);
    }

    if (Object.keys(payload).length === 0) {
      return NextResponse.json(
        { ok: false, error: "No hay campos para actualizar." },
        { status: 400 }
      );
    }

    const supabase = createAdminSupabaseClient();

    const { data, error } = await supabase
      .from("prospects")
      .update(payload)
      .eq("id", prospectId)
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
      { status: 200 }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo actualizar el prospecto.";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 }
    );
  }
}