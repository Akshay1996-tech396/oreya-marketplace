import MarketplaceDetailPage from "@/components/marketplace/MarketplaceDetailPage";
import { vendorServices } from "@/data/marketplaceData";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function VendorServiceDetailPage({ params }: PageProps) {
  const { id } = await params;
  const service = vendorServices.find((item) => item.id === id);

  return (
    <MarketplaceDetailPage
      title={`Service Details - ${id}`}
      description="View vendor service information."
      record={service}
      backLink="/vendor/services"
      editLink={`/vendor/services/${id}/edit`}
    />
  );
}