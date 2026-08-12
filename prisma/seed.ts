import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting seed...");

  // Clean old data
  await prisma.review.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.appointmentSlot.deleteMany();
  await prisma.product.deleteMany();
  await prisma.service.deleteMany();
  await prisma.vendorProfile.deleteMany();
  await prisma.category.deleteMany();
  await prisma.currencyRate.deleteMany();
  await prisma.setting.deleteMany();
  await prisma.user.deleteMany();

  // Users
  const admin = await prisma.user.create({
    data: {
      name: "Main Admin",
      email: "admin@example.com",
      password: "admin123",
      role: "ADMIN",
    },
  });

  const vendorUser = await prisma.user.create({
    data: {
      name: "Seven Seas Hotel",
      email: "vendor@example.com",
      password: "vendor123",
      phone: "9999999999",
      role: "VENDOR",
    },
  });

  const customer = await prisma.user.create({
    data: {
      name: "Akshay Shrivastava",
      email: "customer@example.com",
      password: "customer123",
      phone: "8888888888",
      role: "CUSTOMER",
    },
  });

  // Vendor profile
  const vendor = await prisma.vendorProfile.create({
    data: {
      userId: vendorUser.id,
      businessName: "Seven Seas Hotel",
      slug: "seven-seas-hotel",
      description: "Premium restaurants, services and experiences vendor.",
      phone: "9999999999",
      address: "Dubai, UAE",
      city: "Dubai",
      country: "UAE",
      status: "APPROVED",
      commissionRate: 10,
    },
  });

  // Categories
  const restaurantsCategory = await prisma.category.create({
    data: {
      name: "Restaurants",
      slug: "restaurants",
      description: "Restaurant listings and dining experiences.",
    },
  });

  const servicesCategory = await prisma.category.create({
    data: {
      name: "Services",
      slug: "services",
      description: "Book professional services and appointments.",
    },
  });

  const productsCategory = await prisma.category.create({
    data: {
      name: "Products",
      slug: "products",
      description: "Shop curated products from trusted vendors.",
    },
  });

  const experiencesCategory = await prisma.category.create({
    data: {
      name: "Experiences",
      slug: "experiences",
      description: "Discover events, clubs, activities and experiences.",
    },
  });

  // Products
  await prisma.product.createMany({
    data: [
      {
        vendorId: vendor.id,
        categoryId: productsCategory.id,
        title: "Premium Perfume",
        slug: "premium-perfume",
        description: "Luxury perfume with long-lasting fragrance.",
        price: 199,
        currency: "AED",
        stock: 20,
        images: [],
        status: "ACTIVE",
      },
      {
        vendorId: vendor.id,
        categoryId: productsCategory.id,
        title: "Luxury Watch",
        slug: "luxury-watch",
        description: "Elegant luxury watch for premium lifestyle.",
        price: 499,
        currency: "AED",
        stock: 10,
        images: [],
        status: "ACTIVE",
      },
      {
        vendorId: vendor.id,
        categoryId: productsCategory.id,
        title: "Leather Wallet",
        slug: "leather-wallet",
        description: "Premium leather wallet.",
        price: 89,
        currency: "AED",
        stock: 30,
        images: [],
        status: "ACTIVE",
      },
    ],
  });

  // Services / Restaurants / Experiences
  const saltRestaurant = await prisma.service.create({
    data: {
      vendorId: vendor.id,
      categoryId: restaurantsCategory.id,
      title: "Salt Restaurant",
      slug: "salt-restaurant",
      description: "Premium restaurant buffet experience.",
      price: 44,
      currency: "AED",
      duration: 60,
      images: [],
      status: "ACTIVE",
    },
  });

  await prisma.service.createMany({
    data: [
      {
        vendorId: vendor.id,
        categoryId: restaurantsCategory.id,
        title: "Punjabi Dhaba",
        slug: "punjabi-dhaba",
        description: "Indian dining experience.",
        price: 49,
        currency: "AED",
        duration: 60,
        images: [],
        status: "ACTIVE",
      },
      {
        vendorId: vendor.id,
        categoryId: servicesCategory.id,
        title: "Full Body Scrub for Women",
        slug: "full-body-scrub-for-women",
        description: "Home salon and spa service.",
        price: 149,
        currency: "AED",
        duration: 90,
        images: [],
        status: "ACTIVE",
      },
      {
        vendorId: vendor.id,
        categoryId: servicesCategory.id,
        title: "Salon Appointment",
        slug: "salon-appointment",
        description: "Beauty salon appointment booking.",
        price: 75,
        currency: "AED",
        duration: 60,
        images: [],
        status: "ACTIVE",
      },
      {
        vendorId: vendor.id,
        categoryId: experiencesCategory.id,
        title: "Desert Safari",
        slug: "desert-safari",
        description: "Adventure desert safari experience.",
        price: 299,
        currency: "AED",
        duration: 180,
        images: [],
        status: "ACTIVE",
      },
      {
        vendorId: vendor.id,
        categoryId: experiencesCategory.id,
        title: "Luxury Yacht Ride",
        slug: "luxury-yacht-ride",
        description: "Luxury yacht ride experience.",
        price: 799,
        currency: "AED",
        duration: 120,
        images: [],
        status: "ACTIVE",
      },
    ],
  });

  // Appointment slots
  await prisma.appointmentSlot.createMany({
    data: [
      {
        vendorId: vendor.id,
        serviceId: saltRestaurant.id,
        date: new Date("2026-07-01"),
        startTime: "10:00",
        endTime: "11:00",
        capacity: 10,
        bookedCount: 0,
        isActive: true,
      },
      {
        vendorId: vendor.id,
        serviceId: saltRestaurant.id,
        date: new Date("2026-07-01"),
        startTime: "12:00",
        endTime: "13:00",
        capacity: 10,
        bookedCount: 0,
        isActive: true,
      },
    ],
  });

  // Cart for customer
  const cart = await prisma.cart.create({
    data: {
      customerId: customer.id,
    },
  });

  await prisma.cartItem.create({
    data: {
      cartId: cart.id,
      serviceId: saltRestaurant.id,
      quantity: 1,
      price: 44,
      currency: "AED",
    },
  });

  // Currency rates
  await prisma.currencyRate.createMany({
    data: [
      {
        baseCurrency: "AED",
        targetCurrency: "INR",
        rate: 22.7,
      },
      {
        baseCurrency: "AED",
        targetCurrency: "USD",
        rate: 0.27,
      },
      {
        baseCurrency: "AED",
        targetCurrency: "EUR",
        rate: 0.25,
      },
    ],
  });

  // Settings
  await prisma.setting.createMany({
    data: [
      {
        key: "default_currency",
        value: "AED",
      },
      {
        key: "default_language",
        value: "en",
      },
      {
        key: "platform_name",
        value: "Multi-Vendor Marketplace",
      },
    ],
  });

  console.log("Seed completed successfully!");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });