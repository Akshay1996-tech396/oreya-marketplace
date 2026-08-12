import MarketplaceDetailPage from "@/components/marketplace/MarketplaceDetailPage";
import { adminServices } from "@/data/marketplaceData";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AdminServiceDetailPage({ params }: PageProps) {
  const { id } = await params;
  const service = adminServices.find((item) => item.id === id);

  return (
    <MarketplaceDetailPage
      title={`Service Details - ${id}`}
      description="View complete marketplace service information."
      record={service}
      backLink="/admin/services"
      editLink={`/admin/services/${id}/edit`}
    />
  );
}