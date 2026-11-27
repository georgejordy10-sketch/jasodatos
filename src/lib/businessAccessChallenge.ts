import crypto from "node:crypto";
import { cookies } from "next/headers";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const BUSINESS_ACCESS_CHALLENGE_COOKIE_NAME =
  "jasodatos_business_access_challenge";

const CHALLENGE_TTL_SECONDS = 10 * 60;
const MAX_FAILED_ATTEMPTS = 5;
const SERVER_CHALLENGE_PREFIX = "v2.";

type LegacyBusinessAccessChallenge = {
  version: 1;
  businessId: string;
  slug: string;
  email: string;
  codeHash: string;
  failedAttempts: number;
  issuedAt: number;
  expiresAt: number;
};

export type ValidatedBusinessAccessChallenge = {
  businessId: string;
  slug: string;
  email: string;
};

type CreateChallengeInput = {
  businessId: string;
  slug: string;
  email: string;
  code: string;
};

type ServerChallengeRpcResult = {
  ok?: boolean;
  reason?: string;
  business_id?: string;
  slug?: string;
  email?: string;
};

function getChallengeSecret(): string {
  const secret =
    process.env.BUSINESS_ACCESS_SESSION_SECRET?.trim();

  if (!secret) {
    throw new Error(
      "Falta configurar BUSINESS_ACCESS_SESSION_SECRET."
    );
  }

  if (Buffer.byteLength(secret, "utf8") < 32) {
    throw new Error(
      "BUSINESS_ACCESS_SESSION_SECRET debe tener al menos 32 bytes."
    );
  }

  return secret;
}

function hashAccessCode(code: string): string {
  return crypto
    .createHmac("sha256", getChallengeSecret())
    .update(`business-access-code:${code.trim()}`)
    .digest("hex");
}

function hashServerToken(token: string): string {
  return crypto
    .createHash("sha256")
    .update(`business-access-token:${token}`)
    .digest("hex");
}

function encodePayload(
  payload: LegacyBusinessAccessChallenge
): string {
  return Buffer.from(
    JSON.stringify(payload),
    "utf8"
  ).toString("base64url");
}

function signPayload(encodedPayload: string): string {
  return crypto
    .createHmac("sha256", getChallengeSecret())
    .update(`business-access-challenge:${encodedPayload}`)
    .digest("base64url");
}

function signaturesMatch(
  providedSignature: string,
  expectedSignature: string
): boolean {
  const providedBuffer = Buffer.from(
    providedSignature,
    "utf8"
  );

  const expectedBuffer = Buffer.from(
    expectedSignature,
    "utf8"
  );

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    providedBuffer,
    expectedBuffer
  );
}

function serializeLegacyChallenge(
  payload: LegacyBusinessAccessChallenge
): string {
  const encodedPayload = encodePayload(payload);
  const signature = signPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

function createLegacyChallengeToken(
  input: CreateChallengeInput
): string {
  const now = Math.floor(Date.now() / 1000);

  const payload: LegacyBusinessAccessChallenge = {
    version: 1,
    businessId: input.businessId.trim(),
    slug: input.slug.trim(),
    email: input.email.trim().toLowerCase(),
    codeHash: hashAccessCode(input.code),
    failedAttempts: 0,
    issuedAt: now,
    expiresAt: now + CHALLENGE_TTL_SECONDS,
  };

  return serializeLegacyChallenge(payload);
}

function verifyLegacyChallengeToken(
  token: string | null | undefined
): LegacyBusinessAccessChallenge | null {
  if (!token) {
    return null;
  }

  try {
    const parts = token.split(".");

    if (parts.length !== 2) {
      return null;
    }

    const [encodedPayload, providedSignature] = parts;

    if (!encodedPayload || !providedSignature) {
      return null;
    }

    const expectedSignature =
      signPayload(encodedPayload);

    if (
      !signaturesMatch(
        providedSignature,
        expectedSignature
      )
    ) {
      return null;
    }

    const payload = JSON.parse(
      Buffer.from(
        encodedPayload,
        "base64url"
      ).toString("utf8")
    ) as Partial<LegacyBusinessAccessChallenge>;

    const now = Math.floor(Date.now() / 1000);

    if (
      payload.version !== 1 ||
      typeof payload.businessId !== "string" ||
      !payload.businessId.trim() ||
      typeof payload.slug !== "string" ||
      !payload.slug.trim() ||
      typeof payload.email !== "string" ||
      !payload.email.trim() ||
      typeof payload.codeHash !== "string" ||
      !payload.codeHash.trim() ||
      typeof payload.failedAttempts !== "number" ||
      !Number.isInteger(payload.failedAttempts) ||
      payload.failedAttempts < 0 ||
      payload.failedAttempts >= MAX_FAILED_ATTEMPTS ||
      typeof payload.issuedAt !== "number" ||
      typeof payload.expiresAt !== "number" ||
      payload.expiresAt <= now
    ) {
      return null;
    }

    return {
      version: 1,
      businessId: payload.businessId,
      slug: payload.slug,
      email: payload.email,
      codeHash: payload.codeHash,
      failedAttempts: payload.failedAttempts,
      issuedAt: payload.issuedAt,
      expiresAt: payload.expiresAt,
    };
  } catch {
    return null;
  }
}

function isMissingServerChallengeStorageError(error: {
  code?: string | null;
  message?: string | null;
}) {
  if (
    error.code === "42P01" ||
    error.code === "PGRST202" ||
    error.code === "PGRST205"
  ) {
    return true;
  }

  const message = String(error.message ?? "").toLowerCase();

  return (
    message.includes("business_access_challenges") &&
    (
      message.includes("schema cache") ||
      message.includes("does not exist") ||
      message.includes("could not find")
    )
  );
}

function isServerChallengeToken(
  token: string
): boolean {
  return token.startsWith(SERVER_CHALLENGE_PREFIX);
}

function getRawServerToken(
  cookieValue: string
): string | null {
  if (!isServerChallengeToken(cookieValue)) {
    return null;
  }

  const rawToken = cookieValue.slice(
    SERVER_CHALLENGE_PREFIX.length
  );

  if (!/^[A-Za-z0-9_-]{40,}$/.test(rawToken)) {
    return null;
  }

  return rawToken;
}

async function setChallengeCookie(
  value: string,
  maxAge = CHALLENGE_TTL_SECONDS
) {
  const cookieStore = await cookies();

  cookieStore.set(
    BUSINESS_ACCESS_CHALLENGE_COOKIE_NAME,
    value,
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge,
    }
  );
}

async function clearChallengeCookie() {
  const cookieStore = await cookies();

  cookieStore.set(
    BUSINESS_ACCESS_CHALLENGE_COOKIE_NAME,
    "",
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    }
  );
}

export function generateBusinessAccessCode(): string {
  return crypto
    .randomInt(100000, 1000000)
    .toString();
}

export async function setBusinessAccessChallenge(
  input: CreateChallengeInput
): Promise<void> {
  const rawToken = crypto
    .randomBytes(32)
    .toString("base64url");

  const supabase =
    createAdminSupabaseClient();

  const expiresAt = new Date(
    Date.now() + CHALLENGE_TTL_SECONDS * 1000
  );

  const {
    error: serverChallengeError,
  } = await supabase
    .from("business_access_challenges")
    .insert({
      token_hash: hashServerToken(rawToken),
      business_id: input.businessId.trim(),
      slug: input.slug.trim(),
      email: input.email.trim().toLowerCase(),
      code_hash: hashAccessCode(input.code),
      failed_attempts: 0,
      expires_at: expiresAt.toISOString(),
    });

  if (!serverChallengeError) {
    await setChallengeCookie(
      `${SERVER_CHALLENGE_PREFIX}${rawToken}`
    );

    return;
  }

  if (
    !isMissingServerChallengeStorageError(
      serverChallengeError
    )
  ) {
    console.error(
      "[business-access-challenge] No se pudo crear el challenge server-side:",
      serverChallengeError
    );

    throw new Error(
      "No se pudo iniciar la verificación de acceso."
    );
  }

  /*
   * Compatibilidad temporal para despliegues donde la migración
   * de Supabase todavía no fue aplicada. El hash del PIN queda
   * protegido con HMAC secreto, por lo que ya no es brute-forceable
   * offline desde la cookie. El modo server-side sigue siendo el
   * objetivo definitivo porque también impide replay de intentos.
   */
  console.warn(
    "[business-access-challenge] Storage server-side no disponible; se usa compatibilidad firmada."
  );

  await setChallengeCookie(
    createLegacyChallengeToken(input)
  );
}

export async function validateBusinessAccessCode(
  code: string
): Promise<ValidatedBusinessAccessChallenge | null> {
  const cookieStore = await cookies();

  const token = cookieStore.get(
    BUSINESS_ACCESS_CHALLENGE_COOKIE_NAME
  )?.value;

  if (!token) {
    return null;
  }

  const rawServerToken =
    getRawServerToken(token);

  if (rawServerToken) {
    const supabase =
      createAdminSupabaseClient();

    const {
      data,
      error,
    } = await supabase.rpc(
      "validate_business_access_challenge",
      {
        p_token_hash:
          hashServerToken(rawServerToken),
        p_code_hash:
          hashAccessCode(code),
      }
    );

    if (error) {
      console.error(
        "[business-access-challenge] Error validando challenge server-side:",
        error
      );

      return null;
    }

    const result =
      data as ServerChallengeRpcResult | null;

    if (
      result?.ok === true &&
      typeof result.business_id === "string" &&
      typeof result.slug === "string" &&
      typeof result.email === "string"
    ) {
      return {
        businessId: result.business_id,
        slug: result.slug,
        email: result.email,
      };
    }

    if (
      result?.reason === "expired" ||
      result?.reason === "attempts_exceeded" ||
      result?.reason === "consumed" ||
      result?.reason === "invalid"
    ) {
      await clearChallengeCookie();
    }

    return null;
  }

  const challenge =
    verifyLegacyChallengeToken(token);

  if (!challenge) {
    return null;
  }

  const incomingHash =
    hashAccessCode(code);

  const incomingBuffer = Buffer.from(
    incomingHash,
    "utf8"
  );

  const expectedBuffer = Buffer.from(
    challenge.codeHash,
    "utf8"
  );

  if (incomingBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (
    !crypto.timingSafeEqual(
      incomingBuffer,
      expectedBuffer
    )
  ) {
    const failedAttempts =
      challenge.failedAttempts + 1;

    if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
      await clearChallengeCookie();
      return null;
    }

    const updatedChallenge:
      LegacyBusinessAccessChallenge = {
        ...challenge,
        failedAttempts,
      };

    const remainingSeconds = Math.max(
      1,
      challenge.expiresAt -
        Math.floor(Date.now() / 1000)
    );

    await setChallengeCookie(
      serializeLegacyChallenge(updatedChallenge),
      remainingSeconds
    );

    return null;
  }

  return {
    businessId: challenge.businessId,
    slug: challenge.slug,
    email: challenge.email,
  };
}

export async function clearBusinessAccessChallenge():
  Promise<void> {
  const cookieStore = await cookies();

  const token = cookieStore.get(
    BUSINESS_ACCESS_CHALLENGE_COOKIE_NAME
  )?.value;

  const rawServerToken =
    token ? getRawServerToken(token) : null;

  if (rawServerToken) {
    try {
      const supabase =
        createAdminSupabaseClient();

      const { error } = await supabase
        .from("business_access_challenges")
        .delete()
        .eq(
          "token_hash",
          hashServerToken(rawServerToken)
        );

      if (
        error &&
        !isMissingServerChallengeStorageError(
          error
        )
      ) {
        console.warn(
          "[business-access-challenge] No se pudo limpiar el challenge server-side:",
          error
        );
      }
    } catch (error) {
      console.warn(
        "[business-access-challenge] Error limpiando challenge server-side:",
        error
      );
    }
  }

  await clearChallengeCookie();
}
