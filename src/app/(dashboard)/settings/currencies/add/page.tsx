import MarketplaceFormPage from "@/components/marketplace/MarketplaceFormPage";
import { currencySelectOptions } from "@/data/languageCurrencyData";

export default function AddCurrencyPage() {
  return (
    <MarketplaceFormPage
      title="Add Currency"
      description="Add a currency that customers can select for website prices."
      backLink="/settings/currencies"
      submitText="Save Currency"
      fields={[
        {
          name: "currencyCode",
          label: "Select Currency",
          type: "select",
          options: currencySelectOptions,
        },
        {
          name: "symbol",
          label: "Currency Symbol",
          placeholder: "Example: ₹, $, د.إ, ¥",
        },
        {
          name: "exchangeRate",
          label: "Exchange Rate",
          type: "number",
          placeholder: "Example: 1 for INR, 0.012 for USD",
        },
        {
          name: "isDefault",
          label: "Default Currency",
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