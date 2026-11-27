import crypto from "node:crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

type RateLimitRpcResult = {
  ok?: boolean;
  allowed?: boolean;
  retry_after_seconds?: number;
};

function getRateLimitSecret(): string {
  const secret =
    process.env.BUSINESS_ACCESS_SESSION_SECRET?.trim();

  if (!secret) {
    throw new Error(
      "Falta configurar BUSINESS_ACCESS_SESSION_SECRET."
    );
  }

  return secret;
}

function getClientIp(request: Request): string {
  const forwardedFor =
    request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor
      .split(",")[0]
      ?.trim() || "unknown";
  }

  return (
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

function buildRateLimitKey(
  request: Request,
  action: string,
  identifier = ""
) {
  const ip = getClientIp(request);

  return crypto
    .createHmac("sha256", getRateLimitSecret())
    .update(
      `public-rate-limit:${action}:${ip}:${identifier.trim().toLowerCase()}`
    )
    .digest("hex");
}

function isMissingRateLimitRpcError(error: {
  code?: string | null;
  message?: string | null;
}) {
  if (
    error.code === "PGRST202" ||
    error.code === "42P01" ||
    error.code === "PGRST205"
  ) {
    return true;
  }

  const message =
    String(error.message ?? "").toLowerCase();

  return (
    message.includes("consume_public_api_rate_limit") &&
    (
      message.includes("schema cache") ||
      message.includes("does not exist") ||
      message.includes("could not find")
    )
  );
}

export async function checkPublicRateLimit({
  request,
  action,
  identifier,
  limit,
  windowSeconds,
}: {
  request: Request;
  action: string;
  identifier?: string;
  limit: number;
  windowSeconds: number;
}): Promise<RateLimitResult> {
  try {
    const supabase =
      createAdminSupabaseClient();

    const {
      data,
      error,
    } = await supabase.rpc(
      "consume_public_api_rate_limit",
      {
        p_action: action,
        p_key_hash: buildRateLimitKey(
          request,
          action,
          identifier
        ),
        p_limit: limit,
        p_window_seconds: windowSeconds,
      }
    );

    if (error) {
      if (isMissingRateLimitRpcError(error)) {
        console.warn(
          `[rate-limit] RPC no disponible para ${action}; se mantiene compatibilidad temporal.`
        );

        return {
          allowed: true,
          retryAfterSeconds: 0,
        };
      }

      console.error(
        `[rate-limit] Error en ${action}:`,
        error
      );

      /*
       * Fail closed en producción para endpoints que envían
       * correos/códigos. En desarrollo se permite continuar.
       */
      return {
        allowed:
          process.env.NODE_ENV !== "production",
        retryAfterSeconds: 60,
      };
    }

    const result =
      data as RateLimitRpcResult | null;

    if (
      !result ||
      result.ok !== true ||
      typeof result.allowed !== "boolean"
    ) {
      console.error(
        `[rate-limit] Respuesta inválida para ${action}:`,
        data
      );

      return {
        allowed:
          process.env.NODE_ENV !== "production",
        retryAfterSeconds: 60,
      };
    }

    return {
      allowed: result.allowed,
      retryAfterSeconds:
        typeof result.retry_after_seconds === "number"
          ? Math.max(
              0,
              result.retry_after_seconds
            )
          : 0,
    };
  } catch (error) {
    console.error(
      `[rate-limit] Error inesperado en ${action}:`,
      error
    );

    return {
      allowed:
        process.env.NODE_ENV !== "production",
      retryAfterSeconds: 60,
    };
  }
}

export function rateLimitResponse(
  retryAfterSeconds: number
) {
  return Response.json(
    {
      ok: false,
      error:
        "Se realizaron demasiados intentos. Espera un momento antes de volver a intentarlo.",
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(
          Math.max(1, retryAfterSeconds)
        ),
      },
    }
  );
}
