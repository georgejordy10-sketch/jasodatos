import {
  getBusinessAccessSession,
  type BusinessAccessSession,
} from "@/lib/businessAccessSession";

export type AuthorizedBusinessAccess = {
  businessId: string;
  slug: string;
};

export async function authorizeBusinessAccess(
  requestedSlug: string
): Promise<AuthorizedBusinessAccess | null> {
  const cleanRequestedSlug =
    requestedSlug.trim();

  if (!cleanRequestedSlug) {
    return null;
  }

  const session: BusinessAccessSession | null =
    await getBusinessAccessSession();

  if (!session) {
    return null;
  }

  if (session.slug !== cleanRequestedSlug) {
    return null;
  }

  if (!session.businessId.trim()) {
    return null;
  }

  return {
    businessId: session.businessId,
    slug: session.slug,
  };
}