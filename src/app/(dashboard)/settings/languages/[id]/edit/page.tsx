import MarketplaceFormPage from "@/components/marketplace/MarketplaceFormPage";
import { languageSelectOptions } from "@/data/languageCurrencyData";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditLanguagePage({ params }: PageProps) {
  const { id } = await params;

  return (
    <MarketplaceFormPage
      title={`Edit Language - ${id}`}
      description="Update website language configuration."
      backLink={`/settings/languages/${id}`}
      submitText="Update Language"
      fields={[
        {
          name: "languageCode",
          label: "Select Language",
          type: "select",
          options: languageSelectOptions,
        },
        {
          name: "direction",
          label: "Text Direction",
          type: "select",
          options: [
            { label: "LTR - Left to Right", value: "ltr" },
            { label: "RTL - Right to Left", value: "rtl" },
          ],
        },
        {
          name: "isDefault",
          label: "Default Language",
          type: "select",
          options: [
            { label: "Yes", value: "yes" },
            { label: "No", value: "no" },
          ],
        },
        {
          name: "status",
          label: "Status",
          type: "select",
          options: [
            { label: "Active", value: "active" },
            { label: "Inactive", value: "inactive" },
          ],
        },
      ]}
    />
  );
}