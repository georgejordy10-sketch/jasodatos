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
  commercial_whatsapp: string | null;
  owner_email: string | null;
  owner_whatsapp: string | null;
  status: string | null;
  trial_ends_at: string | null;
};

const BUSINESS_SELECT =
  "id, slug, business_name, commercial_email, commercial_whatsapp, owner_email, owner_whatsapp, status, trial_ends_at";

function cleanText(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeBusinessName(
  value: string
): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
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
  return normalizeEmail(
    business.commercial_email ??
      business.owner_email ??
      ""
  );
}

function findExactEmailMatches(
  businesses: BusinessRecord[],
  email: string,
  field:
    | "commercial_email"
    | "owner_email"
): BusinessRecord[] {
  const expectedEmail =
    normalizeEmail(email);

  return businesses.filter(
    (business) =>
      normalizeEmail(
        business[field] ?? ""
      ) === expectedEmail
  );
}

function findExactPhoneMatches(
  businesses: BusinessRecord[],
  phone: string,
  field:
    | "commercial_whatsapp"
    | "owner_whatsapp"
): BusinessRecord[] {
  const expectedPhone =
    normalizePhone(phone);

  return businesses.filter(
    (business) =>
      normalizePhone(
        business[field] ?? ""
      ) === expectedPhone
  );
}

function findExactBusinessNameMatches(
  businesses: BusinessRecord[],
  businessName: string
): BusinessRecord[] {
  const expectedName =
    normalizeBusinessName(
      businessName
    );

  return businesses.filter(
    (business) =>
      normalizeBusinessName(
        business.business_name
      ) === expectedName
  );
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
  const resendApiKey =
    process.env.RESEND_API_KEY?.trim();

  const fromEmail =
    process.env.RESEND_FROM_EMAIL?.trim();

  if (!resendApiKey || !fromEmail) {
    if (
      process.env.NODE_ENV === "production"
    ) {
      throw new Error(
        "El servicio de correo no está configurado."
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
        Authorization:
          `Bearer ${resendApiKey}`,
        "Content-Type":
          "application/json",
        "User-Agent":
          "JasoDatos/1.0",
      },
      body: JSON.stringify({
        from: fromEmail,
        to,
        subject:
          "Código de acceso a JasoDatos",
        text:
          `Solicitaste acceso al negocio ${businessName} en JasoDatos.\n\n` +
          `Tu código de acceso es: ${code}\n\n` +
          "Este código vence en 10 minutos.\n\n" +
          "Si no solicitaste este acceso, puedes ignorar este correo.",
      }),
    }
  );

  if (!response.ok) {
    const raw =
      await response.text();

    console.error(
      "[recover-business] Resend rechazó el correo:",
      {
        status: response.status,
        response:
          raw.slice(0, 500),
      }
    );

    throw new Error(
      "No se pudo enviar el código de acceso."
    );
  }

  return {
    sent: true,
  };
}

function genericRecoveryResponse(
  debugVerificationCode?: string
) {
  return NextResponse.json({
    ok: true,
    verification_required: true,
    message:
      "Si los datos coinciden con un negocio con acceso vigente, enviaremos un código de 6 dígitos al correo registrado.",
    ...(debugVerificationCode
      ? {
          debug_verification_code:
            debugVerificationCode,
        }
      : {}),
  });
}

export async function POST(
  request: Request
) {
  try {
    let body: RecoverBusinessBody;

    try {
      body =
        (await request.json()) as RecoverBusinessBody;
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

    const businessName = cleanText(
      body.business_name
    );

    const commercialEmail =
      normalizeEmail(
        cleanText(
          body.commercial_email
        )
      );

    const commercialWhatsapp =
      normalizePhone(
        cleanText(
          body.commercial_whatsapp
        )
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

    if (
      businessName.length > 160 ||
      commercialEmail.length > 254 ||
      commercialWhatsapp.length > 20
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Los datos ingresados no tienen un formato válido.",
        },
        { status: 400 }
      );
    }

    await clearBusinessAccessChallenge();

    const supabase =
      createAdminSupabaseClient();

    let businesses:
      BusinessRecord[] = [];

    if (commercialEmail) {
      const {
        data,
        error,
      } = await supabase
        .from("businesses")
        .select(BUSINESS_SELECT)
        .ilike(
          "commercial_email",
          commercialEmail
        )
        .limit(10);

      if (error) {
        console.error(
          "[recover-business] Error consultando correo comercial:",
          error
        );

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
        findExactEmailMatches(
          (data as
            | BusinessRecord[]
            | null) ?? [],
          commercialEmail,
          "commercial_email"
        );

      if (businesses.length === 0) {
        const {
          data:
            ownerEmailBusinesses,
          error:
            ownerEmailError,
        } = await supabase
          .from("businesses")
          .select(BUSINESS_SELECT)
          .ilike(
            "owner_email",
            commercialEmail
          )
          .limit(10);

        if (ownerEmailError) {
          console.error(
            "[recover-business] Error consultando correo del propietario:",
            ownerEmailError
          );

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
          findExactEmailMatches(
            (ownerEmailBusinesses as
              | BusinessRecord[]
              | null) ?? [],
            commercialEmail,
            "owner_email"
          );
      }
    } else if (
      commercialWhatsapp
    ) {
      const {
        data,
        error,
      } = await supabase
        .from("businesses")
        .select(BUSINESS_SELECT)
        .ilike(
          "commercial_whatsapp",
          `%${commercialWhatsapp}%`
        )
        .limit(10);

      if (error) {
        console.error(
          "[recover-business] Error consultando WhatsApp comercial:",
          error
        );

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
        findExactPhoneMatches(
          (data as
            | BusinessRecord[]
            | null) ?? [],
          commercialWhatsapp,
          "commercial_whatsapp"
        );

      if (businesses.length === 0) {
        const {
          data:
            ownerWhatsappBusinesses,
          error:
            ownerWhatsappError,
        } = await supabase
          .from("businesses")
          .select(BUSINESS_SELECT)
          .ilike(
            "owner_whatsapp",
            `%${commercialWhatsapp}%`
          )
          .limit(10);

        if (ownerWhatsappError) {
          console.error(
            "[recover-business] Error consultando WhatsApp del propietario:",
            ownerWhatsappError
          );

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
          findExactPhoneMatches(
            (ownerWhatsappBusinesses as
              | BusinessRecord[]
              | null) ?? [],
            commercialWhatsapp,
            "owner_whatsapp"
          );
      }
    } else {
      const {
        data,
        error,
      } = await supabase
        .from("businesses")
        .select(BUSINESS_SELECT)
        .ilike(
          "business_name",
          businessName
        )
        .limit(10);

      if (error) {
        console.error(
          "[recover-business] Error consultando nombre del negocio:",
          error
        );

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
        findExactBusinessNameMatches(
          (data as
            | BusinessRecord[]
            | null) ?? [],
          businessName
        );
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
      getAccessEmail(
        business
      );

    if (!accessEmail) {
      return genericRecoveryResponse();
    }

    const accessCode =
      generateBusinessAccessCode();

    await setBusinessAccessChallenge({
      businessId:
        business.id,
      slug:
        business.slug,
      email:
        accessEmail,
      code:
        accessCode,
    });

    try {
      const emailResult =
        await sendBusinessAccessEmail({
          to:
            accessEmail,
          businessName:
            business.business_name,
          code:
            accessCode,
        });

      const debugVerificationCode =
        !emailResult.sent &&
        process.env.NODE_ENV !==
          "production"
          ? accessCode
          : undefined;

      return genericRecoveryResponse(
        debugVerificationCode
      );
    } catch (error) {
      console.error(
        "[recover-business] No se pudo entregar el código:",
        error
      );

      await clearBusinessAccessChallenge();

      /*
       * La respuesta debe ser igual a la de un negocio
       * inexistente para no revelar si una cuenta existe
       * mediante el resultado del envío del correo.
       */
      return genericRecoveryResponse();
    }
  } catch (error) {
    console.error(
      "[recover-business] Error inesperado:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "No se pudo procesar la solicitud de acceso.",
      },
      { status: 500 }
    );
  }
}
