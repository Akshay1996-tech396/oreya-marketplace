import DashboardTablePage from "@/components/marketplace/DashboardTablePage";
import { vendorCouponColumns, vendorCoupons } from "@/data/marketplaceData";

export default function VendorCouponsPage() {
  return (
    <DashboardTablePage
      title="My Coupons"
      description="Manage coupons for your products and services."
      columns={vendorCouponColumns}
      rows={vendorCoupons}
      buttonText="Add Coupon"
      buttonLink="/vendor/coupons/add"
      basePath="/vendor/coupons"
    />
  );
}