import type { BusinessProfile, ProfileId } from "./types";
import { comercialProfile } from "./comercial/schema";

export const profileRegistry: Record<ProfileId, BusinessProfile> = {
  comercial: comercialProfile,
};

export function getProfile(profileId: ProfileId): BusinessProfile {
  return profileRegistry[profileId];
}

export function listProfiles(): BusinessProfile[] {
  return Object.values(profileRegistry);
}