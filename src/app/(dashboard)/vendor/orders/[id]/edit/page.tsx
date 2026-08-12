import MarketplaceFormPage from "@/components/marketplace/MarketplaceFormPage";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditVendorOrderPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <MarketplaceFormPage
      title={`Edit Order - ${id}`}
      description="Update vendor order status."
      backLink={`/vendor/orders/${id}`}
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
          name: "note",
          label: "Vendor Note",
          type: "textarea",
          placeholder: "Enter order note",
        },
      ]}
    />
  );
}