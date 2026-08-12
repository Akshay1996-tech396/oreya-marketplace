import MarketplaceDetailPage from "@/components/marketplace/MarketplaceDetailPage";
import { adminLanguages } from "@/data/languageCurrencyData";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function LanguageDetailPage({ params }: PageProps) {
  const { id } = await params;
  const language = adminLanguages.find((item) => item.id === id);

  return (
    <MarketplaceDetailPage
      title={`Language Details - ${id}`}
      description="View website language configuration."
      record={language}
      backLink="/settings/languages"
      editLink={`/settings/languages/${id}/edit`}
    />
  );
}