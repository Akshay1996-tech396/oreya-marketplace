"use client";

import type { ReactNode } from "react";

import DetailActionTabs, {
  type DetailActionTab,
} from "@/components/detail/DetailActionTabs";
import DetailVendorContent from "@/components/detail/DetailVendorContent";

export type RestaurantAccordionSection =
  | "DESCRIPTION"
  | "VIEW_VENDOR"
  | "SELECT_MENU"
  | "TABLE_RESERVATION";

type RestaurantDetailAccordionsProps = {
  openSection: RestaurantAccordionSection | null;
  onToggle: (section: RestaurantAccordionSection) => void;
  vendorName: string;
  vendorDescription?: string | null;
  vendorProfileHref?: string | null;
  descriptionContent: ReactNode;
  menuContent: ReactNode;
  reservationContent: ReactNode;
  reservationAction?: ReactNode;
};

export default function RestaurantDetailAccordions({
  openSection,
  onToggle,
  vendorName,
  vendorDescription,
  vendorProfileHref,
  descriptionContent,
  menuContent,
  reservationContent,
  reservationAction,
}: RestaurantDetailAccordionsProps) {
  const activeSection: RestaurantAccordionSection =
    openSection || "DESCRIPTION";

  const tabs: DetailActionTab<RestaurantAccordionSection>[] = [
    {
      key: "DESCRIPTION",
      label: "Description",
      content: descriptionContent,
    },
    {
      key: "VIEW_VENDOR",
      label: "View Vendor",
      content: (
        <DetailVendorContent
          name={vendorName}
          description={vendorDescription}
          profileHref={vendorProfileHref}
        />
      ),
    },
    {
      key: "SELECT_MENU",
      label: "Select a Menu",
      content: menuContent,
    },
    {
      key: "TABLE_RESERVATION",
      label: "Table Reservation",
      content: reservationContent,
    },
  ];

  function handleTabChange(section: RestaurantAccordionSection) {
    if (section !== activeSection) {
      onToggle(section);
    }
  }

  return (
    <div className="mt-5 min-w-0 space-y-4">
      <DetailActionTabs
        id="restaurant-primary-detail-tabs"
        tabs={tabs}
        activeKey={activeSection}
        onChange={handleTabChange}
        ariaLabel="Restaurant details"
      />

      {reservationAction ? (
        <div className="min-w-0">{reservationAction}</div>
      ) : null}
    </div>
  );
}