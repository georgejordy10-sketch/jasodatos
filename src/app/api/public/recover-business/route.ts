import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  clearBusinessAccessChallenge,
  generateBusinessAccessCode,
  setBusinessAccessChallenge,
} from "@/lib/businessAccessChallenge";

type RecoverBusinessBody = {
  business_name?: string;
  commercial_email?: string;
  commercial_whatsapp?: string;
};

type BusinessRecord = {
  id: string;
  slug: string;
  business_name: string;
  commercial_email: string | null;
  owner_email: string | null;
  status: string | null;
  trial_ends_at: string | null;
};

function cleanText(value: unknown) {
  if (typeof value !== "string") return "";

  return value.trim();
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

function hasValidAccessStatus(
  business: BusinessRecord
): boolean {
  if (business.status === "active") {
    return true;
  }

  if (business.status !== "trial") {
    return false;
  }

  if (!business.trial_ends_at) {
    return false;
  }

  const trialEndsAt = new Date(
    business.trial_ends_at
  );

  if (!Number.isFinite(trialEndsAt.getTime())) {
    return false;
  }

  return trialEndsAt.getTime() > Date.now();
}

function getAccessEmail(
  business: BusinessRecord
): string {
  return (
    business.commercial_email ??
    business.owner_email ??
    ""
  )
    .trim()
    .toLowerCase();
}

async function sendBusinessAccessEmail({
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
    process.env.RESEND_FROM_EMAIL ||
    "JasoDatos <onboarding@resend.dev>";

  if (!resendApiKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "Falta configurar RESEND_API_KEY para enviar correos."
      );
    }

    console.log(
      `[JasoDatos DEV] Código de acceso para ${to}: ${code}`
    );

    return {
      sent: false,
    };
  }

  const response = await fetch(
    "https://api.resend.com/emails",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
        "User-Agent": "JasoDatos/1.0",
      },
      body: JSON.stringify({
        from: fromEmail,
        to,
        subject: "Código de acceso a JasoDatos",
        text:
          `Solicitaste acceso al negocio ${businessName} en JasoDatos.\n\n` +
          `Tu código de acceso es: ${code}\n\n` +
          "Este código vence en 10 minutos.\n\n" +
          "Si no solicitaste este acceso, puedes ignorar este correo.",
      }),
    }
  );

  if (!response.ok) {
    const raw = await response.text();

    throw new Error(
      raw || "No se pudo enviar el código de acceso."
    );
  }

  return {
    sent: true,
  };
}

function genericRecoveryResponse() {
  return NextResponse.json({
    ok: true,
    verification_required: true,
    message:
      "Si los datos coinciden con un negocio con acceso vigente, enviaremos un código de 6 dígitos al correo registrado.",
  });
}

export async function POST(request: Request) {
  try {
    const body =
      (await request.json()) as RecoverBusinessBody;

    const businessName = cleanText(
      body.business_name
    );

    const commercialEmail = cleanText(
      body.commercial_email
    ).toLowerCase();

    const commercialWhatsapp = normalizePhone(
      cleanText(body.commercial_whatsapp)
    );

    if (
      !businessName &&
      !commercialEmail &&
      !commercialWhatsapp
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Ingresa el nombre del negocio, correo comercial o WhatsApp registrado.",
        },
        { status: 400 }
      );
    }

    await clearBusinessAccessChallenge();

    const supabase = createAdminSupabaseClient();

    let businesses: BusinessRecord[] = [];

    if (commercialEmail) {
      const { data, error } = await supabase
        .from("businesses")
        .select(
          "id, slug, business_name, commercial_email, owner_email, status, trial_ends_at"
        )
        .ilike(
          "commercial_email",
          commercialEmail
        )
        .limit(5);

      if (error) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "No se pudo procesar la solicitud de acceso.",
          },
          { status: 500 }
        );
      }

      businesses =
        (data as BusinessRecord[] | null) ?? [];

      if (businesses.length === 0) {
        const {
          data: ownerEmailBusinesses,
          error: ownerEmailError,
        } = await supabase
          .from("businesses")
          .select(
            "id, slug, business_name, commercial_email, owner_email, status, trial_ends_at"
          )
          .ilike(
            "owner_email",
            commercialEmail
          )
          .limit(5);

        if (ownerEmailError) {
          return NextResponse.json(
            {
              ok: false,
              error:
                "No se pudo procesar la solicitud de acceso.",
            },
            { status: 500 }
          );
        }

        businesses =
          (ownerEmailBusinesses as
            | BusinessRecord[]
            | null) ?? [];
      }
    } else if (commercialWhatsapp) {
      const { data, error } = await supabase
        .from("businesses")
        .select(
          "id, slug, business_name, commercial_email, owner_email, status, trial_ends_at"
        )
        .ilike(
          "commercial_whatsapp",
          `%${commercialWhatsapp}%`
        )
        .limit(5);

      if (error) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "No se pudo procesar la solicitud de acceso.",
          },
          { status: 500 }
        );
      }

      businesses =
        (data as BusinessRecord[] | null) ?? [];

      if (businesses.length === 0) {
        const {
          data: ownerWhatsappBusinesses,
          error: ownerWhatsappError,
        } = await supabase
          .from("businesses")
          .select(
            "id, slug, business_name, commercial_email, owner_email, status, trial_ends_at"
          )
          .ilike(
            "owner_whatsapp",
            `%${commercialWhatsapp}%`
          )
          .limit(5);

        if (ownerWhatsappError) {
          return NextResponse.json(
            {
              ok: false,
              error:
                "No se pudo procesar la solicitud de acceso.",
            },
            { status: 500 }
          );
        }

        businesses =
          (ownerWhatsappBusinesses as
            | BusinessRecord[]
            | null) ?? [];
      }
    } else {
      const { data, error } = await supabase
        .from("businesses")
        .select(
          "id, slug, business_name, commercial_email, owner_email, status, trial_ends_at"
        )
        .ilike(
          "business_name",
          businessName
        )
        .limit(5);

      if (error) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "No se pudo procesar la solicitud de acceso.",
          },
          { status: 500 }
        );
      }

      businesses =
        (data as BusinessRecord[] | null) ?? [];
    }

    const business =
      businesses.find(
        (item) =>
          item.status === "active" &&
          hasValidAccessStatus(item)
      ) ??
      businesses.find(
        (item) =>
          item.status === "trial" &&
          hasValidAccessStatus(item)
      ) ??
      null;

    if (!business) {
      return genericRecoveryResponse();
    }

    const accessEmail =
      getAccessEmail(business);

    if (!accessEmail) {
      return genericRecoveryResponse();
    }

    const accessCode =
      generateBusinessAccessCode();

    await setBusinessAccessChallenge({
      businessId: business.id,
      slug: business.slug,
      email: accessEmail,
      code: accessCode,
    });

    try {
      const emailResult =
        await sendBusinessAccessEmail({
          to: accessEmail,
          businessName:
            business.business_name,
          code: accessCode,
        });

      return NextResponse.json({
        ok: true,
        verification_required: true,
        message:
          "Si los datos coinciden con un negocio con acceso vigente, enviaremos un código de 6 dígitos al correo registrado.",
        debug_verification_code:
          !emailResult.sent &&
          process.env.NODE_ENV !== "production"
            ? accessCode
            : undefined,
      });
    } catch (error) {
      await clearBusinessAccessChallenge();

      throw error;
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo procesar la solicitud de acceso.";

    console.error(
      "[recover-business] Error:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
