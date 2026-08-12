-- CreateEnum
CREATE TYPE "RestaurantStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ACTIVE', 'INACTIVE', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "MenuItemStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'OUT_OF_STOCK');

-- CreateEnum
CREATE TYPE "FoodType" AS ENUM ('VEG', 'NON_VEG', 'EGG', 'VEGAN', 'OTHER');

-- CreateEnum
CREATE TYPE "RestaurantReservationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED', 'COMPLETED', 'NO_SHOW');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'RESTAURANT_RESERVATION_CREATED';
ALTER TYPE "NotificationType" ADD VALUE 'RESTAURANT_RESERVATION_CONFIRMED';
ALTER TYPE "NotificationType" ADD VALUE 'RESTAURANT_RESERVATION_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE 'RESTAURANT_RESERVATION_CANCELLED';
ALTER TYPE "NotificationType" ADD VALUE 'RESTAURANT_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'RESTAURANT_REJECTED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OrderStatus" ADD VALUE 'ACCEPTED';
ALTER TYPE "OrderStatus" ADD VALUE 'PREPARING';
ALTER TYPE "OrderStatus" ADD VALUE 'READY';
ALTER TYPE "OrderStatus" ADD VALUE 'OUT_FOR_DELIVERY';
ALTER TYPE "OrderStatus" ADD VALUE 'DELIVERED';
ALTER TYPE "OrderStatus" ADD VALUE 'REJECTED';

-- AlterTable
ALTER TABLE "cart_items" ADD COLUMN     "menuItemId" TEXT,
ADD COLUMN     "restaurantId" TEXT;

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "menuItemId" TEXT,
ADD COLUMN     "restaurantId" TEXT;

-- AlterTable
ALTER TABLE "reviews" ADD COLUMN     "menuItemId" TEXT,
ADD COLUMN     "restaurantId" TEXT;

-- CreateTable
CREATE TABLE "restaurants" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "categoryId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "shortDescription" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "logo" TEXT,
    "coverImage" TEXT,
    "images" TEXT[],
    "cuisineTypes" TEXT[],
    "foodTypes" "FoodType"[],
    "priceForTwo" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'AED',
    "address" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "country" TEXT,
    "state" TEXT,
    "city" TEXT,
    "area" TEXT,
    "zipCode" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "isDeliveryAvailable" BOOLEAN NOT NULL DEFAULT true,
    "isPickupAvailable" BOOLEAN NOT NULL DEFAULT true,
    "isTableReservationAvailable" BOOLEAN NOT NULL DEFAULT false,
    "deliveryRadiusKm" DECIMAL(10,2),
    "deliveryFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "minOrderAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "estimatedDeliveryMinutes" INTEGER,
    "status" "RestaurantStatus" NOT NULL DEFAULT 'DRAFT',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" TIMESTAMP(3),
    "rejectedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurant_menu_categories" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurant_menu_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurant_menu_items" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "menuCategoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AED',
    "images" TEXT[],
    "foodType" "FoodType" NOT NULL DEFAULT 'OTHER',
    "ingredients" TEXT,
    "allergens" TEXT,
    "calories" INTEGER,
    "preparationTimeMinutes" INTEGER,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "status" "MenuItemStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurant_menu_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurant_operating_hours" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "openTime" TEXT,
    "closeTime" TEXT,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurant_operating_hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurant_tables" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "tableNumber" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurant_tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurant_reservations" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "tableId" TEXT,
    "reservationDate" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT,
    "guests" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'AED',
    "status" "RestaurantReservationStatus" NOT NULL DEFAULT 'PENDING',
    "customerNote" TEXT,
    "vendorNote" TEXT,
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurant_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "restaurants_slug_key" ON "restaurants"("slug");

-- CreateIndex
CREATE INDEX "restaurants_vendorId_idx" ON "restaurants"("vendorId");

-- CreateIndex
CREATE INDEX "restaurants_categoryId_idx" ON "restaurants"("categoryId");

-- CreateIndex
CREATE INDEX "restaurants_status_idx" ON "restaurants"("status");

-- CreateIndex
CREATE INDEX "restaurants_slug_idx" ON "restaurants"("slug");

-- CreateIndex
CREATE INDEX "restaurants_city_idx" ON "restaurants"("city");

-- CreateIndex
CREATE INDEX "restaurants_area_idx" ON "restaurants"("area");

-- CreateIndex
CREATE INDEX "restaurants_isFeatured_idx" ON "restaurants"("isFeatured");

-- CreateIndex
CREATE INDEX "restaurants_isPopular_idx" ON "restaurants"("isPopular");

-- CreateIndex
CREATE INDEX "restaurant_menu_categories_restaurantId_idx" ON "restaurant_menu_categories"("restaurantId");

-- CreateIndex
CREATE INDEX "restaurant_menu_categories_isActive_idx" ON "restaurant_menu_categories"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "restaurant_menu_categories_restaurantId_slug_key" ON "restaurant_menu_categories"("restaurantId", "slug");

-- CreateIndex
CREATE INDEX "restaurant_menu_items_restaurantId_idx" ON "restaurant_menu_items"("restaurantId");

-- CreateIndex
CREATE INDEX "restaurant_menu_items_menuCategoryId_idx" ON "restaurant_menu_items"("menuCategoryId");

-- CreateIndex
CREATE INDEX "restaurant_menu_items_status_idx" ON "restaurant_menu_items"("status");

-- CreateIndex
CREATE INDEX "restaurant_menu_items_isAvailable_idx" ON "restaurant_menu_items"("isAvailable");

-- CreateIndex
CREATE INDEX "restaurant_menu_items_isFeatured_idx" ON "restaurant_menu_items"("isFeatured");

-- CreateIndex
CREATE UNIQUE INDEX "restaurant_menu_items_restaurantId_slug_key" ON "restaurant_menu_items"("restaurantId", "slug");

-- CreateIndex
CREATE INDEX "restaurant_operating_hours_restaurantId_idx" ON "restaurant_operating_hours"("restaurantId");

-- CreateIndex
CREATE INDEX "restaurant_operating_hours_dayOfWeek_idx" ON "restaurant_operating_hours"("dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "restaurant_operating_hours_restaurantId_dayOfWeek_key" ON "restaurant_operating_hours"("restaurantId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "restaurant_tables_restaurantId_idx" ON "restaurant_tables"("restaurantId");

-- CreateIndex
CREATE INDEX "restaurant_tables_isActive_idx" ON "restaurant_tables"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "restaurant_tables_restaurantId_tableNumber_key" ON "restaurant_tables"("restaurantId", "tableNumber");

-- CreateIndex
CREATE INDEX "restaurant_reservations_customerId_idx" ON "restaurant_reservations"("customerId");

-- CreateIndex
CREATE INDEX "restaurant_reservations_restaurantId_idx" ON "restaurant_reservations"("restaurantId");

-- CreateIndex
CREATE INDEX "restaurant_reservations_tableId_idx" ON "restaurant_reservations"("tableId");

-- CreateIndex
CREATE INDEX "restaurant_reservations_status_idx" ON "restaurant_reservations"("status");

-- CreateIndex
CREATE INDEX "restaurant_reservations_reservationDate_idx" ON "restaurant_reservations"("reservationDate");

-- CreateIndex
CREATE INDEX "cart_items_restaurantId_idx" ON "cart_items"("restaurantId");

-- CreateIndex
CREATE INDEX "cart_items_menuItemId_idx" ON "cart_items"("menuItemId");

-- CreateIndex
CREATE INDEX "order_items_restaurantId_idx" ON "order_items"("restaurantId");

-- CreateIndex
CREATE INDEX "order_items_menuItemId_idx" ON "order_items"("menuItemId");

-- CreateIndex
CREATE INDEX "reviews_restaurantId_idx" ON "reviews"("restaurantId");

-- CreateIndex
CREATE INDEX "reviews_menuItemId_idx" ON "reviews"("menuItemId");

-- AddForeignKey
ALTER TABLE "restaurants" ADD CONSTRAINT "restaurants_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurants" ADD CONSTRAINT "restaurants_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_menu_categories" ADD CONSTRAINT "restaurant_menu_categories_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_menu_items" ADD CONSTRAINT "restaurant_menu_items_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_menu_items" ADD CONSTRAINT "restaurant_menu_items_menuCategoryId_fkey" FOREIGN KEY ("menuCategoryId") REFERENCES "restaurant_menu_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_operating_hours" ADD CONSTRAINT "restaurant_operating_hours_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_tables" ADD CONSTRAINT "restaurant_tables_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_reservations" ADD CONSTRAINT "restaurant_reservations_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_reservations" ADD CONSTRAINT "restaurant_reservations_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_reservations" ADD CONSTRAINT "restaurant_reservations_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "restaurant_tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "restaurant_menu_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "restaurant_menu_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "restaurant_menu_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
