import MarketplaceDetailPage from "@/components/marketplace/MarketplaceDetailPage";
import { vendorCategories } from "@/data/marketplaceData";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function VendorCategoryDetailPage({ params }: PageProps) {
  const { id } = await params;
  const category = vendorCategories.find((item) => item.id === id);

  return (
    <MarketplaceDetailPage
      title={`Category Request - ${id}`}
      description="View vendor category request and approval status."
      record={category}
      backLink="/vendor/categories"
      editLink={`/vendor/categories/${id}/edit`}
    />
  );
}