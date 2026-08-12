import MarketplaceDetailPage from "@/components/marketplace/MarketplaceDetailPage";
import { adminCurrencies } from "@/data/languageCurrencyData";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CurrencyDetailPage({ params }: PageProps) {
  const { id } = await params;
  const currency = adminCurrencies.find((item) => item.id === id);

  return (
    <MarketplaceDetailPage
      title={`Currency Details - ${id}`}
      description="View website currency configuration."
      record={currency}
      backLink="/settings/currencies"
      editLink={`/settings/currencies/${id}/edit`}
    />
  );
}