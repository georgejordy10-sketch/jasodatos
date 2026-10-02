import crypto from "node:crypto";
import { cookies } from "next/headers";

export const BUSINESS_ACCESS_COOKIE_NAME =
  "jasodatos_business_access";

const DEFAULT_SESSION_TTL_SECONDS =
  60 * 60 * 24 * 7;

export type BusinessAccessSession = {
  version: 1;
  businessId: string;
  slug: string;
  issuedAt: number;
  expiresAt: number;
};

type CreateBusinessAccessSessionInput = {
  businessId: string;
  slug: string;
  expiresInSeconds?: number;
};

function getSessionSecret(): string {
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

function encodePayload(
  payload: BusinessAccessSession
): string {
  return Buffer.from(
    JSON.stringify(payload),
    "utf8"
  ).toString("base64url");
}

function signPayload(encodedPayload: string): string {
  return crypto
    .createHmac("sha256", getSessionSecret())
    .update(encodedPayload)
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

export function createBusinessAccessToken({
  businessId,
  slug,
  expiresInSeconds = DEFAULT_SESSION_TTL_SECONDS,
}: CreateBusinessAccessSessionInput): string {
  const cleanBusinessId = businessId.trim();
  const cleanSlug = slug.trim();

  if (!cleanBusinessId) {
    throw new Error(
      "No se recibió el identificador del negocio."
    );
  }

  if (!cleanSlug) {
    throw new Error(
      "No se recibió el slug del negocio."
    );
  }

  const now = Math.floor(Date.now() / 1000);

  const payload: BusinessAccessSession = {
    version: 1,
    businessId: cleanBusinessId,
    slug: cleanSlug,
    issuedAt: now,
    expiresAt: now + expiresInSeconds,
  };

  const encodedPayload = encodePayload(payload);
  const signature = signPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function verifyBusinessAccessToken(
  token: string | null | undefined
): BusinessAccessSession | null {
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

    const decodedPayload = JSON.parse(
      Buffer.from(
        encodedPayload,
        "base64url"
      ).toString("utf8")
    ) as Partial<BusinessAccessSession>;

    const now = Math.floor(Date.now() / 1000);

    if (
      decodedPayload.version !== 1 ||
      typeof decodedPayload.businessId !== "string" ||
      !decodedPayload.businessId.trim() ||
      typeof decodedPayload.slug !== "string" ||
      !decodedPayload.slug.trim() ||
      typeof decodedPayload.issuedAt !== "number" ||
      typeof decodedPayload.expiresAt !== "number" ||
      decodedPayload.expiresAt <= now
    ) {
      return null;
    }

    return {
      version: 1,
      businessId: decodedPayload.businessId,
      slug: decodedPayload.slug,
      issuedAt: decodedPayload.issuedAt,
      expiresAt: decodedPayload.expiresAt,
    };
  } catch {
    return null;
  }
}

export async function setBusinessAccessSession(
  input: CreateBusinessAccessSessionInput
): Promise<void> {
  const expiresInSeconds =
    input.expiresInSeconds ??
    DEFAULT_SESSION_TTL_SECONDS;

  const token = createBusinessAccessToken({
    ...input,
    expiresInSeconds,
  });

  const cookieStore = await cookies();

  cookieStore.set(
    BUSINESS_ACCESS_COOKIE_NAME,
    token,
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: expiresInSeconds,
    }
  );
}

export async function getBusinessAccessSession():
  Promise<BusinessAccessSession | null> {
  const cookieStore = await cookies();

  const token = cookieStore.get(
    BUSINESS_ACCESS_COOKIE_NAME
  )?.value;

  return verifyBusinessAccessToken(token);
}

export async function hasBusinessAccess(
  slug: string
): Promise<boolean> {
  const session =
    await getBusinessAccessSession();

  if (!session) {
    return false;
  }

  return session.slug === slug.trim();
}

export async function clearBusinessAccessSession():
  Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(
    BUSINESS_ACCESS_COOKIE_NAME,
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
