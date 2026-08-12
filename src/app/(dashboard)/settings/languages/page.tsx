import DashboardTablePage from "@/components/marketplace/DashboardTablePage";
import {
  adminLanguageColumns,
  adminLanguages,
} from "@/data/languageCurrencyData";

export default function LanguagesSettingsPage() {
  return (
    <DashboardTablePage
      title="Languages"
      description="Manage website languages available for customers."
      columns={adminLanguageColumns}
      rows={adminLanguages}
      buttonText="Add Language"
      buttonLink="/settings/languages/add"
      basePath="/settings/languages"
    />
  );
}