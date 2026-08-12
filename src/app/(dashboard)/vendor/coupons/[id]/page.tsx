import MarketplaceDetailPage from "@/components/marketplace/MarketplaceDetailPage";
import { vendorCoupons } from "@/data/marketplaceData";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function VendorCouponDetailPage({ params }: PageProps) {
  const { id } = await params;
  const coupon = vendorCoupons.find((item) => item.id === id);

  return (
    <MarketplaceDetailPage
      title={`Coupon Details - ${id}`}
      description="View vendor coupon details and approval status."
      record={coupon}
      backLink="/vendor/coupons"
      editLink={`/vendor/coupons/${id}/edit`}
    />
  );
}