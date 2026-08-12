"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import CustomDatePicker from "@/components/ui/CustomDatePicker";

import DetailBreadcrumbs from "@/components/detail/DetailBreadcrumbs";
import DetailImageGallery from "@/components/detail/DetailImageGallery";
import DetailInfoTabs from "@/components/detail/DetailInfoTabs";
import DetailPageLayout from "@/components/detail/DetailPageLayout";
import DetailPriceSection from "@/components/detail/DetailPriceSection";
import DetailTrustCards from "@/components/detail/DetailTrustCards";
import RestaurantDetailAccordions, {
  type RestaurantAccordionSection,
} from "@/components/restaurants/RestaurantDetailAccordions";

type RestaurantVendor = {
  id: string;
  businessName: string;
  slug: string;
  description: string | null;
  status: string;
} | null;

type RestaurantOperatingHour = {
  id: string;
  dayOfWeek: number;
  isClosed: boolean;
  openTime: string | null;
  closeTime: string | null;
  slotMinutes: number | null;
  lastReservationTime: string | null;
};

type RestaurantSpecialHour = {
  id: string;
  date: string;
  isClosed: boolean;
  openTime: string | null;
  closeTime: string | null;
  note: string | null;
};

type RestaurantTable = {
  id: string;
  tableNumber: string;
  name: string | null;
  capacity: number;
  minGuests: number;
  maxGuests: number;
  location: string | null;
  isActive: boolean;
  isReservable: boolean;
  sortOrder: number;
};

type RestaurantMenuTypeValue = "REGULAR" | "COMBO";

type RestaurantMenuItem = {
  id: string;
  restaurantId: string;
  name: string;
  slug: string;
  description: string | null;
  price: string;
  currency: string;
  image: string | null;
  images?: string[];
  isActive: boolean;
  sortOrder: number;
  menuType?: RestaurantMenuTypeValue;
  validFrom?: string | null;
  validUntil?: string | null;
};

type RestaurantSpecification = {
  label: string;
  value: string;
};

type RestaurantDetail = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  specifications: unknown;
  exchangePolicy: string | null;
  refundPolicy: string | null;
  logo: string | null;
  coverImage: string | null;
  images: string[];
  cuisineTypes: string[];
  priceForTwo: string | null;
  currency: string;
  address: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  area: string | null;
  state: string | null;
  country: string | null;
  zipCode: string | null;
  latitude: string | null;
  longitude: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  isTableReservationAvailable: boolean;
  reservationSlotMinutes: number;
  reservationBufferMinutes: number;
  reservationAdvanceDays: number;
  reservationNoticeMinutes: number;
  reservationMinGuests: number;
  reservationMaxGuests: number | null;
  reservationAutoConfirm: boolean;
  allowSameDayReservation: boolean;
  allowGuestReservation: boolean;
  reservationTerms: string | null;
  reservationCancellationNote: string | null;
  vendor: RestaurantVendor;
  operatingHours: RestaurantOperatingHour[];
  specialHours: RestaurantSpecialHour[];
  tables: RestaurantTable[];
  menuItems: RestaurantMenuItem[];
  _count: {
    tables: number;
    menuItems: number;
    reservations: number;
    reviews: number;
  };
};

type AvailableRestaurantTable = {
  id: string;
  tableNumber: string;
  capacity: number;
  seatingArea: string | null;
  note: string | null;
};

type AvailableRestaurantSlot = {
  time: string;
  label: string;
  startTime: string;
  endTime: string;
  availableTables: AvailableRestaurantTable[];
};

type ReservationTimeOption = {
  startTime: string;
  endTime: string;
  label: string;
  slotMinutes: number;
};

type SelectedMenuItem = {
  menuItemId: string;
  quantity: number;
};

type SelectedMenuEntry = {
  menuItem: RestaurantMenuItem;
  quantity: number;
  lineTotal: string;
  lineTotalNumber: number;
};

type RestaurantDetailClientProps = {
  restaurant: RestaurantDetail;
};

const fallbackImage =
  "data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22900%22%20height%3D%22700%22%20viewBox%3D%220%200%20900%20700%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Crect%20width%3D%22900%22%20height%3D%22700%22%20fill%3D%22%23F4F1EC%22/%3E%3Ctext%20x%3D%22450%22%20y%3D%22345%22%20font-family%3D%22Arial%22%20font-size%3D%2238%22%20fill%3D%22%239A8A7A%22%20text-anchor%3D%22middle%22%3ERestaurant%3C/text%3E%3C/svg%3E";

const paymentMethods = [
  "AMEX",
  "Apple Pay",
  "Discover",
  "Google Pay",
  "JCB",
  "Mastercard",
  "PayPal",
  "Visa",
];


function formatDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getTodayDateString() {
  return formatDateInputValue(new Date());
}

function normalizeSelectedDate(value: string | Date) {
  if (value instanceof Date) {
    return formatDateInputValue(value);
  }

  return String(value || "").slice(0, 10);
}

function parseInputDate(value: string) {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
}

function normalizeImageSource(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("/") ||
    value.startsWith("data:") ||
    value.startsWith("blob:")
  ) {
    return value;
  }

  return `/uploads/restaurants/${value}`;
}

function parseTimeToMinutes(value: string | null | undefined) {
  const normalizedTime = normalizeSlotTime(value);

  if (!normalizedTime) {
    return null;
  }

  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(normalizedTime);

  if (!match) {
    return null;
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

function formatTimeLabel(value: string | null | undefined) {
  const minutes = parseTimeToMinutes(value);

  if (minutes === null) {
    return "Not set";
  }

  let hours = Math.floor(minutes / 60);
  const minuteValue = minutes % 60;
  const period = hours >= 12 ? "PM" : "AM";

  hours = hours % 12;

  if (hours === 0) {
    hours = 12;
  }

  return `${String(hours).padStart(2, "0")}:${String(minuteValue).padStart(
    2,
    "0"
  )} ${period}`;
}

function formatMinutesToTimeValue(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const minuteValue = minutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(minuteValue).padStart(
    2,
    "0"
  )}`;
}


function normalizeSlotTime(value: string | null | undefined) {
  const trimmedValue = String(value || "").trim();

  if (!trimmedValue) {
    return "";
  }

  const match = /^(\d{1,2}):([0-5]\d)(?::[0-5]\d)?$/.exec(trimmedValue);

  if (!match) {
    return trimmedValue;
  }

  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function getMinimumStartMinutesForDate(
  restaurant: RestaurantDetail,
  dateValue: string
) {
  if (dateValue !== getTodayDateString()) {
    return null;
  }

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const noticeMinutes = Math.max(restaurant.reservationNoticeMinutes || 0, 0);

  return currentMinutes + noticeMinutes;
}

function getResponseSlots(result: unknown): AvailableRestaurantSlot[] {
  const response = result as {
    slots?: unknown;
    slot?: unknown;
    availableSlots?: unknown;
    data?: {
      slots?: unknown;
      availableSlots?: unknown;
    };
  };

  const rawSlots = Array.isArray(response.slots)
    ? response.slots
    : Array.isArray(response.availableSlots)
      ? response.availableSlots
      : Array.isArray(response.data?.slots)
        ? response.data.slots
        : Array.isArray(response.data?.availableSlots)
          ? response.data.availableSlots
          : response.slot
            ? [response.slot]
            : [];

  return rawSlots
    .map((rawSlot) => {
      const slot = rawSlot as Partial<AvailableRestaurantSlot> & {
        time?: string;
      };

      return {
        time: normalizeSlotTime(slot.time || slot.startTime),
        label:
          slot.label ||
          `${formatTimeLabel(slot.startTime)} - ${formatTimeLabel(
            slot.endTime
          )}`,
        startTime: normalizeSlotTime(slot.startTime || slot.time),
        endTime: normalizeSlotTime(slot.endTime),
        availableTables: Array.isArray(slot.availableTables)
          ? slot.availableTables
          : [],
      };
    })
    .filter((slot) => Boolean(slot.startTime));
}


function getSpecialHourDateValue(value: string) {
  return value.slice(0, 10);
}

function getReservationWindowForDate(
  restaurant: RestaurantDetail,
  dateValue: string
) {
  const selectedDate = parseInputDate(dateValue);

  if (!selectedDate) {
    return null;
  }

  const dayOfWeek = selectedDate.getDay();
  const operatingHour = restaurant.operatingHours.find(
    (item) => item.dayOfWeek === dayOfWeek
  );
  const effectiveSlotMinutes =
    operatingHour?.slotMinutes && operatingHour.slotMinutes > 0
      ? operatingHour.slotMinutes
      : restaurant.reservationSlotMinutes;

  const specialHour = restaurant.specialHours.find(
    (item) => getSpecialHourDateValue(item.date) === dateValue
  );

  if (specialHour) {
    if (
      specialHour.isClosed ||
      !specialHour.openTime ||
      !specialHour.closeTime
    ) {
      return null;
    }

    return {
      openTime: specialHour.openTime,
      closeTime: specialHour.closeTime,
      slotMinutes: effectiveSlotMinutes,
      lastReservationTime: operatingHour?.lastReservationTime || null,
    };
  }

  if (
    !operatingHour ||
    operatingHour.isClosed ||
    !operatingHour.openTime ||
    !operatingHour.closeTime
  ) {
    return null;
  }

  return {
    openTime: operatingHour.openTime,
    closeTime: operatingHour.closeTime,
    slotMinutes: effectiveSlotMinutes,
    lastReservationTime: operatingHour.lastReservationTime,
  };
}

function getReservationTimeOptions(
  restaurant: RestaurantDetail,
  dateValue: string
): ReservationTimeOption[] {
  const reservationWindow = getReservationWindowForDate(restaurant, dateValue);

  if (!reservationWindow) {
    return [];
  }

  const openMinutes = parseTimeToMinutes(reservationWindow.openTime);
  const closeMinutes = parseTimeToMinutes(reservationWindow.closeTime);

  if (openMinutes === null || closeMinutes === null) {
    return [];
  }

  const slotMinutes = Math.max(reservationWindow.slotMinutes || 60, 1);
  const bufferMinutes = Math.max(restaurant.reservationBufferMinutes || 0, 0);
  const stepMinutes = slotMinutes + bufferMinutes;
  const lastReservationMinutes = parseTimeToMinutes(
    reservationWindow.lastReservationTime
  );
  const latestStartMinutes = Math.min(
    closeMinutes - slotMinutes,
    lastReservationMinutes ?? closeMinutes - slotMinutes
  );
  const minimumStartMinutes = getMinimumStartMinutesForDate(
    restaurant,
    dateValue
  );

  const options: ReservationTimeOption[] = [];

  for (
    let currentMinutes = openMinutes;
    currentMinutes <= latestStartMinutes;
    currentMinutes += stepMinutes
  ) {
    if (minimumStartMinutes !== null && currentMinutes < minimumStartMinutes) {
      continue;
    }

    const startTime = formatMinutesToTimeValue(currentMinutes);
    const endTime = formatMinutesToTimeValue(currentMinutes + slotMinutes);

    options.push({
      startTime,
      endTime,
      label: `${formatTimeLabel(startTime)} - ${formatTimeLabel(endTime)}`,
      slotMinutes,
    });
  }

  return options;
}

function parseRestaurantSpecifications(
  value: unknown
): RestaurantSpecification[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const row = item as Record<string, unknown>;
      const label = String(row.label || "").trim();
      const specificationValue = String(row.value || "").trim();

      if (!label || !specificationValue) {
        return null;
      }

      return {
        label,
        value: specificationValue,
      };
    })
    .filter(
      (item): item is RestaurantSpecification =>
        item !== null
    );
}

function formatCurrency(currency: string, amount: string | number | null) {
  if (amount === null || amount === undefined || amount === "") {
    return `${currency} 0.00`;
  }

  const parsedAmount = Number(amount);

  if (!Number.isFinite(parsedAmount)) {
    return `${currency} ${amount}`;
  }

  return `${currency} ${parsedAmount.toFixed(2)}`;
}

function getMenuLineTotalNumber(menuItem: RestaurantMenuItem, quantity: number) {
  const unitPrice = Number(menuItem.price);

  if (!Number.isFinite(unitPrice)) {
    return 0;
  }

  return unitPrice * quantity;
}

function getMenuLineTotal(menuItem: RestaurantMenuItem, quantity: number) {
  return getMenuLineTotalNumber(menuItem, quantity).toFixed(2);
}

function getRestaurantLocation(restaurant: RestaurantDetail) {
  return (
    [
      restaurant.address,
      restaurant.area,
      restaurant.city,
      restaurant.state,
      restaurant.country,
      restaurant.zipCode,
    ]
      .filter(Boolean)
      .join(", ") || "Location not available"
  );
}

function getDirectionsUrl(restaurant: RestaurantDetail) {
  if (restaurant.latitude && restaurant.longitude) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${restaurant.latitude},${restaurant.longitude}`
    )}`;
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    getRestaurantLocation(restaurant)
  )}`;
}

function createImageGallery(restaurant: RestaurantDetail) {
  const rawImages = [
    restaurant.coverImage,
    ...restaurant.images,
    restaurant.logo,
  ].filter(Boolean) as string[];

  const uniqueImages = Array.from(new Set(rawImages))
    .map(normalizeImageSource)
    .filter(Boolean) as string[];

  return uniqueImages.length > 0 ? uniqueImages : [fallbackImage];
}

function getMenuItemImageUrls(menuItem: RestaurantMenuItem) {
  const uploadedImages = Array.isArray(menuItem.images)
    ? menuItem.images
        .map((image) => normalizeImageSource(image))
        .filter((image): image is string => Boolean(image))
    : [];

  const fallbackMenuImage = normalizeImageSource(menuItem.image);

  if (uploadedImages.length > 0) {
    return uploadedImages;
  }

  return fallbackMenuImage ? [fallbackMenuImage] : [];
}

function getMenuImage(menuItem: RestaurantMenuItem) {
  return getMenuItemImageUrls(menuItem)[0] || fallbackImage;
}

function getRestaurantMenuType(
  menuItem: RestaurantMenuItem
): RestaurantMenuTypeValue {
  return menuItem.menuType === "COMBO" ? "COMBO" : "REGULAR";
}

function formatMenuValidityDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export default function RestaurantDetailClient({
  restaurant,
}: RestaurantDetailClientProps) {
  const router = useRouter();

  const imageGallery = useMemo(
    () => createImageGallery(restaurant),
    [restaurant]
  );

  const restaurantSpecifications = useMemo(
    () => parseRestaurantSpecifications(restaurant.specifications),
    [restaurant.specifications]
  );

  const regularMenuItems = useMemo(
    () =>
      restaurant.menuItems.filter(
        (menuItem) => getRestaurantMenuType(menuItem) === "REGULAR"
      ),
    [restaurant.menuItems]
  );

  const comboMenuItems = useMemo(
    () =>
      restaurant.menuItems.filter(
        (menuItem) => getRestaurantMenuType(menuItem) === "COMBO"
      ),
    [restaurant.menuItems]
  );

  const initialMenuType: RestaurantMenuTypeValue =
    regularMenuItems.length > 0 ? "REGULAR" : "COMBO";

  const [selectedImage, setSelectedImage] = useState(imageGallery[0]);
  const [openAccordionSection, setOpenAccordionSection] =
    useState<RestaurantAccordionSection | null>(null);
  const [selectedMenuType, setSelectedMenuType] =
    useState<RestaurantMenuTypeValue>(initialMenuType);
  const [reservationDate, setReservationDate] = useState(getTodayDateString());
  const [guestCount, setGuestCount] = useState(restaurant.reservationMinGuests);
  const [availableSlots, setAvailableSlots] = useState<
    AvailableRestaurantSlot[]
  >([]);
  const [selectedSlotStartTime, setSelectedSlotStartTime] = useState("");
  const [selectedTableId, setSelectedTableId] = useState("");
  const initialMenuItem =
    initialMenuType === "REGULAR"
      ? regularMenuItems[0]
      : comboMenuItems[0];

  const [selectedMenuItems, setSelectedMenuItems] = useState<
    SelectedMenuItem[]
  >(
    initialMenuItem
      ? [
          {
            menuItemId: initialMenuItem.id,
            quantity: 1,
          },
        ]
      : []
  );
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [menuImagePopup, setMenuImagePopup] = useState<{
    title: string;
    images: string[];
    selectedIndex: number;
  } | null>(null);

  const minimumReservationDate = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return today;
  }, []);

  const maximumReservationDate = useMemo(() => {
    const maxDate = new Date(minimumReservationDate);
    maxDate.setDate(maxDate.getDate() + restaurant.reservationAdvanceDays);

    return maxDate;
  }, [minimumReservationDate, restaurant.reservationAdvanceDays]);

  const minimumReservationDateValue = useMemo(() => {
    return formatDateInputValue(minimumReservationDate);
  }, [minimumReservationDate]);

  const maximumReservationDateValue = useMemo(() => {
    return formatDateInputValue(maximumReservationDate);
  }, [maximumReservationDate]);


  const reservationTimeOptions = useMemo(() => {
    return getReservationTimeOptions(restaurant, reservationDate);
  }, [restaurant, reservationDate]);

  const selectedReservationTimeOption = useMemo(() => {
    return (
      reservationTimeOptions.find(
        (option) => option.startTime === selectedSlotStartTime
      ) || null
    );
  }, [reservationTimeOptions, selectedSlotStartTime]);

  const effectiveReservationSlotMinutes =
    selectedReservationTimeOption?.slotMinutes ||
    reservationTimeOptions[0]?.slotMinutes ||
    restaurant.reservationSlotMinutes;

  const selectedMenuEntries = useMemo(() => {
    return selectedMenuItems
      .map((selectedMenuItem) => {
        const menuItem = restaurant.menuItems.find(
          (item) => item.id === selectedMenuItem.menuItemId
        );

        if (!menuItem) {
          return null;
        }

        const quantity = Math.max(1, selectedMenuItem.quantity);
        const lineTotalNumber = getMenuLineTotalNumber(menuItem, quantity);

        return {
          menuItem,
          quantity,
          lineTotal: lineTotalNumber.toFixed(2),
          lineTotalNumber,
        };
      })
      .filter((entry): entry is SelectedMenuEntry => Boolean(entry));
  }, [restaurant.menuItems, selectedMenuItems]);

  const selectedReservationAmount = useMemo(() => {
    if (selectedMenuEntries.length === 0) {
      return restaurant.priceForTwo || "0";
    }

    const totalAmount = selectedMenuEntries.reduce((total, entry) => {
      return total + entry.lineTotalNumber;
    }, 0);

    return totalAmount.toFixed(2);
  }, [restaurant.priceForTwo, selectedMenuEntries]);

  const selectedReservationCurrency =
    selectedMenuEntries[0]?.menuItem.currency || restaurant.currency;

  const visibleMenuItems =
    selectedMenuType === "REGULAR" ? regularMenuItems : comboMenuItems;

  const maximumGuestCount = useMemo(() => {
    const activeReservableTableCapacities = restaurant.tables
      .filter((table) => table.isActive && table.isReservable)
      .map((table) => table.capacity)
      .filter((capacity) => Number.isFinite(capacity) && capacity > 0);

    const maximumTableCapacity =
      activeReservableTableCapacities.length > 0
        ? Math.max(...activeReservableTableCapacities)
        : restaurant.reservationMinGuests;

    if (restaurant.reservationMaxGuests) {
      return Math.max(
        restaurant.reservationMinGuests,
        Math.min(restaurant.reservationMaxGuests, maximumTableCapacity)
      );
    }

    return Math.max(restaurant.reservationMinGuests, maximumTableCapacity);
  }, [
    restaurant.tables,
    restaurant.reservationMinGuests,
    restaurant.reservationMaxGuests,
  ]);

  const selectedMenuTotalQuantity = selectedMenuEntries.reduce(
    (total, entry) => total + entry.quantity,
    0
  );

  const selectedMenuSummary = selectedMenuEntries
    .map((entry) => `${entry.menuItem.name} × ${entry.quantity}`)
    .join(", ");

  const firstSelectedMenuItem = selectedMenuEntries[0]?.menuItem || null;

  const cuisineLabel =
    restaurant.cuisineTypes.length > 0
      ? restaurant.cuisineTypes.join(", ")
      : "Restaurant";

  const selectedSlot = useMemo(() => {
    return (
      availableSlots.find((slot) => slot.startTime === selectedSlotStartTime) ||
      null
    );
  }, [availableSlots, selectedSlotStartTime]);

  const selectedTable = useMemo(() => {
    return (
      selectedSlot?.availableTables.find(
        (table) => table.id === selectedTableId
      ) || null
    );
  }, [selectedSlot, selectedTableId]);

  useEffect(() => {
    if (!menuImagePopup) {
      return;
    }

    const originalBodyOverflow = document.body.style.overflow;

    function handlePopupKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuImagePopup(null);
      }

      if (event.key === "ArrowLeft") {
        setMenuImagePopup((currentPopup) => {
          if (!currentPopup || currentPopup.images.length <= 1) {
            return currentPopup;
          }

          return {
            ...currentPopup,
            selectedIndex:
              currentPopup.selectedIndex === 0
                ? currentPopup.images.length - 1
                : currentPopup.selectedIndex - 1,
          };
        });
      }

      if (event.key === "ArrowRight") {
        setMenuImagePopup((currentPopup) => {
          if (!currentPopup || currentPopup.images.length <= 1) {
            return currentPopup;
          }

          return {
            ...currentPopup,
            selectedIndex:
              currentPopup.selectedIndex === currentPopup.images.length - 1
                ? 0
                : currentPopup.selectedIndex + 1,
          };
        });
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handlePopupKeyDown);

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      window.removeEventListener("keydown", handlePopupKeyDown);
    };
  }, [menuImagePopup]);

  useEffect(() => {
    setAvailableSlots([]);
    setSelectedTableId("");
    setMessage(null);

    setSelectedSlotStartTime((currentValue) => {
      const existingOption = reservationTimeOptions.find(
        (option) => option.startTime === currentValue
      );

      if (existingOption) {
        return currentValue;
      }

      return reservationTimeOptions[0]?.startTime || "";
    });
  }, [reservationTimeOptions]);

  useEffect(() => {
    if (selectedMenuType === "REGULAR" && regularMenuItems.length === 0) {
      if (comboMenuItems.length > 0) {
        setSelectedMenuType("COMBO");
      }

      return;
    }

    if (selectedMenuType === "COMBO" && comboMenuItems.length === 0) {
      if (regularMenuItems.length > 0) {
        setSelectedMenuType("REGULAR");
      }
    }
  }, [
    comboMenuItems.length,
    regularMenuItems.length,
    selectedMenuType,
  ]);

  useEffect(() => {
    if (restaurant.menuItems.length === 0) {
      setSelectedMenuItems([]);
      return;
    }

    setSelectedMenuItems((currentSelectedItems) => {
      const validSelectedItems = currentSelectedItems.filter(
        (selectedMenuItem) =>
          restaurant.menuItems.some(
            (menuItem) => menuItem.id === selectedMenuItem.menuItemId
          )
      );

      if (validSelectedItems.length > 0) {
        return validSelectedItems.map((item) => ({
          ...item,
          quantity: Math.max(1, item.quantity),
        }));
      }

      const defaultMenuItem =
        regularMenuItems[0] || comboMenuItems[0] || restaurant.menuItems[0];

      return defaultMenuItem
        ? [
            {
              menuItemId: defaultMenuItem.id,
              quantity: 1,
            },
          ]
        : [];
    });
  }, [comboMenuItems, regularMenuItems, restaurant.menuItems]);

  useEffect(() => {
    setGuestCount((currentGuestCount) => {
      if (currentGuestCount < restaurant.reservationMinGuests) {
        return restaurant.reservationMinGuests;
      }

      if (currentGuestCount > maximumGuestCount) {
        return maximumGuestCount;
      }

      return currentGuestCount;
    });

    clearTableSelection();
  }, [restaurant.reservationMinGuests, maximumGuestCount]);

  function clearTableSelection() {
    setAvailableSlots([]);
    setSelectedTableId("");
    setMessage(null);
  }

  function openMenuImagePopup(menuItem: RestaurantMenuItem, selectedIndex = 0) {
    const images = getMenuItemImageUrls(menuItem);

    if (images.length === 0) {
      return;
    }

    setMenuImagePopup({
      title: menuItem.name,
      images,
      selectedIndex: Math.min(Math.max(selectedIndex, 0), images.length - 1),
    });
  }

  function closeMenuImagePopup() {
    setMenuImagePopup(null);
  }

  function showPreviousMenuImage() {
    setMenuImagePopup((currentPopup) => {
      if (!currentPopup || currentPopup.images.length <= 1) {
        return currentPopup;
      }

      return {
        ...currentPopup,
        selectedIndex:
          currentPopup.selectedIndex === 0
            ? currentPopup.images.length - 1
            : currentPopup.selectedIndex - 1,
      };
    });
  }

  function showNextMenuImage() {
    setMenuImagePopup((currentPopup) => {
      if (!currentPopup || currentPopup.images.length <= 1) {
        return currentPopup;
      }

      return {
        ...currentPopup,
        selectedIndex:
          currentPopup.selectedIndex === currentPopup.images.length - 1
            ? 0
            : currentPopup.selectedIndex + 1,
      };
    });
  }

  function handleReservationDateChange(value: string | Date) {
    const selectedDateValue = normalizeSelectedDate(value);

    if (!selectedDateValue) {
      return;
    }

    setReservationDate(selectedDateValue);
    clearTableSelection();
  }

  function decreaseGuestCount() {
    setGuestCount((currentValue) => {
      const nextValue = currentValue - 1;

      return Math.max(restaurant.reservationMinGuests, nextValue);
    });

    clearTableSelection();
  }

  function increaseGuestCount() {
    setGuestCount((currentValue) => {
      const nextValue = currentValue + 1;

      return Math.min(maximumGuestCount, nextValue);
    });

    clearTableSelection();
  }

  function isMenuItemSelected(menuItemId: string) {
    return selectedMenuItems.some(
      (selectedMenuItem) => selectedMenuItem.menuItemId === menuItemId
    );
  }

  function getSelectedMenuQuantity(menuItemId: string) {
    return (
      selectedMenuItems.find(
        (selectedMenuItem) => selectedMenuItem.menuItemId === menuItemId
      )?.quantity || 1
    );
  }

  function toggleMenuSelection(menuItemId: string) {
    setSelectedMenuItems((currentSelectedItems) => {
      const alreadySelected = currentSelectedItems.some(
        (selectedMenuItem) => selectedMenuItem.menuItemId === menuItemId
      );

      if (alreadySelected) {
        return currentSelectedItems.filter(
          (selectedMenuItem) => selectedMenuItem.menuItemId !== menuItemId
        );
      }

      return [
        ...currentSelectedItems,
        {
          menuItemId,
          quantity: 1,
        },
      ];
    });

    setMessage(null);
  }

  function decreaseMenuQuantity(menuItemId: string) {
    setSelectedMenuItems((currentSelectedItems) =>
      currentSelectedItems.map((selectedMenuItem) => {
        if (selectedMenuItem.menuItemId !== menuItemId) {
          return selectedMenuItem;
        }

        return {
          ...selectedMenuItem,
          quantity: Math.max(1, selectedMenuItem.quantity - 1),
        };
      })
    );
  }

  function increaseMenuQuantity(menuItemId: string) {
    setSelectedMenuItems((currentSelectedItems) =>
      currentSelectedItems.map((selectedMenuItem) => {
        if (selectedMenuItem.menuItemId !== menuItemId) {
          return selectedMenuItem;
        }

        return {
          ...selectedMenuItem,
          quantity: selectedMenuItem.quantity + 1,
        };
      })
    );
  }

async function loadAvailableSlots() {
  if (!reservationDate) {
    setMessage({
      type: "error",
      text: "Please select a reservation date.",
    });

    return;
  }

  if (!selectedSlotStartTime) {
    setMessage({
      type: "error",
      text: "Please select a reservation time.",
    });

    return;
  }

  const selectedTimeOption = selectedReservationTimeOption;

  if (!selectedTimeOption) {
    setMessage({
      type: "error",
      text: "The selected reservation time is not valid for this date.",
    });

    return;
  }

  if (guestCount > maximumGuestCount) {
    setMessage({
      type: "error",
      text: `This restaurant can accept up to ${maximumGuestCount} guests based on available table capacity.`,
    });

    return;
  }

  setIsLoadingSlots(true);
  setMessage(null);
  setAvailableSlots([]);
  setSelectedTableId("");

  try {
    const response = await fetch(
      `/api/restaurants/${restaurant.id}/available-slots`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: reservationDate,
          guestCount,
          startTime: selectedTimeOption.startTime,
          endTime: selectedTimeOption.endTime,
        }),
      }
    );

    const result = await response.json().catch(() => null);

    if (!response.ok || !result?.success) {
      throw new Error(result?.message || "No available tables were found.");
    }

    const slots = getResponseSlots(result);
    const selectedStartTime = normalizeSlotTime(selectedTimeOption.startTime);

    const selectedAvailableSlot = slots.find((slot) => {
      return normalizeSlotTime(slot.startTime) === selectedStartTime;
    });

    const selectedAvailableTables = selectedAvailableSlot?.availableTables || [];

    if (!selectedAvailableSlot || selectedAvailableTables.length === 0) {
      setMessage({
        type: "error",
        text: "No table is available for the selected date, time, and guest count.",
      });

      return;
    }

    const backendStartTime = normalizeSlotTime(
  selectedAvailableSlot.startTime || selectedTimeOption.startTime
);

const backendEndTime = normalizeSlotTime(
  selectedAvailableSlot.endTime || selectedTimeOption.endTime
);

const backendSlotLabel =
  selectedAvailableSlot.label ||
  `${formatTimeLabel(backendStartTime)} - ${formatTimeLabel(backendEndTime)}`;

setAvailableSlots([
  {
    ...selectedAvailableSlot,
    time: backendStartTime,
    startTime: backendStartTime,
    endTime: backendEndTime,
    label: backendSlotLabel,
    availableTables: selectedAvailableTables,
  },
]);

setSelectedSlotStartTime(backendStartTime);
    setSelectedTableId(selectedAvailableTables[0]?.id || "");

    setMessage({
      type: "success",
      text: "Available tables loaded successfully.",
    });
  } catch (error) {
    setMessage({
      type: "error",
      text:
        error instanceof Error
          ? error.message
          : "Unable to load available tables.",
    });
  } finally {
    setIsLoadingSlots(false);
  }
}

  function handleReservationCheckout() {
    if (restaurant.menuItems.length > 0 && selectedMenuEntries.length === 0) {
      setMessage({
        type: "error",
        text: "Please select at least one menu item before continuing.",
      });

      return;
    }

    if (!selectedSlot) {
      setMessage({
        type: "error",
        text: "Please check available tables before continuing.",
      });

      return;
    }

    if (!selectedTable) {
      setMessage({
        type: "error",
        text: "Please select an available table.",
      });

      return;
    }

    const checkoutMenuItems = selectedMenuEntries.map((entry) => {
      const menuItemImages = getMenuItemImageUrls(entry.menuItem);

      return {
        id: entry.menuItem.id,
        name: entry.menuItem.name,
        price: entry.menuItem.price,
        currency: entry.menuItem.currency,
        quantity: entry.quantity,
        totalPrice: entry.lineTotal,
        image: menuItemImages[0] || "",
        images: menuItemImages,
      };
    });

    const checkoutParams = new URLSearchParams({
      checkoutType: "restaurant-reservation",
      restaurantId: restaurant.id,
      restaurantSlug: restaurant.slug,
      restaurantName: restaurant.name,
      reservationDate,
      startTime: selectedSlot.startTime,
      endTime: selectedSlot.endTime,
      slotLabel: selectedSlot.label,
      tableId: selectedTable.id,
      tableNumber: selectedTable.tableNumber,
      tableCapacity: String(selectedTable.capacity),
      guests: String(guestCount),
      slotMinutes: String(effectiveReservationSlotMinutes),
      bufferMinutes: String(restaurant.reservationBufferMinutes),
      amount: selectedReservationAmount,
      currency: selectedReservationCurrency,
      image: firstSelectedMenuItem
        ? getMenuImage(firstSelectedMenuItem)
        : selectedImage,
      menuItems: JSON.stringify(checkoutMenuItems),
      menuItemIds: selectedMenuEntries
        .map((entry) => entry.menuItem.id)
        .join(","),
      menuItemNames: selectedMenuEntries
        .map((entry) => entry.menuItem.name)
        .join(", "),
      menuItemId: firstSelectedMenuItem?.id || "",
      menuItemName: firstSelectedMenuItem?.name || "",
      menuItemPrice: firstSelectedMenuItem?.price || "",
      menuItemCurrency: firstSelectedMenuItem?.currency || "",
      menuItemQuantity:
        selectedMenuEntries.length > 0 ? String(selectedMenuTotalQuantity) : "",
      menuItemUnitPrice:
        selectedMenuEntries.length === 1
          ? firstSelectedMenuItem?.price || ""
          : "",
      menuItemTotalPrice:
        selectedMenuEntries.length > 0 ? selectedReservationAmount : "",
    });

    router.push(`/checkout?${checkoutParams.toString()}`);
  }

  function toggleAccordionSection(section: RestaurantAccordionSection) {
    setOpenAccordionSection((currentSection) =>
      currentSection === section ? null : section
    );
  }

  return (
    <>
      <DetailPageLayout
        breadcrumbs={
          <DetailBreadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "Restaurants", href: "/restaurants" },
              { label: restaurant.name },
            ]}
          />
        }
        left={
          <>
            <DetailImageGallery
              images={imageGallery}
              title={restaurant.name}
              activeImage={selectedImage}
              onActiveImageChange={setSelectedImage}
              fallbackImage={fallbackImage}
              maxThumbnails={5}
            />

            <DetailTrustCards
              paymentSecurity={{
                methods: paymentMethods,
                description:
                  "Your payment information is processed securely. We do not store credit card details or have access to your credit card information.",
              }}
            />
          </>
        }
        right={
          <>
            <h1 className="break-words font-heading text-[30px] leading-tight text-[#111111] sm:text-[36px] lg:text-[42px]">
              {restaurant.name.toUpperCase()}
            </h1>


            <DetailPriceSection
              currency={selectedReservationCurrency}
              amount={selectedReservationAmount}
            >
              {selectedMenuEntries.length > 0 ? (
                <p className="mt-1 text-sm text-[#777777]">
                  Selected menu:{" "}
                  <span className="font-medium text-[#111111]">
                    {selectedMenuSummary}
                  </span>
                </p>
              ) : null}
            </DetailPriceSection>

            <a
              href={getDirectionsUrl(restaurant)}
              target="_blank"
              rel="noreferrer"
              className="mt-6 flex items-center gap-4"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded border border-[#d8d8d8] text-xl">
                🚌
              </span>
              <span>
                <span className="block text-base font-semibold text-[#111111]">
                  Get Directions
                </span>
                
              </span>
            </a>

            {/* <div className="mt-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a8176]">
                Restaurant Information
              </p>
              <h2 className="mt-2 font-heading text-2xl uppercase text-[#111111]">
                Details and Reservation
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#777777]">
                Open a section to review restaurant information, select a menu,
                or reserve an available table.
              </p>
            </div> */}

            <RestaurantDetailAccordions
              openSection={openAccordionSection}
              onToggle={toggleAccordionSection}
              vendorName={restaurant.vendor?.businessName || "OREYA Partner"}
              vendorDescription={restaurant.vendor?.description}
              vendorProfileHref={
                restaurant.vendor?.slug
                  ? `/vendors/${restaurant.vendor.slug}`
                  : null
              }
              descriptionContent={
                <>
                  <p className="text-[15px] leading-7 text-[#666666]">
                    {restaurant.description ||
                      restaurant.shortDescription ||
                      "Explore a curated restaurant experience with comfortable seating, warm hospitality, and table reservation support."}
                  </p>

                  <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-[#666666] sm:grid-cols-2">
                    <p>
                      <span className="font-semibold text-[#111111]">
                        Cuisine:
                      </span>{" "}
                      {cuisineLabel}
                    </p>

                    <p>
                      <span className="font-semibold text-[#111111]">
                        Location:
                      </span>{" "}
                      {getRestaurantLocation(restaurant)}
                    </p>
                  </div>
                </>
              }
              menuContent={
                <>
                  {restaurant.menuItems.length > 0 ? (
                                <div>
                                  {/* <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <p className="max-w-2xl text-sm leading-6 text-[#777777]">
                                      Select one or more menu options. The reservation total will
                                      update automatically according to the selected quantities.
                                    </p>

                                    <span className="w-fit shrink-0 rounded-full bg-[#f4f1ec] px-3 py-1 text-xs font-medium text-[#666666]">
                                      {restaurant.menuItems.length} available option
                                      {restaurant.menuItems.length === 1 ? "" : "s"}
                                    </span>
                                  </div> */}

                                  <div
                                    className="mt-2 flex w-full gap-2 overflow-x-auto rounded-2xl bg-[#f5f5f5] p-1.5"
                                    role="tablist"
                                    aria-label="Restaurant menu categories"
                                  >
                                    <button
                                      type="button"
                                      role="tab"
                                      aria-selected={selectedMenuType === "REGULAR"}
                                      onClick={() => setSelectedMenuType("REGULAR")}
                                      disabled={regularMenuItems.length === 0}
                                      className={`min-w-[150px] flex-1 whitespace-nowrap rounded-xl px-5 py-3 text-sm font-semibold transition ${
                                        selectedMenuType === "REGULAR"
                                          ? "bg-black text-white shadow-sm"
                                          : "bg-transparent text-[#666666] hover:bg-white hover:text-black"
                                      } disabled:cursor-not-allowed disabled:opacity-40`}
                                    >
                                      Regular Menu ({regularMenuItems.length})
                                    </button>

                                    <button
                                      type="button"
                                      role="tab"
                                      aria-selected={selectedMenuType === "COMBO"}
                                      onClick={() => setSelectedMenuType("COMBO")}
                                      disabled={comboMenuItems.length === 0}
                                      className={`min-w-[150px] flex-1 whitespace-nowrap rounded-xl px-5 py-3 text-sm font-semibold transition ${
                                        selectedMenuType === "COMBO"
                                          ? "bg-black text-white shadow-sm"
                                          : "bg-transparent text-[#666666] hover:bg-white hover:text-black"
                                      } disabled:cursor-not-allowed disabled:opacity-40`}
                                    >
                                      Combo Menu ({comboMenuItems.length})
                                    </button>
                                  </div>

                                  {visibleMenuItems.length > 0 ? (
                                    <div className="mt-4 grid grid-cols-1 gap-4">
                                      {visibleMenuItems.map((menuItem) => {
                                        const isSelected = isMenuItemSelected(menuItem.id);
                                        const menuItemImages = getMenuItemImageUrls(menuItem);
                                        const menuImage = menuItemImages[0] || fallbackImage;
                                        const extraMenuImages = menuItemImages.slice(1, 5);
                                        const quantity = getSelectedMenuQuantity(menuItem.id);
                                        const menuTotalAmount = isSelected
                                          ? getMenuLineTotal(menuItem, quantity)
                                          : menuItem.price;
                                        const menuType = getRestaurantMenuType(menuItem);
                                        const validFromLabel = formatMenuValidityDate(
                                          menuItem.validFrom
                                        );
                                        const validUntilLabel = formatMenuValidityDate(
                                          menuItem.validUntil
                                        );

                                        return (
                                          <div
                                            key={menuItem.id}
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => toggleMenuSelection(menuItem.id)}
                                            onKeyDown={(event) => {
                                              if (event.key === "Enter" || event.key === " ") {
                                                event.preventDefault();
                                                toggleMenuSelection(menuItem.id);
                                              }
                                            }}
                                            className={`w-full cursor-pointer rounded-[20px] border p-3.5 text-left transition sm:p-4 ${
                                              isSelected
                                                ? "border-black bg-[#fafafa] shadow-sm"
                                                : "border-[#e5e5e5] bg-white hover:border-black"
                                            }`}
                                          >
                                            <div className="flex flex-col gap-4 sm:flex-row">
                                              <button
                                                type="button"
                                                onClick={(event) => {
                                                  event.stopPropagation();
                                                  openMenuImagePopup(menuItem, 0);
                                                }}
                                                className="h-44 w-full shrink-0 overflow-hidden rounded-[16px] bg-[#f4f1ec] transition hover:opacity-90 sm:h-28 sm:w-28"
                                                aria-label={`View ${menuItem.name} image`}
                                              >
                                                <img
                                                  src={menuImage}
                                                  alt={menuItem.name}
                                                  className="h-full w-full object-cover"
                                                  onError={(event) => {
                                                    event.currentTarget.src = fallbackImage;
                                                  }}
                                                />
                                              </button>

                                              <div className="min-w-0 flex-1">
                                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                  <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                      <p className="break-words font-semibold text-[#111111]">
                                                        {menuItem.name}
                                                      </p>

                                                      <span
                                                        className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                                                          menuType === "COMBO"
                                                            ? "bg-amber-100 text-amber-800"
                                                            : "bg-[#eeeeee] text-[#555555]"
                                                        }`}
                                                      >
                                                        {menuType === "COMBO"
                                                          ? "Combo Menu"
                                                          : "Regular Menu"}
                                                      </span>
                                                    </div>

                                                    {menuItem.description ? (
                                                      <p
                                                        title={menuItem.description}
                                                        className="mt-1 line-clamp-1 text-sm leading-6 text-[#777777]"
                                                      >
                                                        {menuItem.description}
                                                      </p>
                                                    ) : (
                                                      <p className="mt-1 text-sm text-[#999999]">
                                                        Menu details are not available.
                                                      </p>
                                                    )}

                                                    {menuType === "COMBO" &&
                                                    (validFromLabel || validUntilLabel) ? (
                                                      <p className="mt-2 text-xs font-medium text-amber-700">
                                                        Valid{" "}
                                                        {validFromLabel
                                                          ? `from ${validFromLabel}`
                                                          : ""}
                                                        {validFromLabel && validUntilLabel
                                                          ? " "
                                                          : ""}
                                                        {validUntilLabel
                                                          ? `until ${validUntilLabel}`
                                                          : ""}
                                                      </p>
                                                    ) : null}
                                                  </div>

                                                  <div className="shrink-0 sm:text-right">
                                                    <p className="text-base font-semibold text-[#111111]">
                                                      {formatCurrency(
                                                        menuItem.currency,
                                                        menuTotalAmount
                                                      )}
                                                    </p>

                                                    {isSelected ? (
                                                      <p className="mt-1 text-xs text-[#777777]">
                                                        {formatCurrency(
                                                          menuItem.currency,
                                                          menuItem.price
                                                        )}{" "}
                                                        × {quantity}
                                                      </p>
                                                    ) : null}
                                                  </div>
                                                </div>

                                                {extraMenuImages.length > 0 ? (
                                                  <div className="mt-3 flex flex-wrap gap-2">
                                                    {extraMenuImages.map((imageUrl, index) => (
                                                      <button
                                                        key={`${menuItem.id}-${imageUrl}-${index}`}
                                                        type="button"
                                                        onClick={(event) => {
                                                          event.stopPropagation();
                                                          openMenuImagePopup(menuItem, index + 1);
                                                        }}
                                                        className="h-10 w-10 overflow-hidden rounded-lg border border-[#e5e5e5] bg-[#f4f1ec] transition hover:border-black"
                                                        aria-label={`View ${menuItem.name} image ${
                                                          index + 2
                                                        }`}
                                                      >
                                                        <img
                                                          src={imageUrl}
                                                          alt={`${menuItem.name} image ${index + 2}`}
                                                          className="h-full w-full object-cover"
                                                          onError={(event) => {
                                                            event.currentTarget.src = fallbackImage;
                                                          }}
                                                        />
                                                      </button>
                                                    ))}

                                                    {menuItemImages.length > 5 ? (
                                                      <button
                                                        type="button"
                                                        onClick={(event) => {
                                                          event.stopPropagation();
                                                          openMenuImagePopup(menuItem, 5);
                                                        }}
                                                        className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#e5e5e5] bg-white text-xs font-semibold text-[#777777] transition hover:border-black hover:text-black"
                                                        aria-label={`View more ${menuItem.name} images`}
                                                      >
                                                        +{menuItemImages.length - 5}
                                                      </button>
                                                    ) : null}
                                                  </div>
                                                ) : null}

                                                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#eeeeee] pt-3">
                                                  <label
                                                    className="flex cursor-pointer items-center gap-2"
                                                    onClick={(event) => event.stopPropagation()}
                                                  >
                                                    <input
                                                      type="checkbox"
                                                      checked={isSelected}
                                                      onChange={() =>
                                                        toggleMenuSelection(menuItem.id)
                                                      }
                                                      className="h-4 w-4 rounded border-[#cccccc] text-black focus:ring-black"
                                                      aria-label={`Select ${menuItem.name}`}
                                                    />

                                                    <span
                                                      className={`text-xs font-semibold uppercase tracking-wide ${
                                                        isSelected ? "text-black" : "text-[#999999]"
                                                      }`}
                                                    >
                                                      {isSelected ? "Selected" : "Select"}
                                                    </span>
                                                  </label>

                                                  {isSelected ? (
                                                    <div
                                                      className="flex items-center overflow-hidden rounded-full border border-[#dddddd] bg-white"
                                                      onClick={(event) => event.stopPropagation()}
                                                    >
                                                      <button
                                                        type="button"
                                                        onClick={() =>
                                                          decreaseMenuQuantity(menuItem.id)
                                                        }
                                                        className="flex h-9 w-10 items-center justify-center text-lg font-semibold text-[#111111] transition hover:bg-[#f5f5f5]"
                                                        aria-label={`Decrease ${menuItem.name} quantity`}
                                                      >
                                                        −
                                                      </button>

                                                      <span className="min-w-[36px] text-center text-sm font-semibold text-[#111111]">
                                                        {quantity}
                                                      </span>

                                                      <button
                                                        type="button"
                                                        onClick={() =>
                                                          increaseMenuQuantity(menuItem.id)
                                                        }
                                                        className="flex h-9 w-10 items-center justify-center text-lg font-semibold text-[#111111] transition hover:bg-[#f5f5f5]"
                                                        aria-label={`Increase ${menuItem.name} quantity`}
                                                      >
                                                        +
                                                      </button>
                                                    </div>
                                                  ) : null}
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <div className="mt-4 rounded-2xl border border-dashed border-[#d8d8d8] bg-[#fafafa] px-5 py-8 text-center">
                                      <p className="font-semibold text-[#333333]">
                                        No {selectedMenuType === "COMBO" ? "combo" : "regular"} menu
                                        is currently available.
                                      </p>

                                      <p className="mt-1 text-sm text-[#777777]">
                                        Select the other menu category to review available options.
                                      </p>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="rounded-[14px] border border-[#e5e5e5] bg-[#fafafa] px-4 py-3 text-sm text-[#777777]">
                                  No menu package has been added for this restaurant. Checkout
                                  will use the restaurant base price.
                                </div>
                              )}
                </>
              }
              reservationContent={
                <>
                                      {/* <div className="rounded-[10px] border border-[#dedede] px-5 py-4">
                                                    <h3 className="font-heading text-lg text-[#111111]">
                                                      RESERVATION DETAILS
                                                    </h3>

                                                    <p className="mt-1 text-sm text-[#777777]">
                                                      Reserve a table with {effectiveReservationSlotMinutes} minute
                                                      slots. Buffer time is {restaurant.reservationBufferMinutes}{" "}
                                                      minutes between reservations.
                                                    </p>
                                                  </div> */}
                  {/* 
                                                  <div className="mt-5">
                                                    <p className="text-sm">
                                                      <span className="font-semibold">Promotions:</span>{" "}
                                                      <span className="text-[#777777]">Table Reservation</span>
                                                    </p>

                                                    <div className="mt-3 flex flex-wrap gap-2">
                                                      {[
                                                        "Reservation",
                                                        `${effectiveReservationSlotMinutes} Min Slot`,
                                                        `${restaurant.reservationBufferMinutes} Min Buffer`,
                                                        `${restaurant.reservationAdvanceDays} Days Advance`,
                                                        restaurant.allowSameDayReservation
                                                          ? "Same-Day Allowed"
                                                          : "Same-Day Closed",
                                                      ].map((item, index) => (
                                                        <span
                                                          key={item}
                                                          className={`rounded-full border px-5 py-2 text-sm ${
                                                            index === 0
                                                              ? "border-black bg-black text-white"
                                                              : "border-black bg-white text-black"
                                                          }`}
                                                        >
                                                          {item}
                                                        </span>
                                                      ))}
                                                    </div>
                                                  </div> */}

                                                  <div
                                                    className="mt-7 space-y-4"
                                                    data-calendar-popup-boundary
                                                  >
                                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                                      <div>
                                                        <label className="mb-1.5 block text-sm font-medium text-[#111111]">
                                                          Reservation Date
                                                        </label>

                                                        <CustomDatePicker
                                                          id="restaurantReservationDate"
                                                          name="restaurantReservationDate"
                                                          value={reservationDate}
                                                          minDate={minimumReservationDateValue}
                                                          maxDate={maximumReservationDateValue}
                                                          placeholder="Select reservation date"
                                                          popupFullWidth
                                                          onChange={handleReservationDateChange}
                                                        />
                                                      </div>
                                                      <div>
                                                        <label className="mb-1.5 block text-sm font-medium text-[#111111]">
                                                          Available Time
                                                        </label>

                                                        <select
                                                          value={selectedSlotStartTime}
                                                          onChange={(event) => {
                                                            setSelectedSlotStartTime(event.target.value);
                                                            clearTableSelection();
                                                          }}
                                                          className="h-11 w-full rounded-full border border-[#dddddd] px-4 text-sm outline-none focus:border-black"
                                                        >
                                                          {reservationTimeOptions.length > 0 ? (
                                                            reservationTimeOptions.map((option) => (
                                                              <option key={option.startTime} value={option.startTime}>
                                                                {option.label}
                                                              </option>
                                                            ))
                                                          ) : (
                                                            <option value="">No time available</option>
                                                          )}
                                                        </select>
                                                      </div>

                                                      <div>
                                                        <label className="mb-1.5 block text-sm font-medium text-[#111111]">
                                                          Guests
                                                        </label>

                                                        <div className="flex h-11 items-center justify-between rounded-full border border-[#dddddd] px-4">
                                                          <button
                                                            type="button"
                                                            onClick={decreaseGuestCount}
                                                            disabled={guestCount <= restaurant.reservationMinGuests}
                                                            className="text-xl leading-none disabled:cursor-not-allowed disabled:opacity-40"
                                                            aria-label="Decrease guest count"
                                                          >
                                                            −
                                                          </button>

                                                          <span className="text-sm font-medium">{guestCount}</span>

                                                          <button
                                                            type="button"
                                                            onClick={increaseGuestCount}
                                                            disabled={guestCount >= maximumGuestCount}
                                                            className="text-xl leading-none disabled:cursor-not-allowed disabled:opacity-40"
                                                            aria-label="Increase guest count"
                                                          >
                                                            +
                                                          </button>
                                                        </div>

                                                        {/* <p className="mt-1 text-xs text-[#777777]">
                                                          Available for {restaurant.reservationMinGuests} to{" "}
                                                          {maximumGuestCount} guests based on table capacity.
                                                        </p> */}
                                                      </div>
                                                    </div>

                                                    <button
                                                      type="button"
                                                      onClick={loadAvailableSlots}
                                                      disabled={
                                                        isLoadingSlots ||
                                                        !restaurant.isTableReservationAvailable ||
                                                        !selectedSlotStartTime
                                                      }
                                                      className="h-12 w-full rounded-full bg-[#ececec] text-sm font-semibold text-black transition hover:bg-[#dedede] disabled:cursor-not-allowed disabled:opacity-60"
                                                    >
                                                      {isLoadingSlots ? "Checking Tables..." : "Check Available Slots"}
                                                    </button>

                                                    {availableSlots.length > 0 ? (
                                                      <div className="space-y-4">
                                                        <div>
                                                          <label className="mb-1.5 block text-sm font-medium text-[#111111]">
                                                            Available Table
                                                          </label>

                                                          <select
                                                            value={selectedTableId}
                                                            onChange={(event) =>
                                                              setSelectedTableId(event.target.value)
                                                            }
                                                            className="h-11 w-full rounded-full border border-[#dddddd] px-4 text-sm outline-none focus:border-black"
                                                          >
                                                            {availableSlots[0]?.availableTables.map((table) => (
                                                              <option key={table.id} value={table.id}>
                                                                Table {table.tableNumber} · {table.capacity} guests
                                                                {table.seatingArea ? ` · ${table.seatingArea}` : ""}
                                                              </option>
                                                            ))}
                                                          </select>
                                                        </div>

                                                      </div>
                                                    ) : null}

                                                    {message ? (
                                                      <div
                                                        className={`rounded-[14px] px-4 py-3 text-sm ${
                                                          message.type === "success"
                                                            ? "bg-green-50 text-green-700"
                                                            : "bg-red-50 text-red-700"
                                                        }`}
                                                      >
                                                        {message.text}
                                                      </div>
                                                    ) : null}
                                                  </div>
                </>
              }
              reservationAction={
                availableSlots.length > 0 ? (
                  <button
                    type="button"
                    onClick={handleReservationCheckout}
                    disabled={!selectedTable}
                    className="h-12 w-full rounded-full bg-black text-sm font-semibold text-white transition hover:bg-[#222222] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Reserve It Now ·{" "}
                    {formatCurrency(
                      selectedReservationCurrency,
                      selectedReservationAmount
                    )}
                  </button>
                ) : null
              }
            />

            <div className="mt-6 flex items-center gap-3 text-sm">
              <span>Share:</span>
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#dddddd] font-semibold"
              >
                f
              </button>
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#dddddd] font-semibold"
              >
                𝕏
              </button>
            </div>
          </>
        }
        bottom={
          <DetailInfoTabs
            customTabs={[
              {
                key: "SPECIFICATIONS",
                label: "SPECIFICATIONS",
                content: (
                  <>
                    <div className="grid grid-cols-1 gap-8 py-8 lg:grid-cols-2 lg:gap-12 lg:py-10">
                      <div className="overflow-hidden rounded-[18px] bg-[#f4f1ec]">
                        <img
                          src={selectedImage}
                          alt={restaurant.name}
                          className="h-[280px] w-full object-cover sm:h-[360px]"
                          onError={(event) => {
                            event.currentTarget.src = fallbackImage;
                          }}
                        />
                      </div>

                      <div>
                        <h2 className="font-heading text-2xl uppercase text-[#111111]">
                          {restaurant.name}
                        </h2>

                        {restaurantSpecifications.length > 0 ? (
                          <div className="mt-5 overflow-hidden rounded-[16px] border border-[#e5e5e5]">
                            {restaurantSpecifications.map((specification, index) => (
                              <div
                                key={`${specification.label}-${index}`}
                                className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-4 border-b border-[#e5e5e5] px-4 py-3 text-[15px] last:border-b-0"
                              >
                                <span className="font-semibold text-[#111111]">
                                  {specification.label}
                                </span>
                                <span className="text-[#666666]">
                                  {specification.value}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-5 space-y-5 text-[15px] leading-7 text-[#666666]">
                            <p>
                              {restaurant.description ||
                                restaurant.shortDescription ||
                                "This restaurant offers a curated dining experience with comfortable seating, convenient table reservation, and warm hospitality."}
                            </p>

                            <p>
                              Cuisine type: {cuisineLabel}. Reservation slot duration is{" "}
                              {effectiveReservationSlotMinutes} minutes with{" "}
                              {restaurant.reservationBufferMinutes} minutes buffer time.
                            </p>

                            <p>
                              Guests can reserve tables for{" "}
                              {restaurant.reservationMinGuests} to {maximumGuestCount}{" "}
                              guests based on active reservable table capacity.
                            </p>

                            {restaurant.menuItems.length > 0 ? (
                              <p>
                                Menu packages available:{" "}
                                {restaurant.menuItems.map((item) => item.name).join(", ")}
                                .
                              </p>
                            ) : null}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ),
              },
              {
                key: "EXCHANGES AND REFUNDS",
                label: "EXCHANGES AND REFUNDS",
                content: (
                  <>
                    <div className="grid grid-cols-1 gap-8 py-8 lg:grid-cols-2 lg:gap-12 lg:py-10">
                      <div className="overflow-hidden rounded-[18px] bg-[#f4f1ec]">
                        <img
                          src={selectedImage}
                          alt={restaurant.name}
                          className="h-[280px] w-full object-cover sm:h-[360px]"
                          onError={(event) => {
                            event.currentTarget.src = fallbackImage;
                          }}
                        />
                      </div>

                      <div>
                        <h2 className="font-heading text-2xl uppercase text-[#111111]">
                          Exchanges and Refunds
                        </h2>

                        {restaurant.exchangePolicy || restaurant.refundPolicy ? (
                          <div className="mt-5 space-y-6 text-[15px] leading-7 text-[#666666]">
                            {restaurant.exchangePolicy ? (
                              <section>
                                <h3 className="font-semibold text-[#111111]">
                                  Exchange Policy
                                </h3>
                                <p className="mt-2 whitespace-pre-line">
                                  {restaurant.exchangePolicy}
                                </p>
                              </section>
                            ) : null}

                            {restaurant.refundPolicy ? (
                              <section>
                                <h3 className="font-semibold text-[#111111]">
                                  Refund Policy
                                </h3>
                                <p className="mt-2 whitespace-pre-line">
                                  {restaurant.refundPolicy}
                                </p>
                              </section>
                            ) : null}
                          </div>
                        ) : (
                          <div className="mt-5 space-y-5 text-[15px] leading-7 text-[#666666]">
                            <p>
                              Reservations are subject to table availability, restaurant
                              operating hours, selected menu packages, and confirmation
                              rules configured by the restaurant.
                            </p>

                            <p>
                              {restaurant.reservationCancellationNote ||
                                "Please contact the restaurant if you need to cancel or modify your reservation. Final cancellation acceptance depends on the restaurant policy."}
                            </p>

                            <p>
                              Same-day reservation is{" "}
                              {restaurant.allowSameDayReservation
                                ? "available"
                                : "not available"}{" "}
                              for this restaurant.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ),
              },
              {
                key: "CUSTOMER REVIEWS",
                label: "CUSTOMER REVIEWS",
                content: (
                  <>
                    <div className="py-12 text-center">
                      <h2 className="font-heading text-2xl uppercase text-[#111111]">
                        Customer Reviews
                      </h2>

                      <div className="mx-auto mt-8 flex max-w-[560px] flex-col items-center justify-center gap-6 md:flex-row">
                        <div className="text-center">
                          <p className="text-xl tracking-widest">☆☆☆☆☆</p>
                          <p className="mt-1 text-sm text-[#777777]">
                            Be the first to write a review
                          </p>
                        </div>

                        <div className="hidden h-16 w-px bg-[#dddddd] md:block" />

                        <button type="button" className="w-full max-w-[220px] bg-[#333333] px-8 py-3 text-sm font-semibold text-white">
                          Write a review
                        </button>
                      </div>
                    </div>
                  </>
                ),
              },
            ]}
          />
        }
      />

      {menuImagePopup ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-label={`${menuImagePopup.title} image preview`}
          onClick={closeMenuImagePopup}
        >
          <div
            className="relative flex max-h-[92vh] w-full max-w-5xl flex-col rounded-[22px] bg-white p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-4">
              <div>
                <p className="font-heading text-xl text-[#111111]">
                  {menuImagePopup.title}
                </p>
                <p className="text-sm text-[#777777]">
                  Image {menuImagePopup.selectedIndex + 1} of{" "}
                  {menuImagePopup.images.length}
                </p>
              </div>

              <button
                type="button"
                onClick={closeMenuImagePopup}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#dddddd] text-2xl leading-none text-[#111111] transition hover:bg-[#f5f5f5]"
                aria-label="Close image popup"
              >
                ×
              </button>
            </div>

            <div className="relative overflow-hidden rounded-[18px] bg-[#f4f1ec]">
              <img
                src={
                  menuImagePopup.images[menuImagePopup.selectedIndex] ||
                  fallbackImage
                }
                alt={menuImagePopup.title}
                className="max-h-[68vh] w-full object-contain"
                onError={(event) => {
                  event.currentTarget.src = fallbackImage;
                }}
              />

              {menuImagePopup.images.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={showPreviousMenuImage}
                    className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-2xl text-[#111111] shadow-lg transition hover:bg-white"
                    aria-label="Previous image"
                  >
                    ‹
                  </button>

                  <button
                    type="button"
                    onClick={showNextMenuImage}
                    className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-2xl text-[#111111] shadow-lg transition hover:bg-white"
                    aria-label="Next image"
                  >
                    ›
                  </button>
                </>
              ) : null}
            </div>

            {menuImagePopup.images.length > 1 ? (
              <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                {menuImagePopup.images.map((imageUrl, index) => (
                  <button
                    key={`${imageUrl}-${index}`}
                    type="button"
                    onClick={() =>
                      setMenuImagePopup((currentPopup) =>
                        currentPopup
                          ? {
                              ...currentPopup,
                              selectedIndex: index,
                            }
                          : currentPopup
                      )
                    }
                    className={`h-16 w-16 shrink-0 overflow-hidden rounded-[12px] border bg-[#f4f1ec] transition ${
                      menuImagePopup.selectedIndex === index
                        ? "border-black"
                        : "border-[#e5e5e5] hover:border-black"
                    }`}
                    aria-label={`Show image ${index + 1}`}
                  >
                    <img
                      src={imageUrl}
                      alt={`${menuImagePopup.title} thumbnail ${index + 1}`}
                      className="h-full w-full object-cover"
                      onError={(event) => {
                        event.currentTarget.src = fallbackImage;
                      }}
                    />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}