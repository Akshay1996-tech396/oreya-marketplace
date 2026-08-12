export type MarketplaceItem = {
  id: number;
  title: string;
  vendor: string;
  category: string;
  price: number;
  currency: string;
  slug: string;
  image?: string;
};

export const restaurants: MarketplaceItem[] = [
  {
    id: 1,
    title: "Salt Restaurant",
    vendor: "Seven Seas Hotel",
    category: "Restaurants",
    price: 44,
    currency: "AED",
    slug: "salt-restaurant",
  },
  {
    id: 2,
    title: "Punjabi Dhaba",
    vendor: "Seven Seas Hotel",
    category: "Restaurants",
    price: 49,
    currency: "AED",
    slug: "punjabi-dhaba",
  },
  {
    id: 3,
    title: "Royal Dinner Buffet",
    vendor: "Luxury Palace",
    category: "Restaurants",
    price: 99,
    currency: "AED",
    slug: "royal-dinner-buffet",
  },
  {
    id: 4,
    title: "Cafe Breakfast Deal",
    vendor: "Urban Cafe",
    category: "Restaurants",
    price: 29,
    currency: "AED",
    slug: "cafe-breakfast-deal",
  },
];

export const services: MarketplaceItem[] = [
  {
    id: 5,
    title: "Home Cleaning Service",
    vendor: "CleanPro",
    category: "Services",
    price: 120,
    currency: "AED",
    slug: "home-cleaning-service",
  },
  {
    id: 6,
    title: "Salon Appointment",
    vendor: "Style Studio",
    category: "Services",
    price: 75,
    currency: "AED",
    slug: "salon-appointment",
  },
  {
    id: 7,
    title: "AC Repair Service",
    vendor: "QuickFix",
    category: "Services",
    price: 150,
    currency: "AED",
    slug: "ac-repair-service",
  },
  {
    id: 8,
    title: "Car Wash Booking",
    vendor: "AutoShine",
    category: "Services",
    price: 60,
    currency: "AED",
    slug: "car-wash-booking",
  },
];

export const products: MarketplaceItem[] = [
  {
    id: 9,
    title: "Premium Perfume",
    vendor: "Oud House",
    category: "Products",
    price: 199,
    currency: "AED",
    slug: "premium-perfume",
  },
  {
    id: 10,
    title: "Luxury Watch",
    vendor: "Time Gallery",
    category: "Products",
    price: 499,
    currency: "AED",
    slug: "luxury-watch",
  },
  {
    id: 11,
    title: "Leather Wallet",
    vendor: "Urban Style",
    category: "Products",
    price: 89,
    currency: "AED",
    slug: "leather-wallet",
  },
  {
    id: 12,
    title: "Wireless Headphones",
    vendor: "SoundPro",
    category: "Products",
    price: 249,
    currency: "AED",
    slug: "wireless-headphones",
  },
];

export const experiences: MarketplaceItem[] = [
  {
    id: 13,
    title: "Desert Safari",
    vendor: "Adventure Hub",
    category: "Experiences",
    price: 299,
    currency: "AED",
    slug: "desert-safari",
  },
  {
    id: 14,
    title: "Luxury Yacht Ride",
    vendor: "Blue Waves",
    category: "Experiences",
    price: 799,
    currency: "AED",
    slug: "luxury-yacht-ride",
  },
  {
    id: 15,
    title: "City Tour",
    vendor: "Travel Mate",
    category: "Experiences",
    price: 149,
    currency: "AED",
    slug: "city-tour",
  },
  {
    id: 16,
    title: "Spa Experience",
    vendor: "Relax Center",
    category: "Experiences",
    price: 220,
    currency: "AED",
    slug: "spa-experience",
  },
];

export const allItems = [
  ...restaurants,
  ...services,
  ...products,
  ...experiences,
];