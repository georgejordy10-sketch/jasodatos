import crypto from "node:crypto";
import { cookies } from "next/headers";

export const BUSINESS_ACCESS_CHALLENGE_COOKIE_NAME =
  "jasodatos_business_access_challenge";

const CHALLENGE_TTL_SECONDS = 10 * 60;
const MAX_FAILED_ATTEMPTS = 5;

type BusinessAccessChallenge = {
  version: 1;
  businessId: string;
  slug: string;
  email: string;
  codeHash: string;
  failedAttempts: number;
  issuedAt: number;
  expiresAt: number;
};

type CreateChallengeInput = {
  businessId: string;
  slug: string;
  email: string;
  code: string;
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
    .createHash("sha256")
    .update(code)
    .digest("hex");
}

function encodePayload(
  payload: BusinessAccessChallenge
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
function serializeChallenge(
  payload: BusinessAccessChallenge
): string {
  const encodedPayload = encodePayload(payload);
  const signature = signPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

function createChallengeToken(
  input: CreateChallengeInput
): string {
  const now = Math.floor(Date.now() / 1000);

  const payload: BusinessAccessChallenge = {
    version: 1,
    businessId: input.businessId.trim(),
    slug: input.slug.trim(),
    email: input.email.trim().toLowerCase(),
    codeHash: hashAccessCode(input.code),
    failedAttempts: 0,
    issuedAt: now,
    expiresAt: now + CHALLENGE_TTL_SECONDS,
  };

  return serializeChallenge(payload);
}

function verifyChallengeToken(
  token: string | null | undefined
): BusinessAccessChallenge | null {
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
    ) as Partial<BusinessAccessChallenge>;

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

export function generateBusinessAccessCode(): string {
  return crypto
    .randomInt(100000, 1000000)
    .toString();
}

export async function setBusinessAccessChallenge(
  input: CreateChallengeInput
): Promise<void> {
  const token = createChallengeToken(input);
  const cookieStore = await cookies();

  cookieStore.set(
    BUSINESS_ACCESS_CHALLENGE_COOKIE_NAME,
    token,
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: CHALLENGE_TTL_SECONDS,
    }
  );
}

export async function validateBusinessAccessCode(
  code: string
): Promise<BusinessAccessChallenge | null> {
  const cookieStore = await cookies();

  const token = cookieStore.get(
    BUSINESS_ACCESS_CHALLENGE_COOKIE_NAME
  )?.value;

  const challenge = verifyChallengeToken(token);

  if (!challenge) {
    return null;
  }

  const incomingHash = hashAccessCode(code.trim());

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
      cookieStore.set(
        BUSINESS_ACCESS_CHALLENGE_COOKIE_NAME,
        "",
        {
          httpOnly: true,
          secure:
            process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 0,
        }
      );

      return null;
    }

    const updatedChallenge: BusinessAccessChallenge = {
      ...challenge,
      failedAttempts,
    };

    const remainingSeconds = Math.max(
      1,
      challenge.expiresAt -
        Math.floor(Date.now() / 1000)
    );

    cookieStore.set(
      BUSINESS_ACCESS_CHALLENGE_COOKIE_NAME,
      serializeChallenge(updatedChallenge),
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: remainingSeconds,
      }
    );

    return null;
  }

  return challenge;
}

export async function clearBusinessAccessChallenge():
  Promise<void> {
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
