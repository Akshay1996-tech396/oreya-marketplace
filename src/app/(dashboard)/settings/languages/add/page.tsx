import MarketplaceFormPage from "@/components/marketplace/MarketplaceFormPage";
import { languageSelectOptions } from "@/data/languageCurrencyData";

export default function AddLanguagePage() {
  return (
    <MarketplaceFormPage
      title="Add Language"
      description="Add a language that customers can select on the website."
      backLink="/settings/languages"
      submitText="Save Language"
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