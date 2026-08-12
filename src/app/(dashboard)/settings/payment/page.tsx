import MarketplaceFormPage from "@/components/marketplace/MarketplaceFormPage";

export default function PaymentSettingsPage() {
  return (
    <MarketplaceFormPage
      title="Payment Settings"
      description="Manage payment methods, commission and payout settings."
      backLink="/admin/dashboard"
      submitText="Save Payment Settings"
      fields={[
        {
          name: "paymentGateway",
          label: "Payment Gateway",
          type: "select",
          options: [
            { label: "Razorpay", value: "razorpay" },
            { label: "Stripe", value: "stripe" },
            { label: "PayPal", value: "paypal" },
            { label: "Cash on Delivery", value: "cod" },
          ],
        },
        {
          name: "commissionType",
          label: "Commission Type",
          type: "select",
          options: [
            { label: "Percentage", value: "percentage" },
            { label: "Fixed Amount", value: "fixed" },
          ],
        },
        {
          name: "commissionValue",
          label: "Commission Value",
          type: "number",
          placeholder: "Example: 10",
        },
        {
          name: "minimumPayout",
          label: "Minimum Vendor Payout",
          type: "number",
          placeholder: "Example: 1000",
        },
        {
          name: "payoutCycle",
          label: "Payout Cycle",
          type: "select",
          options: [
            { label: "Daily", value: "daily" },
            { label: "Weekly", value: "weekly" },
            { label: "Monthly", value: "monthly" },
          ],
        },
        {
          name: "paymentMode",
          label: "Payment Mode",
          type: "select",
          options: [
            { label: "Test Mode", value: "test" },
            { label: "Live Mode", value: "live" },
          ],
        },
        {
          name: "notes",
          label: "Payment Notes",
          type: "textarea",
          placeholder: "Write payment or payout related notes",
        },
      ]}
    />
  );
}