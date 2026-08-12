import DashboardTablePage from "@/components/marketplace/DashboardTablePage";
import {
  adminCurrencies,
  adminCurrencyColumns,
} from "@/data/languageCurrencyData";

export default function CurrenciesSettingsPage() {
  return (
    <DashboardTablePage
      title="Currencies"
      description="Manage currencies available for customer product, service and appointment prices."
      columns={adminCurrencyColumns}
      rows={adminCurrencies}
      buttonText="Add Currency"
      buttonLink="/settings/currencies/add"
      basePath="/settings/currencies"
    />
  );
}