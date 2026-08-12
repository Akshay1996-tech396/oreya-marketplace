import DashboardTablePage from "@/components/marketplace/DashboardTablePage";
import { adminCouponColumns, adminCoupons } from "@/data/marketplaceData";

export default function AdminCouponsPage() {
  return (
    <DashboardTablePage
      title="Coupons"
      description="Manage platform-wide marketplace coupons."
      columns={adminCouponColumns}
      rows={adminCoupons}
      buttonText="Add Coupon"
      buttonLink="/admin/coupons/add"
      basePath="/admin/coupons"
    />
  );
}