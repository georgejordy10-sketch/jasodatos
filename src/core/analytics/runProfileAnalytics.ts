import type { BusinessProfile, ProfileAnalyticsResult } from "../profiles/types";

export function runProfileAnalytics(
  rows: Record<string, unknown>[],
  profile: BusinessProfile
): ProfileAnalyticsResult {
  return profile.analyze(rows);
}