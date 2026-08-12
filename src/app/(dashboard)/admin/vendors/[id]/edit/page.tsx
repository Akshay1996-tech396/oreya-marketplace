import MarketplaceFormPage from "@/components/marketplace/MarketplaceFormPage";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditAdminVendorPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <MarketplaceFormPage
      title={`Edit Vendor - ${id}`}
      description="Update vendor business details and account status."
      backLink={`/admin/vendors/${id}`}
      submitText="Update Vendor"
      fields={[
        {
          name: "businessName",
          label: "Business Name",
          placeholder: "Enter business name",
        },
        {
          name: "ownerName",
          label: "Owner Name",
          placeholder: "Enter owner name",
        },
        {
          name: "email",
          label: "Email",
          type: "email",
          placeholder: "Enter vendor email",
        },
        {
          name: "phone",
          label: "Phone",
          placeholder: "Enter phone number",
        },
        {
          name: "category",
          label: "Business Category",
          type: "select",
          options: [
            { label: "Beauty", value: "beauty" },
            { label: "Cleaning", value: "cleaning" },
            { label: "Fashion", value: "fashion" },
            { label: "Electronics", value: "electronics" },
          ],
        },
        {
          name: "city",
          label: "City",
          placeholder: "Enter city",
        },
        {
          name: "status",
          label: "Status",
          type: "select",
          options: [
            { label: "Approved", value: "approved" },
            { label: "Pending", value: "pending" },
            { label: "Blocked", value: "blocked" },
          ],
        },
        {
          name: "address",
          label: "Business Address",
          type: "textarea",
          placeholder: "Enter full business address",
        },
      ]}
    />
  );
}