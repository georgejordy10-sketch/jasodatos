import {
  getBusinessAccessSession,
  type BusinessAccessSession,
} from "@/lib/businessAccessSession";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export type AuthorizedBusinessAccess = {
  businessId: string;
  slug: string;
};

type BusinessAccessRecord = {
  id: string;
  slug: string;
  status: string | null;
  trial_ends_at: string | null;
};

function hasValidBusinessStatus(
  business: BusinessAccessRecord
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

  const businessId =
    session.businessId.trim();

  if (!businessId) {
    return null;
  }

  try {
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
      .eq("id", businessId)
      .eq("slug", session.slug)
      .maybeSingle();

    if (error) {
      console.error(
        "[authorize-business-access] No se pudo validar el estado del negocio:",
        error
      );

      return null;
    }

    if (!business) {
      return null;
    }

    const businessRecord =
      business as BusinessAccessRecord;

    if (
      !hasValidBusinessStatus(
        businessRecord
      )
    ) {
      return null;
    }

    return {
      businessId:
        businessRecord.id,
      slug:
        businessRecord.slug,
    };
  } catch (error) {
    console.error(
      "[authorize-business-access] Error inesperado validando acceso:",
      error
    );

    return null;
  }
}
