export type VendorProfileCompletionInput = {
  businessName?: unknown;
  ownerName?: unknown;

  businessPhone?: unknown;
  phone?: unknown;

  brandName?: unknown;
  companyName?: unknown;
  branchName?: unknown;

  city?: unknown;
  state?: unknown;
  country?: unknown;

  zipCode?: unknown;
  postalCode?: unknown;

  addressLine1?: unknown;

  address?: unknown;
  businessAddress?: unknown;

  description?: unknown;
  storeDescription?: unknown;

  businessLicense?: unknown;
  businessLicenseUrl?: unknown;
  businessLicenseDocument?: unknown;
  licenseDocument?: unknown;

  licenseExpiryDate?: unknown;
};

export type VendorProfileCompletionResult = {
  isComplete: boolean;
  missingFields: string[];
  completedFields: number;
  totalRequiredFields: number;
  completionPercentage: number;
};

function hasText(value: unknown): boolean {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

function hasValidDate(value: unknown): boolean {
  if (!value) {
    return false;
  }

  if (value instanceof Date) {
    return !Number.isNaN(value.getTime());
  }

  if (typeof value === "string") {
    const normalizedValue = value.trim();

    if (!normalizedValue) {
      return false;
    }

    const parsedDate = new Date(normalizedValue);

    return !Number.isNaN(parsedDate.getTime());
  }

  return false;
}

function hasBusinessLicense(
  profile: VendorProfileCompletionInput
): boolean {
  return (
    hasText(profile.businessLicense) ||
    hasText(profile.businessLicenseUrl) ||
    hasText(profile.businessLicenseDocument) ||
    hasText(profile.licenseDocument)
  );
}

export function getVendorProfileCompletion(
  profile: VendorProfileCompletionInput | null | undefined
): VendorProfileCompletionResult {
  if (!profile) {
    return {
      isComplete: false,
      missingFields: [
        "Store name",
        "Owner name",
        "Business phone",
        "Brand name",
        "Company name",
        "Branch name",
        "City",
        "State",
        "Country",
        "ZIP or postal code",
        "Address Line 1",
        "Complete business address",
        "Store description",
        "Business licence document",
        "Licence expiry date",
      ],
      completedFields: 0,
      totalRequiredFields: 15,
      completionPercentage: 0,
    };
  }

  const requiredFields = [
    {
      label: "Store name",
      completed: hasText(profile.businessName),
    },
    {
      label: "Owner name",
      completed: hasText(profile.ownerName),
    },
    {
      label: "Business phone",
      completed:
        hasText(profile.businessPhone) ||
        hasText(profile.phone),
    },
    {
      label: "Brand name",
      completed: hasText(profile.brandName),
    },
    {
      label: "Company name",
      completed: hasText(profile.companyName),
    },
    {
      label: "Branch name",
      completed: hasText(profile.branchName),
    },
    {
      label: "City",
      completed: hasText(profile.city),
    },
    {
      label: "State",
      completed: hasText(profile.state),
    },
    {
      label: "Country",
      completed: hasText(profile.country),
    },
    {
      label: "ZIP or postal code",
      completed:
        hasText(profile.zipCode) ||
        hasText(profile.postalCode),
    },
    {
      label: "Address Line 1",
      completed: hasText(profile.addressLine1),
    },
    {
      label: "Complete business address",
      completed:
        hasText(profile.address) ||
        hasText(profile.businessAddress),
    },
    {
      label: "Store description",
      completed:
        hasText(profile.description) ||
        hasText(profile.storeDescription),
    },
    {
      label: "Business licence document",
      completed: hasBusinessLicense(profile),
    },
    {
      label: "Licence expiry date",
      completed: hasValidDate(
        profile.licenseExpiryDate
      ),
    },
  ];

  const missingFields = requiredFields
    .filter((field) => !field.completed)
    .map((field) => field.label);

  const totalRequiredFields = requiredFields.length;
  const completedFields =
    totalRequiredFields - missingFields.length;

  const completionPercentage = Math.round(
    (completedFields / totalRequiredFields) * 100
  );

  return {
    isComplete: missingFields.length === 0,
    missingFields,
    completedFields,
    totalRequiredFields,
    completionPercentage,
  };
}

export function isVendorProfileComplete(
  profile: VendorProfileCompletionInput | null | undefined
): boolean {
  return getVendorProfileCompletion(profile).isComplete;
}