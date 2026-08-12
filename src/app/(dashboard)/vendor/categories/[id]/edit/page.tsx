import MarketplaceFormPage from "@/components/marketplace/MarketplaceFormPage";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditVendorCategoryPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <MarketplaceFormPage
      title={`Edit Category Request - ${id}`}
      description="Update your category request before admin approval."
      backLink={`/vendor/categories/${id}`}
      submitText="Update Request"
      fields={[
        {
          name: "name",
          label: "Category Name",
          placeholder: "Example: Men Wardrobe, Women Wardrobe",
        },
        {
          name: "parent",
          label: "Parent Category",
          type: "select",
          options: [
            { label: "None - Main Category", value: "none" },
            { label: "Electronics", value: "electronics" },
            { label: "Apparel", value: "apparel" },
            { label: "Wardrobe", value: "wardrobe" },
            { label: "Cosmetics", value: "cosmetics" },
          ],
        },
        {
          name: "type",
          label: "Category Type",
          type: "select",
          options: [
            { label: "Product", value: "product" },
            { label: "Service", value: "service" },
            { label: "Both Product & Service", value: "both" },
          ],
        },
        {
          name: "reason",
          label: "Reason / Note",
          type: "textarea",
          placeholder: "Explain why this category is needed",
        },
      ]}
    />
  );
}