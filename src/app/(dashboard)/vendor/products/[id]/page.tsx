import MarketplaceDetailPage from "@/components/marketplace/MarketplaceDetailPage";
import { vendorProducts } from "@/data/marketplaceData";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function VendorProductDetailPage({ params }: PageProps) {
  const { id } = await params;
  const product = vendorProducts.find((item) => item.id === id);

  return (
    <MarketplaceDetailPage
      title={`Product Details - ${id}`}
      description="View vendor product information."
      record={product}
      backLink="/vendor/products"
      editLink={`/vendor/products/${id}/edit`}
    />
  );
}