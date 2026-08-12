import MarketplaceFormPage from "@/components/marketplace/MarketplaceFormPage";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditAdminOrderPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <MarketplaceFormPage
      title={`Edit Order - ${id}`}
      description="Update order status and payment status."
      backLink={`/admin/orders/${id}`}
      submitText="Update Order"
      fields={[
        {
          name: "status",
          label: "Order Status",
          type: "select",
          options: [
            { label: "Pending", value: "pending" },
            { label: "Processing", value: "processing" },
            { label: "Confirmed", value: "confirmed" },
            { label: "Delivered", value: "delivered" },
            { label: "Cancelled", value: "cancelled" },
          ],
        },
        {
          name: "paymentStatus",
          label: "Payment Status",
          type: "select",
          options: [
            { label: "Paid", value: "paid" },
            { label: "Pending", value: "pending" },
            { label: "Failed", value: "failed" },
            { label: "Refunded", value: "refunded" },
          ],
        },
        {
          name: "note",
          label: "Admin Note",
          type: "textarea",
          placeholder: "Enter order note",
        },
      ]}
    />
  );
}