import MarketplaceDetailPage from "@/components/marketplace/MarketplaceDetailPage";
import { adminProducts } from "@/data/marketplaceData";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AdminProductDetailPage({ params }: PageProps) {
  const { id } = await params;
  const product = adminProducts.find((item) => item.id === id);

  return (
    <MarketplaceDetailPage
      title={`Product Details - ${id}`}
      description="View complete product information."
      record={product}
      backLink="/admin/products"
      editLink={`/admin/products/${id}/edit`}
    />
  );
}