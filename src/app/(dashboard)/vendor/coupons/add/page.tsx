import MarketplaceFormPage from "@/components/marketplace/MarketplaceFormPage";

export default function AddVendorCouponPage() {
  return (
    <MarketplaceFormPage
      title="Add Coupon"
      description="Create a coupon for your own products or services."
      backLink="/vendor/coupons"
      submitText="Save Coupon"
      fields={[
        {
          name: "code",
          label: "Coupon Code",
          placeholder: "Example: BEAUTY10",
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
          name: "appliesTo",
          label: "Applies To",
          type: "select",
          options: [
            { label: "All My Products", value: "my-products" },
            { label: "All My Services", value: "my-services" },
            { label: "Specific Product", value: "specific-product" },
            { label: "Specific Service", value: "specific-service" },
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
            { label: "Pending Approval", value: "pending" },
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