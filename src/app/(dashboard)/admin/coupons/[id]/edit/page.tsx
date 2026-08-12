import MarketplaceFormPage from "@/components/marketplace/MarketplaceFormPage";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditAdminCouponPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <MarketplaceFormPage
      title={`Edit Coupon - ${id}`}
      description="Update platform-wide coupon details."
      backLink={`/admin/coupons/${id}`}
      submitText="Update Coupon"
      fields={[
        {
          name: "code",
          label: "Coupon Code",
          placeholder: "Example: WELCOME10",
        },
        {
          name: "discountType",
          label: "Discount Type",
          type: "select",
          options: [
            { label: "Percentage", value: "percentage" },
            { label: "Fixed Amount", value: "fixed" },
          ],
        },
        {
          name: "discountValue",
          label: "Discount Value",
          type: "number",
          placeholder: "Example: 10",
        },
        {
          name: "scope",
          label: "Coupon Scope",
          type: "select",
          options: [
            { label: "Full Marketplace", value: "marketplace" },
            { label: "All Products", value: "products" },
            { label: "All Services", value: "services" },
            { label: "Specific Vendor", value: "vendor" },
          ],
        },
        {
          name: "minimumOrderAmount",
          label: "Minimum Order Amount",
          type: "number",
          placeholder: "Example: 500",
        },
        {
          name: "expiry",
          label: "Expiry Date",
          type: "date",
        },
        {
          name: "status",
          label: "Status",
          type: "select",
          options: [
            { label: "Active", value: "active" },
            { label: "Inactive", value: "inactive" },
            { label: "Expired", value: "expired" },
          ],
        },
        {
          name: "description",
          label: "Description",
          type: "textarea",
          placeholder: "Write coupon details or terms",
        },
      ]}
    />
  );
}