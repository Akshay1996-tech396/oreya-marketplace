import MarketplaceDetailPage from "@/components/marketplace/MarketplaceDetailPage";
import { adminCoupons } from "@/data/marketplaceData";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AdminCouponDetailPage({ params }: PageProps) {
  const { id } = await params;
  const coupon = adminCoupons.find((item) => item.id === id);

  return (
    <MarketplaceDetailPage
      title={`Coupon Details - ${id}`}
      description="View platform coupon scope, discount and status."
      record={coupon}
      backLink="/admin/coupons"
      editLink={`/admin/coupons/${id}/edit`}
    />
  );
}