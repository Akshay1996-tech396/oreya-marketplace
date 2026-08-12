import MarketplaceDetailPage from "@/components/marketplace/MarketplaceDetailPage";
import { adminCategories } from "@/data/marketplaceData";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AdminCategoryDetailPage({ params }: PageProps) {
  const { id } = await params;
  const category = adminCategories.find((item) => item.id === id);

  return (
    <MarketplaceDetailPage
      title={`Category Details - ${id}`}
      description="View category hierarchy, type, source and approval status."
      record={category}
      backLink="/admin/categories"
      editLink={`/admin/categories/${id}/edit`}
    />
  );
}