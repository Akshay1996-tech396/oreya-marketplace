import MarketplaceFormPage from "@/components/marketplace/MarketplaceFormPage";

export default function NotificationSettingsPage() {
  return (
    <MarketplaceFormPage
      title="Notification Settings"
      description="Manage email, SMS and system notification preferences."
      backLink="/admin/dashboard"
      submitText="Save Notification Settings"
      fields={[
        {
          name: "emailNotifications",
          label: "Email Notifications",
          type: "select",
          options: [
            { label: "Enabled", value: "enabled" },
            { label: "Disabled", value: "disabled" },
          ],
        },
        {
          name: "smsNotifications",
          label: "SMS Notifications",
          type: "select",
          options: [
            { label: "Enabled", value: "enabled" },
            { label: "Disabled", value: "disabled" },
          ],
        },
        {
          name: "pushNotifications",
          label: "Push Notifications",
          type: "select",
          options: [
            { label: "Enabled", value: "enabled" },
            { label: "Disabled", value: "disabled" },
          ],
        },
        {
          name: "adminOrderAlert",
          label: "Admin Order Alerts",
          type: "select",
          options: [
            { label: "Enabled", value: "enabled" },
            { label: "Disabled", value: "disabled" },
          ],
        },
        {
          name: "vendorOrderAlert",
          label: "Vendor Order Alerts",
          type: "select",
          options: [
            { label: "Enabled", value: "enabled" },
            { label: "Disabled", value: "disabled" },
          ],
        },
        {
          name: "appointmentAlert",
          label: "Appointment Alerts",
          type: "select",
          options: [
            { label: "Enabled", value: "enabled" },
            { label: "Disabled", value: "disabled" },
          ],
        },
        {
          name: "notificationFooter",
          label: "Notification Footer Text",
          type: "textarea",
          placeholder: "Write footer text for notification emails",
        },
      ]}
    />
  );
}