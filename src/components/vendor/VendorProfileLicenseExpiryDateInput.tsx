"use client";

import CustomDatePicker from "@/components/ui/CustomDatePicker";

type VendorProfileLicenseExpiryDateInputProps = {
  defaultValue: string;
};

export default function VendorProfileLicenseExpiryDateInput({
  defaultValue,
}: VendorProfileLicenseExpiryDateInputProps) {
  return (
    <CustomDatePicker
      id="licenseExpiry"
      name="licenseExpiry"
      defaultValue={defaultValue}
      placeholder="Select license expiry date"
    />
  );
}