import type { BusinessProfile } from "../profiles/types";

export interface RequiredFieldValidationResult {
  missingRequiredFields: string[];
  isValid: boolean;
}

export function validateRequiredFields(
  mappedRows: Record<string, unknown>[],
  profile: BusinessProfile
): RequiredFieldValidationResult {
  const firstRow = mappedRows[0] ?? {};

  const missingRequiredFields = profile.requiredFieldKeys.filter((fieldKey) => {
    return !(fieldKey in firstRow);
  });

  return {
    missingRequiredFields,
    isValid: missingRequiredFields.length === 0,
  };
}