import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  clearBusinessAccessChallenge,
  validateBusinessAccessCode,
} from "@/lib/businessAccessChallenge";
import { setBusinessAccessSession } from "@/lib/businessAccessSession";

type VerifyBusinessAccessBody = {
  code?: string;
};

type BusinessRecord = {
  id: string;
  slug: string;
  status: string | null;
  trial_ends_at: string | null;
};

function cleanText(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function getSessionDurationSeconds(
  business: BusinessRecord
): number | null {
  if (business.status === "active") {
    return 7 * 24 * 60 * 60;
  }

  if (business.status !== "trial") {
    return null;
  }

  if (!business.trial_ends_at) {
    return null;
  }

  const trialEndsAt = new Date(
    business.trial_ends_at
  );

  if (!Number.isFinite(trialEndsAt.getTime())) {
    return null;
  }

  const remainingMilliseconds =
    trialEndsAt.getTime() - Date.now();

  if (remainingMilliseconds <= 0) {
    return null;
  }

  return Math.max(
    1,
    Math.floor(
      remainingMilliseconds / 1000
    )
  );
}

export async function POST(
  request: Request
) {
  try {
    let body: VerifyBusinessAccessBody;

    try {
      body =
        (await request.json()) as VerifyBusinessAccessBody;
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error:
            "La solicitud contiene datos inválidos.",
        },
        { status: 400 }
      );
    }

    const code =
      cleanText(body.code);

    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Ingresa el código de 6 dígitos recibido por correo.",
        },
        { status: 400 }
      );
    }

    const challenge =
      await validateBusinessAccessCode(
        code
      );

    if (!challenge) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El código es incorrecto, venció o alcanzó el máximo de intentos. Solicita un nuevo código.",
        },
        { status: 400 }
      );
    }

    const supabase =
      createAdminSupabaseClient();

    const {
      data: business,
      error,
    } = await supabase
      .from("businesses")
      .select(
        "id, slug, status, trial_ends_at"
      )
      .eq(
        "id",
        challenge.businessId
      )
      .eq(
        "slug",
        challenge.slug
      )
      .maybeSingle();

    if (error) {
      console.error(
        "[verify-business-access] Error consultando negocio:",
        error
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "No se pudo validar el acceso al negocio.",
        },
        { status: 500 }
      );
    }

    if (!business) {
      await clearBusinessAccessChallenge();

      return NextResponse.json(
        {
          ok: false,
          error:
            "No se pudo validar el acceso al negocio.",
        },
        { status: 404 }
      );
    }

    const sessionDurationSeconds =
      getSessionDurationSeconds(
        business as BusinessRecord
      );

    if (!sessionDurationSeconds) {
      await clearBusinessAccessChallenge();

      return NextResponse.json(
        {
          ok: false,
          error:
            "El acceso de este negocio ya no se encuentra vigente.",
        },
        { status: 403 }
      );
    }

    await setBusinessAccessSession({
      businessId: business.id,
      slug: business.slug,
      expiresInSeconds:
        sessionDurationSeconds,
    });

    await clearBusinessAccessChallenge();

    return NextResponse.json({
      ok: true,
      redirectTo:
        `/cargas?business=${encodeURIComponent(
          business.slug
        )}`,
    });
  } catch (error) {
    console.error(
      "[verify-business-access] Error inesperado:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "No se pudo verificar el código de acceso.",
      },
      { status: 500 }
    );
  }
}
