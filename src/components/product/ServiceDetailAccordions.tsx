"use client";

import { useState } from "react";

import DetailActionTabs, {
  type DetailActionTab,
} from "@/components/detail/DetailActionTabs";
import DetailVendorContent from "@/components/detail/DetailVendorContent";
import ServiceBookingForm from "@/components/product/ServiceBookingForm";

type AvailableAppointmentSlot = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number | null;
  capacity: number;
  bookedCount: number;
  note: string | null;
};

type ServiceAccordionSection =
  | "DESCRIPTION"
  | "VIEW_VENDOR"
  | "APPOINTMENT_BOOKING";

type ServiceDetailAccordionsProps = {
  serviceId: string;
  serviceTitle: string;
  description?: string | null;
  vendorName: string;
  vendorSlug?: string | null;
  vendorDescription?: string | null;
  price: number;
  currency: string;
  slots: AvailableAppointmentSlot[];
};

export default function ServiceDetailAccordions({
  serviceId,
  serviceTitle,
  description,
  vendorName,
  vendorSlug,
  vendorDescription,
  price,
  currency,
  slots,
}: ServiceDetailAccordionsProps) {
  const [activeSection, setActiveSection] =
    useState<ServiceAccordionSection>("DESCRIPTION");

  const tabs: DetailActionTab<ServiceAccordionSection>[] = [
    {
      key: "DESCRIPTION",
      label: "Description",
      content: (
        <p className="text-[15px] leading-7 text-[#666666]">
          {description?.trim() ||
            "Detailed service information will be available soon."}
        </p>
      ),
    },
    {
      key: "VIEW_VENDOR",
      label: "View Vendor",
      content: (
        <DetailVendorContent
          name={vendorName}
          description={vendorDescription}
          profileHref={vendorSlug ? `/vendors/${vendorSlug}` : null}
        />
      ),
    },
    {
      key: "APPOINTMENT_BOOKING",
      label: "Appointment Booking",
      content: (
        <ServiceBookingForm
          serviceId={serviceId}
          serviceTitle={serviceTitle}
          price={price}
          currency={currency}
          slots={slots}
          embedded
          actionPortalTargetId="service-book-appointment-action"
        />
      ),
    },
  ];

  return (
    <div className="mt-8 min-w-0 space-y-4">
      <DetailActionTabs
        id="service-primary-detail-tabs"
        tabs={tabs}
        activeKey={activeSection}
        onChange={setActiveSection}
        ariaLabel="Service details"
      />

      <div
        id="service-book-appointment-action"
        className={slots.length > 0 ? "w-full" : "hidden"}
      />
    </div>
  );
}